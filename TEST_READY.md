# Test Suite Readiness Report

This workspace is fully equipped with a comprehensive E2E and Integration testing suite for the Archon React + Vite frontend codebase.

## How to Run the Tests

To execute the test runner and verify the tests:

1. **Change Directory** to the `archon` package root:
   ```bash
   cd frontend/AI-OS-GUI/artifacts/archon
   ```

2. **Run all tests** using Vitest:
   ```bash
   pnpm vitest run
   ```

3. **Run tests in watch mode** (for development/debugging):
   ```bash
   pnpm vitest
   ```

## Test Suite Architecture & Coverage

The test suite utilizes **Vitest** coupled with **JSDOM** to simulate browser environments, allowing full rendering and interaction checks of React components, contexts, hooks, and native browser APIs (such as local/session storage and WebSockets).

Total coverage: **68 tests** across **8 test files**, spanning Tiers 1 to 4:

### Feature Summary

| # | Feature | Tested Capabilities | Tiers Covered |
|---|---------|---------------------|---------------|
| 1 | **Boot Screen State** | Sequential steps progression, offline warnings, enter interface skip button, noboot query parameters bypass, already booted bypass, and state cleanup. | Tier 1, Tier 2 |
| 2 | **Sidebar Layout & Resizing** | Left context sidebar toggling, capable modes mapping, right sidebar toggles, drag-to-resize operations with window listeners, and width boundary constraints (200px - 600px). | Tier 1, Tier 2 |
| 3 | **Calendar Widget & Modal** | Loading indicators, day name headers, events rendering in cells, upcoming list sorting, prev/next month pagination, portal modal details popup, and backdrop/close dismiss. | Tier 1, Tier 2 |
| 4 | **File Viewer Tabs** | Default open tabs, tab switching, contents rendering, closing tabs, empty state handling, dropdown items listing, and re-mount session storage state persistence. | Tier 1, Tier 2 |
| 5 | **WebSockets Proxy Mappings** | ws/wss protocol mapping, custom localStorage host/ports, hook connection states (connecting/connected), status event parsing, secure Replit proxy hostname prefix mappings, and backoff reconnect logic. | Tier 1, Tier 2 |
| 6 | **Vite Production Build** | Compiles with Vite, checks asset generation (`index.html`, JS/CSS bundles), verifies code bundle budgets (JS < 1.5MB, CSS < 500KB), checks public resource copy, and script tag inclusions. | Tier 1, Tier 2 |

### Interaction & Workload Scenarios

* **Tier 3 (Cross-Feature Interactions)**:
  * *Boot Screen + WebSockets*: Simulates step completion followed by active WebSocket daemon handshakes.
* **Tier 4 (Real-World Application Scenarios)**:
  * *Scenario 1: Full App Load & Boot Flow*: Verify loading screens transition to offline bypass paths.
  * *Scenario 2: Workspace Layout Customization*: Verify dragging/resizing sidebars.
  * *Scenario 3: Calendar & Event Details*: Verify calendar event click throughs.
  * *Scenario 4: File Inspection & Active Tabs*: Verify file text content viewing under active tabs.
  * *Scenario 5: Secure Replit Proxy WebSocket Connection*: Verify hostname mapping translations on Replit dev domains (`.replit.app`/`.replit.dev`).
