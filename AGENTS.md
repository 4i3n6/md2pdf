# AGENTS.md

## Identity and authorship

All commits to this repository must use the following identity:

```
name:  4i3n6
email: 4i3n6@pm.me
```

This is enforced by `.githooks/pre-commit`. If your local git identity differs, fix it:

```bash
git config user.name "4i3n6"
git config user.email "4i3n6@pm.me"
```

The `.githooks/` directory is committed to the repo. To activate hooks after cloning:

```bash
git config core.hooksPath .githooks
```

## Language policy

**Everything in this repository is written in English (EN-US).**

- Source code: identifiers, comments, string literals — EN-US
- Documentation: all `.md` files — EN-US
- Commit messages — EN-US (enforced by `.githooks/commit-msg`)
- Exception: the `/pt/` directory contains user-facing translated UI (PT-BR) — do not touch unless explicitly working on a translation

## Commit format

Conventional commits, in English:

```
type(scope): short description in EN-US

Optional body.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `build`, `style`, `perf`

The commit-msg hook rejects PT-BR verbs in the description.

## Commands

```bash
npm run dev          # dev server on port 3000 (auto-opens browser)
npm run build        # production build to ./dist
npm run preview      # preview production build
npm run typecheck    # tsc --noEmit (must pass before every commit)
npm run smoke        # smoke test (requires build)
npm run visual:test  # Playwright render/print fidelity suite
```

Build must exit with code 0. No typecheck errors tolerated.

## Code conventions

### Imports

ES6 modules (`import`/`export`). Order: external dependencies -> local modules -> CSS.

### Naming

- Variables and functions: `camelCase` (e.g., `initSystem`, `getCurrentDoc`)
- Classes and objects: `PascalCase` (e.g., `Logger`, `DocumentManager`)
- Indentation: 4 spaces

### TypeScript

Strict mode throughout. All source files are `.ts`. No `any`, no `@ts-ignore` without documented justification. Typecheck must pass before committing.

### Error handling

Use the global `Logger` object:

- `Logger.error()` — errors
- `Logger.success()` — success
- `Logger.log()` — info

No `console.log` in production code (stripped by Terser at build time).

Critical destructive actions use `modalService.confirm()` — not native `confirm()`.

### Architecture

- State: single global `state` object
- DOM access: `document.getElementById()`
- Events: `addEventListener`
- Rendering: pure functions (`renderList()`, `renderPreview()`) with no unnecessary side effects
- Persistence: `localStorage` under key `md2pdf-docs-v3`

### Build

- Minification: Terser with `drop_console: true` and `drop_debugger: true`
- Code splitting: automatic for `codemirror`, `marked`
- PWA: Vite PWA plugin with service worker auto-update
- Chunk size warning threshold: 1000 KB

## Rules

- Functions: max 30 lines, single responsibility
- No new dependencies without explicit justification
- `saveDocs()` after every critical document mutation
- No PT-BR in source code, comments, or documentation outside `/pt/`
