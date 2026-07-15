import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Cpu, Terminal, Paperclip, Plus, Send, X,
  LayoutDashboard, AlertTriangle, AlertCircle, CheckCircle2,
  Play, RefreshCw, ChevronDown, ChevronUp, Pause, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import BrowsePCModal from "../BrowsePCModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mock Diff for DiffViewer
const MOCK_DIFF = `--- a/src/index.css
+++ b/src/index.css
@@ -10,6 +10,12 @@
-  --color-app-bg: oklch(0 0 0);
+  --color-app-bg: #000000;
-  --color-panel-bg: oklch(0.12 0 0);
+  --color-panel-bg: #0a0a0a;
-  --color-border-core: oklch(0.20 0 0);
+  --color-border-core: #222222;
@@ -40,5 +46,10 @@
-  --font-sans: "Plus Jakarta Sans", "Outfit", "Inter", sans-serif;
+  --font-sans: "Satoshi", "Inter", sans-serif;`;

const STATUS_ICON = {
  pending: Clock,
  running: RefreshCw,
  complete: CheckCircle2,
  failed: AlertCircle,
};

const LINE_COLOR = {
  stdout: "text-[#a0a0a0]",
  stderr: "text-red-400 bg-red-950/5 px-1",
  system: "text-white font-bold",
};

const LINE_PREFIX = {
  stdout: "::",
  stderr: "ERR",
  system: "SYS",
};

