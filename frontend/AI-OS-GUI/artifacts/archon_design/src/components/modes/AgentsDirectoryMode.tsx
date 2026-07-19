import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, X, Cpu, Search as SearchIcon, BookOpen,
  Zap, Code2, TestTube2, FileText, Shield, Brain,
  GitBranch, Activity, ChevronRight, Check
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentDef {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  icon: React.ElementType;
  color: string;
  accentBg: string;
  accentBorder: string;
  status: "available" | "running" | "idle";
  type: "system" | "custom";
}

// ── Default system agents ─────────────────────────────────────────────────────
const SYSTEM_AGENTS: AgentDef[] = [
  {
    id: "planner",
    name: "Planner",
    description: "Decomposes complex directives into ordered subtask graphs. Plans multi-step agentic workflows and coordinates handoffs between specialized agents.",
    capabilities: ["Task decomposition", "Workflow orchestration", "Dependency resolution"],
    icon: Brain,
    color: "text-accent-indigo",
    accentBg: "bg-accent-indigo/[0.06]",
    accentBorder: "border-blue-500/20",
    status: "available",
    type: "system",
  },
  {
    id: "coder",
    name: "Coder",
    description: "Writes, refactors, and debugs code across multiple languages and frameworks. Reads existing codebases and produces well-structured, documented output.",
    capabilities: ["Code generation", "Refactoring", "Debugging", "Multi-language"],
    icon: Code2,
    color: "text-accent-emerald",
    accentBg: "bg-accent-emerald/[0.06]",
    accentBorder: "border-accent-emerald/20",
    status: "available",
    type: "system",
  },
  {
    id: "opencode-delegator",
    name: "OpenCode Delegator",
    description: "Delegates complex coding tasks to the OpenCode external system. Handles large codebase navigation and advanced autonomous coding pipelines.",
    capabilities: ["External delegation", "Codebase navigation", "Autonomous coding"],
    icon: GitBranch,
    color: "text-accent-indigo",
    accentBg: "bg-cyan-500/[0.06]",
    accentBorder: "border-accent-indigo/20",
    status: "available",
    type: "system",
  },
  {
    id: "tester",
    name: "Tester",
    description: "Generates unit, integration, and end-to-end tests. Evaluates code quality and produces test coverage reports with fix suggestions.",
    capabilities: ["Unit tests", "Integration tests", "Coverage analysis"],
    icon: TestTube2,
    color: "text-accent-rose",
    accentBg: "bg-accent-rose/[0.06]",
    accentBorder: "border-yellow-500/20",
    status: "available",
    type: "system",
  },
  {
    id: "logger",
    name: "Logger",
    description: "Maintains a structured audit trail of all agent actions, token usage, outputs, and errors. Feeds the agent journal for persistence and replay.",
    capabilities: ["Audit logging", "Token tracking", "State persistence"],
    icon: FileText,
    color: "text-accent-rose",
    accentBg: "bg-accent-rose/[0.06]",
    accentBorder: "border-orange-500/20",
    status: "available",
    type: "system",
  },
  {
    id: "supervisor",
    name: "Autopilot Supervisor",
    description: "Safety watchdog that intercepts dangerous commands before execution. Enforces permission boundaries and provides human-in-the-loop approval gates.",
    capabilities: ["Safety enforcement", "Command interception", "Permission gates"],
    icon: Shield,
    color: "text-accent-rose",
    accentBg: "bg-accent-rose/[0.06]",
    accentBorder: "border-accent-rose/20",
    status: "available",
    type: "system",
  },
  {
    id: "chat-agent",
    name: "Chat Agent",
    description: "RAG-powered conversational agent with vault context. Retrieves relevant notes from LanceDB before generating responses for accurate, grounded answers.",
    capabilities: ["RAG retrieval", "Vault search", "Streaming responses"],
    icon: Bot,
    color: "text-accent-indigo",
    accentBg: "bg-accent-indigo/[0.06]",
    accentBorder: "border-violet-500/20",
    status: "available",
    type: "system",
  },
  {
    id: "council",
    name: "Council Debate",
    description: "Multi-model debate system. Runs Proposer, Critic, Expert, and Synthesizer roles simultaneously to reach balanced, well-reasoned verdicts.",
    capabilities: ["Multi-model debate", "Consensus synthesis", "Adversarial critique"],
    icon: Activity,
    color: "text-accent-rose",
    accentBg: "bg-accent-rose/[0.06]",
    accentBorder: "border-amber-500/20",
    status: "available",
    type: "system",
  },
  {
    id: "deep-research",
    name: "Deep Research",
    description: "Long-horizon research agent with web access via Tavily. Produces structured research reports with citations for academic or technical topics.",
    capabilities: ["Web search", "Citation tracking", "Long-form reports"],
    icon: SearchIcon,
    color: "text-accent-indigo",
    accentBg: "bg-accent-indigo/[0.06]",
    accentBorder: "border-purple-500/20",
    status: "available",
    type: "system",
  },
];

