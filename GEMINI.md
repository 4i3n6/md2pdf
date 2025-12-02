# MD2PDF - Project Context

## Project Overview

**MD2PDF** is a production-ready, client-side web application designed to convert Markdown documents into PDF files. It features a modern, hacker-style dashboard interface and operates entirely within the browser using LocalStorage, ensuring privacy and offline capability.

*   **Version:** 2.0.0
*   **Type:** Client-side Web Application / PWA (Progressive Web App)
*   **Primary Goal:** Provide a free, unlimited, and privacy-focused Markdown editor and PDF converter.

## Tech Stack

*   **Core:** JavaScript (ES Modules), HTML5, CSS3.
*   **Build Tool:** Vite.
*   **Editor:** CodeMirror 6 (with `@codemirror/lang-markdown`, `@codemirror/theme-one-dark`).
*   **Markdown Engine:** Marked.js (GitHub Flavored Markdown enabled).
*   **Storage:** LocalStorage API (for persisting documents).
*   **PDF Generation:** Native `window.print()` API.
*   **PWA:** `vite-plugin-pwa` (Service Worker, Manifest).
*   **Optimization:** Terser (minification), Rollup (manual chunking).

## Architecture & Data Flow

The application follows a simple, event-driven architecture managed by a central state object in `src/main.js`.

1.  **State Management:**
    *   `state` object holds `currentDoc`, `documents` list, `viewMode`, and the `editor` instance.
    *   Data is persisted to `localStorage` under the key `'md2pdf-documents'`.

2.  **Editor & Preview Loop:**
    *   **Input:** User types in CodeMirror editor.
    *   **Event:** `EditorView.updateListener` triggers on changes.
    *   **Process:**
        *   Update `state.currentDoc.content`.
        *   Pass content to `marked(content)` to generate HTML.
        *   Update `innerHTML` of the `#preview` element.
        *   Persist to `localStorage`.

3.  **Document Management:**
    *   CRUD operations (Create, Read, Update, Delete) manipulate the `state.documents` array and sync with `localStorage`.

4.  **PDF Export:**
    *   Uses a CSS-based approach (`@media print`).
    *   The app temporarily applies a `.preview-only` class to hide the editor and sidebar, triggers `window.print()`, and then restores the view.

## Key Files

*   **`src/main.js`**: The application core. Handles initialization, state management, editor setup, event listeners, and DOM manipulation.
*   **`src/styles.css`**: Contains all styling, including CSS variables for theming (e.g., `--primary`, `--sidebar-bg`), responsive rules, and print stylesheets.
*   **`vite.config.js`**: Vite configuration. Includes:
    *   **PWA Setup:** Manifest generation and caching strategies (Google Fonts).
    *   **Build Optimization:** Terser settings to drop console/debugger, manual chunks for CodeMirror and Marked to optimize bundle size.
    *   **Cloudflare Support:** Custom plugin to copy `_headers` and `_redirects` to the dist folder.
*   **`index.html`**: Application entry point.
*   **`PRODUCTION.md`**: Comprehensive checklist and guide for deployment.
*   **`MELHORIAS.md`**: Roadmap of future features and improvements.

## Development

### Commands

*   **Start Dev Server:** `npm run dev` (runs on port 3000)
*   **Build for Production:** `npm run build` (outputs to `dist/`)
*   **Preview Production Build:** `npm run preview`

### Conventions

*   **Code Style:** Vanilla JavaScript using ES6+ features.
*   **State:** Direct mutation of the global `state` object followed by explicit render/save calls.
*   **DOM Access:** Direct `document.getElementById` calls.
*   **Styling:** CSS Variables are used for colors and main theme properties.
*   **Production:** `console.log` and `debugger` are stripped in production builds.

## Deployment

The project is optimized for static hosting (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

*   **Output Directory:** `dist/`
*   **Cloudflare Pages:** The build process automatically copies `_headers` and `_redirects` to `dist/` to ensure correct routing and headers.
*   **PWA:** The app is configured to work offline and be installable.

## Future Roadmap

Refer to `MELHORIAS.md` for the detailed roadmap, which includes:
*   Dark/Light theme toggle.
*   Export to HTML/DOCX.
*   Mermaid diagram support.
*   Syntax highlighting within code blocks in the preview.
