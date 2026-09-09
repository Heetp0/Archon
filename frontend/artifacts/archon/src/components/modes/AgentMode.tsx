import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Cpu, Terminal, Loader2, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, X, Send, LayoutDashboard,
  Paperclip, Plus, History, FileCode, RotateCcw, Check, Copy,
  Columns, Code2, Sparkles, ShieldCheck, Download, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebSocketStore, PlanStep, ToolCall, DangerousCommand } from "@/store/websocketStore";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import { Button } from "@/components/ui/button";
import BrowsePCModal from "@/components/BrowsePCModal";
import type { TerminalLine } from "@/types";

const STATUS_ICON = {
  complete: CheckCircle2,
  running:  Loader2,
  queued:   Clock,
  failed:   XCircle,
} as const;

const STATUS_COLOR = {
  complete: "text-accent-emerald",
  running:  "text-accent-emerald",
  queued:   "text-text-secondary",
  failed:   "text-accent-rose",
} as const;

const LINE_COLOR: Record<TerminalLine["kind"], string> = {
  system:  "text-text-secondary",
  input:   "text-accent-emerald font-semibold",
  output:  "text-text-primary",
  warning: "text-amber-400",
  error:   "text-accent-rose",
  success: "text-accent-emerald",
};

const LINE_PREFIX: Record<TerminalLine["kind"], string> = {
  system:  "ℹ ",
  input:   "$ ",
  output:  "  ",
  warning: "⚠ ",
  error:   "✖ ",
  success: "✔ ",
};

// ── New Agent Project Blocker ────────────────────────────────────────────────
function NewAgentProjectBlocker() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [browsePCOpen, setBrowsePCOpen] = useState(false);
  const { createAgentProject } = useProjectsContext();

  const goToFolder = () => {
    if (!name.trim()) return;
    setBrowsePCOpen(true);
  };

  const handleFolderSelect = (path: string) => {
    setBrowsePCOpen(false);
    createAgentProject(name.trim(), path);
    setShowForm(false);
    setName("");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <Cpu className="w-10 h-10 text-text-secondary" />
      <div>
        <h3 className="text-sm font-mono text-text-primary mb-1">No active Agent Project</h3>
        <p className="text-xs font-mono text-text-secondary max-w-sm leading-relaxed">
          Agent Runtime requires a project linked to a folder on your PC before it can read or modify files.
          Create one below or select an existing Agent Project from the sidebar.
        </p>
      </div>

      {showForm ? (
        <div className="w-full max-w-xs space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goToFolder(); if (e.key === "Escape") setShowForm(false); }}
            placeholder="Project name..."
            className="w-full bg-panel-bg border border-border-core/30 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-emerald/40"
          />
          <div className="flex gap-2">
            <button
              onClick={goToFolder}
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl bg-accent-emerald hover:bg-accent-emerald text-text-primary text-xs font-mono disabled:opacity-30 transition-colors"
            >
              Next: Select Folder →
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-border-core/25 text-text-secondary hover:text-text-primary text-xs font-mono transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          className="bg-accent-emerald hover:bg-accent-emerald text-text-primary font-mono text-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Agent Project
        </Button>
      )}

      <BrowsePCModal
        open={browsePCOpen}
        onClose={() => { setBrowsePCOpen(false); setShowForm(false); }}
        onSelect={handleFolderSelect}
      />
    </div>
  );
}