// ── Add Agent Modal ────────────────────────────────────────────────────────────
function AddAgentModal({
  onSave,
  onClose,
}: {
  onSave: (agent: Omit<AgentDef, "id" | "icon" | "accentBg" | "accentBorder" | "status" | "type">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [color] = useState("text-text-secondary");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/80"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-lg mx-6 bg-panel-bg border border-border-core/30 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-border-core/25 flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-text-primary">Register New Agent</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Agent Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Analyst Agent"
              className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this agent do and when should it be used?"
              className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Capabilities (comma-separated)</label>
            <input
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              placeholder="Data analysis, Visualization, SQL queries"
              className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-core/25 text-sm font-mono text-text-secondary hover:text-text-primary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name && description) {
                onSave({
                  name,
                  description,
                  capabilities: capabilities.split(",").map((c) => c.trim()).filter(Boolean),
                  color,
                });
                onClose();
              }
            }}
            disabled={!name || !description}
            className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-40 text-sm font-mono font-medium transition-all"
          >
            Register Agent
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: AgentDef }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = agent.icon;
  const { agentStatuses } = useWebSocketContext();
  const liveStatus = agentStatuses.find(
    (a) => a.name.toLowerCase() === agent.name.toLowerCase()
  );
  const isRunning = liveStatus?.status === "running";

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden",
        isRunning
          ? "border-green-500/25 bg-accent-emerald/[0.02]"
          : "border-border-core/20 bg-panel-bg hover:border-white/[0.09]"
      )}
    >
      <div
        className="flex items-start gap-4 p-5 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
          agent.accentBg, agent.accentBorder
        )}>
          <Icon className={cn("w-4.5 h-4.5", agent.color)} style={{ width: 18, height: 18 }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono font-medium text-text-primary">{agent.name}</span>
            {agent.type === "system" && (
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-panel-bg/80 text-text-secondary border border-border-core/15">
                System
              </span>
            )}
            {agent.type === "custom" && (
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white border border-white/10">
                Custom
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-secondary leading-relaxed line-clamp-2">{agent.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[10px] font-mono text-accent-emerald">Running</span>
            </div>
          )}
          <ChevronRight
            className={cn("w-4 h-4 text-text-secondary transition-transform", expanded && "rotate-90")}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border-core/15 pt-4">
              <div className="mb-3">
                <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">Capabilities</div>
                <div className="flex flex-wrap gap-2">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-panel-bg/30 border border-border-core/20 text-[11px] font-mono text-text-secondary"
                    >
                      <Check className="w-3 h-3 text-text-secondary" />
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              {isRunning && liveStatus?.action && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-accent-emerald/[0.04] border border-green-500/10">
                  <span className="text-[10px] font-mono text-accent-emerald uppercase tracking-widest">Current action: </span>
                  <span className="text-[10px] font-mono text-accent-emerald">{liveStatus.action}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Mode ─────────────────────────────────────────────────────────────────
export default function AgentsDirectoryMode() {
  const [agents, setAgents] = useState<AgentDef[]>(SYSTEM_AGENTS);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  );

  const systemAgents = filtered.filter((a) => a.type === "system");
  const customAgents = filtered.filter((a) => a.type === "custom");

  const handleAdd = (data: Omit<AgentDef, "id" | "icon" | "accentBg" | "accentBorder" | "status" | "type">) => {
    setAgents((prev) => [
      ...prev,
      {
        ...data,
        id: Math.random().toString(),
        icon: Zap,
        accentBg: "bg-slate-500/[0.06]",
        accentBorder: "border-slate-500/20",
        status: "available",
        type: "custom",
      },
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-app-bg"
    >
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-border-core/15 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-indigo/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-indigo" />
            </div>
            <div>
              <h1 className="text-base font-mono font-bold text-text-primary">Agents Directory</h1>
              <p className="text-[11px] font-mono text-text-secondary mt-0.5">{agents.length} agents registered · Click to expand details</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 border border-border-core text-xs font-mono font-medium transition-all "
          >
            <Plus className="w-3.5 h-3.5" />
            Add Agent
          </button>
        </div>

        {/* Search */}
        <div className="mt-5 relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name or capability..."
            className="w-full bg-panel-bg border border-border-core/25 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo/40"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {systemAgents.length > 0 && (
          <div>
            <h2 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-4">
              System Agents · {systemAgents.length}
            </h2>
            <div className="space-y-3">
              {systemAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}

        {customAgents.length > 0 && (
          <div>
            <h2 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-4">
              Custom Agents · {customAgents.length}
            </h2>
            <div className="space-y-3">
              {customAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center text-text-secondary font-mono text-sm py-16">
            No agents match your search.
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddAgentModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
