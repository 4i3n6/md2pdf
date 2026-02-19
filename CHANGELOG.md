# Changelog

All notable changes to this project will be documented in this file.

## [1.1.67] - 2026-02-18

### Added
- Added `LICENSE` (MIT).
- Added `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
- Added GitHub Actions CI workflow for automated testing and builds.
- Added badges to README.
- Cleaned up local tool traces (`.serena`, `.crush`).

## [1.1.66] - 2026-02-18

### Fixed
- Automated version updates in Manual pages (`content.json` and generated HTML).
- Improved `bump-version.mjs` script to support JSON files.

## [1.1.65] - 2026-02-18

### Fixed
- Automated version updates in Site footer (`index.html` and `pt/index.html`).

## [1.1.64] - 2026-02-18

### Added
- Unit tests for `DocumentManager` service using Vitest.
- Configured JSDOM for testing DOM-dependent logic.

### Fixed
- Improved Markdown validation to ignore image regex patterns.

## [1.1.60] - 2026-02-18

### Added
- Created `modalService` to replace native `confirm()` with a custom UI.
- Extracted CodeMirror theme to `src/editorTheme.ts`.

## [1.1.50] - 2026-02-15

### Fixed
- Implemented crypto address truncation in table cells for better layout in PDF.

## [1.1.0] - 2025-12-08

### Added
- Initial release of the "Hacker Dashboard" interface.
- Local document storage using LocalStorage.
- Native PDF export via browser.