function Clock(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function NewAgentProjectBlocker() {
  const { createAgentProject } = useProjectsContext();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [browsePCOpen, setBrowsePCOpen] = useState(false);

  const handleFolderSelect = (path: string) => {
    setBrowsePCOpen(false);
    createAgentProject(name.trim(), path);
    setShowForm(false);
    setName("");
  };

  const goToFolder = () => {
    if (!name.trim()) return;
    setBrowsePCOpen(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8 bg-app-bg">
      <Cpu className="w-10 h-10 text-[#666666]" />
      <div>
        <h3 className="text-sm font-mono text-white mb-1">No active Agent Project</h3>
        <p className="text-xs font-mono text-[#a0a0a0] max-w-sm leading-relaxed">
          Agent Runtime requires a project linked to a folder on your PC.
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
            className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-white/40"
          />
          <div className="flex gap-2">
            <button
              onClick={goToFolder}
              disabled={!name.trim()}
              className="flex-1 py-2 rounded bg-white text-black hover:bg-neutral-200 text-xs font-mono disabled:opacity-30 transition-colors"
            >
              Select Folder -&gt;
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded border border-[#222222] text-[#a0a0a0] hover:text-white text-xs font-mono transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          className="bg-white text-black hover:bg-neutral-200 font-mono text-sm"
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

function CollapsibleLogItem({ task }: { task: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = STATUS_ICON[task.status as keyof typeof STATUS_ICON] || Clock;
  
  return (
    <div className="border border-[#222222] bg-[#0a0a0a] rounded overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-[#111111] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="font-mono text-[10px] text-[#666666] w-12 text-left">{task.id}</div>
          <span className={cn(
            "text-xs font-mono truncate text-left",
            task.status === "complete" ? "text-[#666666] line-through" : "text-white"
          )}>
            {task.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#a0a0a0] uppercase">
            {task.status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
            {task.status}
          </div>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#666666]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-3 border-t border-[#222222] bg-black font-mono text-[10px] text-[#a0a0a0] leading-relaxed max-h-60 overflow-y-auto">
          {task.logs ? (
            <pre className="whitespace-pre-wrap">{task.logs}</pre>
          ) : (
            <div>Execution step logs: {task.name}... Done.</div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <div className="font-mono text-[10px] p-3 bg-black rounded border border-[#222222] max-h-64 overflow-y-auto leading-relaxed">
      {lines.map((line, idx) => {
        let className = "text-[#a0a0a0]";
        if (line.startsWith("+")) className = "text-emerald-400 bg-emerald-950/20 px-1 rounded-sm";
        if (line.startsWith("-")) className = "text-red-400 bg-red-950/20 px-1 rounded-sm";
        if (line.startsWith("@@")) className = "text-purple-400 font-bold";
        return <div key={idx} className={className}>{line}</div>;
      })}
    </div>
  );
}

export default function AgentMode() {
  const {
    agentStatuses, taskQueue, connected,
    terminalLines, dangerousCommand,
    sendAgentCommand, approveCommand, denyCommand,
  } = useWebSocketContext();

  const { projects, activeProjectId, createChat, activeChatId } = useProjectsContext();
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
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-app-bg relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.md,.py,.js,.ts,.json,.csv"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Header bar */}
      <div className="p-4 border-b border-border-core flex items-center justify-between bg-[#0a0a0a] flex-shrink-0">
        <div>
          <h1 className="text-sm font-mono text-white font-bold tracking-wider">AGENT RUNTIME</h1>
          <p className="text-[10px] font-mono text-[#a0a0a0] mt-0.5">
            <span className="text-white">{activeProject.name}</span>
            {activeProject.folderPath && (
              <span className="text-[#666666]"> | {activeProject.folderPath}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* New Chat */}
          <button
            onClick={() => createChat(activeProjectId, 'agents')}
            title='New chat in this project'
            className='flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#222222] text-[10px] font-mono text-[#a0a0a0] hover:text-white hover:bg-[#111111] transition-colors'
          >
            <Plus className='w-3.5 h-3.5' />
            New Chat
          </button>

          {/* Attach */}
          <button
            onClick={openPicker}
            title="Attach files to project"
            className="w-9 h-9 flex items-center justify-center text-[#a0a0a0] hover:text-white border border-[#222222] rounded bg-[#0a0a0a] transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* View toggle */}
          <div className="flex rounded border border-[#222222] overflow-hidden bg-[#0a0a0a]">
            <button
              onClick={() => setTerminalOpen(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] transition-colors ${
                !terminalOpen ? "bg-[#111111] text-white" : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setTerminalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] transition-colors ${
                terminalOpen ? "bg-[#111111] text-white" : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
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
                {/* Active Daemons & Controls */}
                <div className="flex flex-col space-y-4 overflow-hidden">
                  <h2 className="text-xs font-mono text-white uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                    <Cpu className="w-4 h-4 text-white" /> Active Daemons
                  </h2>
                  <div className="space-y-4 overflow-y-auto flex-1">
                    {agentStatuses.length === 0 ? (
                      <div className="text-xs font-mono text-[#a0a0a0] text-center py-8">
                        No agents running. Send a command to start.
                      </div>
                    ) : agentStatuses.map((agent) => (
                      <div
                        key={agent.id}
                        className={`vercel-card border rounded p-4 relative overflow-hidden flex-shrink-0`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-mono text-white text-xs font-bold">{agent.name}</h3>
                            <div className="text-[10px] font-mono text-[#a0a0a0] mt-1">PID: {agent.pid}</div>
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                            agent.status === "running"
                              ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50 animate-pulse"
                              : "bg-[#111111] text-[#a0a0a0] border-[#222222]"
                          }`}>
                            {agent.status.toUpperCase()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[#a0a0a0]">Current Action</span>
                            <span className="text-white truncate max-w-[200px]">{agent.action}</span>
                          </div>
                          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-[#222222]">
                            <div
                              className="h-full bg-white transition-all duration-500"
                              style={{ width: `${agent.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Daemon Controls */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#222222]">
                          <button
                            onClick={() => {
                              sendAgentCommand("pause");
                              toast.success("Paused agent daemon");
                            }}
                            className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 border border-[#222222] rounded text-[#a0a0a0] hover:text-white hover:bg-[#111111]"
                          >
                            <Pause className="w-3 h-3" /> Pause
                          </button>
                          <button
                            onClick={() => {
                              sendAgentCommand("resume");
                              toast.success("Resumed agent daemon");
                            }}
                            className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 border border-[#222222] rounded text-[#a0a0a0] hover:text-white hover:bg-[#111111]"
                          >
                            <Play className="w-3 h-3" /> Resume
                          </button>
                          <button
                            onClick={() => {
                              sendAgentCommand("kill");
                              toast.success("Killed agent daemon process");
                            }}
                            className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 border border-red-950 bg-red-950/15 rounded text-red-400 hover:bg-red-900/30"
                          >
                            <Trash2 className="w-3 h-3" /> Kill
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Visual DiffViewer Section */}
                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    <h3 className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest">
                      Workspace Diffs
                    </h3>
                    <DiffViewer diff={MOCK_DIFF} />
                  </div>
                </div>

                {/* Collapsible Steps list */}
                <div className="flex flex-col space-y-4 overflow-hidden">
                  <h2 className="text-xs font-mono text-white uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                    <Terminal className="w-4 h-4 text-white" /> Task Queue Logs
                  </h2>
                  <div className="flex-1 bg-[#0a0a0a] border border-[#222222] rounded overflow-hidden flex flex-col min-h-0">
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-2">
                        {taskQueue.length === 0 ? (
                          <div className="text-xs font-mono text-[#a0a0a0] text-center py-8">
                            No tasks queued.
                          </div>
                        ) : taskQueue.map((task) => (
                          <CollapsibleLogItem key={task.id} task={task} />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Dispatch command input */}
              <div className="flex items-center gap-3 border border-[#222222] rounded bg-[#0a0a0a] px-4 py-3 flex-shrink-0 focus-within:border-white/40 transition-colors">
                <span className="text-white font-mono text-sm select-none flex-shrink-0">$</span>
                <input
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? "Dispatch command or directive to agent runtime..." : "Daemon offline"}
                  disabled={!connected}
                  className="flex-1 bg-transparent text-white placeholder:text-[#666666] font-mono text-sm outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleSendCmd}
                  disabled={!connected || !cmdInput.trim()}
                  className="text-[#666666] hover:text-white disabled:opacity-30 transition-colors flex-shrink-0"
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
              className="absolute inset-0 flex flex-col bg-black"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-b border-[#222222] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#222222]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#222222]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                  <span className="text-[10px] font-mono text-white uppercase tracking-wider">archon - agent shell</span>
                </div>
                <button
                  onClick={() => setTerminalOpen(false)}
                  className="text-[#a0a0a0] hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed min-h-0"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#222222 transparent" }}
              >
                {terminalLines.map((line) => (
                  <div key={line.id} className={`flex gap-3 ${LINE_COLOR[line.kind as keyof typeof LINE_COLOR]}`}>
                    <span className="text-[#666666] select-none flex-shrink-0">{line.timestamp}</span>
                    <span className="flex-shrink-0 select-none text-white">{LINE_PREFIX[line.kind as keyof typeof LINE_PREFIX]}</span>
                    <span className="break-all">{line.text}</span>
                  </div>
                ))}
                <div className="flex gap-3 text-white mt-1">
                  <span className="text-[#666666] select-none">
                    {new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="animate-pulse">_</span>
                </div>
                <div ref={terminalEndRef} />
              </div>

              <div className="flex items-center gap-2 px-4 py-3 border-t border-[#222222] bg-[#0a0a0a] flex-shrink-0">
                <span className="text-white font-mono text-sm select-none-0">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? "Enter command or directive..." : "Daemon offline"}
                  disabled={!connected}
                  className="flex-1 bg-transparent text-white placeholder:text-[#666666] font-mono text-sm outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleSendCmd}
                  disabled={!connected || !cmdInput.trim()}
                  className="text-white hover:text-neutral-200 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dangerous Command Warning Modal */}
      <AnimatePresence>
        {dangerousCommand && (
          <motion.div
            key="warning-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-lg w-full mx-6 bg-[#0a0a0a] border border-red-950 rounded overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded bg-red-950/20 border border-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-red-500 font-mono font-bold text-base tracking-wider uppercase mb-1">
                      Dangerous Command Intercepted
                    </h2>
                    <p className="text-[#a0a0a0] text-xs font-mono">{dangerousCommand.reason}</p>
                  </div>
                </div>
                <div className="bg-black border border-red-950 rounded p-4 mb-6 font-mono">
                  <div className="text-[9px] text-red-500 uppercase tracking-wider mb-2">Command to Execute</div>
                  <div className="text-red-300 text-xs break-all">$ {dangerousCommand.command}</div>
                </div>
                <p className="text-[#a0a0a0] text-xs font-mono mb-6 font-normal leading-relaxed">
                  This action may modify system files, delete data, or execute privileged operations.
                  Approve only if you understand the consequences.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={denyCommand}
                    className="flex-1 py-2.5 border border-[#222222] rounded text-xs font-mono text-[#a0a0a0] hover:text-white"
                  >
                    Deny Action
                  </button>
                  <button
                    onClick={approveCommand}
                    className="flex-1 py-2.5 bg-red-950/25 border border-red-900/50 hover:bg-red-900/30 text-red-400 rounded text-xs font-mono"
                  >
                    Approve Execution
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
