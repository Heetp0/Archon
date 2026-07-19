# Page Dependencies & Imports Trees

## Dashboard Mode
Entry: src/components/modes/DashboardMode.tsx
Dependencies:
  - src/components/ui/scroll-area.tsx
    - src/lib/utils.ts
  - src/context/WebSocketContext.tsx
    - src/hooks/useWebSocket.ts
      - src/lib/storage.ts
    - src/context/ProjectsContext.tsx
    - src/lib/bootState.ts
  - src/context/AppContext.tsx
  - src/components/CalendarWidget.tsx

## Chat Mode
Entry: src/components/modes/ChatMode.tsx
Dependencies:
  - src/components/ui/scroll-area.tsx
    - src/lib/utils.ts
  - src/context/WebSocketContext.tsx
    - src/hooks/useWebSocket.ts
      - src/lib/storage.ts
    - src/context/ProjectsContext.tsx
    - src/lib/bootState.ts
  - src/hooks/useFileAttach.ts
  - src/components/CodeBlock.tsx
  - src/components/chat/ChatInput.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx

## Research Mode
Entry: src/components/modes/ResearchMode.tsx
Dependencies:
  - src/context/WebSocketContext.tsx
    - src/hooks/useWebSocket.ts
      - src/lib/storage.ts
    - src/context/ProjectsContext.tsx
    - src/lib/bootState.ts
  - src/hooks/useFileAttach.ts
  - src/components/ui/button.tsx
    - src/lib/utils.ts
  - src/components/ui/scroll-area.tsx
  - src/components/ui/resizable.tsx

## Council Mode
Entry: src/components/modes/CouncilMode.tsx
Dependencies:
  - src/components/ui/scroll-area.tsx
    - src/lib/utils.ts
  - src/components/ui/button.tsx
  - src/context/WebSocketContext.tsx
    - src/hooks/useWebSocket.ts
      - src/lib/storage.ts
    - src/context/ProjectsContext.tsx
    - src/lib/bootState.ts
  - src/hooks/useFileAttach.ts
  - src/components/chat/ChatInput.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx

## Notebook Mode
Entry: src/components/modes/NotebookMode.tsx
Dependencies:
  - src/context/NotebookContext.tsx
    - src/types/notebook.ts
    - src/lib/notebookApi.ts
      - src/lib/storage.ts
  - src/components/notebook/NotebookSidebar.tsx
    - src/components/ui/button.tsx
      - src/lib/utils.ts
    - src/components/ui/scroll-area.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/card.tsx
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/input.tsx
    - src/components/ui/select.tsx
  - src/components/notebook/ChatArea.tsx
    - src/components/notebook/ChatMessage.tsx
      - src/components/notebook/CitationHoverCard.tsx
        - src/components/ui/hover-card.tsx
    - src/components/notebook/SlashCommandInput.tsx
    - src/components/ui/spinner.tsx
  - src/components/notebook/SourceDrawer.tsx
    - src/components/ui/drawer.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/progress.tsx
  - src/components/notebook/CitationModal.tsx
  - src/components/notebook/StudioModal.tsx
  - src/components/notebook/StudioPanel.tsx

## Obsidian Mode
Entry: src/components/modes/ObsidianMode.tsx
Dependencies:
  - src/context/WebSocketContext.tsx
    - src/hooks/useWebSocket.ts
      - src/lib/storage.ts
    - src/context/ProjectsContext.tsx
    - src/lib/bootState.ts
  - src/lib/utils.ts
  - src/components/ui/scroll-area.tsx
  - src/components/ui/card.tsx
  - src/components/ui/button.tsx
  - src/components/ui/dialog.tsx
  - src/components/ui/input.tsx

## Agents Mode
Entry: src/components/modes/AgentMode.tsx
Dependencies:
  - src/components/ui/scroll-area.tsx
    - src/lib/utils.ts
  - src/components/ui/button.tsx
  - src/context/WebSocketContext.tsx
    - src/hooks/useWebSocket.ts
      - src/lib/storage.ts
    - src/context/ProjectsContext.tsx
    - src/lib/bootState.ts
  - src/hooks/useFileAttach.ts
  - src/components/BrowsePCModal.tsx