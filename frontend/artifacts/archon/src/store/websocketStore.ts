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

export interface PlanStep {
  id: number;
  title: string;
  acceptance_criteria: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ToolCall {
  id: string;
  tool: string;
  input: string;
  status: 'running' | 'done';
  exit_code?: number;
  result_count?: number;
  timestamp: string;
}

export interface DangerousCommand {
  id: string;
  command: string;
  reason?: string;
  action?: string;
  target_subproject?: string;
  files_affected?: string[];
  solution_preview?: string;
  retry_count?: number;
  plan_steps?: PlanStep[];
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
  dangerousCommand: DangerousCommand | null;
  calendarEvents: any[];
  lastStatus: string | null;
  planSteps: PlanStep[];
  toolCalls: ToolCall[];
  sessionMetadata: { task_id?: string; status?: string; verdict?: string; retries?: number } | null;
  
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
  setDangerousCommand: (cmd: DangerousCommand | null) => void;
  setCalendarEvents: (events: any[]) => void;
  setLastStatus: (status: string | null) => void;
  setPlanSteps: (stepsOrUpdater: PlanStep[] | ((prev: PlanStep[]) => PlanStep[])) => void;
  setToolCalls: (updater: (prev: ToolCall[]) => ToolCall[]) => void;
  setSessionMetadata: (meta: { task_id?: string; status?: string; verdict?: string; retries?: number } | null) => void;
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
  planSteps: [],
  toolCalls: [],
  sessionMetadata: null,
  
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
  setPlanSteps: (stepsOrUpdater) => set((state) => ({
    planSteps: typeof stepsOrUpdater === 'function' ? stepsOrUpdater(state.planSteps) : stepsOrUpdater
  })),
  setToolCalls: (updater) => set((state) => ({ toolCalls: updater(state.toolCalls) })),
  setSessionMetadata: (meta) => set({ sessionMetadata: meta }),
  clearChat: () => set((state) => {
    const activeChatId = state.activeChatId;
    return {
      messagesMap: activeChatId ? { ...state.messagesMap, [activeChatId]: [] } : state.messagesMap,
      councilMessages: {},
      researchText: ""
    };
  })
}));
