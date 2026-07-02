import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

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
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
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
  
  const sendAgentCommand = (cmd: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setIsStreaming(true);
    
    // Add command echo to terminal
    setTerminalLines(prev => [...prev, {
      id: Math.random().toString(),
      text: `$ ${cmd}`,
      kind: "input",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    }]);

    wsRef.current.send(JSON.stringify({
      id: msgId,
      mode: "agent",
      payload: { content: cmd }
    }));
  }

  const approveCommand = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!lastReqId.current) return;
    wsRef.current.send(JSON.stringify({
      id: lastReqId.current,
      type: "confirm",
      payload: {}
    }));
    setDangerousCommand(null);
  }

  const denyCommand = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!lastReqId.current) return;
    wsRef.current.send(JSON.stringify({
      id: lastReqId.current,
      type: "cancel",
      payload: {}
    }));
    setDangerousCommand(null);
  }
  
  const wsRef = useRef<WebSocket | null>(null);
  const lastReqId = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = () => {
    try {
      setConnecting(true);
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${host}:${port}/ws`);

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        console.log("WebSocket connected to Archon Daemon");
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Changed data.type to data.event
          if (data.event === "token") {
            setIsStreaming(true);
            const { content, model } = data.payload;
            const targetModel = model || "assistant";
            
            // Route agent logs to terminalLines
            const agentModels = ["Planner", "Coder", "OpenCode Delegator", "Tester", "Logger", "Journal", "Supervisor"];
            if (agentModels.includes(targetModel)) {
              setTerminalLines(prev => [...prev, {
                id: Math.random().toString(),
                text: content.trimEnd(),
                kind: "output",
                timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
              }]);
              return; // Do not bleed agent output into chat/council messages
            }

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant" && last.model === targetModel) {
                return [...prev.slice(0, -1), { ...last, content: last.content + content }];
              } else {
                return [...prev, { id: Math.random().toString(), role: "assistant", content, model: targetModel }];
              }
            });

            setCouncilMessages((prev) => {
              const modelMsgs = prev[targetModel] || [];
              const last = modelMsgs[modelMsgs.length - 1];
              let updatedMsgs;
              if (last && last.role === "assistant") {
                updatedMsgs = [...modelMsgs.slice(0, -1), { ...last, content: last.content + content }];
              } else {
                updatedMsgs = [...modelMsgs, { id: Math.random().toString(), role: "assistant", content, model: targetModel }];
              }
              return { ...prev, [targetModel]: updatedMsgs };
            });
            
            if (targetModel === "research") {
                setResearchText(prev => prev + content);
            }
          } else if (data.event === "status") {
            const statusModel = data.payload.model;
            if (statusModel && ["Planner", "Coder", "OpenCode Delegator", "Tester", "Logger", "Journal", "Supervisor"].includes(statusModel)) {
              setAgentStatuses(prev => {
                const existing = prev.find(a => a.name === statusModel);
                if (existing) {
                  return prev.map(a => a.name === statusModel ? { ...a, status: "running", action: data.payload.status } : { ...a, status: "idle" });
                } else {
                  return [...prev.map(a => ({...a, status: "idle"})), { 
                    id: Math.random().toString(), 
                    name: statusModel, 
                    pid: Math.floor(Math.random() * 10000 + 1000).toString(), 
                    status: "running", 
                    action: data.payload.status, 
                    progress: 50 
                  }];
                }
              });
              setTerminalLines(prev => [...prev, {
                id: Math.random().toString(),
                text: `[SYSTEM] ${data.payload.status}`,
                kind: "system",
                timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
              }]);
            }
            if (data.payload.status === "done") {
              setIsStreaming(false);
              if (data.payload.telemetry) {
                  setTelemetry(data.payload.telemetry);
              }
            } else if (data.payload.status === "waiting_confirmation") {
              // Handle safety watchdog gating
              setDangerousCommand(data.payload.command);
            }
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        console.log("WebSocket disconnected. Reconnecting in 2s...");
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WebSocket connection error:", e);
      setConnecting(false);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnection loop on unmount
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const sendChat = (message: string, model: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setMessages((prev) => [...prev, { id: msgId, role: "user", content: message, model }]);
    setIsStreaming(true);
    wsRef.current.send(JSON.stringify({
      id: msgId,
      mode: "chat",
      payload: { content: message, model }
    }));
  };

  const sendCouncil = (message: string, models: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setIsStreaming(true);
    setCouncilMessages((prev) => {
      const next = { ...prev };
      models.forEach(m => {
        if (!next[m]) next[m] = [];
        next[m].push({ id: msgId, role: "user", content: message, model: m });
      });
      return next;
    });
    wsRef.current.send(JSON.stringify({
      id: msgId,
      mode: "council",
      payload: { content: message }
    }));
  };
  
  const sendResearch = (message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msgId = Math.random().toString();
    lastReqId.current = msgId;
    setIsStreaming(true);
    setResearchText("");
    wsRef.current.send(JSON.stringify({
      id: msgId,
      mode: "research",
      payload: { content: message }
    }));
  };

  const clearChat = () => {
    setMessages([]);
    setCouncilMessages({});
    setResearchText("");
  };

  return (
    <WebSocketContext.Provider value={{ connected, connecting, messages, councilMessages, isStreaming, telemetry, citations, researchText, sendChat, sendCouncil, sendResearch, clearChat, agentStatuses, taskQueue, availableModels, terminalLines, dangerousCommand, sendAgentCommand, approveCommand, denyCommand }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocketContext must be used within a WebSocketProvider");
  return context;
}









