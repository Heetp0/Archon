import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, X, Cpu, Search as SearchIcon,
  Zap, Code2, TestTube2, FileText, Shield, Brain,
  GitBranch, Activity, ChevronRight, Check, Play,
  SlidersHorizontal, Sparkles, Terminal, ArrowRight,
  ShieldCheck, CheckCircle2, RotateCcw, HelpCircle,
  ExternalLink, Layers, Database, Sliders
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebSocketStore } from "@/store/websocketStore";
import { useAppContext } from "@/context/AppContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AgentDef {
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
  defaultModel: string;
  provider: string;
  defaultSteps: number;
  defaultBudget: number;
}

export interface DispatchConfig {
  agent: AgentDef;
  directive: string;
  executionMode: "autopilot" | "supervised";
  maxSteps: number;
  tokenBudget: number;
  model: string;
}

// ── Default system agents ─────────────────────────────────────────────────────
export const SYSTEM_AGENTS: AgentDef[] = [
  {
    id: "planner",
    name: "Planner",
    description: "Decomposes complex directives into ordered subtask graphs. Plans multi-step agentic workflows and coordinates handoffs between specialized agents.",
    capabilities: ["Task decomposition", "Workflow orchestration", "Dependency resolution", "Acceptance criteria"],
    icon: Brain,
    color: "text-accent-indigo",
    accentBg: "bg-accent-indigo/[0.08]",
    accentBorder: "border-accent-indigo/25",
    status: "available",
    type: "system",
    defaultModel: "claude-3-5-sonnet-20241022",
    provider: "Anthropic",
    defaultSteps: 30,
    defaultBudget: 50000,
  },
  {
    id: "coder",
    name: "Coder",
    description: "Writes, refactors, and debugs code across multiple languages and frameworks. Reads existing codebases and produces well-structured, documented output.",
    capabilities: ["Code generation", "Refactoring", "Debugging", "AST Analysis", "Multi-language"],
    icon: Code2,
    color: "text-accent-emerald",
    accentBg: "bg-accent-emerald/[0.08]",
    accentBorder: "border-accent-emerald/25",
    status: "available",
    type: "system",
    defaultModel: "claude-3-5-sonnet-20241022",
    provider: "Anthropic",
    defaultSteps: 40,
    defaultBudget: 60000,
  },
  {
    id: "opencode-delegator",
    name: "OpenCode Delegator",
    description: "Delegates complex coding tasks to the OpenCode external system. Handles large codebase navigation and advanced autonomous coding pipelines.",
    capabilities: ["External delegation", "Codebase navigation", "Autonomous coding", "Repo-level edits"],
    icon: GitBranch,
    color: "text-cyan-400",
    accentBg: "bg-cyan-500/[0.08]",
    accentBorder: "border-cyan-500/25",
    status: "available",
    type: "system",
    defaultModel: "ollama/qwen2.5-coder:32b",
    provider: "Local Ollama",
    defaultSteps: 50,
    defaultBudget: 75000,
  },
  {
    id: "tester",
    name: "Tester",
    description: "Generates unit, integration, and end-to-end tests. Evaluates code quality and produces test coverage reports with fix suggestions.",
    capabilities: ["Unit tests", "Integration tests", "Coverage analysis", "Regression audits"],
    icon: TestTube2,
    color: "text-yellow-400",
    accentBg: "bg-yellow-500/[0.08]",
    accentBorder: "border-yellow-500/25",
    status: "available",
    type: "system",
    defaultModel: "claude-3-5-sonnet-20241022",
    provider: "Anthropic",
    defaultSteps: 30,
    defaultBudget: 40000,
  },
  {
    id: "logger",
    name: "Logger",
    description: "Maintains a structured audit trail of all agent actions, token usage, outputs, and errors. Feeds the agent journal for persistence and replay.",
    capabilities: ["Audit logging", "Token tracking", "State persistence", "Journal replay"],
    icon: FileText,
    color: "text-orange-400",
    accentBg: "bg-orange-500/[0.08]",
    accentBorder: "border-orange-500/25",
    status: "available",
    type: "system",
    defaultModel: "groq/llama-3.1-8b-instant",
    provider: "Groq",
    defaultSteps: 20,
    defaultBudget: 25000,
  },
  {
    id: "supervisor",
    name: "Autopilot Supervisor",
    description: "Safety watchdog that intercepts dangerous commands before execution. Enforces permission boundaries and provides human-in-the-loop approval gates.",
    capabilities: ["Safety enforcement", "Command interception", "Permission gates", "Volume limits"],
    icon: Shield,
    color: "text-accent-rose",
    accentBg: "bg-accent-rose/[0.08]",
    accentBorder: "border-accent-rose/25",
    status: "available",
    type: "system",
    defaultModel: "claude-3-5-sonnet-20241022",
    provider: "Anthropic",
    defaultSteps: 25,
    defaultBudget: 35000,
  },
  {
    id: "chat-agent",
    name: "Chat Agent",
    description: "RAG-powered conversational agent with vault context. Retrieves relevant notes from LanceDB before generating responses for accurate, grounded answers.",
    capabilities: ["RAG retrieval", "Vault search", "Streaming responses", "Semantic memory"],
    icon: Bot,
    color: "text-purple-400",
    accentBg: "bg-purple-500/[0.08]",
    accentBorder: "border-purple-500/25",
    status: "available",
    type: "system",
    defaultModel: "groq/llama-3.3-70b-versatile",
    provider: "Groq",
    defaultSteps: 20,
    defaultBudget: 30000,
  },
  {
    id: "council",
    name: "Council Debate",
    description: "Multi-model debate system. Runs Proposer, Critic, Expert, and Synthesizer roles simultaneously to reach balanced, well-reasoned verdicts.",
    capabilities: ["Multi-model debate", "Consensus synthesis", "Adversarial critique", "Verdict voting"],
    icon: Activity,
    color: "text-amber-400",
    accentBg: "bg-amber-500/[0.08]",
    accentBorder: "border-amber-500/25",
    status: "available",
    type: "system",
    defaultModel: "Multi-Model Ensemble",
    provider: "Council 4x",
    defaultSteps: 35,
    defaultBudget: 80000,
  },
  {
    id: "deep-research",
    name: "Deep Research",
    description: "Long-horizon research agent with web access via Tavily. Produces structured research reports with citations for academic or technical topics.",
    capabilities: ["Web search", "Citation tracking", "Long-form reports", "Knowledge synthesis"],
    icon: SearchIcon,
    color: "text-emerald-400",
    accentBg: "bg-emerald-500/[0.08]",
    accentBorder: "border-emerald-500/25",
    status: "available",
    type: "system",
    defaultModel: "gemini/gemini-2.5-flash",
    provider: "Google",
    defaultSteps: 40,
    defaultBudget: 60000,
  },
];

