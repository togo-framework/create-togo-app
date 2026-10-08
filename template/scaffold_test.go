package template

import (
	"bytes"
	"encoding/json"
	"go/parser"
	"go/token"
	"io"
	"io/fs"
	"net"
	"net/http"
	"net/http/cookiejar"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"text/template"
	"time"
)

// scaffoldData mirrors the view model the CLI passes to every .tmpl file
// (togo-framework/cli internal/scaffold). The CLI also installs generator.FuncMap;
// the templates use only built-in actions today, so a template that starts calling
// a CLI helper fails to parse here and must be added to this test on purpose.
type scaffoldData struct {
	App, AppPascal, Module, DB, DBDriver, DBURL string
}

var databases = map[string][2]string{
	"sqlite":        {"sqlite", "file:./togo.db?_pragma=foreign_keys(1)"},
	"postgres":      {"pgx", "postgres://postgres:postgres@localhost:5432/demo?sslmode=disable"},
	"togo-postgres": {"pgx", "postgres://postgres:postgres@localhost:5432/demo?sslmode=disable"},
	"supabase":      {"pgx", "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"},
	"mysql":         {"mysql", "root:root@tcp(localhost:3306)/demo?parseTime=true"},
	"mongodb":       {"mongodb", "mongodb://root:root@localhost:27017/demo?authSource=admin"},
}

var frontends = []string{"tanstack", "nextjs"}

// render writes a project the way `togo new` does (before its plugin installs):
// the backend tree into dir, the chosen frontend into dir/web. .tmpl files are
// executed and lose the suffix; everything else is copied verbatim.
func render(t *testing.T, dir, frontend, db string) {
	t.Helper()
	cfg, ok := databases[db]
	if !ok {
		t.Fatalf("unknown db %q", db)
	}
	d := scaffoldData{App: "demo", AppPascal: "Demo", Module: "example.com/demo", DB: db, DBDriver: cfg[0], DBURL: cfg[1]}
	copyTree(t, FS(), Root, dir, d)
	base := path.Join(FrontendRoot, frontend)
	if _, err := fs.Stat(FrontendFS(), base); err != nil {
		t.Fatalf("unknown frontend %q: %v", frontend, err)
	}
	copyTree(t, FrontendFS(), base, filepath.Join(dir, "web"), d)
}

func copyTree(t *testing.T, src fs.FS, root, dest string, d scaffoldData) {
	t.Helper()
	err := fs.WalkDir(src, root, func(p string, de fs.DirEntry, err error) error {
		if err != nil || de.IsDir() {
			return err
		}
		raw, err := fs.ReadFile(src, p)
		if err != nil {
			return err
		}
		rel := strings.TrimSuffix(strings.TrimPrefix(p, root+"/"), ".tmpl")
		if strings.HasSuffix(p, ".tmpl") {
			tmpl, err := template.New(path.Base(p)).Option("missingkey=error").Parse(string(raw))
			if err != nil {
				return err
			}
			var buf bytes.Buffer
			if err := tmpl.Execute(&buf, d); err != nil {
				return err
			}
			raw = buf.Bytes()
		}
		out := filepath.Join(dest, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
			return err
		}
		return os.WriteFile(out, raw, 0o644)
	})
	if err != nil {
		t.Fatalf("render %s: %v", root, err)
	}
}

func read(t *testing.T, dir, rel string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("read %s: %v", rel, err)
	}
	return string(b)
}

func exists(dir, rel string) bool {
	_, err := os.Stat(filepath.Join(dir, filepath.FromSlash(rel)))
	return err == nil
}

// Every frontend renders with every database stack.
func TestRenderEveryStack(t *testing.T) {
	for _, fe := range frontends {
		for db := range databases {
			t.Run(fe+"/"+db, func(t *testing.T) {
				dir := t.TempDir()
				render(t, dir, fe, db)
				if !exists(dir, "go.mod") || !exists(dir, "web/package.json") {
					t.Fatal("go.mod or web/package.json not rendered")
				}
			})
		}
	}
}

