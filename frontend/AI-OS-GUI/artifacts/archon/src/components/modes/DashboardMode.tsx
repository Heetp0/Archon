import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Cpu, Zap, Clock, MessageSquare, Users, Search,
  BookOpen, Bot, ArrowRight, Wifi, WifiOff, Database,
  Mail, CheckSquare, Square, X, ExternalLink,
  RefreshCw, ChevronRight, CheckCircle2, InboxIcon, ListTodo
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import type { AppMode } from "@/context/AppContext";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MailItem {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  date: string;
  fullSummary: string;
  unread: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  list: string;
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; accent: string;
}) {
  return (
    <div className="relative rounded-2xl border border-white/[0.06] hover:border-white/[0.10] bg-[#0b0c13] p-5 overflow-hidden flex flex-col gap-3 transition-colors">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent.replace("text-","bg-") + "/10 border border-current/10")}>
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

function AgentRow({ agent }: { agent: any }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
      agent.status === "running" ? "border-green-500/20 bg-green-500/[0.03]" : "border-white/[0.04] bg-[#0b0c13]"
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

function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-[#0b0c13] hover:bg-white/[0.03] hover:border-white/[0.10] text-xs font-mono transition-all group"
    >
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
      <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-slate-500 ml-auto transition-colors" />
    </button>
  );
}

