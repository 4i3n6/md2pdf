# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

New releases are prepended automatically by [release-please](https://github.com/googleapis/release-please).

---

## [Unreleased]

---

## [1.1.70] — 2026-02-20

This release completes the repository migration and establishes the automated release infrastructure. The project moved to its permanent home at `github.com/4i3n6/md2pdf` with full commit history preserved and all 172 commits rewritten to reflect the sole author identity. Git hooks in `.githooks/` now enforce this identity on every commit and reject non-English commit messages. The `bump-version.mjs` script received a targeted fix: it was incorrectly replacing every version header in `CHANGELOG.md` with the current version on each patch bump, clobbering historical entries. The version bump mechanism was replaced entirely by release-please, which handles semantic versioning, changelog generation, and GitHub Release creation automatically based on conventional commit messages.

### Added
- `.githooks/commit-msg` rejecting non-English verb patterns in commit subjects
- `release-please-config.json` with extra-files for all version-bearing HTML, TS, and JSON files
- `.release-please-manifest.json` anchoring the release baseline at v1.1.70
- `.github/workflows/release-please.yml` for fully automated release management

### Fixed
- `bump-version.mjs` clobbering historical CHANGELOG version headers on every patch bump
- Three remaining PT-BR commit messages translated to EN-US

### Changed
- Pre-commit hook simplified to author identity check only — version bumping delegated to release-please
- `bump-version.mjs` retained as a manual sync tool (`node scripts/bump-version.mjs sync`)

---

## [1.1.67] — 2026-02-18

Dual focus: a major internal quality sprint spanning early February, followed by a public release preparation pass.

The first phase decomposed the monolithic `main.ts` into focused service modules — preview, print workflow, keyboard navigation, quick tags, document I/O, save status, and the resizable splitter — each with single responsibility and a clear interface boundary. The print pipeline was redesigned into discrete validate → report → print stages, enabling pre-flight checks against the live preview DOM before triggering `window.print()`. A Playwright visual regression suite was introduced to assert rendering fidelity between the screen preview and print output, including table alignment and heading spacing. Performance work reduced redundant preview renders through deduplication and HTML reuse. The logging system was capped to prevent console buffer overflow under high-frequency edits. Crypto address strings in table cells are now automatically truncated to prevent layout overflow in PDF output.

The second phase prepared the project for open-source distribution. MIT license, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` were added. A GitHub Actions CI pipeline validates every push with typecheck, unit tests, and a production build. Unit tests for `DocumentManager` using Vitest and JSDOM were introduced, covering the core document lifecycle — create, update, delete, and schema migration. The native browser `confirm()` dialog was replaced with a custom accessible modal service supporting danger, warning, and info variants with full keyboard control. The CodeMirror theme was extracted to `src/editorTheme.ts` as a standalone module, decoupling color customization from editor initialization. TypeScript strict mode violations were resolved by disambiguating duplicate `ValidationResult` type names across modules, and Markdown validation was improved to correctly ignore image URL patterns.

### Added
- Playwright visual regression suite asserting render/print fidelity across table alignment and heading spacing
- Crypto address truncation in table cells to prevent PDF layout overflow
- MIT license, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- GitHub Actions CI workflow (typecheck, Vitest, build)
- Unit tests for `DocumentManager` covering document lifecycle and schema migration
- Custom modal service replacing native `confirm()`, with accessible dialog and keyboard handling
- `src/editorTheme.ts` extracted as a reusable CodeMirror extension

### Changed
- Decomposed `main.ts` into independent service modules: preview, print, keyboard, quick tags, I/O, save status, splitter
- Print pipeline staged into validate → report → print phases
- Unified preview post-processing and print validation into a shared pipeline
- CodeMirror language extension and fence alias mapping centralized

### Fixed
- Duplicate `ValidationResult` type names causing TypeScript errors
- Markdown validator incorrectly flagging image URL patterns as errors
- Table alignment preservation between preview and print
- URL display after links removed from print output for WYSIWYG parity
- Duplicate preview render requests under rapid editing

---

## [1.1.25] — 2026-01-24

A focused print fidelity release addressing font encoding and visual consistency between the editor preview and the exported PDF.

Liberation Mono replaced Courier New as the monospace font for code blocks in PDF output. Courier New has poor Unicode coverage and drops or misrenders accented characters and many non-Latin glyphs. Liberation Mono shares the same metrics, is metrically compatible with Courier New, and provides reliable rendering across character sets. A font size selector was added for both the preview and PDF export — the range 6pt to 12pt covers everything from dense financial tables to readable document prose — and the selected size is persisted per document rather than globally. The table layout engine was corrected to match between screen preview and print, resolving alignment inconsistencies that appeared when exporting tables with mixed-width columns. URL display after hyperlinks was removed from print output to achieve true WYSIWYG parity: what you see in the editor preview is exactly what gets printed.

### Added
- Font size selector (6pt–12pt) for preview and PDF export, persisted per document

### Fixed
- Replace Courier New with Liberation Mono for correct Unicode and accented character rendering in PDF output
- Table column alignment mismatch between screen preview and print output
- URL display after links removed from print for WYSIWYG parity

---

## [1.1.21] — 2025-12-28

Immediate patch following v1.1.20.

Two regressions were caught post-release. The service worker was registering in development mode, causing stale cache hits that prevented hot reload from working and made iterating on the app extremely frustrating. The registration guard was tightened to check for the production environment before activating the worker. A CSS specificity conflict was discovered: an `!important` declaration on the base code text color rule was winning over highlight.js token classes, effectively disabling all language-specific syntax coloring — SQL keywords, string literals, and comments were rendering as plain text. Removing the `!important` resolved the specificity chain and restored full syntax coloring.

### Fixed
- Service worker disabled in development mode to prevent stale cache interference with hot reload
- CSS specificity conflict where `!important` on base code color overrode highlight.js token classes, breaking all syntax coloring

---

## [1.1.20] — 2025-12-28

This release substantially expanded the editor's language and diagram capabilities and introduced the first enterprise-grade structural features.

SQL and DDL syntax highlighting was added using highlight.js's SQL grammar, with dedicated quick-tag buttons for common SQL constructs and print-safe code block styles that prevent long queries from overflowing the page. A YAML processor was built using `js-yaml`, providing structured HTML rendering of both YAML frontmatter and fenced YAML code blocks, loaded lazily to avoid impacting parse time for documents with no YAML. Mermaid diagram print support was completely overhauled: wide diagrams now automatically detect when they exceed the page width and rotate to landscape orientation; page breaks are managed per diagram to prevent splits mid-figure; and label positioning was corrected for class, state, and entity-relationship diagrams which were previously rendering labels at incorrect coordinates after scaling.

A resizable splitter was implemented between the editor and preview panels. The divider can be dragged to any ratio, double-clicked to reset to 50/50, and its position is persisted to localStorage. File extension auto-detection was added for drag-and-drop: dropping a `.sql`, `.yaml`, `.py`, or other recognized file now wraps the content in the correct fenced code block automatically. A Markdown download button was added to the sidebar for direct export without going through the print dialog.

### Added
- SQL and DDL syntax highlighting with quick-tag buttons and print-safe code block styles
- YAML processor using `js-yaml` with structured rendering and lazy loading
- YAML and Mermaid quick-tag buttons in the editor toolbar
- Resizable splitter between editor and preview panels, with localStorage persistence and double-click reset
- File extension auto-detection on drag-and-drop for automatic code fence wrapping
- Markdown download button in the sidebar

### Fixed
- Mermaid print layout: landscape rotation for wide diagrams, per-diagram page breaks
- Mermaid label positioning for class, state, and ER diagrams
- Sidebar overflow that was breaking editor scroll behavior

---

## [1.1.10] — 2025-12-08

This release added Mermaid diagram support, a bilingual interface, a comprehensive manual, and explicit page break control — completing the document production feature set for the 1.1 line.

Mermaid was integrated with lazy loading so the library is only fetched when the editor detects a `mermaid` code fence. Flowcharts, sequence diagrams, Gantt charts, entity-relationship diagrams, and pie charts all render inline in the live preview. Print styling was included from the start to ensure diagram output matches the preview without additional configuration. A bilingual interface was implemented in full — every UI string is translated in both English and Portuguese, with language detection based on the URL path (`/` for EN-US, `/pt/` for PT-BR). The manual was expanded to 14 pages per language with sections covering the full keyboard reference, syntax guide, print configuration, and diagram authoring. Explicit page breaks were added via `<!-- pagebreak -->` syntax, with a subtle visual indicator in the preview showing where the page will break in print.

### Added
- Mermaid diagram support (flowcharts, sequence, Gantt, ER, pie) with lazy loading and print styling
- Bilingual interface: English (`/`) and Portuguese (`/pt/`) with full i18n coverage
- Bilingual manual: 14 pages per language covering keyboard shortcuts, syntax, and diagrams
- Explicit page break syntax (`<!-- pagebreak -->`) with visual preview indicator
- Desktop-only overlay blocking mobile access with a clear message
- Automatic version bump script propagating version across all HTML, TS, and JSON files on commit

### Fixed
- Print font inheritance from the user's preview selection
- Print stylesheet consolidated to a single source of truth

---

## [1.1.0] — 2025-12-07

A comprehensive engineering pass covering the entire codebase: TypeScript migration, PWA implementation, real-time validation, accessibility, and editor extensibility.

The entire codebase was migrated from JavaScript to TypeScript with strict mode enabled. All `any` types were eliminated and a `Window` interface extension was defined for the global `Logger`. `DocumentManager` was extracted as a dedicated service — all document state, persistence, and migration logic was moved out of `main.ts` into a testable, single-responsibility class. A debounce utility was introduced and applied to preview rendering to eliminate redundant re-renders on rapid keystroke sequences. The PWA implementation was completed: a service worker with offline-first caching, installation support, and an update notification UI that prompts users to reload when a new version is deployed.

Real-time Markdown validation was implemented using CodeMirror 6's decoration API, surfacing syntax errors as inline squiggles directly in the editor. WCAG 2.1 AA accessibility compliance was added through semantic HTML, comprehensive ARIA labels, and full keyboard navigation across all interactive controls. The editor gained a font family selector, text alignment controls, a problems panel listing all current validation errors, and a quick-tag toolbar with buttons for headings, bold, italic, code, links, and tables. A unified storage manager was introduced with a provider pattern, initially backed by localStorage, designed to support additional backends without changes to the consumer code.

### Added
- Full TypeScript migration with strict mode — zero `any` types, `Window` interface extension for `Logger`
- `DocumentManager` service extracted from `main.ts` for isolated document lifecycle management
- Debounce utility applied to preview rendering (300ms delay)
- PWA: offline-first service worker, installation prompt, update notification UI
- Real-time Markdown validation with CodeMirror 6 decoration squiggles
- WCAG 2.1 AA compliance: semantic HTML, ARIA labels, full keyboard navigation
- Font family selector, text alignment controls, problems panel, quick-tag toolbar
- Unified storage manager with provider pattern backed by localStorage

### Fixed
- `PrintRenderer` converted to class extending `marked.Renderer` for correct token handling
- `parser.parseInline()` used for inline token rendering instead of raw string manipulation
- Double sanitization in the Markdown rendering pipeline removed
- Blank screen after the PDF generation dialog was closed

---

## [1.0.0] — 2025-12-02

Initial release of md2pdf: a client-side Markdown editor built around a print-first philosophy.

The core architecture was established in this release: a CodeMirror 6 editor with split-pane live preview, document persistence in localStorage, and PDF export through the browser's native print dialog. No servers, no accounts, no data leaving the user's machine. The print output was the primary design constraint — the stylesheet was authored independently from the screen preview to give precise control over A4 layout: configurable margins, font size, page break control, and removal of visual artifacts that appear on screen but should not appear in print. highlight.js was integrated for syntax highlighting across 30+ languages. A Markdown download button provides a quick export path without going through the print dialog. The service worker was scoped to production only to prevent development cache interference.

### Added
- CodeMirror 6 editor with split-pane live preview
- localStorage document persistence with multi-document workspace management
- PDF export via `window.print()` with a dedicated A4 print stylesheet
- highlight.js syntax highlighting across 30+ languages
- Markdown download button in the sidebar
- PWA service worker (production only)
- Landing page, bilingual manual, SEO sitemap, and robots.txt

### Fixed
- Page break control for long lists and paragraphs preventing mid-element splits
- Print margins and removal of visual artifacts in PDF output
- Content visibility in print by correcting `display:none` on the app layout grid
