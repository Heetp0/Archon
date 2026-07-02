import { useEffect, useRef, useCallback, useState } from "react";

export interface DaemonEnvelope {
  id: string;
  event: "token" | "status" | "gate" | "done" | "error" | "ping" | string;
  payload: Record<string, unknown>;
}

export interface WSState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  send: (msg: unknown) => boolean;
  messages: DaemonEnvelope[];
  flushMessages: () => void;
}

function getDaemonUrl(): string {
  const host = localStorage.getItem("archon_daemon_host") || "localhost";
  const port = localStorage.getItem("archon_daemon_port") || "8765";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${host}:${port}`;
}

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;

export function useWebSocket(): WSState {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DaemonEnvelope[]>([]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const flushMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const scheduleReconnect = useCallback((attempt: number) => {
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), RECONNECT_MAX_MS);
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connectRef.current();
    }, delay);
  }, []);

  const connectRef = useRef(() => {});

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(getDaemonUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data) as Record<string, unknown>;
          // Handle ping (may come as legacy {type:"ping"} or envelope {event:"ping"})
          if (parsed.type === "ping" || parsed.event === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }
          const envelope: DaemonEnvelope = {
            id: (parsed.id as string) || `msg-${Date.now()}`,
            event: (parsed.event as string) || (parsed.type as string) || "unknown",
            payload: (parsed.payload as Record<string, unknown>) || parsed,
          };
          setMessages((prev) => [...prev, envelope]);
        } catch {
          // non-JSON message — ignore
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError("Daemon connection error");
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;
        scheduleReconnect(reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;
      };
    } catch {
      setConnecting(false);
      setError("Failed to create WebSocket");
      scheduleReconnect(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
    }
  }, [scheduleReconnect]);

  connectRef.current = connect;

  const send = useCallback((msg: unknown): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Not connected to daemon");
      return false;
    }
    try {
      ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { connected, connecting, error, send, messages, flushMessages };
}
