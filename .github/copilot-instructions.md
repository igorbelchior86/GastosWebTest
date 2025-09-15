# GastosWebTest — Copilot AI Agent Instructions

## Big Picture Architecture
- **Single-page web app** for personal finance management, built with vanilla JS, HTML, and CSS. No frameworks.
- **Entry points:**
  - `index.html` — main app UI
  - `main.js` — core logic, event wiring, modal management
  - `login.view.js` — login flow
- **Component structure:**
  - UI logic in `/ui/` (modals, sticky header)
  - Theme management in `/components/theme-manager.js`
  - Utility functions in `/js/utils/` (data, date, format, DOM)
- **Icons and assets:** in `/icons/`
- **Firebase integration:**
  - Configs in `firebase.prod.config.js` and `firebase.test.config.js`
  - Auth logic in `auth.js`

## Developer Workflows
- **Testing:**
  - Automated browser-based tests in `test-suite.js` (run with `runAllTests()` in console)
  - UI for running tests: `test-runner.html`
- **Debugging:**
  - Use browser dev tools; no build step required
- **No build tools or package managers** — direct file editing and browser refresh

## Project-Specific Conventions
- **Modals:**
  - Managed via `modalManager` from `/ui/modals.js`
  - Modal elements referenced by ID in `main.js`
- **Theme switching:**
  - Controlled by `themeManager` (`/components/theme-manager.js`)
  - Theme buttons use `.theme-row` and `.theme-btn` selectors
- **Event delegation:**
  - Header segmented control and floating pill use event delegation for UI actions
- **Global state:**
  - App state managed via top-level variables in `main.js`
- **Testing assertions:**
  - Use `TestRunner.assert*` methods in `test-suite.js`

## Integration Points
- **Firebase:**
  - Auth state managed via `window.Auth` (see `auth.js`)
  - Config selection via `firebase.prod.config.js` or `firebase.test.config.js`
- **PWA support:**
  - Manifest: `site.webmanifest`
  - Service worker: `sw.js`

## Patterns & Examples
- **Utilities:**
  - Use `/js/utils/` for reusable logic (e.g., `date-utils.js`, `format-utils.js`)
- **UI updates:**
  - Manipulate DOM directly; query elements by ID or class
- **Testing:**
  - Example: `TestRunner.addTest('should log in', async () => { ... })`

## Key Files & Directories
- `main.js`, `index.html`, `/ui/`, `/components/`, `/js/utils/`, `auth.js`, `test-suite.js`, `test-runner.html`

---
**For AI agents:**
- Prefer direct DOM manipulation and vanilla JS patterns
- Follow modal and theme management conventions
- Use `TestRunner` for new automated tests
- Reference utility modules for common logic
- No build, transpile, or package steps required
