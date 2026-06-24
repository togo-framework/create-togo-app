# create-togo-app

The project template for [togo](https://github.com/togo-framework/togo),
rendered by `togo new <app>`. It is also a Go module that exports the template
as an `embed.FS` (consumed by the CLI) — and is designed to later back an
`npx create-togo-app` flow.

```go
import createtogoapp "github.com/togo-framework/create-togo-app/template"

fsys := createtogoapp.FS() // embedded project skeleton rooted at "project"
```

## What it scaffolds

A full togo app: chi + Huma (REST/OpenAPI) + gqlgen (GraphQL) + sqlc + Atlas +
pgx/Postgres backend, a Next.js (App Router) frontend, Supabase-ready `.env`,
`docker-compose`, a `.claude/` tree (skills/agents/rules) and a `.mcp.json`
wired to the togo MCP server.

Files ending in `.tmpl` are rendered with the app name and module path; all
other files are copied verbatim.

## Database stacks

`togo new` prompts for a database (or pass `--db`). The chosen driver + DSN are
wired into `togo.yaml`, `.env.example`, `go.mod`, and `internal/app` so the DB
works from day 0; docker-backed stacks get a `docker-compose.yml` you can bring up
with `togo db:up` (`togo db:down` to stop).

| `--db` | Driver | Compose |
| --- | --- | --- |
| `sqlite` *(default)* | `sqlite` (modernc) | none — embedded file |
| `postgres` | `pgx` | `postgres:16` |
| `togo-postgres` | `pgx` | **batteries-included Supabase build** — see below |
| `supabase` | `pgx` | `supabase/postgres` (run `supabase start` for the full stack) |
| `mysql` | `mysql` | `mysql:8` |
| `mongodb` | app-level `*mongo.Client` (see `internal/app/mongo.go`) | `mongo:7` |

**togo-postgres** bundles the [architecture](https://github.com/togo-framework/togo)
stack. Real, running services in the compose: **ParadeDB** (`paradedb/paradedb` →
pg_search + pgvector + pg_analytics/duckdb) and **NATS JetStream** (MQ). In-app Go
libraries (not containers): **River** (jobs) and **Atlas** (migrations). Commented
placeholders to enable + configure: **GoTrue** (auth) and **Storage**; `pg_cron` /
`pg_partman` require an image that ships them. The SQL ORM (sqlc/Atlas/`make:resource`)
targets Postgres/MySQL/SQLite — MongoDB is wired as a separate client, not the ORM backend.

## License

MIT
