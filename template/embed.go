// Package template embeds the togo project skeleton rendered by `togo new`.
package template

import "embed"

// Backend + shared files live under "_project" (underscore prefix keeps the Go
// toolchain from compiling the embedded .go files during `go build ./...`).
//
//go:embed all:_project
var projectFS embed.FS

// Frontends live under "frontend/<name>" (nextjs | tanstack); the CLI renders
// the chosen one into the project's web/ dir. No .go files here, so no prefix needed.
//
//go:embed all:frontend
var frontendFS embed.FS

// Root is the directory prefix for the backend template tree.
const Root = "_project"

// FrontendRoot is the directory prefix for the frontend templates.
const FrontendRoot = "frontend"

// FS returns the embedded backend template tree (rooted at Root).
func FS() embed.FS { return projectFS }

// FrontendFS returns the embedded frontend templates (rooted at FrontendRoot).
func FrontendFS() embed.FS { return frontendFS }
