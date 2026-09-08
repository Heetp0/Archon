import { create } from 'zustand';

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
};

export type CouncilMessageMap = {
  [modelKey: string]: Message[];
};

export type Telemetry = {
  tokens: number;
  cost: number;
  latency: number;
};

interface WebSocketState {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  
  messagesMap: Record<string, Message[]>;
  councilMessages: CouncilMessageMap;
  isStreaming: boolean;
  telemetry: Telemetry;
  citations: any[];
  researchText: string;
  agentStatuses: any[];
  taskQueue: any[];
  availableModels: any[];
  terminalLines: any[];
  dangerousCommand: any;
  calendarEvents: any[];
  
  // Actions
  setMessagesMap: (updater: (prev: Record<string, Message[]>) => Record<string, Message[]>) => void;
  setCouncilMessages: (updater: (prev: CouncilMessageMap) => CouncilMessageMap) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setTelemetry: (telemetry: Telemetry) => void;
  setCitations: (updater: (prev: any[]) => any[]) => void;
  setResearchText: (updater: (prev: string) => string) => void;
  setAgentStatuses: (updater: (prev: any[]) => any[]) => void;
  setTaskQueue: (updater: (prev: any[]) => any[]) => void;
  setAvailableModels: (models: any[]) => void;
  setTerminalLines: (updater: (prev: any[]) => any[]) => void;
  setDangerousCommand: (cmd: any) => void;
  setCalendarEvents: (events: any[]) => void;
  clearChat: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),
  
  messagesMap: {},
  councilMessages: {},
  isStreaming: false,
  telemetry: { tokens: 0, cost: 0, latency: 0 },
  citations: [],
  researchText: "",
  agentStatuses: [],
  taskQueue: [],
  availableModels: [],
  terminalLines: [],
  dangerousCommand: null,
  calendarEvents: [],
  
  setMessagesMap: (updater) => set((state) => ({ messagesMap: updater(state.messagesMap) })),
  setCouncilMessages: (updater) => set((state) => ({ councilMessages: updater(state.councilMessages) })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setCitations: (updater) => set((state) => ({ citations: updater(state.citations) })),
  setResearchText: (updater) => set((state) => ({ researchText: updater(state.researchText) })),
  setAgentStatuses: (updater) => set((state) => ({ agentStatuses: updater(state.agentStatuses) })),
  setTaskQueue: (updater) => set((state) => ({ taskQueue: updater(state.taskQueue) })),
  setAvailableModels: (models) => set({ availableModels: models }),
  setTerminalLines: (updater) => set((state) => ({ terminalLines: updater(state.terminalLines) })),
  setDangerousCommand: (cmd) => set({ dangerousCommand: cmd }),
  setCalendarEvents: (events) => set({ calendarEvents: events }),
  clearChat: () => set((state) => {
    const activeChatId = state.activeChatId;
    return {
      messagesMap: activeChatId ? { ...state.messagesMap, [activeChatId]: [] } : state.messagesMap,
      councilMessages: {},
      researchText: ""
    };
  })
}));
