import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { subscribeActiveChat, subscribeActiveProjectFiles, ContextFile } from "@/context/ProjectsContext";
import { clearOfflineTimer } from "@/lib/bootState";
import { toast } from "sonner";
import { useWebSocketStore } from "@/store/websocketStore";

type WebSocketContextType = {
  connected: boolean;
  connecting: boolean;
  sendAgentCommand: (cmd: string) => void;
  approveCommand: () => void;
  denyCommand: () => void;
  sendChat: (message: string, model: string, options?: { web_search?: boolean; use_vault?: boolean }) => void;
  sendCouncil: (message: string, models: string[]) => void;
  sendResearch: (message: string) => void;
  cancelStream: () => void;
  refreshCalendar: () => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const {
    setActiveChatId,
    setMessagesMap,
    setCouncilMessages,
    setIsStreaming,
    setTelemetry,
    setCitations,
    setResearchText,
    setAgentStatuses,
    setAvailableModels,
    setTerminalLines,
    setDangerousCommand,
    setCalendarEvents,
  } = useWebSocketStore.getState();

  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    return subscribeActiveChat((id) => {
      activeChatIdRef.current = id;
      useWebSocketStore.getState().setActiveChatId(id);
    });
  }, []);

  const activeFilesRef = useRef<ContextFile[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      if (typeof subscribeActiveProjectFiles === "function") {
        unsub = subscribeActiveProjectFiles((files) => {
          activeFilesRef.current = files;
        });
      }
    } catch (e) {
      // ignore
    }
    return () => { unsub?.(); };
  }, []);


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
        useWebSocketStore.getState().setCalendarEvents(data.events || []);
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
        useWebSocketStore.getState().setAvailableModels(list);
      }
    } catch {
      // ignore
    }
  }, []);


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
      useWebSocketStore.getState().setTerminalLines((prev) => [...prev, ...newTerminalLines]);
    }

    const state = useWebSocketStore.getState();
    if (activeChatIdRef.current && chatAppends[lastTargetModel]) {
      const contentToAppend = chatAppends[lastTargetModel];
      state.setMessagesMap((prev) => {
        const chatId = activeChatIdRef.current!;
        const sessionMsgs = prev[chatId] || [];
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
        return { ...prev, [chatId]: updatedMsgs };
      });
    }

    Object.entries(chatAppends).forEach(([mKey, contentToAppend]) => {
      state.setCouncilMessages((prev) => {
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
      state.setResearchText((prev) => prev + chatAppends["research"]);
    }
  }, []);

  const handleMessage = useCallback((data: any) => {
    const state = useWebSocketStore.getState();

    if (data.event === "token") {
      state.setIsStreaming(true);
      const payload = data.payload as { content?: string; text?: string; model?: string };
      const content = payload.content !== undefined ? payload.content : (payload.text || "");
      const targetModel = payload.model || "assistant";

      tokenBuffer.current.push({ content, targetModel });
      if (!batchTimeout.current) {
        batchTimeout.current = setTimeout(commitBufferedTokens, 50);
      }
    } else if (data.event === "status") {
      const statusMsg = data.payload.status as string;
      state.setLastStatus(statusMsg);
      const statusModel = data.payload.model as string;
      if (statusModel && ["Planner", "Coder", "OpenCode Delegator", "Tester", "Logger", "Journal", "Supervisor"].includes(statusModel)) {
        state.setAgentStatuses((prev) => {
          const realPid = (data.payload.pid as string) || (data.payload.process_id as string) || (data.payload.id as string) || Math.floor(Math.random() * 10000 + 1000).toString();
          const existing = prev.find((a) => a.name === statusModel);
          if (existing) {
            return prev.map((a) => {
              if (a.name === statusModel) {
                return {
                  ...a,
                  status: "running",
                  action: (data.payload.status as string) || a.action,
                  pid: realPid
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

        state.setTerminalLines((prev) => [
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
        state.setIsStreaming(false);
        if (data.payload.telemetry) {
          state.setTelemetry(data.payload.telemetry as any);
        }
      } else if (data.payload.status === "waiting_confirmation") {
        state.setDangerousCommand({
          id: data.id || lastReqId.current,
          command: data.payload.command
        });
      }
      
      if (statusMsg && statusMsg.startsWith("Crawling: ")) {
        const url = statusMsg.replace("Crawling: ", "").trim();
        state.setCitations((prev) => {
          if (prev.includes(url)) return prev;
          return [...prev, url];
        });
      }
    } else if (data.event === "gate") {
      state.setDangerousCommand({
        id: data.id,
        command: data.payload.command || data.payload.prompt || data.payload
      });
      const gatePayload = data.payload as any;
      if (gatePayload?.urls) {
        state.setCitations(() => gatePayload.urls);
      }
    } else if (data.event === "done") {
      state.setIsStreaming(false);
      state.setLastStatus(null);
      if (data.payload?.telemetry) {
        state.setTelemetry(data.payload.telemetry as any);
      }
      toast.success("Execution completed successfully");
    } else if (data.event === "error") {
      state.setIsStreaming(false);
      state.setLastStatus(null);
      if (data.payload?.telemetry) {
        state.setTelemetry(data.payload.telemetry as any);
      }
      const errorMsg = data.payload?.error || data.payload || "An error occurred";
      toast.error(`Daemon Error: ${errorMsg}`);
    }
  }, [commitBufferedTokens]);

  const { connected, connecting, send } = useWebSocket(handleMessage);

  useEffect(() => {
    if (connected) {
      clearOfflineTimer();
      fetchModels();
    }
  }, [connected, fetchModels]);

  useEffect(() => {
    if (!connected) return;
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 60000);
    return () => clearInterval(interval);
  }, [connected, fetchCalendar]);

  useEffect(() => {
    return () => {
      if (batchTimeout.current) clearTimeout(batchTimeout.current);
    };
  }, []);

  const sendAgentCommand = useCallback((cmd: string) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    
    const state = useWebSocketStore.getState();
    state.setIsStreaming(true);
    state.setLastStatus("Initializing agent...");

    state.setTerminalLines((prev) => [
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
    const state = useWebSocketStore.getState();
    const targetId = reqId || state.dangerousCommand?.id || lastReqId.current;
    if (!targetId) return;
    send({
      id: targetId,
      type: "confirm",
      payload: {}
    });
    state.setDangerousCommand(null);
  }, [send]);

  const denyCommand = useCallback((reqId?: string) => {
    if (!send) return;
    const state = useWebSocketStore.getState();
    const targetId = reqId || state.dangerousCommand?.id || lastReqId.current;
    if (!targetId) return;
    send({
      id: targetId,
      type: "cancel",
      payload: {}
    });
    state.setDangerousCommand(null);
  }, [send]);

  const sendChat = useCallback((message: string, model: string, options?: { web_search?: boolean; use_vault?: boolean }) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;

    const state = useWebSocketStore.getState();
    const chatId = activeChatIdRef.current;
    const history = chatId
      ? (state.messagesMap[chatId] || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : [];

    if (chatId) {
      state.setMessagesMap((prev) => {
        const sessionMsgs = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...sessionMsgs, { id: msgId, role: "user", content: message, model }]
        };
      });
    }

    state.setIsStreaming(true);
    state.setLastStatus("Sending message...");
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
        context: { attachments },
        ...(options?.web_search !== undefined ? { web_search: options.web_search } : {}),
        ...(options?.use_vault !== undefined ? { use_vault: options.use_vault } : {})
      }
    });
  }, [send]);

  const sendCouncil = useCallback((message: string, models: string[]) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    
    const state = useWebSocketStore.getState();
    state.setIsStreaming(true);

    state.setCouncilMessages((prev) => {
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
      }
    });
  }, [send]);

  const cancelStream = useCallback(() => {
    useWebSocketStore.getState().setIsStreaming(false);
    tokenBuffer.current = [];
    toast.info("Streaming interrupted");
  }, []);

  const sendResearch = useCallback((message: string) => {
    if (!send) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    
    const state = useWebSocketStore.getState();
    state.setIsStreaming(true);
    state.setResearchText(() => "");

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

  return (
    <WebSocketContext.Provider
      value={{
        connected,
        connecting,
        sendChat,
        sendCouncil,
        sendResearch,
        cancelStream,
        sendAgentCommand,
        approveCommand,
        denyCommand,
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