// ── Agent-specific directive suggestions ──────────────────────────────────────
const AGENT_SUGGESTIONS: Record<string, string[]> = {
  planner: [
    "Decompose full-stack auth with JWT into ordered subtasks and validation gates",
    "Plan incremental database migration to PostgreSQL with zero downtime strategy",
    "Architect event-driven telemetry pipeline with dead-letter queue orchestration",
    "Deconstruct performance bottlenecks in multi-agent asynchronous graph execution",
  ],
  coder: [
    "Implement resilient WebSocket reconnection loop with exponential backoff and buffer",
    "Refactor state management in agent dashboard to use lightweight memoized selectors",
    "Build type-safe API client with request validation and automatic schema parsing",
    "Implement file diff patch generator with boundary confinement checks",
  ],
  "opencode-delegator": [
    "Delegate full-codebase AST traversal to OpenCode to detect unhandled async exceptions",
    "Run autonomous multi-file refactoring across frontend components for theme consistency",
    "Analyze repository dependency graph and extract circular imports",
    "Dispatch multi-repo integration test generation and benchmark analysis to OpenCode",
  ],
  tester: [
    "Generate comprehensive Vitest unit test suite with mock boundaries and edge cases",
    "Write integration tests simulating WebSocket disconnections and state replays",
    "Create automated test runner evaluating agent approval gates and error handling",
    "Benchmark token consumption and execution latency across concurrent agent nodes",
  ],
  logger: [
    "Audit runtime session logs, aggregate token metrics, and export execution trace",
    "Replay failed tool execution steps from dev_log.md to diagnose crashes",
    "Generate structured markdown audit report of all file write operations",
    "Stream real-time agent telemetry to centralized monitoring dashboard",
  ],
  supervisor: [
    "Enforce strict sandbox security boundaries on terminal commands and file edits",
    "Configure interception rules for destructive bash operations (rm, sudo, curl pipe)",
    "Audit permission gates and enforce human-in-the-loop validation for external calls",
    "Inspect tool call payloads for directory traversal and path escapes",
  ],
  "chat-agent": [
    "Query Obsidian vault notes for recent architectural decisions regarding agent memory",
    "Perform RAG vector search across LanceDB documentation embeddings and summarize APIs",
    "Synthesize context from active project files into a high-level briefing document",
  ],
  council: [
    "Convene 4-model debate on GraphQL vs tRPC for high-throughput client synchronization",
    "Run adversarial critique on multi-agent retry loops and token budget guardrails",
    "Synthesize consensus on state persistence architecture across restarts",
  ],
  "deep-research": [
    "Conduct deep research on state-of-the-art agentic tool execution architectures",
    "Benchmark local LLM inference engines (vLLM vs Ollama vs llama.cpp) for coding",
    "Analyze best practices for human-in-the-loop approval gates in autonomous coding",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "Analyze current workspace repository and identify optimization targets",
  "Generate implementation plan and execute changes autonomously",
  "Audit safety boundaries and verify all test assertions pass",
];

// ── Fallback Curated Models ───────────────────────────────────────────────────
const CURATED_MODELS = [
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "ollama/qwen2.5-coder:32b", label: "Qwen 2.5 Coder 32B", provider: "Local Ollama" },
  { id: "groq/llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "gemini/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "openrouter/deepseek/deepseek-chat", label: "DeepSeek V3", provider: "OpenRouter" },
  { id: "groq/llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", provider: "Groq" },
];

