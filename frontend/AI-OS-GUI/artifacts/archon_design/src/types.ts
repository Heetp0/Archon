export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  model?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  pid: string;
  status: "running" | "idle" | "complete" | "failed";
  action: string;
  progress: number;
}

export interface TaskItem {
  id: string;
  name: string;
  status: "queued" | "running" | "complete" | "failed";
}

export interface CitationItem {
  id: string;
  url: string;
  title: string;
}

export interface TerminalLine {
  id: string;
  text: string;
  kind: "system" | "input" | "output" | "warning" | "error" | "success";
  timestamp: string;
}

export interface DangerousCommandWarning {
  command: string;
  reason: string;
}
