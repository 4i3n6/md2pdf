# Roadmap

This document tracks the future direction of MD2PDF. It reflects the current state of the project (v1.1.70) and what comes next.

## Already shipped

The following capabilities are fully implemented and stable:

**Editor**
- CodeMirror 6 with live syntax highlighting in 16 languages
- Real-time Markdown validation with inline decorations and auto-fix
- Quick-tag toolbar for headings, bold, italic, code blocks, tables, SQL, YAML, Mermaid, page breaks
- Resizable split pane with persisted position
- Drag and drop of `.md`, `.sql`, `.yaml`, and other text files

**Documents**
- Multi-document workspace with full keyboard navigation
- Import `.md` files from disk; export as `.md` without triggering print
- Full workspace backup and restore (JSON)
- localStorage persistence under `md2pdf-docs-v3`

**Rendering**
- GitHub Flavored Markdown via marked.js
- Syntax highlighting in preview via highlight.js (30+ languages)
- Mermaid diagrams (all types) with lazy loading
- YAML rendering via js-yaml with lazy loading
- Page breaks via `<!-- pagebreak -->` with visual indicator

**Print and PDF**
- Dedicated A4 stylesheet independent from screen styles
- Liberation Mono for code blocks in print
- Per-document font size control (6pt–12pt), persisted
- Wide Mermaid diagrams auto-rotated to landscape in print
- Pre-flight validation before triggering the print dialog
- WYSIWYG parity between preview and print output

**Infrastructure**
- Offline-first service worker (PWA)
- Desktop and home screen installable
- WCAG 2.1 AA accessibility
- Bilingual UI (English / Portuguese)
- CI via GitHub Actions (typecheck, build, Playwright)
- Fully automated release pipeline via release-please

---

## Planned

### High priority

**Line numbers in code blocks**
Code blocks in the preview show no line numbers. Useful for longer snippets and SQL queries. Implementation: highlight.js line numbers plugin, CSS counter fallback.

**Copy button on code blocks**
Single-click to copy block content. Client-side only — no server involved.

**Dark editor theme**
Add a One Dark or similar dark theme to the CodeMirror editor. The current theme is GitHub Light. Requires a theme toggle in the toolbar and a localStorage preference.

**Export to HTML**
Export the rendered preview as a self-contained `.html` file with inlined CSS and highlighted code. No dependency on the print dialog.

---

### Medium priority

**Document version history**
Track a rolling buffer of the last N saves per document in localStorage. Allow reverting to a previous snapshot from a document-level history panel.

**KaTeX math rendering**
Render `$...$` and `$$...$$` blocks as typeset math. Lazy-load KaTeX to avoid bundle impact.

**Virtual scrolling for document list**
The current list renders all documents in the DOM. Virtualize for workspaces with hundreds of documents.

**Spanish UI translation**
Add `es/` alongside the existing `en/` and `pt/` UI translations.

---

### Low priority

**Custom theme editor**
Allow users to edit CSS custom properties (accent color, font family, background) directly in the UI, with export and import of theme presets.

**Document templates**
Pre-defined document starters (meeting notes, technical spec, blog post). Selectable from the new document dialog.

**Batch PDF export**
Export all documents as PDFs in a single operation. Requires headless print sequencing — likely via Playwright in a local CLI companion, keeping the browser app stateless.

**Cloud sync (GitHub Gists)**
Optional sync of the document workspace to a private GitHub Gist. Opt-in only, no analytics, no server.

---

## Out of scope

These will not be implemented in the current architecture:

- **Real-time collaboration** — MD2PDF is intentionally local-first; WebRTC/WebSocket would break the privacy model
- **Native app** — Electron/Capacitor adds packaging complexity with no gain over the PWA
- **Analytics or telemetry** — No tracking of any kind, ever
- **Server-side rendering** — The entire pipeline runs in the browser; no server means no data leaves the device

---

## Contributing

To implement any item in this roadmap:

1. Open an issue to discuss the approach before writing code
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Implement with tests where applicable
4. Run `npm run typecheck && npm run build` — both must pass
5. Open a pull request with a clear description of what changed and why
