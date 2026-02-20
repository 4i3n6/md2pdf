# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MD2PDF is a browser-based, offline-first Markdown-to-PDF converter with bilingual UI (EN/PT-BR). Built with TypeScript (strict), Vite, CodeMirror 6, marked.js, Mermaid, and highlight.js. All processing happens client-side with localStorage persistence — no server.

## Commands

```bash
npm run dev              # Dev server at http://localhost:3000/app
npm run build            # Production build to ./dist
npm run typecheck        # tsc --noEmit — MUST pass before every commit
npm test                 # Vitest unit tests (single run)
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Unit tests with v8 coverage
npm run visual:test      # Playwright visual regression tests
npm run smoke            # Smoke test production build
npm run preview          # Preview production build locally
```

## Architecture

**Single-page app** with two entry points: `index.html` (landing) and `app.html` (main SPA).

### Source Layout (`src/`)

- **`main.ts`** — Entry point. Global `state: AppState` object (`{ docs, currentId, editor }`), system init, document CRUD, rendering orchestration.
- **`types/index.ts`** — All TypeScript interfaces (AppState, Document, LoggerInterface, etc.)
- **`constants.ts`** — A4 print limits, storage keys, layout breakpoints, save config
- **`processors/`** — Pure business logic: markdown parsing (marked + DOMPurify), Mermaid diagrams, YAML frontmatter, image dimensions, markdown validation
- **`services/`** — 18 focused modules: documentManager, previewService, printWorkflowService, saveStatusService, markdownDiagnosticsService, splitterService, modalService, quickTagsService, keyboardNavigationService, etc.
- **`utils/`** — Helpers: debounce, storage wrapper, logger, image cache, offline manager, pipeline composition
- **`i18n/`** — Translation system. `t('key.path')` API. Language detected from URL path (`/pt/` → PT-BR, else EN).

### Key Patterns

- **State**: Single global `state` object, manual render calls, no framework
- **DOM**: `document.getElementById()` + `addEventListener`
- **Rendering**: Pure functions (`renderList()`, `renderPreview()`)
- **Persistence**: `localStorage` key `md2pdf-docs-v3` via `DocumentManager` singleton
- **Logging**: Global `Logger` object (error/success/log) — never use `console.log` (stripped by Terser)
- **Destructive actions**: Always use `modalService.confirm()`, never native `confirm()`
- **Services**: Factory/singleton patterns with dependency injection

### Rendering Pipeline

```
Editor change (debounced 300ms)
  → markdownPreprocessService (pagebreaks)
  → markdownProcessor (marked + DOMPurify sanitization)
  → previewService.requestRender() (queue-based)
  → DOM insertion + Mermaid lazy-load + image dimension cache
```

### Build

- **Code splitting**: codemirror, marked, mermaid, highlight, dompurify, yaml chunks
- **Minification**: Terser with `drop_console: true`, `drop_debugger: true`
- **PWA**: vite-plugin-pwa with generateSW strategy, auto-update
- **Bilingual**: EN (default) + PT-BR under `/pt/`, each with 14 manual pages

### Path Aliases (tsconfig + vite)

- `@/*` → `src/*`
- `@processors/*` → `src/processors/*`
- `@utils/*` → `src/utils/*`

## Conventions

- **Language**: Everything in English (EN-US) — code, comments, commits, docs. Exception: `/pt/` directory for PT-BR translations only.
- **Commits**: Conventional commits in English. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `build`, `style`, `perf`. Enforced by `.githooks/commit-msg`.
- **TypeScript**: Strict mode, no `any`, no `@ts-ignore` without justification. `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` all enabled.
- **Functions**: Max 30 lines, single responsibility.
- **Imports**: ES6 modules. Order: external → local → CSS.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes. 4-space indentation.
- **No new dependencies** without explicit justification.
- **`saveDocs()`** must be called after every critical document mutation.

## Testing

- **Unit tests** (Vitest, jsdom): Files in `src/**/*.test.ts`. Coverage excludes `main.ts`, `pwaRegister.ts`, and `.d.ts` files.
- **Visual tests** (Playwright, Chromium 1600x1200): Files in `tests/visual/`. Sequential, 2 retries in CI.
- **Smoke test**: Validates production build integrity.

## Release

Automated via release-please. Push conventional commits to `main` → release-please opens a Release PR with CHANGELOG and version bumps across package.json and 10+ HTML/i18n files. Manual version sync: `node scripts/bump-version.mjs sync`.

## Git Identity

Commits must use identity `4i3n6 <4i3n6@pm.me>` (enforced by `.githooks/pre-commit`). Hooks activated via `git config core.hooksPath .githooks` (auto-configured on `npm install`).
