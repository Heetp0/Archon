# App Routing System

## Routing Strategy
The application is a Single Page Application (SPA). Routing is state-driven and managed via the `mode` variable in `AppContext.tsx` and persisted in `localStorage` under `archon_appMode`.

## Active Modes Mapped to Components
- **Dashboard**: `src/components/modes/DashboardMode.tsx`
- **Chat**: `src/components/modes/ChatMode.tsx`
- **Research**: `src/components/modes/ResearchMode.tsx`
- **Council**: `src/components/modes/CouncilMode.tsx`
- **Notebook**: `src/components/modes/NotebookMode.tsx`
- **Obsidian**: `src/components/modes/ObsidianMode.tsx`
- **Agents**: `src/components/modes/AgentMode.tsx`