// The v0.2.0 contract: auth owns user administration, Autopilot is not a default,
// and the pins and frontend tooling are the released ones.
func TestScaffoldContract(t *testing.T) {
	for _, fe := range frontends {
		t.Run(fe, func(t *testing.T) {
			dir := t.TempDir()
			render(t, dir, fe, "sqlite")

			if exists(dir, "internal/admin") {
				t.Error("internal/admin is rendered; user administration belongs to the auth plugin")
			}
			goMod := read(t, dir, "go.mod")
			for _, pin := range []string{"github.com/togo-framework/auth v0.10.0", "github.com/togo-framework/settings v0.1.2"} {
				if !strings.Contains(goMod, pin) {
					t.Errorf("go.mod does not pin %s", pin)
				}
			}
			if !strings.Contains(read(t, dir, "internal/plugins/plugins.gen.go"), `"github.com/togo-framework/auth"`) {
				t.Error("plugins.gen.go does not link the auth plugin")
			}

			// Docs may say how to install Autopilot; nothing may install or wire it.
			docs := map[string]bool{"CLAUDE.md": true, "README.md": true}
			walk(t, dir, func(rel, body string) {
				if strings.Contains(body, "/api/admin") || strings.Contains(body, "internal/admin") {
					t.Errorf("%s references the removed /api/admin surface", rel)
				}
				if !docs[rel] && strings.Contains(strings.ToLower(body), "autopilot") {
					t.Errorf("%s references Autopilot, which is not a default component", rel)
				}
			})

			pkg := read(t, dir, "web/package.json")
			if !strings.Contains(pkg, `"@fadymondy/nasaq": "^1.2.0"`) {
				t.Error(`web/package.json does not depend on "@fadymondy/nasaq": "^1.2.0"`)
			}
			if fe == "nextjs" {
				if !strings.Contains(pkg, `"lint": "eslint ."`) {
					t.Error(`web lint script is not "eslint ."`)
				}
				if !exists(dir, "web/eslint.config.mjs") || exists(dir, "web/.eslintrc.json") {
					t.Error("web must use the ESLint flat config (eslint.config.mjs) only")
				}
				if !exists(dir, "web/proxy.ts") || exists(dir, "web/middleware.ts") {
					t.Error("web must use proxy.ts (Next.js 16), not middleware.ts")
				}
			}
		})
	}
}

// Database drivers other than SQLite are plugins (db-postgres, db-mysql, …) that
// `togo new --db` blank-imports in internal/plugins, so every command that opens
// the database must load that package: cmd/api through internal/server, the
// others directly. Without it `togo migrate` fails with unknown driver "pgx".
func TestCommandsLoadPlugins(t *testing.T) {
	dir := t.TempDir()
	render(t, dir, "nextjs", "postgres")
	mains, err := filepath.Glob(filepath.Join(dir, "cmd", "*", "main.go"))
	if err != nil || len(mains) == 0 {
		t.Fatalf("no cmd/*/main.go rendered: %v", err)
	}
	for _, m := range mains {
		f, err := parser.ParseFile(token.NewFileSet(), m, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatal(err)
		}
		loads := false
		for _, imp := range f.Imports {
			switch strings.Trim(imp.Path.Value, `"`) {
			case "example.com/demo/internal/plugins", "example.com/demo/internal/server":
				loads = true
			}
		}
		if !loads {
			rel, _ := filepath.Rel(dir, m)
			t.Errorf("%s does not import internal/plugins, so the db driver plugin is not registered", filepath.ToSlash(rel))
		}
	}
}

