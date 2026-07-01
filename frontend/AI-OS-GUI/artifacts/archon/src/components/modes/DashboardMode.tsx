import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity, Cpu, Zap, Clock, MessageSquare, Users, Search,
  BookOpen, Bot, ArrowRight, Wifi, WifiOff, Database,
  TrendingUp, Circle
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import type { AppMode } from "@/context/AppContext";

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className={cn(
      "relative rounded-2xl border bg-[#0b0c13] p-5 overflow-hidden flex flex-col gap-3",
      "border-white/[0.06] hover:border-white/[0.10] transition-colors"
    )}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent + "/15 border border-current/20")}>
        <Icon className={cn("w-4 h-4", accent)} />
      </div>
      <div>
        <div className="text-2xl font-mono font-bold text-slate-100 tracking-tight">{value}</div>
        <div className="text-xs font-mono text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] font-mono text-slate-700 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ── Quick action button ────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, color, onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.06]",
        "bg-[#0b0c13] hover:bg-white/[0.03] hover:border-white/[0.10]",
        "text-xs font-mono transition-all duration-200 group"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
      <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-slate-500 ml-auto transition-colors" />
    </button>
  );
}

// ── Agent row ─────────────────────────────────────────────────────────────────
function AgentRow({ agent }: { agent: any }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
      agent.status === "running"
        ? "border-green-500/20 bg-green-500/[0.03]"
        : "border-white/[0.04] bg-[#0b0c13]"
    )}>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        agent.status === "running" ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : "bg-slate-700"
      )} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-slate-300 font-medium">{agent.name}</div>
        <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">{agent.action || "Idle"}</div>
      </div>
      <span className={cn(
        "text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md border",
        agent.status === "running"
          ? "text-green-400 border-green-500/20 bg-green-500/10"
          : "text-slate-600 border-white/[0.04] bg-transparent"
      )}>
        {agent.status || "idle"}
      </span>
    </div>
  );
}

// ── Uptime counter ────────────────────────────────────────────────────────────
function useUptime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardMode() {
  const { agentStatuses, connected, telemetry, terminalLines } = useWebSocketContext();
  const { setMode } = useAppContext();
  const uptime = useUptime();

  const activeAgents = agentStatuses.filter((a) => a.status === "running").length;
  const totalTasks = terminalLines.filter((l) => l.kind === "input").length;

  const QUICK_ACTIONS: { icon: React.ElementType; label: string; color: string; mode: AppMode }[] = [
    { icon: MessageSquare, label: "New Chat", color: "text-blue-400", mode: "chat" },
    { icon: Users, label: "Start Council", color: "text-orange-400", mode: "council" },
    { icon: Search, label: "Deep Research", color: "text-purple-400", mode: "research" },
    { icon: Cpu, label: "Agent Runtime", color: "text-green-400", mode: "agents" },
    { icon: BookOpen, label: "Obsidian Vault", color: "text-violet-400", mode: "obsidian" },
    { icon: Bot, label: "Agents Directory", color: "text-indigo-400", mode: "directory" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#08090f] overflow-y-auto"
    >
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono font-bold text-slate-100 tracking-tight">The Core</h1>
            <p className="text-xs font-mono text-slate-600 mt-1">AI Operating System · Command Center</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono",
              connected
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                : "border-red-500/20 bg-red-500/5 text-red-400"
            )}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? "Daemon Online" : "Daemon Offline"}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.06] bg-[#0b0c13] text-xs font-mono text-slate-500">
              <Clock className="w-3 h-3 text-slate-600" />
              {uptime}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={Cpu}
            label="Active Agents"
            value={activeAgents || agentStatuses.length}
            sub="Running processes"
            accent="text-green-400"
          />
          <StatCard
            icon={Zap}
            label="Tokens Used"
            value={telemetry.tokens > 0 ? telemetry.tokens.toLocaleString() : "—"}
            sub={telemetry.cost > 0 ? `$${telemetry.cost.toFixed(4)}` : "Session total"}
            accent="text-cyan-400"
          />
          <StatCard
            icon={Activity}
            label="Commands Sent"
            value={totalTasks}
            sub="This session"
            accent="text-violet-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Latency"
            value={telemetry.latency > 0 ? `${telemetry.latency}ms` : "—"}
            sub="Last response"
            accent="text-orange-400"
          />
        </div>

        {/* Middle row — agent status + activity log */}
        <div className="grid grid-cols-5 gap-6">
          {/* Agent Status */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Agent Status</h2>
              <button
                onClick={() => setMode("agents")}
                className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
              >
                Open Runtime →
              </button>
            </div>
            <div className="space-y-2">
              {agentStatuses.length === 0 ? (
                <div className="text-xs font-mono text-slate-700 py-6 text-center rounded-xl border border-white/[0.04] bg-[#0b0c13]">
                  No agents active. Send a command to spin them up.
                </div>
              ) : (
                agentStatuses.map((a) => <AgentRow key={a.id} agent={a} />)
              )}
            </div>

            {/* MCP status pill */}
            <div className="mt-auto pt-2">
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/[0.04] bg-[#0b0c13]">
                <Database className="w-3.5 h-3.5 text-slate-600" />
                <div className="flex-1">
                  <div className="text-xs font-mono text-slate-500">MCP Servers</div>
                  <div className="text-[10px] font-mono text-slate-700 mt-0.5">Configure in Settings → MCP</div>
                </div>
                <button
                  onClick={() => setMode("agents")}
                  className="text-[9px] font-mono text-slate-600 hover:text-slate-400 border border-white/[0.06] px-2 py-1 rounded-lg transition-colors"
                >
                  Setup
                </button>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Activity Feed</h2>
              <button
                onClick={() => setMode("agents")}
                className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
              >
                Open Terminal →
              </button>
            </div>
            <div className="flex-1 rounded-2xl border border-white/[0.05] bg-[#08090e] overflow-hidden">
              <div className="h-[280px] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2030 transparent" }}>
                {terminalLines.length === 0 ? (
                  <div className="text-slate-700 text-center py-8">No activity yet.</div>
                ) : (
                  [...terminalLines].reverse().slice(0, 60).reverse().map((line) => (
                    <div key={line.id} className={cn(
                      "flex gap-3",
                      line.kind === "input" ? "text-green-400" :
                      line.kind === "error" ? "text-red-400" :
                      line.kind === "system" ? "text-slate-600" :
                      "text-slate-400"
                    )}>
                      <span className="text-slate-700 flex-shrink-0 select-none">{line.timestamp}</span>
                      <span className="break-all">{line.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Quick Launch</h2>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <QuickAction
                key={action.mode}
                icon={action.icon}
                label={action.label}
                color={action.color}
                onClick={() => setMode(action.mode)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
