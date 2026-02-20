# Changelog

All notable changes to this project will be documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — v1.1.68

This release focuses on open-source readiness and test coverage. The project now ships with a full governance structure — MIT license, contribution guidelines, code of conduct, and a security policy. A GitHub Actions CI pipeline validates builds on every push. Unit tests for the `DocumentManager` service were introduced using Vitest with JSDOM, covering the core document lifecycle (create, update, delete, migrate). The native browser `confirm()` dialog was replaced with a custom accessible modal service supporting danger, warning, and info variants with full keyboard control. The CodeMirror editor theme was extracted into a standalone `src/editorTheme.ts` module, making color customization independent from initialization logic. TypeScript strict mode violations were resolved by disambiguating duplicate `ValidationResult` type names across modules, and Markdown validation was improved to correctly ignore image URL patterns.

### Added
- MIT license, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`
- GitHub Actions CI workflow for automated build and type checks
- Unit tests for `DocumentManager` using Vitest and JSDOM
- Custom modal service replacing native `confirm()`, with accessible dialog and keyboard handling
- Extracted `src/editorTheme.ts` as a reusable CodeMirror extension

### Fixed
- Duplicate `ValidationResult` type names causing TypeScript errors across modules
- Markdown validator incorrectly flagging image URL patterns as errors
- Version bump loop when committing version files
- Automated version propagation to manual pages and site footer

---

## [1.1.67] — 2026-02-18

This release was a major internal quality sprint spanning several weeks. The codebase was decomposed from a monolithic `main.ts` into a set of focused service modules — preview, print workflow, keyboard navigation, quick tags, document I/O, save status, and the resizable splitter — each with a single responsibility and clear interface. The print pipeline was redesigned into discrete validate → report → print stages, enabling accurate pre-flight checks against the live preview DOM before triggering `window.print()`. A Playwright visual regression suite was added to assert rendering fidelity between screen preview and print output, including table alignment and heading spacing. Performance improvements reduced redundant preview renders through deduplication and HTML reuse. The logging system was capped to prevent console buffer overflow under heavy use. Crypto address strings in table cells are now automatically truncated to prevent layout overflow in PDF output.

### Added
- Playwright visual regression suite asserting render/print fidelity
- Font size selector (6pt–12pt) for preview and PDF export, persisted per document
- Default Open Sans 8pt render output with 10mm A4 margins
- Crypto address truncation in table cells

### Changed
- Decomposed `main.ts` into independent service modules (preview, print, keyboard, quick tags, I/O, save status, splitter)
- Unified preview post-processing and print validation into a shared pipeline
- Centralized CodeMirror language extension and fence alias mapping

### Fixed
- Table alignment preservation between preview and print
- URL display after links removed from print output (WYSIWYG parity)
- Table layout consistency between preview and print modes
- Mermaid markdown parsing stability
- Duplicate preview render requests

---

## [1.1.21] — 2025-12-28

Immediate patch release following v1.1.20. Fixed the service worker registration that was incorrectly active in development mode, causing stale cache issues during iteration. Resolved a CSS specificity conflict where `!important` on the base code color rule was overriding highlight.js token classes, breaking SQL and other language syntax highlighting.

### Fixed
- Service worker disabled in development mode to prevent cache interference
- CSS specificity conflict blocking highlight.js syntax colors in code blocks

---

## [1.1.20] — 2025-12-28

This release introduced a substantial expansion of the editor's language and diagram capabilities, along with the first enterprise-grade structural improvements. SQL and DDL syntax highlighting was added with dedicated quick-tag buttons and print-safe code block styles. A YAML processor was built using `js-yaml`, providing structured HTML rendering of YAML frontmatter and code blocks with lazy loading. Mermaid diagram support received a full print styling overhaul — wide diagrams automatically rotate to landscape, page breaks are managed per diagram, and label positioning was corrected for class, state, and ER diagrams. A resizable splitter between the editor and preview panels was implemented with drag, double-click reset, and localStorage persistence. File extension auto-detection wraps non-Markdown files in the appropriate code block on drop. The sidebar gained a direct Markdown download button.

### Added
- SQL and DDL syntax highlighting with quick-tag buttons
- YAML processor with structured rendering via `js-yaml` (lazy loaded)
- YAML and Mermaid quick-tag buttons in the editor toolbar
- Resizable splitter between editor and preview, with localStorage persistence
- File extension auto-detection for syntax highlighting on drag-and-drop
- MD download button in the sidebar

### Fixed
- Mermaid print layout — landscape rotation for wide diagrams, per-diagram page breaks
- Mermaid label position for class, state, and ER diagrams
- Sidebar overflow breaking editor scroll
- YAML frontmatter conflict with horizontal rule (`---`) syntax
