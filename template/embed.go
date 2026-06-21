// Package template embeds the togo project skeleton rendered by `togo new`
// (and, in the future, `npx create-togo-app`).
package template

import "embed"

// The template tree lives under "_project" so the Go toolchain skips it during
// `go build ./...` (it would otherwise try to compile the embedded .go files),
// while `all:` still embeds the underscore-prefixed directory.
//
//go:embed all:_project
var fs embed.FS

// Root is the directory prefix inside the embedded FS.
const Root = "_project"

// FS returns the embedded project template tree rooted at Root.
func FS() embed.FS { return fs }
