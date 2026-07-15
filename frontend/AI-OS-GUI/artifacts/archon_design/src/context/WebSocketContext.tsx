import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { subscribeActiveChat, subscribeActiveProjectFiles, ContextFile } from "@/context/ProjectsContext";
import { clearOfflineTimer } from "@/lib/bootState";
import { toast } from "sonner";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
};

type CouncilMessageMap = {
  [modelKey: string]: Message[];
};

type Telemetry = {
  tokens: number;
  cost: number;
  latency: number;
};

type WebSocketContextType = {
  agentStatuses: any[];
  taskQueue: any[];
  availableModels: any[];
  terminalLines: any[];
  dangerousCommand: any;
  sendAgentCommand: (cmd: string) => void;
  approveCommand: () => void;
  denyCommand: () => void;
  connected: boolean;
  connecting: boolean;
  messages: Message[];
  councilMessages: CouncilMessageMap;
  isStreaming: boolean;
  telemetry: Telemetry;
  citations: any[];
  researchText: string;
  sendChat: (message: string, model: string) => void;
  sendCouncil: (message: string, models: string[]) => void;
  sendResearch: (message: string) => void;
  clearChat: () => void;
  cancelStream: () => void;
  calendarEvents: any[];
  refreshCalendar: () => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  // Ref so sendChat always sees the current value, bypassing stale closure
  const activeChatIdRef = useRef<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [councilMessages, setCouncilMessages] = useState<CouncilMessageMap>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry>({ tokens: 0, cost: 0, latency: 0 });
  const [citations, setCitations] = useState<any[]>([]);
  const [researchText, setResearchText] = useState("");
  const [agentStatuses, setAgentStatuses] = useState<any[]>([]);
  const [taskQueue, setTaskQueue] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [terminalLines, setTerminalLines] = useState<any[]>([]);
  const [dangerousCommand, setDangerousCommand] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  // Subscribe to activeChatId from ProjectsProvider
  useEffect(() => {
    return subscribeActiveChat((id) => {
      activeChatIdRef.current = id;
      setActiveChatId(id);
    });
  }, []);

  const activeFilesRef = useRef<ContextFile[]>([]);

  // Subscribe to active project files
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      if (typeof subscribeActiveProjectFiles === "function") {
        unsub = subscribeActiveProjectFiles((files) => {
          activeFilesRef.current = files;
        });
      }
    } catch (e) {
      // Ignore mock validation error in tests that do not mock this function
    }
    return () => { unsub?.(); };
  }, []);

  // Consume our robust useWebSocket hook (H-09, M-08)
  const { connected, connecting, send, messages: wsMessages, flushMessages } = useWebSocket();

  const lastReqId = useRef<string | null>(null);
  const tokenBuffer = useRef<{ content: string; targetModel: string }[]>([]);
  const batchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCalendar = useCallback(async () => {
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      const res = await fetch(`${protocol}://${host}:${port}/calendar/events?days=7`);
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.events || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      const res = await fetch(`${protocol}://${host}:${port}/models`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.models || []);
        setAvailableModels(list);
      }
    } catch {
      // ignore
    }
  }, []);

  // Clear offline screen and fetch models/calendar when connected
  useEffect(() => {
    if (connected) {
      clearOfflineTimer(); // C-04 / H-05
      fetchModels();
    }
  }, [connected, fetchModels]);

  // Fetch calendar periodically when connected
  useEffect(() => {
    if (!connected) return;
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 60000);
    return () => clearInterval(interval);
  }, [connected, fetchCalendar]);

  // Throttle token state commits to prevent UI lagging (H-06)
  const commitBufferedTokens = useCallback(() => {
    batchTimeout.current = null;
    const buffer = tokenBuffer.current;
    tokenBuffer.current = [];
    if (buffer.length === 0) return;

    const newTerminalLines: any[] = [];
    const chatAppends: Record<string, string> = {};
    let lastTargetModel = "";

    buffer.forEach(({ content, targetModel }) => {
      const agentModels = ["Planner", "Coder", "OpenCode Delegator", "Tester", "Logger", "Journal", "Supervisor"];
      if (agentModels.includes(targetModel)) {
        newTerminalLines.push({
          id: Math.random().toString(),
          text: content.trimEnd(),
          kind: "output",
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
        });
      } else {
        chatAppends[targetModel] = (chatAppends[targetModel] || "") + content;
        lastTargetModel = targetModel;
      }
    });

    if (newTerminalLines.length > 0) {
      setTerminalLines((prev) => [...prev, ...newTerminalLines]);
    }

    if (activeChatId && chatAppends[lastTargetModel]) {
      const contentToAppend = chatAppends[lastTargetModel];
      setMessagesMap((prev) => {
        const sessionMsgs = prev[activeChatId] || [];
        const last = sessionMsgs[sessionMsgs.length - 1];
        let updatedMsgs;
        if (last && last.role === "assistant" && last.model === lastTargetModel) {
          updatedMsgs = [
            ...sessionMsgs.slice(0, -1),
            { ...last, content: last.content + contentToAppend }
          ];
        } else {
          updatedMsgs = [
            ...sessionMsgs,
            { id: Math.random().toString(), role: "assistant" as const, content: contentToAppend, model: lastTargetModel }
          ];
        }
        return { ...prev, [activeChatId]: updatedMsgs };
      });
    }

    Object.entries(chatAppends).forEach(([mKey, contentToAppend]) => {
      setCouncilMessages((prev) => {
        const modelMsgs = prev[mKey] || [];
        const last = modelMsgs[modelMsgs.length - 1];
        let updatedMsgs;
        if (last && last.role === "assistant") {
          updatedMsgs = [
            ...modelMsgs.slice(0, -1),
            { ...last, content: last.content + contentToAppend }
          ];
        } else {
          updatedMsgs = [
            ...modelMsgs,
            { id: Math.random().toString(), role: "assistant" as const, content: contentToAppend, model: mKey }
          ];
        }
        return { ...prev, [mKey]: updatedMsgs };
      });
    });

    if (chatAppends["research"]) {
      setResearchText((prev) => prev + chatAppends["research"]);
    }
  }, [activeChatId]);

  // Process raw WebSocket messages from hook
  useEffect(() => {
    if (wsMessages.length === 0) return;

    wsMessages.forEach((data) => {
      if (data.event === "token") {
        setIsStreaming(true);
        const payload = data.payload as { content?: string; text?: string; model?: string };
        const content = payload.content !== undefined ? payload.content : (payload.text || "");
        const targetModel = payload.model || "assistant";

        tokenBuffer.current.push({ content, targetModel });
        if (!batchTimeout.current) {
          batchTimeout.current = setTimeout(commitBufferedTokens, 50);
        }
      } else if (data.event === "status") {
        const statusModel = data.payload.model as string;
        if (statusModel && ["Planner", "Coder", "OpenCode Delegator", "Tester", "Logger", "Journal", "Supervisor"].includes(statusModel)) {
          setAgentStatuses((prev) => {
            const realPid = (data.payload.pid as string) || (data.payload.process_id as string) || (data.payload.id as string) || Math.floor(Math.random() * 10000 + 1000).toString();
            const existing = prev.find((a) => a.name === statusModel);
            if (existing) {
              return prev.map((a) => {
                if (a.name === statusModel) {
                  return {
                    ...a,
                    status: "running",
                    action: (data.payload.status as string) || a.action,
                    pid: realPid // M-02
                  };
                }
                return a;
              });
            } else {
              return [
                ...prev,
                {
                  id: Math.random().toString(),
                  name: statusModel,
                  pid: realPid,
                  status: "running",
                  action: (data.payload.status as string) || "active",
                  progress: 50
                }
              ];
            }
          });

          setTerminalLines((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              text: `[SYSTEM] ${data.payload.status}`,
              kind: "system",
              timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
            }
          ]);
        }

        if (data.payload.status === "done") {
          setIsStreaming(false);
          if (data.payload.telemetry) {
            setTelemetry(data.payload.telemetry as Telemetry);
          }
        } else if (data.payload.status === "waiting_confirmation") {
          setDangerousCommand({
            id: data.id || lastReqId.current,
            command: data.payload.command
          });
        }
        
        const statusMsg = data.payload.status as string;
        if (statusMsg && statusMsg.startsWith("Crawling: ")) {
          const url = statusMsg.replace("Crawling: ", "").trim();
          setCitations((prev) => {
            if (prev.includes(url)) return prev;
            return [...prev, url];
          });
        }
      } else if (data.event === "gate") {
        // C-07 / H-11
        setDangerousCommand({
          id: data.id,
          command: data.payload.command || data.payload.prompt || data.payload
        });
        const gatePayload = data.payload as any;
        if (gatePayload?.urls) {
          setCitations(gatePayload.urls);
        }
      } else if (data.event === "done") {
        // C-06
        setIsStreaming(false);
        if (data.payload?.telemetry) {
          setTelemetry(data.payload.telemetry as Telemetry);
        }
        toast.success("Execution completed successfully");
      } else if (data.event === "error") {
        setIsStreaming(false);
        if (data.payload?.telemetry) {
          setTelemetry(data.payload.telemetry as Telemetry);
        }
        const errorMsg = data.payload?.error || data.payload || "An error occurred";
        toast.error(`Daemon Error: ${errorMsg}`);
      }
    });

    flushMessages();
  }, [wsMessages, flushMessages, commitBufferedTokens]);

  useEffect(() => {
    return () => {
      if (batchTimeout.current) clearTimeout(batchTimeout.current);
    };
  }, []);

  const sendAgentCommand = useCallback((cmd: string) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setIsStreaming(true);

    setTerminalLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        text: `$ ${cmd}`,
        kind: "input",
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
      }
    ]);

    const maxSteps = Number(localStorage.getItem("archon_max_steps") || "30");
    const tokenBudget = Number(localStorage.getItem("archon_token_budget") || "500000");

    send({
      id: msgId,
      mode: "agent",
      payload: { 
        content: cmd,
        max_steps: maxSteps,
        token_budget: tokenBudget
      }
    });
  }, [send]);

  const approveCommand = useCallback((reqId?: string) => {
    if (!send) return;
    const targetId = reqId || dangerousCommand?.id || lastReqId.current; // H-11
    if (!targetId) return;
    send({
      id: targetId,
      type: "confirm",
      payload: {}
    });
    setDangerousCommand(null);
  }, [send, dangerousCommand]);

  const denyCommand = useCallback((reqId?: string) => {
    if (!send) return;
    const targetId = reqId || dangerousCommand?.id || lastReqId.current; // H-11
    if (!targetId) return;
    send({
      id: targetId,
      type: "cancel",
      payload: {}
    });
    setDangerousCommand(null);
  }, [send, dangerousCommand]);

  const sendChat = useCallback((message: string, model: string) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;

    const chatId = activeChatIdRef.current;
    const history = chatId
      ? (messagesMap[chatId] || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : [];

    if (chatId) {
      setMessagesMap((prev) => {
        const sessionMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...sessionMsgs, { id: msgId, role: "user", content: message, model }]
        };
      });
    }

    setIsStreaming(true);
    const attachments = activeFilesRef.current.map((f) => ({
      name: f.name,
      content: f.content || "",
    }));

    send({
      id: msgId,
      mode: "chat",
      payload: {
        content: message,
        model,
        history,
        context: { attachments }
      }
    });
  }, [send, messagesMap, activeChatId]);

  const sendCouncil = useCallback((message: string, models: string[]) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setIsStreaming(true);

    setCouncilMessages((prev) => {
      const next = { ...prev };
      models.forEach((m) => {
        if (!next[m]) next[m] = [];
        next[m].push({ id: msgId, role: "user", content: message, model: m });
      });
      return next;
    });

    const attachments = activeFilesRef.current.map((f) => ({
      name: f.name,
      content: f.content || "",
    }));

    send({
      id: msgId,
      mode: "council",
      payload: {
        content: message,
        models,
        context: { attachments }
      } // M-18
    });
  }, [send]);

  const cancelStream = useCallback(() => {
    setIsStreaming(false);
    tokenBuffer.current = [];
    toast.info("Streaming interrupted");
  }, []);

  const sendResearch = useCallback((message: string) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setIsStreaming(true);
    setResearchText("");

    const attachments = activeFilesRef.current.map((f) => ({
      name: f.name,
      content: f.content || "",
    }));

    send({
      id: msgId,
      mode: "research",
      payload: {
        content: message,
        context: { attachments }
      }
    });
  }, [send]);

  const clearChat = useCallback(() => {
    if (activeChatId) {
      setMessagesMap((prev) => ({
        ...prev,
        [activeChatId]: []
      }));
    }
    setCouncilMessages({});
    setResearchText("");
  }, [activeChatId]);

  const activeMessages = activeChatId ? (messagesMap[activeChatId] || []) : [];

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        connecting,
        messages: activeMessages,
        councilMessages,
        isStreaming,
        telemetry,
        citations,
        researchText,
        sendChat,
        sendCouncil,
        sendResearch,
        clearChat,
        cancelStream,
        agentStatuses,
        taskQueue,
        availableModels,
        terminalLines,
        dangerousCommand,
        sendAgentCommand,
        approveCommand,
        denyCommand,
        calendarEvents,
        refreshCalendar: fetchCalendar
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocketContext must be used within a WebSocketProvider");
  return context;
}