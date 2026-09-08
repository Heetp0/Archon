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

export interface ResearchSource {
  id: number;
  url: string;
  title: string;
  snippet: string;
  summary?: string;
}

export interface ResearchGraphData {
  nodes: Array<{ id: string; label: string; x: number; y: number; r: number; primary?: boolean }>;
  edges: Array<{ from: string; to: string }>;
}

interface WebSocketState {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  
  messagesMap: Record<string, Message[]>;
  councilMessages: CouncilMessageMap;
  isStreaming: boolean;
  telemetry: Telemetry;
  citations: ResearchSource[];
  researchText: string;
  researchOutline: string[];
  researchGraphData: ResearchGraphData | null;
  researchSuggestions: string[];
  agentStatuses: any[];
  taskQueue: any[];
  availableModels: any[];
  terminalLines: any[];
  dangerousCommand: any;
  calendarEvents: any[];
  lastStatus: string | null;
  
  // Actions
  setMessagesMap: (updater: (prev: Record<string, Message[]>) => Record<string, Message[]>) => void;
  setCouncilMessages: (updater: (prev: CouncilMessageMap) => CouncilMessageMap) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setTelemetry: (telemetry: Telemetry) => void;
  setCitations: (citationsOrUpdater: ResearchSource[] | ((prev: ResearchSource[]) => ResearchSource[])) => void;
  setResearchText: (updater: (prev: string) => string) => void;
  setResearchOutline: (outline: string[]) => void;
  setResearchGraphData: (data: ResearchGraphData | null) => void;
  setResearchSuggestions: (suggestions: string[]) => void;
  setAgentStatuses: (updater: (prev: any[]) => any[]) => void;
  setTaskQueue: (updater: (prev: any[]) => any[]) => void;
  setAvailableModels: (models: any[]) => void;
  setTerminalLines: (updater: (prev: any[]) => any[]) => void;
  setDangerousCommand: (cmd: any) => void;
  setCalendarEvents: (events: any[]) => void;
  setLastStatus: (status: string | null) => void;
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
  researchOutline: [],
  researchGraphData: null,
  researchSuggestions: [],
  agentStatuses: [],
  taskQueue: [],
  availableModels: [],
  terminalLines: [],
  dangerousCommand: null,
  calendarEvents: [],
  lastStatus: null,
  
  setMessagesMap: (updater) => set((state) => ({ messagesMap: updater(state.messagesMap) })),
  setCouncilMessages: (updater) => set((state) => ({ councilMessages: updater(state.councilMessages) })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setCitations: (citationsOrUpdater) => set((state) => ({
    citations: typeof citationsOrUpdater === 'function'
      ? citationsOrUpdater(state.citations)
      : citationsOrUpdater
  })),
  setResearchText: (updater) => set((state) => ({ researchText: updater(state.researchText) })),
  setResearchOutline: (outline) => set({ researchOutline: outline }),
  setResearchGraphData: (data) => set({ researchGraphData: data }),
  setResearchSuggestions: (suggestions) => set({ researchSuggestions: suggestions }),
  setAgentStatuses: (updater) => set((state) => ({ agentStatuses: updater(state.agentStatuses) })),
  setTaskQueue: (updater) => set((state) => ({ taskQueue: updater(state.taskQueue) })),
  setAvailableModels: (models) => set({ availableModels: models }),
  setTerminalLines: (updater) => set((state) => ({ terminalLines: updater(state.terminalLines) })),
  setDangerousCommand: (cmd) => set({ dangerousCommand: cmd }),
  setCalendarEvents: (events) => set({ calendarEvents: events }),
  setLastStatus: (status) => set({ lastStatus: status }),
  clearChat: () => set((state) => {
    const activeChatId = state.activeChatId;
    return {
      messagesMap: activeChatId ? { ...state.messagesMap, [activeChatId]: [] } : state.messagesMap,
      councilMessages: {},
      researchText: ""
    };
  })
}));
