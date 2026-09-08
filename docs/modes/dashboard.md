# Dashboard Mode

## 1. Overview
The Dashboard Mode serves as the central command center for the Archon Operating System. It provides a unified view of active agents, token usage telemetry, unread mail via MCP, and pending tasks. It integrates a 7-day activity chart, a calendar widget, real-time activity feed from the daemon terminal, and quick launch actions to navigate to other modes (Chat, Council, Deep Research, Agents, etc.).

## 2. Architecture & Data Flow

```mermaid
graph TD
    A[DashboardMode Component] -->|Subscribes| B[WebSocketContext / Store]
    B -->|WebSocket WS/WSS| C[Archon Daemon]
    C -->|Telemetry| B
    C -->|Agent Statuses| B
    C -->|Terminal Logs| B
    C -->|MCP Proxies| D[Gmail / Keep / Calendar]
    A -->|Renders| E[Stat Cards]
    A -->|Renders| F[Activity Bar Chart]
    A -->|Renders| G[Mail & Todo Digests]
    
    H[Android DashboardScreen] --> I[ArchonApiClient / BackendConfigStore]
    H --> J[Jetpack Compose Responsive UI]
```

## 3. Key API Endpoints & WebSocket Messages
- **WebSocket Subscriptions**:
  - `agentStatuses`: List of running/idle agent processes.
  - `telemetry`: Metrics for tokens used and estimated cost.
  - `terminalLines`: Feed of system, input, and error logs.
  - `calendarEvents`: Synced events for the schedule widget.
- **MCP Calls (Conceptual)**:
  - Mail sync relies on Gmail MCP to pull summaries.
  - Todo sync relies on Google Keep MCP.

## 4. Data Models / Database Schema
**Frontend Types:**
- `MailItem`: `id`, `sender`, `subject`, `preview`, `date`, `fullSummary`, `unread`
- `TodoItem`: `id`, `text`, `done`, `list`
- `ActivityBucket`: `day`, `commands`, `tokens`

**Android Data Classes:**
- `DashboardStat`: `id`, `label`, `value`, `sub`, `icon`, `accentColor`
- `AgentProcess`: `id`, `name`, `action`, `status`
- `ActivityLogEntry`: `id`, `timestamp`, `text`, `kind`
- `MailDigestItem`, `TodoItem`, `CalendarEvent`, `QuickActionItem`

## 5. UI Component Tree
- `DashboardMode` (React Context & Store integration)
  - `DashboardHeader` (Uptime counter, Connection status)
  - `StatCard` (x4 - Active Agents, Tokens Used, Unread Mail, Tasks Pending)
  - `SvgBarChart` (Pure SVG implementation to avoid Recharts React 19 hook conflicts)
  - `CalendarWidget` (Daily schedule)
  - `AgentRow` (Active process indicators)
  - `MailModal` (Framer Motion dialog for reading email summaries)
  - `QuickAction` (Grid buttons for navigating App modes)

## 6. Android Implementation
Implemented in `DashboardScreen.kt` using Jetpack Compose with strict responsive behaviors (`WindowSizeClass`):
- **Expanded (>= 840dp)**: Multi-column layout using weights (Stats inline, Activity/Calendar split, Agent/Logs split).
- **Medium (600dp - 839dp)**: 2-column layout.
- **Compact (< 600dp)**: Single-column vertically scrollable view with 2x2 stats grid.
- **Parity Dataset**: Fallback hardcoded datasets (`defaultStats`, `defaultMailItems`, etc.) are provided for UI development and testing when the backend is disconnected.
- **Canvas Chart**: Activity Bar Chart is custom-drawn using Compose `Canvas` for optimal performance.

## 7. Known Issues / Open TODOs
- **Mock Data Dependency**: Android currently uses default hardcoded datasets. Needs to be wired fully to the `ArchonApiClient` WebSockets.
- **Chart Tooltips**: Custom SVG Bar Chart hover tooltips occasionally overflow on smaller window sizes.
- **Uptime Sync**: Uptime counter is currently client-side. Should synchronize base timestamp from the Daemon.
