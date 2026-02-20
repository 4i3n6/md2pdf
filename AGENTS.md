# AGENTS.md

## Identity and authorship

Each contributor commits with their own identity. There is no project-wide enforced name/email.

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

## Release workflow

Versioning and GitHub Releases are fully automated via [release-please](https://github.com/googleapis/release-please).

**How it works:**
1. Push conventional commits to `main`
2. release-please opens (or updates) a Release PR with a generated CHANGELOG entry and a version bump in `package.json` and all extra-files
3. Merge the PR — a GitHub Release is created automatically and tagged

**Version bump rules:**
- `fix:`, `perf:`, `refactor:`, `docs:` → patch (`1.1.x`)
- `feat:` → minor (`1.x.0`)
- `BREAKING CHANGE:` in commit body → major (`x.0.0`)

**Do NOT manually bump versions** in `package.json`, HTML files, `content.json`, or `i18n/*.ts`. release-please manages all version strings across the repository. Manual bumps cause conflicts and break the automated release pipeline.

**Manual sync (edge cases only):**
```bash
node scripts/bump-version.mjs sync   # propagate current package.json version to all files
```

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

## Security

- All user-generated HTML must be sanitized (DOMPurify in the browser, equivalent in Node.js)
- Never set Mermaid `securityLevel` to `'loose'` — use `'strict'` or `'sandbox'`
- No raw HTML injection into browser contexts (Puppeteer, iframes) without prior sanitization
- No credentials, tokens, or secrets in code or documentation
- Sensitive data in logs must be truncated/masked (e.g., `222***222`)

## Rules

- Functions: max 30 lines, single responsibility
- No new dependencies without explicit justification
- `saveDocs()` after every critical document mutation
- No PT-BR in source code, comments, or documentation outside `/pt/`

## Contributing (Pull Requests)

External contributions are welcome. To keep PRs mergeable:

1. **Do not bump versions.** release-please handles all version strings. PRs that touch `package.json` version, HTML version spans, `content.json`, or `i18n/*.ts` version fields will be rejected.
2. **Do not add AI config files.** `CLAUDE.md`, `.cursorrules`, `.cursorignore`, and similar are gitignored. Use them locally but do not commit them. `AGENTS.md` is the single source of truth for project conventions.
3. **Justify new dependencies.** Open an issue or explain in the PR body why the dependency is necessary and whether it belongs in `dependencies` (required at runtime by the published package) or `devDependencies` (build tools, test frameworks, bundled code).
4. **Prefer shared code over duplication.** If logic already exists in `src/processors/` or `src/utils/`, extract a platform-agnostic module instead of reimplementing it.
5. **Run checks before opening.** `npm run typecheck` and `npm test` must both pass. PRs with type errors or failing tests will not be reviewed.
6. **Follow the commit format.** Conventional commits in English. The commit-msg hook rejects non-conforming messages.
7. **One logical change per PR.** Avoid mixing unrelated changes (e.g., a new feature + a CI config change + a Node.js version bump). Split them into separate PRs.
