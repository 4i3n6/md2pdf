# md2pdf

A fast, privacy-first Markdown editor and PDF exporter that runs entirely in your browser.

No servers. No accounts. No data leaves your machine.

[![CI](https://github.com/4i3n6/md2pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/4i3n6/md2pdf/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/4i3n6/md2pdf)](LICENSE)
[![Version](https://img.shields.io/github/v/tag/4i3n6/md2pdf?label=version)](https://github.com/4i3n6/md2pdf/releases)

## What it does

md2pdf is a Markdown editor with live preview and native PDF export, built entirely as a client-side application. Documents are stored in localStorage, the editor runs on CodeMirror 6, and PDF generation uses the browser's built-in print dialog — no backend, no external services, no account required.

## Features

- **100% client-side** — no server, no tracking, no signup
- **Multi-document workspace** — manage multiple files with full backup and restore
- **Live split-pane preview** — real-time rendering as you type
- **GitHub Flavored Markdown** — full GFM support including tables, task lists, and strikethrough
- **Syntax highlighting** — powered by highlight.js across 30+ languages
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt, ER and more rendered inline
- **YAML processor** — structured rendering of YAML frontmatter and code blocks
- **Print fidelity** — pixel-accurate A4 layout with configurable margins and font size
- **Resizable panels** — draggable splitter, persisted across sessions
- **Drag and drop** — drop `.md` files directly into the editor
- **Keyboard-first** — `Ctrl/Cmd+S` to save, `Ctrl/Cmd+P` to export PDF
- **PWA-ready** — install and use offline as a standalone app
- **Bilingual UI** — English and Portuguese interfaces

## Getting started

```bash
git clone https://github.com/4i3n6/md2pdf.git
cd md2pdf
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build to `./dist` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | TypeScript strict mode check |
| `npm run smoke` | Smoke test against production build |
| `npm run visual:test` | Playwright render/print fidelity suite |

## Tech stack

| Layer | Technology |
|---|---|
| Build | [Vite](https://vitejs.dev) |
| Editor | [CodeMirror 6](https://codemirror.net) |
| Markdown | [marked.js](https://marked.js.org) |
| Diagrams | [Mermaid](https://mermaid.js.org) |
| Highlighting | [highlight.js](https://highlightjs.org) |
| Language | TypeScript (strict mode) |
| Storage | localStorage |
| PDF export | `window.print()` |

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Save document |
| `Ctrl/Cmd + P` | Export as PDF |

## Deployment

The build output in `./dist` is a static site. Deploy to any static host:

```bash
npm run build
# serve ./dist
```

Route `/app` must rewrite to `app.html`. A `_redirects` file compatible with Cloudflare Pages is included in the repo root.

## Customization

### Theme colors

Edit CSS variables in `src/styles.css`:

```css
:root {
    --primary: #10b981;
    --primary-dark: #059669;
    --sidebar-bg: #1f2937;
}
```

### Default document content

Edit `defaultDoc` in `src/services/documentManager.ts`.

## Privacy

All data is stored exclusively in your browser's localStorage. Nothing is transmitted to any external service.

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the approach.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
