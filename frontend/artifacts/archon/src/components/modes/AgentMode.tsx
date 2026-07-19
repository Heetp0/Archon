import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Cpu, Terminal, Loader2, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, X, Send, LayoutDashboard,
  Paperclip, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
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
  input:   "text-accent-emerald",
  output:  "text-accent-emerald",
  warning: "text-accent-rose",
  error:   "text-accent-rose",
  success: "text-accent-emerald",
};

const LINE_PREFIX: Record<TerminalLine["kind"], string> = {
  system:  "  ",
  input:   "",
  output:  "  ",
  warning: "⚠ ",
  error:   "✖ ",
  success: "✔ ",
};

// ── New Agent Project flow (from blocking state) ───────────────────────────────
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

// ── Main Agent Mode ────────────────────────────────────────────────────────────
export default function AgentMode() {
  const {
    agentStatuses, taskQueue, connected,
    terminalLines, dangerousCommand,
    sendAgentCommand, approveCommand, denyCommand,
  } = useWebSocketContext();

  const { projects, activeProjectId } = useProjectsContext();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSentCmdRef = useRef<string>("");

  useEffect(() => {
    if (terminalOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLines, terminalOpen]);

  useEffect(() => {
    if (terminalOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [terminalOpen]);

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

  // Blocking state — no active agent project
  if (!activeProject || activeProject.kind !== "agent") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-full bg-[#01040A]"
      >
        <NewAgentProjectBlocker />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#01040A] relative"
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
      <div className="p-4 border-b border-green-900/30 flex items-center justify-between bg-gradient-to-r from-green-950/20 to-transparent flex-shrink-0">
        <div>
          <h1 className="text-lg font-mono text-text-primary font-bold tracking-tight">AGENT RUNTIME</h1>
          <p className="text-xs font-mono text-text-secondary mt-0.5">
            <span className="text-green-700">{activeProject.name}</span>
            {activeProject.folderPath && (
              <span className="text-text-secondary"> · {activeProject.folderPath}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded bg-app-bg border border-border-core flex items-center gap-2">
            <div className="text-[10px] text-text-secondary font-mono uppercase">CPU</div>
            <div className="text-sm text-accent-emerald font-mono">—</div>
          </div>
          <div className="px-3 py-1.5 rounded bg-app-bg border border-border-core flex items-center gap-2">
            <div className="text-[10px] text-text-secondary font-mono uppercase">RAM</div>
            <div className="text-sm text-accent-emerald font-mono">—</div>
          </div>

          {/* Attach */}
          <button
            onClick={openPicker}
            title="Attach files to project"
            className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary border border-border-core rounded bg-app-bg transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* View toggle */}
          <div className="flex rounded border border-border-core overflow-hidden">
            <button
              onClick={() => setTerminalOpen(false)}
              data-testid="button-show-dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs transition-colors ${
                !terminalOpen ? "bg-panel-bg text-text-primary" : "bg-app-bg text-text-secondary hover:text-text-secondary"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setTerminalOpen(true)}
              data-testid="button-show-terminal"
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs border-l border-border-core transition-colors ${
                terminalOpen
                  ? "bg-green-900/30 text-accent-emerald "
                  : "bg-app-bg text-text-secondary hover:text-accent-emerald"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* Dashboard view */}
        <AnimatePresence>
          {!terminalOpen && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 p-6 flex flex-col gap-6 overflow-hidden"
            >
              <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
                {/* Active Daemons */}
                <div className="flex flex-col space-y-4 overflow-hidden">
                  <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                    <Cpu className="w-4 h-4 text-accent-emerald" /> Active Daemons
                  </h2>
                  <div className="space-y-4 overflow-y-auto flex-1">
                    {agentStatuses.length === 0 ? (
                      <div className="text-xs font-mono text-text-secondary text-center py-8">
                        No agents running. Send a command to start.
                      </div>
                    ) : agentStatuses.map((agent) => (
                      <div
                        key={agent.id}
                        className={`glass-panel border rounded-lg p-5 relative overflow-hidden flex-shrink-0 ${
                          agent.status === "running" ? "border-green-500/30" : "border-border-core"
                        } ${agent.status === "idle" ? "opacity-60" : ""}`}
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full ${
                          agent.status === "running"
                            ? "bg-accent-emerald "
                            : "bg-slate-600"
                        }`} />
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-mono text-text-primary text-sm font-bold">{agent.name}</h3>
                            <div className="text-xs font-mono text-accent-emerald mt-1">PID: {agent.pid}</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-[10px] font-mono border ${
                            agent.status === "running"
                              ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20 animate-pulse"
                              : agent.status === "complete"
                              ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20"
                              : agent.status === "failed"
                              ? "bg-accent-rose/10 text-accent-rose border-accent-rose/20"
                              : "bg-panel-bg text-text-secondary border-border-core/60"
                          }`}>
                            {agent.status.toUpperCase()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-text-secondary">Current Action</span>
                            <span className="text-text-primary">{agent.action}</span>
                          </div>
                          <div className="h-1.5 w-full bg-panel-bg rounded-full overflow-hidden border border-border-core">
                            <div
                              className={`h-full transition-all duration-500 ${
                                agent.status === "running"
                                  ? "bg-accent-emerald "
                                  : "bg-slate-600"
                              }`}
                              style={{ width: `${agent.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Queue */}
                <div className="flex flex-col space-y-4 overflow-hidden">
                  <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                    <Terminal className="w-4 h-4 text-accent-emerald" /> Task Queue
                  </h2>
                  <div className="flex-1 glass-panel border border-border-core rounded-lg overflow-hidden flex flex-col min-h-0">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-2">
                        {taskQueue.length === 0 ? (
                          <div className="text-xs font-mono text-text-secondary text-center py-8">
                            No tasks queued.
                          </div>
                        ) : taskQueue.map((task) => {
                          const Icon = STATUS_ICON[task.status as keyof typeof STATUS_ICON];
                          return (
                            <div key={task.id} className="flex items-center gap-4 p-3 rounded bg-panel-bg/50 border border-border-core/50">
                              <div className="font-mono text-[10px] text-text-secondary w-12">{task.id}</div>
                              <div className={`font-sans text-sm flex-1 ${
                                task.status === "complete" ? "text-text-secondary line-through" : "text-text-primary"
                              }`}>
                                {task.name}
                              </div>
                              <div className={`flex items-center gap-1.5 ${STATUS_COLOR[task.status as keyof typeof STATUS_COLOR]}`}>
                                {task.status === "running"
                                  ? <Icon className="w-4 h-4 animate-spin" />
                                  : <Icon className="w-4 h-4" />
                                }
                                <span className="text-[10px] font-mono uppercase tracking-wider">{task.status}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Dispatch prompt */}
              <div className="flex items-center gap-3 border border-border-core rounded-lg bg-app-bg px-4 py-3 flex-shrink-0">
                <span className="text-accent-emerald font-mono text-sm select-none flex-shrink-0">$</span>
                <input
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? "Dispatch command or directive to agent runtime..." : "Daemon offline"}
                  disabled={!connected}
                  data-testid="input-dashboard-command"
                  className="flex-1 bg-transparent text-accent-emerald placeholder:text-text-secondary font-mono text-sm outline-none caret-green-400 disabled:opacity-40"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleSendCmd}
                  disabled={!connected || !cmdInput.trim()}
                  data-testid="button-send-dashboard-command"
                  className="text-green-700 hover:text-accent-emerald disabled:opacity-30 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terminal view */}
        <AnimatePresence>
          {terminalOpen && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex flex-col bg-app-bg"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-[#050E05] border-b border-green-900/30 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-accent-rose/70" />
                    <div className="w-3 h-3 rounded-full bg-accent-rose/70" />
                    <div className="w-3 h-3 rounded-full bg-accent-emerald/70" />
                  </div>
                  <span className="text-[11px] font-mono text-accent-emerald uppercase tracking-widest">archon — agent shell</span>
                </div>
                <button
                  onClick={() => setTerminalOpen(false)}
                  className="text-text-secondary hover:text-text-secondary transition-colors"
                  data-testid="button-close-terminal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed min-h-0"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#1a3a1a transparent" }}
              >
                {terminalLines.map((line) => (
                  <div key={line.id} className={`flex gap-3 ${LINE_COLOR[line.kind as keyof typeof LINE_COLOR]}`}>
                    <span className="text-green-900 select-none flex-shrink-0">{line.timestamp}</span>
                    <span className="flex-shrink-0 select-none">{LINE_PREFIX[line.kind as keyof typeof LINE_PREFIX]}</span>
                    <span className="break-all">{line.text}</span>
                  </div>
                ))}
                <div className="flex gap-3 text-accent-emerald mt-1">
                  <span className="text-green-900 select-none">
                    {new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="animate-pulse">█</span>
                </div>
                <div ref={terminalEndRef} />
              </div>

              <div className="flex items-center gap-2 px-4 py-3 border-t border-green-900/30 bg-[#020A02] flex-shrink-0">
                <span className="text-accent-emerald font-mono text-sm select-none">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? "Enter command or directive..." : "Daemon offline"}
                  disabled={!connected}
                  data-testid="input-terminal-command"
                  className="flex-1 bg-transparent text-accent-emerald placeholder:text-green-900 font-mono text-sm outline-none caret-green-400 disabled:opacity-40"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleSendCmd}
                  disabled={!connected || !cmdInput.trim()}
                  data-testid="button-send-command"
                  className="text-accent-emerald hover:text-accent-emerald disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Dangerous Command Warning Modal ── */}
      <AnimatePresence>
        {dangerousCommand && (
          <motion.div
            key="warning-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-app-bg/80"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative max-w-lg w-full mx-6 bg-[#0A0000] border-2 border-red-500/60 rounded-xl overflow-hidden "
            >
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />
              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-rose/10 border border-red-500/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-accent-rose font-mono font-bold text-lg tracking-tight uppercase mb-1">
                      Dangerous Command Intercepted
                    </h2>
                    <p className="text-text-secondary text-sm font-mono">{dangerousCommand.reason}</p>
                  </div>
                </div>
                <div className="bg-app-bg border border-red-900/50 rounded-lg p-4 mb-6 font-mono">
                  <div className="text-[10px] text-red-600 uppercase tracking-widest mb-2">Command to Execute</div>
                  <div className="text-red-300 text-sm break-all">$ {dangerousCommand.command}</div>
                </div>
                <p className="text-text-secondary text-xs font-mono mb-6">
                  This action may modify system files, delete data, or execute privileged operations.
                  Approve only if you understand the consequences.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={denyCommand}
                    data-testid="button-deny-command"
                    className="flex-1 py-3 rounded-lg border border-border-core/60 bg-panel-bg text-text-primary font-mono text-sm font-bold hover:border-slate-500 hover:text-text-primary transition-all"
                  >
                    DENY
                  </button>
                  <button
                    onClick={approveCommand}
                    data-testid="button-approve-command"
                    className="flex-1 py-3 rounded-lg border border-red-500/50 bg-accent-rose/10 text-accent-rose font-mono text-sm font-bold hover:bg-accent-rose/20 hover:border-red-400 transition-all "
                  >
                    APPROVE
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
