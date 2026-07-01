import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Cpu, Zap, Clock, MessageSquare, Users, Search,
  BookOpen, Bot, ArrowRight, Wifi, WifiOff, Database,
  TrendingUp, Mail, CheckSquare, Square, X, ExternalLink,
  RefreshCw, ChevronRight, CheckCircle2
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

// ── Mock data (replaced by daemon /briefing data when connected) ────────────────
const MOCK_MAILS: MailItem[] = [
  {
    id: "m1", unread: true,
    sender: "GitHub", subject: "Action failed: deploy.yml on main",
    date: "10:42 AM",
    preview: "The workflow run 'deploy.yml' failed on push to main…",
    fullSummary: `## GitHub Actions — deploy.yml failed

**Repository:** your-org/the-core  
**Branch:** main  
**Triggered by:** push (commit a3f9c2d)

### What failed
The \`Build & Deploy\` job failed at step **"Install pnpm deps"** with exit code 1.

\`\`\`
Error: Cannot find module '@workspace/archon'
Hint: Did you run pnpm install in the workspace root?
\`\`\`

### Steps to fix
1. Ensure \`pnpm-workspace.yaml\` includes all artifact paths.
2. Run \`pnpm install\` at the workspace root before \`pnpm --filter @workspace/archon build\`.
3. Re-run the failed job from the Actions tab.

[View run →](https://github.com)`
  },
  {
    id: "m2", unread: true,
    sender: "Notion", subject: "Your weekly digest is ready",
    date: "9:15 AM",
    preview: "Here's what happened in your workspace this week…",
    fullSummary: `## Notion Weekly Digest — W26 2026

### Pages updated this week (12)
- **The Core — System Architecture** (updated 3 times)
- **Research Pipeline — Q3 2026** (2 updates)
- **CodeSpace / archon** (5 updates)
- **Meeting Notes — June 30** (new)

### Tasks completed (7)
✓ Finalize dashboard UI  
✓ Connect LanceDB vault search  
✓ Set up GitHub Actions pipeline  
✓ Draft research proposal v2  
✓ Write system overview doc  
✓ Review PR #14  
✓ Update dependencies  

### Tasks overdue (2)
⚠ Submit conference abstract — was due Jun 28  
⚠ Reply to supervisor re: thesis draft`
  },
  {
    id: "m3", unread: false,
    sender: "Vercel", subject: "Deployment to production succeeded",
    date: "Yesterday",
    preview: "Your latest deployment is live at the-core.vercel.app…",
    fullSummary: `## Vercel Deployment Succeeded ✓

**Project:** the-core  
**Environment:** Production  
**URL:** https://the-core.vercel.app  
**Duration:** 1m 42s  
**Commit:** \`feat: add dashboard redesign\` (a3f9c2d)

### Build summary
- Framework: Vite 8.1.0
- Output size: 842 KB (gzip: 234 KB)
- Functions deployed: 0
- Edge config: none

All checks passed. Your deployment is live.`
  },
  {
    id: "m4", unread: false,
    sender: "Prof. Rahman", subject: "RE: Thesis draft feedback",
    date: "Yesterday",
    preview: "Thanks for sending over the draft — I have a few notes on Chapter 3…",
    fullSummary: `## RE: Thesis draft feedback

Hi,

Thank you for sending over Chapter 3. Overall the structure is solid. Here are my notes:

**Strengths**
- The literature review is thorough and well-cited.
- The methodology section clearly justifies the choice of LanceDB for vector search.

**Revisions needed**
1. **Section 3.2** — The performance benchmarks need error bars. Please re-run the ablation study with 5 trials and report mean ± std.
2. **Figure 3.4** — Axes are unlabeled. Add units (ms for latency, MB for memory).
3. **Conclusion para 2** — The claim about "10× speedup" needs a direct citation or should be softened.

Please revise and send back by **July 7**. We can schedule a call after that.

Best,  
Prof. Rahman`
  },
  {
    id: "m5", unread: true,
    sender: "Linear", subject: "[THE-CORE] 3 issues need attention",
    date: "Mon",
    preview: "Issues assigned to you are past due or blocked…",
    fullSummary: `## Linear — Issues needing attention

### Past due
- **THE-CORE-42** — Implement vault-aware skill execution  
  *Due: Jun 28 · Assignee: You · Priority: High*

### Blocked
- **THE-CORE-38** — MCP Gmail integration end-to-end test  
  *Blocked by: THE-CORE-35 (daemon WebSocket wss:// fix)*

### In Review
- **THE-CORE-47** — Dashboard progress charts  
  *Waiting on review from: @team*

[Open Linear →](https://linear.app)`
  },
];