func walk(t *testing.T, dir string, fn func(rel, body string)) {
	t.Helper()
	err := filepath.WalkDir(dir, func(p string, de fs.DirEntry, err error) error {
		if err != nil || de.IsDir() {
			return err
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(dir, p)
		fn(filepath.ToSlash(rel), string(b))
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

// plugin is one of the plugins `togo new` installs on top of the template
// (togo-framework/cli cmd/new.go: auth-dev, and dashboard for Next.js), pinned
// here to the releases this template is paired with instead of @latest.
type plugin struct {
	module, version string
	nextjsOnly      bool
}

var installs = []plugin{
	{module: "github.com/togo-framework/auth-dev", version: "v0.1.0"},
	{module: "github.com/togo-framework/dashboard", version: "v0.9.0", nextjsOnly: true},
}

// install does what `togo install` does for a plugin without a manifest: fetch
// the module, blank-import it in plugins.gen.go, and copy its web/ subtree into
// the project's web/. A file the template already has is a collision: togo
// install would keep the template's copy and silently drop the plugin's.
func install(t *testing.T, dir string, env []string, p plugin) {
	t.Helper()
	run(t, dir, env, "go", "get", p.module+"@"+p.version)

	gen := read(t, dir, "internal/plugins/plugins.gen.go")
	i := strings.LastIndex(gen, ")")
	if i < 0 {
		t.Fatal("plugins.gen.go has no import block")
	}
	gen = gen[:i] + "\t_ \"" + p.module + "\"\n" + gen[i:]
	if err := os.WriteFile(filepath.Join(dir, "internal", "plugins", "plugins.gen.go"), []byte(gen), 0o644); err != nil {
		t.Fatal(err)
	}

	web := filepath.Join(strings.TrimSpace(output(t, dir, env, "go", "list", "-m", "-f", "{{.Dir}}", p.module)), "web")
	if _, err := os.Stat(web); err != nil {
		return
	}
	err := filepath.WalkDir(web, func(src string, de fs.DirEntry, err error) error {
		if err != nil || de.IsDir() {
			return err
		}
		rel, err := filepath.Rel(web, src)
		if err != nil {
			return err
		}
		dest := filepath.Join(dir, "web", rel)
		if _, err := os.Stat(dest); err == nil {
			t.Errorf("%s web/%s collides with a template file", p.module, filepath.ToSlash(rel))
			return nil
		}
		b, err := os.ReadFile(src)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return err
		}
		return os.WriteFile(dest, b, 0o644)
	})
	if err != nil {
		t.Fatal(err)
	}
}

// TestScaffoldBuilds renders a real project per frontend, installs the plugins
// `togo new` adds, and builds it: Go (tidy, build, vet, test), the admin API at
// runtime (probeAdminAPI), and web (npm install, lint, typecheck, build). It
// needs the network, Go and Node, so it runs only with TOGO_SCAFFOLD_E2E=1 (CI
// sets it). The project builds outside any go.work (GOWORK=off) against
// released modules.
func TestScaffoldBuilds(t *testing.T) {
	if os.Getenv("TOGO_SCAFFOLD_E2E") != "1" {
		t.Skip("set TOGO_SCAFFOLD_E2E=1 to build rendered scaffolds")
	}
	for _, fe := range frontends {
		t.Run(fe, func(t *testing.T) {
			dir := t.TempDir()
			render(t, dir, fe, "sqlite")

			goEnv := append(os.Environ(), "GOWORK=off", "GOFLAGS=-mod=mod")
			for _, p := range installs {
				if !p.nextjsOnly || fe == "nextjs" {
					install(t, dir, goEnv, p)
				}
			}
			run(t, dir, goEnv, "go", "mod", "tidy")
			run(t, dir, goEnv, "go", "build", "./...")
			run(t, dir, goEnv, "go", "vet", "./...")
			run(t, dir, goEnv, "go", "test", "./...")
			probeAdminAPI(t, dir, goEnv, fe)

			web := filepath.Join(dir, "web")
			npm := "npm"
			if runtime.GOOS == "windows" {
				npm = "npm.cmd"
			}
			run(t, web, os.Environ(), npm, "install", "--no-audit", "--no-fund")
			if fe == "nextjs" {
				run(t, web, os.Environ(), npm, "run", "lint")
			}
			run(t, web, os.Environ(), npm, "run", "typecheck")
			run(t, web, os.Environ(), npm, "run", "build")
		})
	}
}

// seederSource stands in for a generated seeder registry: it writes a row into
// the probe table through the app's database handle, the way resource seeders do.
const seederSource = `package seeders

import (
	"context"

	"example.com/demo/internal/app"
)

func SeedAll(ctx context.Context, a *app.App) error {
	_, err := a.SQLDB.ExecContext(ctx, "INSERT INTO e2e_migrate_probe (id) VALUES (1)")
	return err
}
`

// checkSource proves both commands ran through the registered "pgx" driver: it
// loads the project's plugins (as cmd/migrate and cmd/seed must), finds the probe
// table the migration created and the row the seeder wrote, and drops the table
// so the next run starts clean.
const checkSource = `package main

import (
	"database/sql"
	"os"

	_ "example.com/demo/internal/plugins"
)

func main() {
	db, err := sql.Open("pgx", os.Args[1])
	if err != nil {
		panic(err)
	}
	var name sql.NullString
	if err := db.QueryRow("SELECT to_regclass('e2e_migrate_probe')::text").Scan(&name); err != nil {
		panic(err)
	}
	if !name.Valid {
		panic("migration did not create e2e_migrate_probe")
	}
	var rows int
	if err := db.QueryRow("SELECT count(*) FROM e2e_migrate_probe WHERE id = 1").Scan(&rows); err != nil {
		panic(err)
	}
	if rows != 1 {
		panic("seed did not write the probe row")
	}
	if _, err := db.Exec("DROP TABLE e2e_migrate_probe"); err != nil {
		panic(err)
	}
}
`

// TestScaffoldMigratePostgres renders a Postgres project the way `togo new --db
// postgres` does (db-postgres blank-imported in plugins.gen.go), runs its
// migrate and seed commands against the throwaway database in
// TOGO_SCAFFOLD_PG_URL (CI starts one as a service container), and checks the
// table the migration created and the row the seeder wrote.
func TestScaffoldMigratePostgres(t *testing.T) {
	url := os.Getenv("TOGO_SCAFFOLD_PG_URL")
	if url == "" {
		t.Skip("set TOGO_SCAFFOLD_PG_URL to a throwaway Postgres database")
	}
	dir := t.TempDir()
	render(t, dir, "nextjs", "postgres")
	goEnv := append(os.Environ(), "GOWORK=off", "GOFLAGS=-mod=mod")
	install(t, dir, goEnv, plugin{module: "github.com/togo-framework/db-postgres", version: "v0.1.0"})
	run(t, dir, goEnv, "go", "mod", "tidy")

	// The drop clears a probe table left by an earlier failed run against the same database.
	for name, stmt := range map[string]string{
		"0001_e2e_drop_probe.sql":   "DROP TABLE IF EXISTS e2e_migrate_probe;\n",
		"0002_e2e_create_probe.sql": "CREATE TABLE e2e_migrate_probe (id integer PRIMARY KEY);\n",
	} {
		if err := os.WriteFile(filepath.Join(dir, "internal", "db", "schema", name), []byte(stmt), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(dir, "internal", "db", "seeders", "registry.gen.go"), []byte(seederSource), 0o644); err != nil {
		t.Fatal(err)
	}
	dbEnv := append(goEnv, "DB_DRIVER=pgx", "DATABASE_URL="+url)
	if out := output(t, dir, dbEnv, "go", "run", "./cmd/migrate"); !strings.Contains(out, "migrate complete") {
		t.Errorf("migrate did not complete:\n%s", out)
	}
	// seed exits 0 even when the database is unavailable, so check what it logged.
	if out := output(t, dir, dbEnv, "go", "run", "./cmd/seed"); !strings.Contains(out, "seed complete") {
		t.Errorf("seed did not complete:\n%s", out)
	}

	check := filepath.Join(dir, "cmd", "e2e-check")
	if err := os.MkdirAll(check, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(check, "main.go"), []byte(checkSource), 0o644); err != nil {
		t.Fatal(err)
	}
	run(t, dir, goEnv, "go", "run", "./cmd/e2e-check", url)
}

// promoteSource grants the admin role straight in the database: auth has no API
// for the first administrator, and it re-reads roles from the database on every
// request, so this is what a seeder or an operator does.
const promoteSource = `package main

import (
	"database/sql"
	"os"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", os.Args[1])
	if err != nil {
		panic(err)
	}
	if _, err := db.Exec("UPDATE users SET roles = 'admin' WHERE email = ?", os.Args[2]); err != nil {
		panic(err)
	}
}
`

// probeAdminAPI boots the built API on SQLite and checks who owns the admin
// surface and how its sessions behave: auth owns /api/auth/admin/*, the legacy
// /api/admin/* is gone, the dashboard's mail API exists only with Next.js, admin
// writes need the admin's own cookie session plus CSRF, and an impersonation
// bearer never borrows the admin cookie's privileges.
func probeAdminAPI(t *testing.T, dir string, env []string, fe string) {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "api")
	if runtime.GOOS == "windows" {
		bin += ".exe"
	}
	run(t, dir, env, "go", "build", "-o", bin, "./cmd/api")

	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := l.Addr().String()
	l.Close()
	dsn := "file:" + filepath.ToSlash(filepath.Join(t.TempDir(), "probe.db")) + "?_pragma=foreign_keys(1)"

	var logs bytes.Buffer
	srv := exec.Command(bin)
	srv.Dir = dir
	srv.Env = append(env, "ADDR="+addr, "DB_DRIVER=sqlite", "DATABASE_URL="+dsn, "APP_ENV=development")
	srv.Stdout, srv.Stderr = &logs, &logs
	if err := srv.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = srv.Process.Kill()
		_ = srv.Wait()
		if t.Failed() {
			t.Logf("api log:\n%s", logs.String())
		}
	})

	base := "http://" + addr
	anon := &client{t: t, base: base, http: &http.Client{Timeout: 10 * time.Second}}
	deadline := time.Now().Add(90 * time.Second)
	for {
		if res, err := anon.http.Get(base + "/api/health"); err == nil {
			res.Body.Close()
			if res.StatusCode == http.StatusOK {
				break
			}
		}
		if time.Now().After(deadline) {
			t.Fatal("api did not become healthy")
		}
		time.Sleep(500 * time.Millisecond)
	}

	mail := http.StatusNotFound
	if fe == "nextjs" {
		mail = http.StatusUnauthorized
	}
	anon.expect("GET", "/api/auth/admin/users", nil, nil, http.StatusUnauthorized)
	anon.expect("GET", "/api/admin/users", nil, nil, http.StatusNotFound)
	anon.expect("GET", "/api/dashboard/admin/mail", nil, nil, mail)

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	admin := &client{t: t, base: base, http: &http.Client{Timeout: 10 * time.Second, Jar: jar}}
	admin.expect("POST", "/api/auth/dev/login", nil, nil, http.StatusOK)
	// auth-dev puts the admin role only in the token it issues; auth re-reads
	// roles from the database, so the developer login is an ordinary user.
	admin.expect("GET", "/api/auth/admin/users", nil, nil, http.StatusForbidden)

	promote := filepath.Join(dir, "cmd", "e2e-promote")
	if err := os.MkdirAll(promote, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(promote, "main.go"), []byte(promoteSource), 0o644); err != nil {
		t.Fatal(err)
	}
	run(t, dir, env, "go", "run", "./cmd/e2e-promote", dsn, "dev@togo.local")
	if err := os.RemoveAll(promote); err != nil {
		t.Fatal(err)
	}
	admin.expect("GET", "/api/auth/admin/users", nil, nil, http.StatusOK)

	var csrf struct {
		Token string `json:"csrf_token"`
	}
	admin.decode(admin.expect("GET", "/api/auth/csrf", nil, nil, http.StatusOK), &csrf)
	withCSRF := map[string]string{"X-CSRF-Token": csrf.Token}
	member := map[string]any{"email": "member@example.com"}
	admin.expect("POST", "/api/auth/admin/users", member, nil, http.StatusForbidden)
	var created struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	admin.decode(admin.expect("POST", "/api/auth/admin/users", member, withCSRF, http.StatusCreated), &created)
	if fe == "nextjs" {
		admin.expect("GET", "/api/dashboard/admin/mail", nil, nil, http.StatusOK)
	}

	var grant struct {
		Token string `json:"token"`
	}
	admin.decode(admin.expect("POST", "/api/auth/admin/users/"+created.User.ID+"/impersonate", nil, withCSRF, http.StatusOK), &grant)
	bearer := map[string]string{"Authorization": "Bearer " + grant.Token}

	// The bearer alone acts as the member and is refused admin access.
	var me struct {
		Email        string `json:"email"`
		Impersonator string `json:"impersonator"`
	}
	anon.decode(anon.expect("GET", "/api/auth/me", nil, bearer, http.StatusOK), &me)
	if me.Email != "member@example.com" || me.Impersonator == "" {
		t.Errorf("impersonation bearer resolves to %+v, want the member with an impersonator", me)
	}
	anon.expect("GET", "/api/auth/admin/users", nil, bearer, http.StatusForbidden)

	// Sent together with the admin's cookie session the bearer still wins, so
	// admin reads and writes are refused instead of falling back to the cookie.
	both := map[string]string{"Authorization": bearer["Authorization"], "X-CSRF-Token": csrf.Token}
	me.Email = ""
	admin.decode(admin.expect("GET", "/api/auth/me", nil, bearer, http.StatusOK), &me)
	if me.Email != "member@example.com" {
		t.Errorf("bearer with the admin cookie resolves to %q, want the member", me.Email)
	}
	admin.expect("GET", "/api/auth/admin/users", nil, bearer, http.StatusForbidden)
	admin.expect("POST", "/api/auth/admin/users", map[string]any{"email": "other@example.com"}, both, http.StatusForbidden)
	if fe == "nextjs" {
		admin.expect("GET", "/api/dashboard/admin/mail", nil, bearer, http.StatusForbidden)
	}
}

type client struct {
	t    *testing.T
	base string
	http *http.Client
}

// expect sends a JSON request and fails the test unless the status matches.
func (c *client) expect(method, path string, body any, header map[string]string, want int) []byte {
	c.t.Helper()
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			c.t.Fatal(err)
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, rd)
	if err != nil {
		c.t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range header {
		req.Header.Set(k, v)
	}
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	out, err := io.ReadAll(res.Body)
	if err != nil {
		c.t.Fatal(err)
	}
	if res.StatusCode != want {
		c.t.Errorf("%s %s = %d, want %d: %s", method, path, res.StatusCode, want, bytes.TrimSpace(out))
	}
	return out
}

func (c *client) decode(b []byte, v any) {
	c.t.Helper()
	if err := json.Unmarshal(b, v); err != nil {
		c.t.Fatalf("decode %s: %v", b, err)
	}
}

// failingSeederSource stands in for a generated seeder registry whose seeder
// returns an error.
const failingSeederSource = `package seeders

import (
	"context"
	"errors"

	"example.com/demo/internal/app"
)

func SeedAll(ctx context.Context, a *app.App) error {
	return errors.New("e2e seeder failure")
}
`

// TestScaffoldSeedExitStatus runs a Postgres project's seed command against
// TOGO_SCAFFOLD_PG_URL and checks its exit status, so `togo seed` in a script or
// CI step fails when nothing was seeded: non-zero when the database cannot be
// opened or a seeder fails, zero when seeding completes.
func TestScaffoldSeedExitStatus(t *testing.T) {
	url := os.Getenv("TOGO_SCAFFOLD_PG_URL")
	if url == "" {
		t.Skip("set TOGO_SCAFFOLD_PG_URL to a throwaway Postgres database")
	}
	dir := t.TempDir()
	render(t, dir, "nextjs", "postgres")
	goEnv := append(os.Environ(), "GOWORK=off", "GOFLAGS=-mod=mod")
	install(t, dir, goEnv, plugin{module: "github.com/togo-framework/db-postgres", version: "v0.1.0"})
	run(t, dir, goEnv, "go", "mod", "tidy")
	// Run a built binary so each case checks the command's exit status, not go run's.
	bin := filepath.Join(dir, "seed")
	if runtime.GOOS == "windows" {
		bin += ".exe"
	}
	original := read(t, dir, "internal/db/seeders/registry.gen.go")
	registry := filepath.Join(dir, "internal", "db", "seeders", "registry.gen.go")

	// Nothing listens on port 1, so connecting to it fails straight away.
	unreachable := "postgres://postgres:postgres@127.0.0.1:1/demo?sslmode=disable&connect_timeout=5"
	for _, tc := range []struct {
		name, driver, url, registry, log string
		ok                               bool
	}{
		{"driver not registered", "nosuchdriver", url, original, "seed: database unavailable", false},
		{"database unreachable", "pgx", unreachable, original, "seed: database unavailable", false},
		{"seeder fails", "pgx", url, failingSeederSource, "e2e seeder failure", false},
		{"seeding completes", "pgx", url, original, "seed complete", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := os.WriteFile(registry, []byte(tc.registry), 0o644); err != nil {
				t.Fatal(err)
			}
			run(t, dir, goEnv, "go", "build", "-o", bin, "./cmd/seed")
			cmd := exec.Command(bin)
			cmd.Dir = dir
			cmd.Env = append(goEnv, "DB_DRIVER="+tc.driver, "DATABASE_URL="+tc.url)
			out, err := cmd.CombinedOutput()
			if !strings.Contains(string(out), tc.log) {
				t.Errorf("seed output lacks %q:\n%s", tc.log, out)
			}
			if tc.ok && err != nil {
				t.Errorf("seed exited with %v, want success:\n%s", err, out)
			}
			if !tc.ok && err == nil {
				t.Errorf("seed exited 0, want a non-zero exit status:\n%s", out)
			}
		})
	}
}

func run(t *testing.T, dir string, env []string, name string, args ...string) {
	t.Helper()
	output(t, dir, env, name, args...)
}

func output(t *testing.T, dir string, env []string, name string, args ...string) string {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Env = env
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s %s: %v\n%s", name, strings.Join(args, " "), err, out)
	}
	return string(out)
}
