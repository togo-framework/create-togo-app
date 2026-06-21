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

## License

MIT