// ── Configure & Dispatch Modal ────────────────────────────────────────────────
function ConfigureDispatchModal({
  agent,
  isOpen,
  onClose,
  onDispatch,
}: {
  agent: AgentDef;
  isOpen: boolean;
  onClose: () => void;
  onDispatch: (config: DispatchConfig) => void;
}) {
  const availableModels = useWebSocketStore((s) => s.availableModels);
  const agentStatuses = useWebSocketStore((s) => s.agentStatuses);

  const liveStatus = agentStatuses.find(
    (a) =>
      a.name?.toLowerCase() === agent.name.toLowerCase() ||
      a.id?.toLowerCase() === agent.id.toLowerCase()
  );
  const isRunning = liveStatus?.status === "running";

  // Merge available models with curated list
  const modelOptions = useMemo(() => {
    if (!availableModels || availableModels.length === 0) return CURATED_MODELS;
    const list = availableModels.map((m: any) => ({
      id: m.model_id || m.id,
      label: m.label || m.name || m.model_id,
      provider:
        m.provider ||
        (m.model_id?.includes("/") ? m.model_id.split("/")[0] : "Custom"),
    }));
    for (const cm of CURATED_MODELS) {
      if (!list.some((m) => m.id === cm.id)) {
        list.push(cm);
      }
    }
    return list;
  }, [availableModels]);

  // Initial form values from localStorage or agent defaults
  const [directive, setDirective] = useState<string>(() => {
    const saved = localStorage.getItem(`archon_directive_${agent.id}`);
    if (saved) return saved;
    const suggestions = AGENT_SUGGESTIONS[agent.id] || DEFAULT_SUGGESTIONS;
    return suggestions[0] || "";
  });

  const [executionMode, setExecutionMode] = useState<"autopilot" | "supervised">(() => {
    const saved = localStorage.getItem("archon_execution_mode");
    return saved === "supervised" ? "supervised" : "autopilot";
  });

  const [maxSteps, setMaxSteps] = useState<number>(() => {
    const saved = localStorage.getItem("archon_max_steps");
    const parsed = saved ? parseInt(saved, 10) : agent.defaultSteps;
    return isNaN(parsed) ? 30 : Math.min(Math.max(parsed, 10), 100);
  });

  const [tokenBudget, setTokenBudget] = useState<number>(() => {
    const saved = localStorage.getItem("archon_token_budget");
    const parsed = saved ? parseInt(saved, 10) : agent.defaultBudget;
    return isNaN(parsed) ? 50000 : Math.min(Math.max(parsed, 10000), 100000);
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem(`archon_agent_model_${agent.id}`);
    if (saved) return saved;
    return agent.defaultModel;
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleDispatch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleDispatch = () => {
    if (!directive.trim()) {
      toast.error("Please provide a task directive before dispatching");
      return;
    }
    onDispatch({
      agent,
      directive: directive.trim(),
      executionMode,
      maxSteps,
      tokenBudget,
      model: selectedModel,
    });
  };

  const suggestions = AGENT_SUGGESTIONS[agent.id] || DEFAULT_SUGGESTIONS;
  const Icon = agent.icon;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-panel-bg border border-border-core/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border-core/25 flex items-center justify-between bg-panel-bg flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                agent.accentBg,
                agent.accentBorder
              )}
            >
              <Icon className={cn("w-5 h-5", agent.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-mono font-bold text-text-primary truncate">
                  Configure & Dispatch: {agent.name}
                </h3>
                <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-panel-bg border border-border-core/30 text-text-secondary">
                  {agent.type}
                </span>
                {isRunning ? (
                  <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                    Running
                  </span>
                ) : (
                  <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-panel-bg border border-border-core/20 text-text-secondary">
                    Ready
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-text-secondary truncate mt-0.5">
                Configure runtime parameters and route directive to AgentMode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Agent Role Summary */}
          <div className="px-4 py-3 rounded-xl bg-app-bg/60 border border-border-core/25">
            <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1">
              Role & Capabilities
            </div>
            <p className="text-xs font-mono text-text-secondary leading-relaxed mb-2.5">
              {agent.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-0.5 rounded-md bg-panel-bg border border-border-core/30 text-[10px] font-mono text-text-secondary flex items-center gap-1"
                >
                  <Check className="w-2.5 h-2.5 text-text-secondary" />
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Task Directive Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-accent-indigo" />
                Task Directive
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-secondary">
                  {directive.length} chars · ~{Math.ceil(directive.length / 4)} tokens
                </span>
                {directive && (
                  <button
                    onClick={() => setDirective("")}
                    className="text-[10px] font-mono text-accent-rose hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              rows={4}
              placeholder={`Describe the high-priority directive for ${agent.name}...`}
              className="w-full bg-[#09090b] border border-border-core/35 rounded-xl px-4 py-3 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/60 focus:ring-1 focus:ring-accent-indigo/25 resize-none transition-all"
            />

            {/* Prompt Suggestion Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[9px] font-mono text-text-secondary uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-accent-indigo" />
                Suggested Directives (Click to populate)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((chip, idx) => {
                  const isSelected = directive === chip;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDirective(chip)}
                      className={cn(
                        "text-left text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 group",
                        isSelected
                          ? "bg-accent-indigo/15 border-accent-indigo/40 text-text-primary"
                          : "bg-panel-bg/60 border-border-core/25 text-text-secondary hover:text-text-primary hover:border-border-core/50 hover:bg-white/[0.02]"
                      )}
                    >
                      <Sparkles
                        className={cn(
                          "w-2.5 h-2.5 flex-shrink-0 transition-colors",
                          isSelected
                            ? "text-accent-indigo"
                            : "text-text-secondary/50 group-hover:text-accent-indigo"
                        )}
                      />
                      <span className="truncate max-w-[280px] sm:max-w-[420px]">
                        {chip}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Execution Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
              Execution Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Autopilot */}
              <div
                onClick={() => setExecutionMode("autopilot")}
                className={cn(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                  executionMode === "autopilot"
                    ? "bg-accent-emerald/[0.06] border-accent-emerald/40 shadow-sm"
                    : "bg-panel-bg/40 border-border-core/25 hover:border-border-core/45"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    executionMode === "autopilot"
                      ? "bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald"
                      : "bg-panel-bg border-border-core/30 text-text-secondary"
                  )}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-text-primary">
                      Autopilot
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.2 rounded",
                        executionMode === "autopilot"
                          ? "bg-accent-emerald/20 text-accent-emerald"
                          : "text-text-secondary"
                      )}
                    >
                      Full Autonomy
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary leading-relaxed mt-1">
                    Continuous autonomous execution without prompts. Runs plan steps and code edits to completion.
                  </p>
                </div>
              </div>

              {/* Supervised */}
              <div
                onClick={() => setExecutionMode("supervised")}
                className={cn(
                  "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                  executionMode === "supervised"
                    ? "bg-accent-indigo/[0.06] border-accent-indigo/40 shadow-sm"
                    : "bg-panel-bg/40 border-border-core/25 hover:border-border-core/45"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    executionMode === "supervised"
                      ? "bg-accent-indigo/15 border-accent-indigo/30 text-accent-indigo"
                      : "bg-panel-bg border-border-core/30 text-text-secondary"
                  )}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-text-primary">
                      Supervised
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.2 rounded",
                        executionMode === "supervised"
                          ? "bg-accent-indigo/20 text-accent-indigo"
                          : "text-text-secondary"
                      )}
                    >
                      Approval Gates
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary leading-relaxed mt-1">
                    Human-in-the-loop gates enforced. Pauses and prompts before terminal execution or file writes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sliders Grid: Max Recursion Steps & Token Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Recursion Steps Slider */}
            <div className="space-y-2 p-3.5 rounded-xl bg-app-bg/50 border border-border-core/25">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  Max Recursion Steps
                </label>
                <span className="text-xs font-mono font-bold text-accent-indigo px-1.5 py-0.5 rounded bg-accent-indigo/10 border border-accent-indigo/20">
                  {maxSteps} steps
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={maxSteps}
                onChange={(e) => setMaxSteps(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-border-core/40 rounded-lg appearance-none"
              />
              <div className="flex items-center justify-between text-[9px] font-mono text-text-secondary pt-0.5">
                <span>10 (Fast)</span>
                <span>50 (Normal)</span>
                <span>100 (Deep)</span>
              </div>
              <div className="flex items-center gap-1 pt-1">
                {[15, 30, 60, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxSteps(preset)}
                    className={cn(
                      "flex-1 py-1 rounded text-[10px] font-mono border transition-all",
                      maxSteps === preset
                        ? "bg-accent-indigo/20 border-accent-indigo/40 text-text-primary"
                        : "bg-panel-bg border-border-core/20 text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Budget Limit Slider */}
            <div className="space-y-2 p-3.5 rounded-xl bg-app-bg/50 border border-border-core/25">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  Token Budget Limit
                </label>
                <span className="text-xs font-mono font-bold text-accent-emerald px-1.5 py-0.5 rounded bg-accent-emerald/10 border border-accent-emerald/20">
                  {(tokenBudget / 1000).toFixed(0)}k tokens
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={100000}
                step={5000}
                value={tokenBudget}
                onChange={(e) => setTokenBudget(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-border-core/40 rounded-lg appearance-none"
              />
              <div className="flex items-center justify-between text-[9px] font-mono text-text-secondary pt-0.5">
                <span>10k</span>
                <span>50k</span>
                <span>100k</span>
              </div>
              <div className="flex items-center gap-1 pt-1">
                {[20000, 40000, 75000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTokenBudget(preset)}
                    className={cn(
                      "flex-1 py-1 rounded text-[10px] font-mono border transition-all",
                      tokenBudget === preset
                        ? "bg-accent-emerald/20 border-accent-emerald/40 text-text-primary"
                        : "bg-panel-bg border-border-core/20 text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {(preset / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Assignment Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-text-secondary" />
              Live Model Assignment
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#09090b] border border-border-core/35 rounded-xl px-4 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-indigo/60 focus:ring-1 focus:ring-accent-indigo/25 appearance-none cursor-pointer"
              >
                {modelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-[#121214] text-text-primary">
                    {opt.label} ({opt.provider})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xs">
                ▼
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary px-1">
              <span>Target Provider: {modelOptions.find((m) => m.id === selectedModel)?.provider || "Auto"}</span>
              <span>Persisted across sessions</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border-core/25 bg-panel-bg flex items-center justify-between flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-text-secondary">
            <span>
              {executionMode === "autopilot" ? "⚡ Autopilot" : "🛡️ Supervised"} · {maxSteps} steps · {(tokenBudget / 1000).toFixed(0)}k tokens
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border-core/30 text-xs font-mono text-text-secondary hover:text-text-primary hover:border-border-core/60 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              disabled={!directive.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 disabled:opacity-40 text-xs font-mono font-semibold text-white shadow-lg shadow-accent-indigo/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Dispatch to Runtime
              <span className="hidden sm:inline-block text-[9px] opacity-60 ml-0.5">
                (⌘↵)
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Add Custom Agent Modal ────────────────────────────────────────────────────
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
  const [provider, setProvider] = useState("Anthropic");
  const [defaultModel, setDefaultModel] = useState("claude-3-5-sonnet-20241022");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-panel-bg border border-border-core/40 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border-core/25 flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-text-primary">Register Custom Agent</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
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
              className="w-full bg-[#09090b] border border-border-core/25 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this agent specialize in and how should it decompose workflows?"
              className="w-full bg-[#09090b] border border-border-core/25 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
              Capabilities (comma-separated)
            </label>
            <input
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              placeholder="SQL generation, Schema inspection, Benchmark stats"
              className="w-full bg-[#09090b] border border-border-core/25 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Provider</label>
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Anthropic"
                className="w-full bg-[#09090b] border border-border-core/25 rounded-xl px-4 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Default Model</label>
              <input
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="e.g. claude-3-5-sonnet-20241022"
                className="w-full bg-[#09090b] border border-border-core/25 rounded-xl px-4 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/50"
              />
            </div>
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
                  color: "text-accent-indigo",
                  defaultModel,
                  provider,
                  defaultSteps: 30,
                  defaultBudget: 50000,
                });
                onClose();
              }
            }}
            disabled={!name || !description}
            className="flex-1 py-2.5 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 disabled:opacity-40 text-sm font-mono text-white transition-all"
          >
            Register Agent
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({
  agent,
  onConfigure,
}: {
  agent: AgentDef;
  onConfigure: (agent: AgentDef) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = agent.icon;
  const agentStatuses = useWebSocketStore((s) => s.agentStatuses);

  const liveStatus = agentStatuses.find(
    (a) =>
      a.name?.toLowerCase() === agent.name.toLowerCase() ||
      a.id?.toLowerCase() === agent.id.toLowerCase()
  );
  const isRunning = liveStatus?.status === "running";

  // Check saved model assignment
  const assignedModel =
    localStorage.getItem(`archon_agent_model_${agent.id}`) || agent.defaultModel;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden group",
        isRunning
          ? "border-accent-emerald/35 bg-accent-emerald/[0.02]"
          : "border-border-core/25 bg-panel-bg hover:border-border-core/60 hover:bg-[#151518]"
      )}
    >
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Agent Info & Icon */}
        <div
          className="flex items-start gap-3.5 flex-1 min-w-0 cursor-pointer"
          onClick={() => onConfigure(agent)}
        >
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105",
              agent.accentBg,
              agent.accentBorder
            )}
          >
            <Icon className={cn("w-5 h-5", agent.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-mono font-semibold text-text-primary hover:text-white transition-colors">
                {agent.name}
              </span>

              {agent.type === "system" && (
                <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-panel-bg/80 text-text-secondary border border-border-core/20">
                  System
                </span>
              )}
              {agent.type === "custom" && (
                <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/25">
                  Custom
                </span>
              )}

              {/* Status Badge */}
              {isRunning ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-emerald/10 border border-accent-emerald/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                  <span className="text-[9px] font-mono font-medium text-accent-emerald uppercase tracking-wider">
                    Running
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-panel-bg/60 border border-border-core/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/50" />
                  <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider">
                    Ready
                  </span>
                </div>
              )}

              {/* Live Model Badge */}
              <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-app-bg border border-border-core/20 text-[10px] font-mono text-text-secondary">
                <Cpu className="w-2.5 h-2.5 text-text-secondary/70" />
                <span className="truncate max-w-[130px]">{assignedModel}</span>
                <span className="opacity-50">· {agent.provider}</span>
              </div>
            </div>

            <p className="text-xs font-mono text-text-secondary leading-relaxed line-clamp-2">
              {agent.description}
            </p>

            {/* Inline Capabilities Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {agent.capabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-0.5 rounded bg-panel-bg/60 border border-border-core/20 text-[10px] font-mono text-text-secondary"
                >
                  {cap}
                </span>
              ))}
              {agent.capabilities.length > 3 && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono text-text-secondary/70">
                  +{agent.capabilities.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:self-center flex-shrink-0">
          <button
            onClick={() => onConfigure(agent)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-accent-indigo/10 hover:bg-accent-indigo text-accent-indigo hover:text-white border border-accent-indigo/30 transition-all text-xs font-mono font-medium shadow-sm group/btn"
          >
            <Sliders className="w-3.5 h-3.5 transition-transform group-hover/btn:rotate-45" />
            <span>Configure & Dispatch</span>
          </button>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-xl border border-border-core/25 text-text-secondary hover:text-text-primary hover:bg-white/[0.03] transition-colors"
            title={expanded ? "Collapse details" : "Expand details"}
          >
            <ChevronRight
              className={cn("w-4 h-4 transition-transform duration-200", expanded && "rotate-90")}
            />
          </button>
        </div>
      </div>

      {/* Expanded Details Pane */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border-core/15 bg-app-bg/40"
          >
            <div className="p-5 space-y-4">
              {/* Full Capabilities */}
              <div>
                <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">
                  All Specialized Capabilities
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-panel-bg border border-border-core/25 text-[11px] font-mono text-text-secondary"
                    >
                      <Check className="w-3 h-3 text-accent-emerald" />
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Running Status Action Output */}
              {isRunning && liveStatus?.action && (
                <div className="px-3.5 py-2.5 rounded-xl bg-accent-emerald/[0.05] border border-accent-emerald/20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-emerald animate-ping" />
                  <div className="text-xs font-mono">
                    <span className="text-accent-emerald uppercase tracking-wider font-semibold">
                      Current Action:{" "}
                    </span>
                    <span className="text-text-primary">{liveStatus.action}</span>
                  </div>
                </div>
              )}

              {/* Quick Spec Bar */}
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-text-secondary pt-1 border-t border-border-core/15">
                <span>Default Steps: {agent.defaultSteps}</span>
                <span>Default Budget: {(agent.defaultBudget / 1000).toFixed(0)}k</span>
                <span>Assigned Model: {assignedModel}</span>
                <span>Provider: {agent.provider}</span>
                <button
                  onClick={() => onConfigure(agent)}
                  className="ml-auto text-accent-indigo hover:underline flex items-center gap-1 font-medium"
                >
                  Open Dispatch Settings →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Mode Component ───────────────────────────────────────────────────────
export default function AgentsDirectoryMode() {
  const [agents, setAgents] = useState<AgentDef[]>(SYSTEM_AGENTS);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<AgentDef | null>(null);

  const { sendAgentCommand } = useWebSocketContext();
  const { setMode } = useAppContext();
  const { projects, activeProjectId, setActiveProject } = useProjectsContext();
  const agentStatuses = useWebSocketStore((s) => s.agentStatuses);

  // Statistics
  const runningCount = agentStatuses.filter((a) => a.status === "running").length;
  const availableCount = agents.length - runningCount;

  // Filtered lists
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.capabilities.some((c) => c.toLowerCase().includes(query)) ||
        a.provider.toLowerCase().includes(query) ||
        a.defaultModel.toLowerCase().includes(query)
    );
  }, [agents, search]);

  const systemAgents = filtered.filter((a) => a.type === "system");
  const customAgents = filtered.filter((a) => a.type === "custom");

  // Handler for custom agent registration
  const handleAddAgent = (
    data: Omit<AgentDef, "id" | "icon" | "accentBg" | "accentBorder" | "status" | "type">
  ) => {
    const newAgent: AgentDef = {
      ...data,
      id: `custom-${Date.now()}`,
      icon: Zap,
      accentBg: "bg-accent-indigo/[0.08]",
      accentBorder: "border-accent-indigo/25",
      status: "available",
      type: "custom",
    };
    setAgents((prev) => [...prev, newAgent]);
    toast.success(`Agent ${data.name} registered successfully`);
  };

  // Handler for Dispatching to Runtime
  const handleDispatchToRuntime = useCallback(
    (config: DispatchConfig) => {
      const { agent, directive, executionMode, maxSteps, tokenBudget, model } = config;

      try {
        // 1. Store settings in localStorage
        localStorage.setItem("archon_max_steps", String(maxSteps));
        localStorage.setItem("archon_token_budget", String(tokenBudget));
        localStorage.setItem("archon_execution_mode", executionMode);
        localStorage.setItem("archon_active_agent", agent.id);
        localStorage.setItem("archon_active_agent_name", agent.name);
        localStorage.setItem(`archon_agent_model_${agent.id}`, model);
        localStorage.setItem("archon_agent_model", model);
        localStorage.setItem(`archon_directive_${agent.id}`, directive);
        localStorage.setItem("archon_last_directive", directive);
        localStorage.setItem(
          "archon_agent_dispatch_payload",
          JSON.stringify({
            agentId: agent.id,
            agentName: agent.name,
            directive,
            executionMode,
            maxSteps,
            tokenBudget,
            model,
            dispatchedAt: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.warn("Failed to persist dispatch settings to localStorage:", err);
      }

      // 2. Ensure an active agent project is selected
      const currentProject = projects.find((p) => p.id === activeProjectId);
      if (!currentProject || currentProject.kind !== "agent") {
        const existingAgentProject = projects.find((p) => p.kind === "agent");
        if (existingAgentProject) {
          setActiveProject(existingAgentProject.id);
        }
      }

      // 3. Format command and send via sendAgentCommand
      const modeLabel = executionMode === "autopilot" ? "Autopilot" : "Supervised";
      const formattedCommand = `[${agent.name} / ${modeLabel}]: ${directive}`;
      sendAgentCommand(formattedCommand);

      // 4. Close the modal
      setSelectedAgentForModal(null);

      // 5. Switch active tab/view to AgentMode
      setMode("agents");

      // 6. Notify user with toast
      toast.success(`Dispatched ${agent.name} to Agent Runtime`, {
        description: `${modeLabel} · ${maxSteps} steps · ${(tokenBudget / 1000).toFixed(0)}k budget`,
      });
    },
    [projects, activeProjectId, setActiveProject, sendAgentCommand, setMode]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full bg-app-bg select-none"
    >
      {/* Top Header */}
      <div className="px-8 pt-7 pb-5 border-b border-border-core/20 flex-shrink-0 bg-app-bg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-indigo/10 border border-accent-indigo/25 flex items-center justify-center">
              <Bot className="w-5 h-5 text-accent-indigo" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-mono font-bold text-text-primary">
                  Agents Directory
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-panel-bg border border-border-core/25 text-text-secondary">
                  v2.0 Orchestrator
                </span>
              </div>
              <p className="text-xs font-mono text-text-secondary mt-0.5">
                {agents.length} specialized agents · {runningCount} active · Click any agent to configure & dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMode("agents")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-core/25 hover:border-border-core/60 text-xs font-mono text-text-secondary hover:text-text-primary transition-all"
              title="Open runtime terminal and live plan stream"
            >
              <Terminal className="w-3.5 h-3.5" />
              Runtime Terminal
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 text-xs font-mono font-medium text-white shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Agent
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-5 relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name, capability, provider, or model..."
            className="w-full bg-panel-bg border border-border-core/25 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-indigo/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Agents List Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* System Agents */}
        {systemAgents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-text-secondary" />
                System Agents · {systemAgents.length}
              </h2>
              <span className="text-[10px] font-mono text-text-secondary">
                Click card or "Configure & Dispatch" to launch
              </span>
            </div>
            <div className="space-y-3">
              {systemAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onConfigure={(a) => setSelectedAgentForModal(a)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom Agents */}
        {customAgents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-accent-indigo" />
                Custom Agents · {customAgents.length}
              </h2>
            </div>
            <div className="space-y-3">
              {customAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onConfigure={(a) => setSelectedAgentForModal(a)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty Search State */}
        {filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <Bot className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
            <div className="text-sm font-mono text-text-primary font-medium">
              No agents matching "{search}"
            </div>
            <p className="text-xs font-mono text-text-secondary mt-1 max-w-sm mx-auto">
              Try searching by specialized capabilities such as "orchestration", "refactoring", "unit tests", or clear your filter.
            </p>
            <button
              onClick={() => setSearch("")}
              className="mt-4 px-4 py-2 rounded-xl bg-panel-bg border border-border-core/30 text-xs font-mono text-text-primary hover:border-border-core/60 transition-all"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Configure & Dispatch Modal */}
      <AnimatePresence>
        {selectedAgentForModal && (
          <ConfigureDispatchModal
            agent={selectedAgentForModal}
            isOpen={Boolean(selectedAgentForModal)}
            onClose={() => setSelectedAgentForModal(null)}
            onDispatch={handleDispatchToRuntime}
          />
        )}
      </AnimatePresence>

      {/* Add Custom Agent Modal */}
      <AnimatePresence>
        {showAdd && (
          <AddAgentModal onSave={handleAddAgent} onClose={() => setShowAdd(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