const MOCK_TODOS: TodoItem[] = [
  { id: "t1", text: "Finish thesis Chapter 3 revisions", done: false, list: "Thesis" },
  { id: "t2", text: "Submit conference abstract by July 5", done: false, list: "Academic" },
  { id: "t3", text: "Wire daemon WebSocket wss:// for Replit", done: false, list: "The Core" },
  { id: "t4", text: "Re-run ablation study with 5 trials", done: false, list: "Research" },
  { id: "t5", text: "Reply to Prof. Rahman re: feedback", done: false, list: "Academic" },
  { id: "t6", text: "Push dashboard redesign to main", done: true, list: "The Core" },
  { id: "t7", text: "Update LanceDB to v0.19", done: true, list: "The Core" },
  { id: "t8", text: "Book study room for Friday session", done: true, list: "Study" },
];

// 7-day activity data (commands sent per day)
const ACTIVITY_DATA = [
  { day: "Mon", commands: 14, tokens: 42 },
  { day: "Tue", commands: 22, tokens: 68 },
  { day: "Wed", commands: 9,  tokens: 31 },
  { day: "Thu", commands: 31, tokens: 94 },
  { day: "Fri", commands: 18, tokens: 57 },
  { day: "Sat", commands: 5,  tokens: 16 },
  { day: "Sun", commands: 27, tokens: 83 },
];