function useUptime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ── Mail summary modal ────────────────────────────────────────────────────────
function MailModal({ mail, onClose }: { mail: MailItem; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const lines = mail.fullSummary.split("\n");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[680px] max-h-[78vh] bg-[#0b0c13] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">{mail.sender} · {mail.date}</div>
              <h2 className="text-base font-mono font-semibold text-slate-100 leading-snug">{mail.subject}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-white/[0.06] text-slate-600 hover:text-slate-300 hover:border-white/[0.12] transition-colors"
                title="Open in Gmail"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-white/[0.06] text-slate-600 hover:text-slate-300 hover:border-white/[0.12] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2030 transparent" }}>
            {lines.map((line, i) => {
              if (line.startsWith("## ")) return (
                <h3 key={i} className="text-sm font-mono font-bold text-slate-200 pt-2 pb-1">{line.replace("## ","")}</h3>
              );
              if (line.startsWith("### ")) return (
                <h4 key={i} className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider pt-3 pb-1">{line.replace("### ","")}</h4>
              );
              if (line.startsWith("✓")) return (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-emerald-400/80">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />{line.replace("✓ ","")}
                </div>
              );
              if (line === "") return <div key={i} className="h-2" />;
              return (
                <p key={i} className="text-xs font-mono text-slate-500 leading-relaxed">{line}</p>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.04] flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs font-mono text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Pure-SVG bar chart (no recharts — avoids React 19 hook conflict) ───────────
function SvgBarChart({
  data, dataKey, color, height = 160,
}: {
  data: { day: string; commands: number; tokens: number }[];
  dataKey: "commands" | "tokens";
  color: string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...data.map((d) => d[dataKey]), 1);
  const barW = 18;
  const gap = 14;
  const padL = 28;
  const padB = 22;
  const padT = 8;
  const chartH = height - padB - padT;
  const totalW = data.length * (barW + gap) - gap + padL + 8;

  const isEmpty = data.every((d) => d[dataKey] === 0);

  return (
    <div className="relative">
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-[10px] font-mono text-slate-700">No activity data — connect daemon to track usage</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        width="100%"
        height={height}
        style={{ overflow: "visible", opacity: isEmpty ? 0.3 : 1 }}
      >
        {[0, 0.5, 1].map((frac) => {
          const y = padT + chartH - frac * chartH;
          const val = Math.round(frac * maxVal);
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={totalW - 4} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} textAnchor="end"
                fontSize={9} fontFamily="monospace" fill="#475569">{val}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const val = d[dataKey];
          const barH = Math.max((val / maxVal) * chartH, isEmpty ? 0 : 2);
          const x = padL + i * (barW + gap);
          const y = padT + chartH - barH;
          const isHov = hovered === i;
          return (
            <g key={d.day}>
              <rect x={x - 4} y={padT} width={barW + 8} height={chartH}
                fill={isHov ? "rgba(255,255,255,0.03)" : "transparent"} rx={4}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
              />
              <rect x={x} y={y} width={barW} height={barH}
                fill={color} fillOpacity={isHov ? 0.95 : 0.72} rx={4}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {isHov && !isEmpty && (
                <g>
                  <rect x={x - 10} y={y - 28} width={38} height={20}
                    fill="#0f1017" rx={5}
                    stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                  <text x={x + barW / 2} y={y - 14} textAnchor="middle"
                    fontSize={10} fontFamily="monospace" fill="#e2e8f0">{val}</text>
                </g>
              )}
              <text x={x + barW / 2} y={height - 4} textAnchor="middle"
                fontSize={9} fontFamily="monospace" fill="#475569">{d.day}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Build 7-day activity buckets from terminal lines
function useDerivedActivity(terminalLines: any[]) {
  return useMemo(() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { day: days[d.getDay()], commands: 0, tokens: 0 };
    });
    // When the daemon is live, terminalLines will carry timestamps
    // that can be bucketed here. For now returns zeroed-out days.
  }, [terminalLines.length]);
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardMode() {
  const { agentStatuses, connected, telemetry, terminalLines } = useWebSocketContext();
  const { setMode } = useAppContext();
  const uptime = useUptime();

  // No mock data — these will be populated by daemon /briefing MCP calls
  const [mails, setMails]   = useState<MailItem[]>([]);
  const [todos, setTodos]   = useState<TodoItem[]>([]);
  const [openMail, setOpenMail] = useState<MailItem | null>(null);
  const [chartView, setChartView] = useState<"commands" | "tokens">("commands");

  const activityData = useDerivedActivity(terminalLines);

  const activeAgents  = agentStatuses.filter((a) => a.status === "running").length;
  const pendingTodos  = todos.filter((t) => !t.done).length;
  const unreadMails   = mails.filter((m) => m.unread).length;

  const QUICK_ACTIONS: { icon: React.ElementType; label: string; color: string; mode: AppMode }[] = [
    { icon: MessageSquare, label: "New Chat",         color: "text-blue-400",   mode: "chat" },
    { icon: Users,         label: "Start Council",    color: "text-orange-400", mode: "council" },
    { icon: Search,        label: "Deep Research",    color: "text-purple-400", mode: "research" },
    { icon: Cpu,           label: "Agent Runtime",    color: "text-green-400",  mode: "agents" },
    { icon: BookOpen,      label: "Obsidian Vault",   color: "text-violet-400", mode: "obsidian" },
    { icon: Bot,           label: "Agents Directory", color: "text-indigo-400", mode: "directory" },
  ];

  const toggleTodo = (id: string) =>
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-full bg-[#08090f] overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}
      >
        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-6 border-b border-white/[0.04] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-mono font-bold text-slate-100 tracking-tight">The Core</h1>
              <p className="text-xs font-mono text-slate-600 mt-1">AI Operating System · Command Center</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono",
                connected ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-red-500/20 bg-red-500/5 text-red-400"
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

        <div className="flex-1 p-8 space-y-8 min-w-0">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              icon={Cpu}
              label="Active Agents"
              value={agentStatuses.length > 0 ? activeAgents : "—"}
              sub={agentStatuses.length > 0 ? "Running processes" : "Connect daemon to track"}
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
              icon={Mail}
              label="Unread Mail"
              value={connected ? unreadMails : "—"}
              sub={connected ? "Click to read summaries" : "Connect daemon to sync"}
              accent="text-blue-400"
            />
            <StatCard
              icon={CheckSquare}
              label="Tasks Pending"
              value={connected ? pendingTodos : "—"}
              sub={connected ? `${todos.filter(t => t.done).length} completed` : "Connect daemon to sync"}
              accent="text-violet-400"
            />
          </div>

          {/* ── Progress charts row ── */}
          <div className="grid grid-cols-5 gap-6">

            {/* Activity bar chart */}
            <div className="col-span-3 rounded-2xl border border-white/[0.06] bg-[#0b0c13] p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">7-Day Activity</h2>
                <div className="flex gap-1">
                  {(["commands","tokens"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setChartView(v)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all",
                        chartView === v
                          ? "bg-white/[0.06] text-slate-200 border border-white/[0.10]"
                          : "text-slate-600 hover:text-slate-400"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <SvgBarChart
                data={activityData}
                dataKey={chartView}
                color={chartView === "commands" ? "#22d3ee" : "#a78bfa"}
                height={160}
              />
            </div>

            {/* Projects — empty state until daemon populates */}
            <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-[#0b0c13] p-5 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Projects</h2>
              </div>
              {/* Empty state */}
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-4">
                <Activity className="w-6 h-6 text-slate-700" />
                <p className="text-[11px] font-mono text-slate-700 leading-relaxed">
                  No projects tracked yet.<br />
                  Projects will appear here once the daemon is connected and reports active tasks.
                </p>
              </div>
            </div>
          </div>

          {/* ── Middle row — agent status + activity log ── */}
          <div className="grid grid-cols-5 gap-6">
            {/* Agent Status */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Agent Status</h2>
                <button onClick={() => setMode("agents")} className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
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
              <div className="mt-auto pt-2">
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/[0.04] bg-[#0b0c13]">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  <div className="flex-1">
                    <div className="text-xs font-mono text-slate-500">MCP Servers</div>
                    <div className="text-[10px] font-mono text-slate-700 mt-0.5">Configure in Settings → MCP</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Activity Feed</h2>
                <button onClick={() => setMode("agents")} className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                  Open Terminal →
                </button>
              </div>
              <div className="flex-1 rounded-2xl border border-white/[0.05] bg-[#08090e] overflow-hidden">
                <div
                  className="h-[220px] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2030 transparent" }}
                >
                  {terminalLines.length === 0 ? (
                    <div className="text-slate-700 text-center py-8">No activity yet. Start a session to see logs.</div>
                  ) : (
                    [...terminalLines].reverse().slice(0, 60).reverse().map((line) => (
                      <div key={line.id} className={cn(
                        "flex gap-3",
                        line.kind === "input"  ? "text-green-400"  :
                        line.kind === "error"  ? "text-red-400"    :
                        line.kind === "system" ? "text-slate-600"  : "text-slate-400"
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

          {/* ── Mail digest + Todo row ── */}
          <div className="grid grid-cols-2 gap-6">

            {/* Mail digest */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0b0c13] overflow-hidden flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Mail Digest</h2>
                  {unreadMails > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono text-blue-400">
                      {unreadMails} new
                    </span>
                  )}
                </div>
                <button className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Sync
                </button>
              </div>

              {mails.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 px-6 text-center">
                  <InboxIcon className="w-7 h-7 text-slate-700" />
                  <div>
                    <p className="text-xs font-mono text-slate-600">No mail synced yet</p>
                    <p className="text-[10px] font-mono text-slate-700 mt-1">
                      Add the Gmail MCP server in{" "}
                      <button className="text-blue-500/70 hover:text-blue-400 underline underline-offset-2 transition-colors">
                        Settings → MCP
                      </button>{" "}
                      to pull summaries here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}>
                  {mails.map((mail) => (
                    <button
                      key={mail.id}
                      onClick={() => setOpenMail(mail)}
                      className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left group"
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                        mail.unread ? "bg-blue-400" : "bg-transparent"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={cn("text-[11px] font-mono font-medium truncate", mail.unread ? "text-slate-200" : "text-slate-400")}>
                            {mail.sender}
                          </span>
                          <span className="text-[9px] font-mono text-slate-700 flex-shrink-0">{mail.date}</span>
                        </div>
                        <div className={cn("text-[11px] font-mono truncate", mail.unread ? "text-slate-300" : "text-slate-500")}>
                          {mail.subject}
                        </div>
                        <div className="text-[10px] font-mono text-slate-700 mt-0.5 truncate">{mail.preview}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-slate-500 flex-shrink-0 mt-1.5 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Todo list */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0b0c13] overflow-hidden flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
                  <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">To-Do</h2>
                  {pendingTodos > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[9px] font-mono text-violet-400">
                      {pendingTodos} open
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-700">Google Keep · via MCP</span>
              </div>

              {todos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 px-6 text-center">
                  <ListTodo className="w-7 h-7 text-slate-700" />
                  <div>
                    <p className="text-xs font-mono text-slate-600">No tasks synced yet</p>
                    <p className="text-[10px] font-mono text-slate-700 mt-1">
                      Add the Google Keep MCP server in{" "}
                      <button className="text-violet-500/70 hover:text-violet-400 underline underline-offset-2 transition-colors">
                        Settings → MCP
                      </button>{" "}
                      to sync your checklists here.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}>
                    {[...todos.filter(t => !t.done), ...todos.filter(t => t.done)].map((todo) => (
                      <button
                        key={todo.id}
                        onClick={() => toggleTodo(todo.id)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors text-left group"
                      >
                        {todo.done
                          ? <CheckSquare className="w-3.5 h-3.5 text-violet-500/60 flex-shrink-0" />
                          : <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                        }
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-[11px] font-mono block truncate",
                            todo.done ? "text-slate-700 line-through" : "text-slate-300"
                          )}>
                            {todo.text}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-mono px-2 py-0.5 rounded-md border flex-shrink-0",
                          todo.done ? "text-slate-700 border-white/[0.03]" : "text-slate-600 border-white/[0.06]"
                        )}>
                          {todo.list}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-white/[0.04] flex-shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono text-slate-700">
                        {todos.filter(t => t.done).length} of {todos.length} complete
                      </span>
                      <span className="text-[9px] font-mono text-slate-700">
                        {Math.round((todos.filter(t => t.done).length / todos.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${(todos.filter(t => t.done).length / todos.length) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="h-full bg-violet-500/50 rounded-full"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Quick Launch ── */}
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

          <div className="h-4" />
        </div>
      </motion.div>

      {openMail && <MailModal mail={openMail} onClose={() => setOpenMail(null)} />}
    </>
  );
}