// ── Plan Checklist Card (Devin-style) ─────────────────────────────────────────
function PlanChecklistCard({ planSteps }: { planSteps: PlanStep[] }) {
  if (!planSteps || planSteps.length === 0) return null;

  return (
    <div className="bg-panel-bg border border-border-core rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border-core/40 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-emerald" />
          <h3 className="font-mono text-xs font-bold text-text-primary tracking-wider uppercase">
            Execution Plan ({planSteps.length} Steps)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded border border-accent-emerald/20">
          AUTOPILOT
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {planSteps.map((step) => {
          const isDone = step.status === "completed";
          const isRunning = step.status === "running";
          const isFailed = step.status === "failed";

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded border text-xs font-mono transition-all ${
                isRunning
                  ? "border-accent-emerald bg-accent-emerald/5 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                  : isDone
                  ? "border-border-core/50 bg-panel-bg/40 opacity-75"
                  : isFailed
                  ? "border-accent-rose/50 bg-accent-rose/5"
                  : "border-border-core/40 bg-panel-bg"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-accent-emerald animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                  ) : isFailed ? (
                    <XCircle className="w-3.5 h-3.5 text-accent-rose" />
                  ) : (
                    <span className="inline-block w-3.5 h-3.5 rounded-full border border-text-secondary/40 text-[9px] text-center text-text-secondary leading-3">
                      {step.id}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${isDone ? "line-through text-text-secondary" : "text-text-primary"}`}>
                    {step.title}
                  </div>
                  {step.acceptance_criteria && (
                    <div className="text-[11px] text-text-secondary mt-1 flex items-center gap-1.5">
                      <span className="text-accent-emerald/80 font-mono text-[9px] uppercase tracking-wider bg-accent-emerald/10 px-1 py-0.2 rounded">
                        Criteria
                      </span>
                      <span className="truncate">{step.acceptance_criteria}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tool Call Activity Stream (Claude Code-style ⏺ bullets) ───────────────────
function ToolCallActivityCard({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!toolCalls || toolCalls.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-panel-bg border border-border-core rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border-core/40 pb-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-accent-emerald" />
          <h3 className="font-mono text-xs font-bold text-text-primary tracking-wider uppercase">
            Tool Activity ({toolCalls.length})
          </h3>
        </div>
        <span className="text-[10px] font-mono text-text-secondary">
          AUDIT LOG
        </span>
      </div>

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {toolCalls.slice(-8).map((tc) => {
          const isDone = tc.status === "done";
          const isExp = !!expanded[tc.id];

          return (
            <div
              key={tc.id}
              className="border border-border-core/50 rounded bg-app-bg text-[11px] font-mono overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleExpand(tc.id)}
                className="w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-panel-bg/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2 truncate">
                  {isDone ? (
                    <span className="text-accent-emerald select-none">✔</span>
                  ) : (
                    <Loader2 className="w-3 h-3 text-accent-emerald animate-spin flex-shrink-0" />
                  )}
                  <span className="font-bold text-accent-emerald">{tc.tool}</span>
                  <span className="text-text-secondary truncate">{tc.input}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-[9px] text-text-secondary">{tc.timestamp}</span>
                  {isExp ? <ChevronUp className="w-3 h-3 text-text-secondary" /> : <ChevronDown className="w-3 h-3 text-text-secondary" />}
                </div>
              </button>

              {isExp && (
                <div className="px-3 py-2 border-t border-border-core/40 bg-panel-bg text-[10px] text-text-secondary space-y-1">
                  <div><span className="text-text-primary font-bold">Input:</span> {tc.input}</div>
                  {tc.exit_code !== undefined && <div><span className="text-text-primary font-bold">Exit Code:</span> {tc.exit_code}</div>}
                  {tc.result_count !== undefined && <div><span className="text-text-primary font-bold">Results:</span> {tc.result_count} entries</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Supervisor Telemetry Meter Bar (Devin ACU & Cursor style) ───────────────
function SupervisorMeterBar({
  telemetry,
  toolCallsCount,
  planStepsCount
}: {
  telemetry: { tokens: number; cost: number; latency: number };
  toolCallsCount: number;
  planStepsCount: number;
}) {
  const tokenCount = telemetry?.tokens || 0;
  const rawAcu = Math.max(0.1, (tokenCount / 10000) + (toolCallsCount * 0.25)).toFixed(1);
  const acuTier = Number(rawAcu) <= 2 ? "XS" : Number(rawAcu) <= 5 ? "S" : Number(rawAcu) <= 10 ? "M" : "L";
  const tierColor = acuTier === "XS" || acuTier === "S"
    ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/30"
    : acuTier === "M"
    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
    : "bg-accent-rose/10 text-accent-rose border-accent-rose/30";

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-app-bg border border-border-core text-[11px] text-text-secondary">
        <span className="text-text-primary font-semibold">{tokenCount.toLocaleString()}</span> tokens
        <span className="text-border-core">·</span>
        <span className="text-text-primary font-semibold">{toolCallsCount}</span> tool calls
        {planStepsCount > 0 && (
          <>
            <span className="text-border-core">·</span>
            <span className="text-text-primary font-semibold">{planStepsCount}</span> steps
          </>
        )}
      </div>

      <div
        title={`Supervisor Budget: ${rawAcu} ACU consumed (${tokenCount} tokens, ${toolCallsCount} tool operations)`}
        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${tierColor}`}
      >
        {acuTier} ({rawAcu} ACU)
      </div>
    </div>
  );
}

// ── Session History Drawer Modal ─────────────────────────────────────────────
function SessionHistoryModal({
  open,
  onClose,
  onSelectSession
}: {
  open: boolean;
  onClose: () => void;
  onSelectSession: (taskId: string) => void;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
    const port = localStorage.getItem("archon_daemon_port") || "8765";
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const token = localStorage.getItem("archon_token") || "";

    fetch(`${protocol}://${host}:${port}/agents/sessions?limit=15`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
      })
      .catch(err => {
        console.error("Failed to load sessions:", err);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/80 backdrop-blur-sm p-4">
      <div className="bg-panel-bg border border-border-core rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border-core flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent-emerald" />
            <h3 className="font-mono text-sm font-bold text-text-primary">Agent Session History</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs font-mono text-text-secondary gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent-emerald" />
              Loading past sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-text-secondary">
              No recorded sessions found in journal.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.task_id}
                className="p-3 rounded border border-border-core/60 bg-app-bg hover:border-accent-emerald/50 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-text-primary">{s.task_id}</div>
                  <div className="font-mono text-[10px] text-text-secondary mt-0.5">
                    {s.started_at ? new Date(s.started_at).toLocaleString() : "Unknown date"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    s.status === "completed"
                      ? "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/10"
                      : "text-text-secondary border-border-core bg-panel-bg"
                  }`}>
                    {s.status?.toUpperCase()}
                  </span>
                  <button
                    onClick={() => {
                      onSelectSession(s.task_id);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-accent-emerald hover:bg-accent-emerald text-text-primary font-mono text-[11px] font-semibold transition-colors"
                  >
                    Replay
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Agent Mode Component ────────────────────────────────────────────────
export default function AgentMode() {
  const { sendAgentCommand, approveCommand, denyCommand, connected, fetchSessionHistory } = useWebSocketContext();
  const agentStatuses = useWebSocketStore(s => s.agentStatuses);
  const taskQueue = useWebSocketStore(s => s.taskQueue);
  const terminalLines = useWebSocketStore(s => s.terminalLines);
  const dangerousCommand = useWebSocketStore(s => s.dangerousCommand);
  const planSteps = useWebSocketStore(s => s.planSteps);
  const toolCalls = useWebSocketStore(s => s.toolCalls);
  const sessionMetadata = useWebSocketStore(s => s.sessionMetadata);
  const telemetry = useWebSocketStore(s => s.telemetry);

  const { projects, activeProjectId } = useProjectsContext();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  // View state: "split" (Plan + Terminal), "dashboard" (Daemons + Queue), "terminal" (Full terminal)
  const [viewMode, setViewMode] = useState<"split" | "dashboard" | "terminal">("split");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [cmdInput, setCmdInput] = useState("");

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentCmdRef = useRef<string>("");

  const clearTerminal = useCallback(() => {
    useWebSocketStore.getState().setTerminalLines(() => []);
    toast.info("Terminal lines cleared");
  }, []);

  const copyTerminalText = useCallback(() => {
    const lines = useWebSocketStore.getState().terminalLines;
    const text = lines.map(l => `[${l.timestamp}] ${l.text}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Terminal log copied to clipboard");
  }, []);

  const downloadTerminalLog = useCallback(() => {
    const lines = useWebSocketStore.getState().terminalLines;
    const text = lines.map(l => `[${l.timestamp}] ${l.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent_session_${sessionMetadata?.task_id || "log"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Session log downloaded");
  }, [sessionMetadata]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLines]);

  const handleSendCmd = useCallback(() => {
    if (!cmdInput.trim()) return;
    lastSentCmdRef.current = cmdInput.trim();
    sendAgentCommand(cmdInput.trim());
    setCmdInput("");
  }, [cmdInput, sendAgentCommand]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendCmd();
    if (e.key === "ArrowUp" && !cmdInput && lastSentCmdRef.current) {
      e.preventDefault();
      setCmdInput(lastSentCmdRef.current);
    }
  };

  const copySolutionCode = () => {
    if (!dangerousCommand?.solution_preview) return;
    navigator.clipboard.writeText(dangerousCommand.solution_preview);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Blocking state — no active agent project
  if (!activeProject || activeProject.kind !== "agent") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-full bg-app-bg"
      >
        <NewAgentProjectBlocker />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.01 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-app-bg relative overflow-hidden"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.md,.py,.js,.ts,.json,.csv"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* ── Header bar ── */}
      <div className="p-3.5 border-b border-border-core flex items-center justify-between bg-panel-bg flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-emerald" />
            <h1 className="text-sm font-mono text-text-primary font-bold tracking-tight">AGENT RUNTIME</h1>
            {sessionMetadata?.task_id && (
              <span className="text-[10px] font-mono text-text-secondary bg-app-bg px-2 py-0.5 rounded border border-border-core">
                {sessionMetadata.task_id}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-secondary mt-0.5">
            <span className="text-accent-emerald font-semibold">{activeProject.name}</span>
            {activeProject.folderPath && (
              <span className="text-text-secondary"> · {activeProject.folderPath}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Supervisor Telemetry Gauge */}
          <SupervisorMeterBar
            telemetry={telemetry}
            toolCallsCount={toolCalls.length}
            planStepsCount={planSteps.length}
          />

          {/* Replay / History button */}
          <button
            onClick={() => setHistoryOpen(true)}
            title="View Past Agent Sessions"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-app-bg border border-border-core text-xs font-mono text-text-secondary hover:text-text-primary hover:border-accent-emerald/40 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-accent-emerald" />
            <span>History</span>
          </button>

          {/* Attach */}
          <button
            onClick={openPicker}
            title="Attach files to project"
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary border border-border-core rounded bg-app-bg transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* View toggle pills */}
          <div className="flex rounded border border-border-core overflow-hidden bg-app-bg">
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs transition-colors ${
                viewMode === "split" ? "bg-accent-emerald/20 text-accent-emerald font-bold" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Split
            </button>
            <button
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs border-l border-border-core transition-colors ${
                viewMode === "dashboard" ? "bg-accent-emerald/20 text-accent-emerald font-bold" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setViewMode("terminal")}
              className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs border-l border-border-core transition-colors ${
                viewMode === "terminal" ? "bg-accent-emerald/20 text-accent-emerald font-bold" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Shell
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* VIEW 1: Split View (Devin-style: Plan + Tools on Left, Terminal on Right) */}
        {viewMode === "split" && (
          <div className="absolute inset-0 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
            {/* Left Column: Plan & Tools (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
              <PlanChecklistCard planSteps={planSteps} />
              <ToolCallActivityCard toolCalls={toolCalls} />
              
              {/* If no plan or tools yet, show empty state helper */}
              {(!planSteps || planSteps.length === 0) && (!toolCalls || toolCalls.length === 0) && (
                <div className="bg-panel-bg border border-border-core/50 rounded-lg p-6 text-center space-y-2">
                  <Cpu className="w-8 h-8 text-accent-emerald/50 mx-auto" />
                  <h4 className="font-mono text-xs font-bold text-text-primary">Plan & Tool Stream Active</h4>
                  <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
                    Dispatch an engineering directive below. The Planner will structure verified steps, and tool executions will stream in real-time.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Live Terminal & Input (7 cols) */}
            <div className="md:col-span-7 flex flex-col glass-panel border border-border-core rounded-lg overflow-hidden min-h-0 bg-app-bg">
              <div className="flex items-center justify-between px-4 py-2 bg-panel-bg border-b border-border-core flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-accent-emerald" />
                  <span className="text-[11px] font-mono text-accent-emerald tracking-wider uppercase font-bold">
                    Terminal Output & Verifier Stream
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-text-secondary mr-2">
                    {terminalLines.length} lines
                  </span>
                  <button
                    onClick={copyTerminalText}
                    title="Copy terminal output"
                    className="p-1 rounded hover:bg-app-bg text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={downloadTerminalLog}
                    title="Export session log"
                    className="p-1 rounded hover:bg-app-bg text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clearTerminal}
                    title="Clear terminal output"
                    className="p-1 rounded hover:bg-app-bg text-text-secondary hover:text-accent-rose transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 min-h-0"
                style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-border-core) transparent" }}
              >
                {terminalLines.map((line) => (
                  <div key={line.id} className={`flex gap-2.5 ${LINE_COLOR[line.kind as keyof typeof LINE_COLOR]}`}>
                    <span className="text-text-secondary/50 select-none flex-shrink-0 text-[10px]">{line.timestamp}</span>
                    <span className="flex-shrink-0 select-none">{LINE_PREFIX[line.kind as keyof typeof LINE_PREFIX]}</span>
                    <span className="break-all whitespace-pre-wrap">{line.text}</span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Command input */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-border-core bg-panel-bg flex-shrink-0">
                <span className="text-accent-emerald font-mono text-sm select-none">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? "Enter agent instruction or prompt..." : "Daemon offline"}
                  disabled={!connected}
                  className="flex-1 bg-transparent text-accent-emerald placeholder:text-text-secondary font-mono text-sm outline-none caret-green-400 disabled:opacity-40"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleSendCmd}
                  disabled={!connected || !cmdInput.trim()}
                  className="px-3 py-1.5 rounded bg-accent-emerald hover:bg-accent-emerald text-text-primary text-xs font-mono font-bold disabled:opacity-30 transition-colors flex items-center gap-1.5"
                >
                  <span>Dispatch</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Dashboard Overview View */}
        {viewMode === "dashboard" && (
          <div className="absolute inset-0 p-6 flex flex-col gap-6 overflow-hidden">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
              {/* Active Daemons */}
              <div className="flex flex-col space-y-3 overflow-hidden">
                <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest flex items-center gap-2 flex-shrink-0 font-bold">
                  <Cpu className="w-4 h-4 text-accent-emerald" /> Active Node Subprocesses
                </h2>
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {agentStatuses.length === 0 ? (
                    <div className="text-xs font-mono text-text-secondary text-center py-12 glass-panel border border-border-core rounded-lg">
                      No active subagents currently processing.
                    </div>
                  ) : (
                    agentStatuses.map((agent) => (
                      <div
                        key={agent.id}
                        className="glass-panel border border-border-core rounded-lg p-4 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-mono text-text-primary text-sm font-bold">{agent.name}</h3>
                            <div className="text-xs font-mono text-accent-emerald mt-0.5">PID: {agent.pid}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-accent-emerald/30 text-accent-emerald bg-accent-emerald/10">
                            {agent.status?.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-text-secondary mt-2">
                          <span className="text-text-primary font-semibold">Action:</span> {agent.action}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Task Queue */}
              <div className="flex flex-col space-y-3 overflow-hidden">
                <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest flex items-center gap-2 flex-shrink-0 font-bold">
                  <Terminal className="w-4 h-4 text-accent-emerald" /> Pipeline Stage Queue
                </h2>
                <div className="flex-1 glass-panel border border-border-core rounded-lg overflow-hidden flex flex-col min-h-0 p-4">
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {taskQueue.length === 0 ? (
                      <div className="text-xs font-mono text-text-secondary text-center py-12">
                        Pipeline idle. Send a directive to begin.
                      </div>
                    ) : (
                      taskQueue.map((task) => {
                        const Icon = STATUS_ICON[task.status as keyof typeof STATUS_ICON];
                        return (
                          <div key={task.id} className="flex items-center gap-3 p-3 rounded bg-panel-bg border border-border-core/60">
                            <div className="font-mono text-[10px] text-text-secondary w-12">{task.id}</div>
                            <div className="font-mono text-xs flex-1 text-text-primary truncate">{task.name}</div>
                            <div className={`flex items-center gap-1 text-[10px] font-mono uppercase ${STATUS_COLOR[task.status as keyof typeof STATUS_COLOR]}`}>
                              {Icon && <Icon className="w-3.5 h-3.5" />}
                              <span>{task.status}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom prompt */}
            <div className="flex items-center gap-3 border border-border-core rounded-lg bg-panel-bg px-4 py-3 flex-shrink-0">
              <span className="text-accent-emerald font-mono text-sm select-none">$</span>
              <input
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={connected ? "Dispatch command to agent runtime..." : "Daemon offline"}
                disabled={!connected}
                className="flex-1 bg-transparent text-accent-emerald placeholder:text-text-secondary font-mono text-sm outline-none caret-green-400 disabled:opacity-40"
              />
              <button
                onClick={handleSendCmd}
                disabled={!connected || !cmdInput.trim()}
                className="px-3 py-1.5 rounded bg-accent-emerald hover:bg-accent-emerald text-text-primary text-xs font-mono font-bold disabled:opacity-30 transition-colors"
              >
                Execute
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: Full Terminal View */}
        {viewMode === "terminal" && (
          <div className="absolute inset-0 flex flex-col bg-app-bg">
            <div className="flex items-center justify-between px-4 py-2 bg-panel-bg border-b border-border-core flex-shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-accent-emerald" />
                <span className="text-[11px] font-mono text-accent-emerald tracking-wider uppercase font-bold">
                  Dedicated Agent Shell Console
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-text-secondary mr-2">
                  {terminalLines.length} lines
                </span>
                <button
                  onClick={copyTerminalText}
                  title="Copy terminal output"
                  className="p-1 rounded hover:bg-app-bg text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={downloadTerminalLog}
                  title="Export session log"
                  className="p-1 rounded hover:bg-app-bg text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={clearTerminal}
                  title="Clear terminal output"
                  className="p-1 rounded hover:bg-app-bg text-text-secondary hover:text-accent-rose transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 min-h-0">
              {terminalLines.map((line) => (
                <div key={line.id} className={`flex gap-3 ${LINE_COLOR[line.kind as keyof typeof LINE_COLOR]}`}>
                  <span className="text-text-secondary/50 select-none flex-shrink-0 text-[10px]">{line.timestamp}</span>
                  <span className="flex-shrink-0 select-none">{LINE_PREFIX[line.kind as keyof typeof LINE_PREFIX]}</span>
                  <span className="break-all whitespace-pre-wrap">{line.text}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-border-core bg-panel-bg flex-shrink-0">
              <span className="text-accent-emerald font-mono text-sm select-none">$</span>
              <input
                ref={inputRef}
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={connected ? "Enter command or directive..." : "Daemon offline"}
                disabled={!connected}
                className="flex-1 bg-transparent text-accent-emerald placeholder:text-text-secondary font-mono text-sm outline-none caret-green-400 disabled:opacity-40"
              />
              <button
                onClick={handleSendCmd}
                disabled={!connected || !cmdInput.trim()}
                className="px-3 py-1.5 rounded bg-accent-emerald hover:bg-accent-emerald text-text-primary text-xs font-mono font-bold disabled:opacity-30 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── High-Fidelity Human-in-the-Loop Approval Gate Modal (Claude Code / Devin Review style) ── */}
      <AnimatePresence>
        {dangerousCommand && (
          <motion.div
            key="approval-gate-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 15 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className="relative max-w-2xl w-full bg-panel-bg border-2 border-accent-emerald/60 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header banner */}
              <div className="bg-accent-emerald/15 border-b border-accent-emerald/30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-emerald/20 border border-accent-emerald/40 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-accent-emerald" />
                  </div>
                  <div>
                    <h2 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">
                      Authorization Checkpoint
                    </h2>
                    <p className="text-[11px] font-mono text-accent-emerald">
                      Target Subproject: {dangerousCommand.target_subproject || "Workspace/ProjectHub"}
                    </p>
                  </div>
                </div>

                {dangerousCommand.retry_count !== undefined && dangerousCommand.retry_count > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Self-Correction Retry #{dangerousCommand.retry_count}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Command & affected files */}
                <div className="bg-app-bg border border-border-core rounded-lg p-3 space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Command to Execute</div>
                  <div className="text-accent-emerald break-all font-semibold">$ {dangerousCommand.command}</div>
                  {dangerousCommand.files_affected && dangerousCommand.files_affected.length > 0 && (
                    <div className="text-[11px] text-text-secondary pt-1 border-t border-border-core/40 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-accent-emerald" />
                      <span>Affected Files: {dangerousCommand.files_affected.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Solution Code Preview (Claude Code Diff / Preview style) */}
                {dangerousCommand.solution_preview && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-primary font-bold flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-accent-emerald" />
                        Code Solution Preview (solution.py)
                      </span>
                      <button
                        onClick={copySolutionCode}
                        className="text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-accent-emerald" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                      </button>
                    </div>

                    <div className="bg-app-bg border border-border-core rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                      {dangerousCommand.solution_preview}
                    </div>
                  </div>
                )}

                <p className="text-[11px] font-mono text-text-secondary leading-relaxed">
                  The Coder Agent has compiled this solution. Approving allows OpenCode to execute and test it in your local workspace sandbox.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-border-core bg-panel-bg flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={denyCommand}
                  className="px-4 py-2 rounded-lg border border-border-core text-text-secondary hover:text-text-primary font-mono text-xs font-bold transition-colors"
                >
                  Deny / Cancel (Esc)
                </button>
                <button
                  onClick={approveCommand}
                  className="px-5 py-2 rounded-lg bg-accent-emerald hover:bg-accent-emerald text-text-primary font-mono text-xs font-bold transition-all shadow-lg shadow-accent-emerald/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Authorize & Execute (Enter)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Session History Modal ── */}
      <SessionHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSession={(taskId) => {
          fetchSessionHistory(taskId);
        }}
      />
    </motion.div>
  );
}