// Project progress
const PROJECTS = [
  { name: "The Core — AI OS",    pct: 68, status: "active",   color: "#22d3ee" },
  { name: "Thesis Chapter 3",    pct: 45, status: "at-risk",  color: "#f97316" },
  { name: "Research Pipeline",   pct: 82, status: "active",   color: "#a78bfa" },
  { name: "CodeSpace / archon",  pct: 91, status: "active",   color: "#4ade80" },
  { name: "Conference Abstract", pct: 15, status: "blocked",  color: "#ef4444" },
];

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
              if (line.startsWith("**") && line.endsWith("**")) return (
                <p key={i} className="text-xs font-mono text-slate-300 font-semibold">{line.replace(/\*\*/g,"")}</p>
              );
              if (line.startsWith("✓")) return (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-emerald-400/80">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />{line.replace("✓ ","")}
                </div>
              );
              if (line.startsWith("⚠")) return (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-amber-400/80">
                  <span className="text-amber-400 flex-shrink-0">⚠</span>{line.replace("⚠ ","")}
                </div>
              );
              if (line.startsWith("- **")) return (
                <div key={i} className="flex items-start gap-2 text-xs font-mono text-slate-400 py-0.5">
                  <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-600" />
                  <span dangerouslySetInnerHTML={{ __html: line.replace(/- \*\*(.*?)\*\*/,"<strong class='text-slate-300'>$1</strong>") }} />
                </div>
              );
              if (line.startsWith("```")) return (
                <div key={i} className="rounded-lg bg-[#08090e] border border-white/[0.05] px-3 py-2 font-mono text-xs text-slate-500 mt-1" />
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

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      width="100%"
      height={height}
      style={{ overflow: "visible" }}
    >
      {/* Y-axis ticks */}
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

      {/* Bars */}
      {data.map((d, i) => {
        const val = d[dataKey];
        const barH = (val / maxVal) * chartH;
        const x = padL + i * (barW + gap);
        const y = padT + chartH - barH;
        const isHov = hovered === i;
        return (
          <g key={d.day}>
            {/* Hover bg */}
            <rect x={x - 4} y={padT} width={barW + 8} height={chartH}
              fill={isHov ? "rgba(255,255,255,0.03)" : "transparent"} rx={4}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            />
            {/* Bar */}
            <rect x={x} y={y} width={barW} height={barH}
              fill={color} fillOpacity={isHov ? 0.95 : 0.72} rx={4}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            {/* Tooltip */}
            {isHov && (
              <g>
                <rect x={x - 10} y={y - 28} width={38} height={20}
                  fill="#0f1017" rx={5}
                  stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <text x={x + barW / 2} y={y - 14} textAnchor="middle"
                  fontSize={10} fontFamily="monospace" fill="#e2e8f0">{val}</text>
              </g>
            )}
            {/* X label */}
            <text x={x + barW / 2} y={height - 4} textAnchor="middle"
              fontSize={9} fontFamily="monospace" fill="#475569">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardMode() {
  const { agentStatuses, connected, telemetry, terminalLines } = useWebSocketContext();
  const { setMode } = useAppContext();
  const uptime = useUptime();

  const [todos, setTodos] = useState<TodoItem[]>(MOCK_TODOS);
  const [openMail, setOpenMail] = useState<MailItem | null>(null);
  const [chartView, setChartView] = useState<"commands" | "tokens">("commands");

  const activeAgents = agentStatuses.filter((a) => a.status === "running").length;
  const totalTasks = terminalLines.filter((l) => l.kind === "input").length;
  const pendingTodos = todos.filter((t) => !t.done).length;
  const unreadMails = MOCK_MAILS.filter((m) => m.unread).length;

  const QUICK_ACTIONS: { icon: React.ElementType; label: string; color: string; mode: AppMode }[] = [
    { icon: MessageSquare, label: "New Chat",        color: "text-blue-400",   mode: "chat" },
    { icon: Users,         label: "Start Council",   color: "text-orange-400", mode: "council" },
    { icon: Search,        label: "Deep Research",   color: "text-purple-400", mode: "research" },
    { icon: Cpu,           label: "Agent Runtime",   color: "text-green-400",  mode: "agents" },
    { icon: BookOpen,      label: "Obsidian Vault",  color: "text-violet-400", mode: "obsidian" },
    { icon: Bot,           label: "Agents Directory",color: "text-indigo-400", mode: "directory" },
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
            <StatCard icon={Cpu}        label="Active Agents"  value={activeAgents || agentStatuses.length} sub="Running processes"   accent="text-green-400" />
            <StatCard icon={Zap}        label="Tokens Used"    value={telemetry.tokens > 0 ? telemetry.tokens.toLocaleString() : "—"} sub={telemetry.cost > 0 ? `$${telemetry.cost.toFixed(4)}` : "Session total"} accent="text-cyan-400" />
            <StatCard icon={Mail}       label="Unread Mail"    value={unreadMails}  sub="Click to read summaries" accent="text-blue-400" />
            <StatCard icon={CheckSquare} label="Tasks Pending" value={pendingTodos} sub={`${todos.filter(t=>t.done).length} completed`} accent="text-violet-400" />
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
                data={ACTIVITY_DATA}
                dataKey={chartView}
                color={chartView === "commands" ? "#22d3ee" : "#a78bfa"}
                height={160}
              />
            </div>

            {/* Project progress bars */}
            <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-[#0b0c13] p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Projects</h2>
                <div className="flex gap-2 text-[9px] font-mono">
                  {[
                    { label: "active",   color: "text-emerald-400" },
                    { label: "at-risk",  color: "text-orange-400" },
                    { label: "blocked",  color: "text-red-400" },
                  ].map((s) => (
                    <span key={s.label} className={cn(s.color, "opacity-70")}>{s.label}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {PROJECTS.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-600 ml-2">{p.pct}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: p.color, opacity: 0.75 }}
                      />
                    </div>
                  </div>
                ))}
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
                    <div className="text-slate-700 text-center py-8">No activity yet.</div>
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
            <div className="rounded-2xl border border-white/[0.06] bg-[#0b0c13] overflow-hidden flex flex-col">
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

              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}>
                {MOCK_MAILS.map((mail) => (
                  <button
                    key={mail.id}
                    onClick={() => setOpenMail(mail)}
                    className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left group"
                  >
                    {/* Unread dot */}
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
            </div>

            {/* Todo list */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0b0c13] overflow-hidden flex flex-col">
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
                <span className="text-[10px] font-mono text-slate-700">Google Keep · synced via MCP</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}>
                {/* Pending first */}
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
                      todo.done
                        ? "text-slate-700 border-white/[0.03]"
                        : "text-slate-600 border-white/[0.06]"
                    )}>
                      {todo.list}
                    </span>
                  </button>
                ))}
              </div>

              {/* Footer — completion bar */}
              <div className="px-5 py-3 border-t border-white/[0.04] flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono text-slate-700">
                    {todos.filter(t=>t.done).length} of {todos.length} complete
                  </span>
                  <span className="text-[9px] font-mono text-slate-700">
                    {Math.round((todos.filter(t=>t.done).length / todos.length) * 100)}%
                  </span>
                </div>
                <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${(todos.filter(t=>t.done).length / todos.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="h-full bg-violet-500/50 rounded-full"
                  />
                </div>
              </div>
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

          {/* bottom breathing room */}
          <div className="h-4" />
        </div>
      </motion.div>

      {/* Mail modal (portal-less, sits above overlay) */}
      {openMail && <MailModal mail={openMail} onClose={() => setOpenMail(null)} />}
    </>
  );
}
