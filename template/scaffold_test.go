package template

import (
	"bytes"
	"io/fs"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"text/template"
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

// TestScaffoldBuilds renders a real project per frontend and builds it: Go
// (tidy, build, vet) and web (npm install, lint, typecheck, build). It needs the
// network, Go and Node, so it runs only with TOGO_SCAFFOLD_E2E=1 (CI sets it).
// The project builds outside any go.work (GOWORK=off) against released modules.
func TestScaffoldBuilds(t *testing.T) {
	if os.Getenv("TOGO_SCAFFOLD_E2E") != "1" {
		t.Skip("set TOGO_SCAFFOLD_E2E=1 to build rendered scaffolds")
	}
	for _, fe := range frontends {
		t.Run(fe, func(t *testing.T) {
			dir := t.TempDir()
			render(t, dir, fe, "sqlite")

			goEnv := append(os.Environ(), "GOWORK=off", "GOFLAGS=-mod=mod")
			run(t, dir, goEnv, "go", "mod", "tidy")
			run(t, dir, goEnv, "go", "build", "./...")
			run(t, dir, goEnv, "go", "vet", "./...")

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

func run(t *testing.T, dir string, env []string, name string, args ...string) {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Env = env
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s %s: %v\n%s", name, strings.Join(args, " "), err, out)
	}
}
