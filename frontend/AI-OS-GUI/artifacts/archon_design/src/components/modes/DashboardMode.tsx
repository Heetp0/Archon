import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Cpu, Zap, Clock, MessageSquare, Users, Search,
  BookOpen, Bot, ArrowRight, Wifi, WifiOff, Database,
  Mail, CheckSquare, Square, X, ExternalLink,
  RefreshCw, ChevronRight, CheckCircle2, InboxIcon, ListTodo,
  Play
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import type { AppMode } from "@/context/AppContext";
import CalendarWidget from "@/components/CalendarWidget";
import OnboardingFlow from "@/components/dashboard/OnboardingFlow";
import SettingsPanel from "@/components/dashboard/SettingsPanel";
import HelpSystem from "@/components/dashboard/HelpSystem";

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

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; accent: string;
}) {
  return (
    <div className="relative rounded border border-border-core bg-panel-bg p-5 overflow-hidden flex flex-col gap-3 transition-colors hover:border-[#444444] vercel-card">
      <div className="flex items-start justify-between">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center bg-[#111111] border border-[#222222]")}>
          <Icon className={cn("w-4 h-4 text-white")} />
        </div>
        {/* SVG Sparkline Spark/Trend Indicator */}
        <div className="h-8 flex items-end">
          <svg className="w-16 h-6 text-[#666666]" viewBox="0 0 100 30" fill="none">
            <path
              d="M0 25 C 20 15, 40 28, 60 10 C 80 5, 90 12, 100 2"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div>
        <div className="text-2xl font-mono font-bold text-white tracking-tight">{value}</div>
        <div className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-wider mt-0.5">{label}</div>
        {sub && <div className="text-[10px] font-mono text-[#666666] mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: any }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded border transition-colors",
      agent.status === "running" ? "border-emerald-900/40 bg-emerald-950/10" : "border-[#222222] bg-[#0a0a0a]"
    )}>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        agent.status === "running" ? "bg-white animate-pulse" : "bg-[#222222]"
      )} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-white font-medium">{agent.name}</div>
        <div className="text-[10px] font-mono text-[#a0a0a0] mt-0.5 truncate">{agent.action || "Idle"}</div>
      </div>
      <span className={cn(
        "text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border",
        agent.status === "running"
          ? "text-white border-white/20 bg-white/10"
          : "text-[#a0a0a0] border-[#222222] bg-transparent"
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
      className="flex items-center gap-2.5 px-4 py-2.5 rounded border border-[#222222] bg-panel-bg hover:bg-[#111111] text-xs font-mono transition-all group"
    >
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-[#a0a0a0] group-hover:text-white transition-colors">{label}</span>
      <ArrowRight className="w-3 h-3 text-[#a0a0a0] group-hover:text-white ml-auto transition-colors" />
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
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function SystemHealthPanel() {
  return (
    <div className="rounded border border-[#222222] bg-[#0a0a0a] p-4 flex flex-col gap-3 font-mono text-[10px]">
      <div className="flex items-center justify-between border-b border-[#222222] pb-2">
        <span className="font-bold text-white uppercase tracking-wider">System Health</span>
        <span className="flex items-center gap-1.5 text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          ONLINE
        </span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[#a0a0a0]">CPU Utilisation</span>
            <span className="text-white">12%</span>
          </div>
          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-[#222222]">
            <div className="h-full bg-white" style={{ width: "12%" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[#a0a0a0]">RAM Usage</span>
            <span className="text-white">4.2 GB / 16 GB</span>
          </div>
          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-[#222222]">
            <div className="h-full bg-white" style={{ width: "26%" }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 border border-[#222222] bg-black rounded flex flex-col gap-0.5">
            <span className="text-[#666666] text-[8px] uppercase">Latency</span>
            <span className="text-white text-xs">4 ms</span>
          </div>
          <div className="p-2 border border-[#222222] bg-black rounded flex flex-col gap-0.5">
            <span className="text-[#666666] text-[8px] uppercase">Daemon Sync</span>
            <span className="text-white text-xs">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FineTuneStatus {
  current_model: string;
  is_running: boolean;
  history: Array<{
    timestamp: string;
    model_name: string;
    dataset_size: number;
    baseline_wer: number;
    fine_tuned_wer: number;
    wer_reduction_percent: number;
  }>;
}

function TesseractModelWidget() {
  const [status, setStatus] = useState<FineTuneStatus | null>(null);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("http://localhost:8000/tutor/finetune/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch Tesseract status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerFinetune = async () => {
    setTriggering(true);
    try {
      const res = await fetch("http://localhost:8000/tutor/finetune/trigger", { method: "POST" });
      if (res.ok) {
        fetchStatus();
      }
    } catch (e) {
      console.error("Failed to trigger finetune:", e);
    } finally {
      setTriggering(false);
    }
  };

  if (!status) return null;

  return (
    <div className="rounded border border-[#222222] bg-[#0a0a0a] p-4 flex flex-col gap-3 font-mono text-[10px]">
      <div className="flex items-center justify-between border-b border-[#222222] pb-2">
        <span className="font-bold text-white uppercase tracking-wider">Tesseract OCR Tuning</span>
        <span className="flex items-center gap-1.5 text-white">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            status.is_running ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
          )} />
          {status.is_running ? "RUNNING" : "IDLE"}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[#a0a0a0]">Active Model:</span>
          <span className="text-white font-bold">{status.current_model}</span>
        </div>

        {status.history && status.history.length > 0 && (
          <div className="space-y-1">
            <span className="text-[#666666] text-[8px] uppercase tracking-wider block mb-1">Checkpoints History</span>
            <div className="max-h-[60px] overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: "none" }}>
              {status.history.map((h, idx) => (
                <div key={idx} className="flex justify-between text-[9px] border-b border-[#111] pb-0.5">
                  <span className="text-[#a0a0a0]">{new Date(h.timestamp).toLocaleDateString()}</span>
                  <span className="text-emerald-400">-{h.wer_reduction_percent.toFixed(1)}% WER</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={triggerFinetune}
          disabled={status.is_running || triggering}
          className={cn(
            "w-full py-2 px-3 rounded border text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all",
            status.is_running || triggering
              ? "border-[#222] bg-[#111] text-[#666] cursor-not-allowed"
              : "border-white bg-white text-black hover:bg-black hover:text-white"
          )}
        >
          {status.is_running ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Fine-tuning Model...
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Trigger Custom Fine-tuning
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MailDetailModal({ mail, onClose }: { mail: MailItem | null; onClose: () => void }) {
  if (!mail) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="bg-panel-bg border border-border-core rounded max-w-lg w-full flex flex-col max-h-[85vh] shadow-2xl"
        >
          <div className="px-6 py-4 border-b border-border-core flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Mail Summary</h3>
              <p className="text-[10px] font-mono text-[#a0a0a0] mt-0.5">Sender: {mail.sender}</p>
            </div>
            <button onClick={onClose} className="text-[#a0a0a0] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="font-mono text-xs leading-relaxed text-white space-y-4">
              <div>
                <span className="text-[#666666] text-[9px] uppercase tracking-widest block mb-1">Subject</span>
                <div className="text-white font-bold">{mail.subject}</div>
              </div>
              <div>
                <span className="text-[#666666] text-[9px] uppercase tracking-widest block mb-1">Analysis & Action Items</span>
                <div className="p-4 bg-[#0a0a0a] rounded border border-border-core whitespace-pre-wrap">{mail.fullSummary}</div>
              </div>
            </div>
          </ScrollArea>
          <div className="px-6 py-4 border-t border-border-core flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-[#222222] bg-[#0a0a0a] text-xs font-mono text-[#a0a0a0] hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

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
          <span className="text-[10px] font-mono text-text-secondary">No activity data - connect daemon to track usage</span>
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

function useDerivedActivity(terminalLines: any[]) {
  return useMemo(() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { day: days[d.getDay()], commands: 0, tokens: 0 };
    });
  }, [terminalLines.length]);
}

export default function DashboardMode() {
  const { agentStatuses, connected, telemetry, terminalLines, calendarEvents } = useWebSocketContext();
  const { setMode } = useAppContext();
  const uptime = useUptime();

  const [mails, setMails]   = useState<MailItem[]>([]);
  const [todos, setTodos]   = useState<TodoItem[]>([]);
  const [openMail, setOpenMail] = useState<MailItem | null>(null);
  const [chartView, setChartView] = useState<"commands" | "tokens">("commands");

  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('archon_onboarded'));
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const activityData = useDerivedActivity(terminalLines);

  const activeAgents  = agentStatuses.filter((a) => a.status === "running").length;
  const pendingTodos  = todos.filter((t) => !t.done).length;
  const unreadMails   = mails.filter((m) => m.unread).length;

  const QUICK_ACTIONS: { icon: React.ElementType; label: string; color: string; mode: AppMode }[] = [
    { icon: MessageSquare, label: "New Chat",         color: "text-white",   mode: "chat" },
    { icon: Users,         label: "Start Council",    color: "text-white", mode: "council" },
    { icon: Search,        label: "Deep Research",    color: "text-white", mode: "research" },
    { icon: Cpu,           label: "Agent Runtime",    color: "text-white",  mode: "agents" },
    { icon: BookOpen,      label: "Obsidian Vault",   color: "text-white", mode: "obsidian" },
    { icon: Bot,           label: "Agents Directory", color: "text-white", mode: "directory" },
  ];

  const toggleTodo = (id: string) =>
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-full bg-app-bg overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border-core flex-shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-mono font-bold text-white tracking-wider">Archon Workspace</h1>
              <p className="text-[10px] font-mono text-[#a0a0a0] mt-1">AI Operating System | Management Console</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono",
                connected ? "border-emerald-950 bg-emerald-950/10 text-emerald-400" : "border-red-950 bg-red-950/10 text-red-400"
              )}>
                {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {connected ? "Daemon Online" : "Daemon Offline"}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#222222] bg-[#0a0a0a] text-xs font-mono text-white">
                <Clock className="w-3 h-3 text-[#a0a0a0]" />
                {uptime}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-8 min-w-0">
          {/* Stat cards with trend lines */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              icon={Cpu}
              label="Active Agents"
              value={agentStatuses.length > 0 ? activeAgents : "0"}
              sub={agentStatuses.length > 0 ? "Running processes" : "Connect daemon to track"}
              accent="text-white"
            />
            <StatCard
              icon={Zap}
              label="Tokens Used"
              value={telemetry.tokens > 0 ? telemetry.tokens.toLocaleString() : "0"}
              sub={telemetry.cost > 0 ? `$${telemetry.cost.toFixed(4)}` : "Session total"}
              accent="text-white"
            />
            <StatCard
              icon={Mail}
              label="Unread Mail"
              value={connected ? unreadMails : "0"}
              sub={connected ? "Click to read summaries" : "Connect daemon to sync"}
              accent="text-white"
            />
            <StatCard
              icon={CheckSquare}
              label="Tasks Pending"
              value={connected ? pendingTodos : "0"}
              sub={connected ? `${todos.filter(t => t.done).length} completed` : "Connect daemon to sync"}
              accent="text-white"
            />
          </div>

          {/* Progress charts row */}
          <div className="grid grid-cols-5 gap-6">
            {/* Activity bar chart */}
            <div className="col-span-3 rounded border border-border-core bg-panel-bg p-5 vercel-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-mono text-white uppercase tracking-widest">7-Day Activity</h2>
                <div className="flex gap-1">
                  {(["commands","tokens"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setChartView(v)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all",
                        chartView === v
                          ? "bg-white text-black border border-white"
                          : "text-[#a0a0a0] hover:text-white"
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
                color={chartView === "commands" ? "white" : "white"}
                height={160}
              />
            </div>

            {/* Calendar */}
            <div className="col-span-2 flex flex-col min-h-[320px]">
              <CalendarWidget events={calendarEvents} loading={false} />
            </div>
          </div>

          {/* Middle row - active status grids + activity log */}
          <div className="grid grid-cols-5 gap-6">
            {/* Agent Status (Active status grid) */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest">Agent Status Grid</h2>
                <button onClick={() => setMode("agents")} className="text-[10px] font-mono text-[#a0a0a0] hover:text-white transition-colors">
                  Open Runtime -&gt;
                </button>
              </div>
              {/* Active status grid layout */}
              <div className="grid grid-cols-1 gap-2">
                {agentStatuses.length === 0 ? (
                  <div className="text-xs font-mono text-[#a0a0a0] py-6 text-center rounded border border-border-core bg-[#0a0a0a]">
                    No agents active. Send a command to spin them up.
                  </div>
                ) : (
                  agentStatuses.map((a) => <AgentRow key={a.id} agent={a} />)
                )}
              </div>
              
              {/* System Health Panel */}
              <SystemHealthPanel />
              
              {/* Tesseract Model Widget */}
              <TesseractModelWidget />
            </div>

            {/* Activity Feed */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest">Activity Feed</h2>
                <button onClick={() => setMode("agents")} className="text-[10px] font-mono text-[#a0a0a0] hover:text-white transition-colors">
                  Open Terminal -&gt;
                </button>
              </div>
              <div className="flex-1 rounded border border-border-core bg-black overflow-hidden">
                <div
                  className="h-[220px] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#222222 transparent" }}
                >
                  {terminalLines.length === 0 ? (
                    <div className="text-[#a0a0a0] text-center py-8">No activity yet. Start a session to see logs.</div>
                  ) : (
                    [...terminalLines].reverse().slice(0, 60).reverse().map((line) => (
                      <div key={line.id} className={cn(
                        "flex gap-3",
                        line.kind === "input"  ? "text-white"  :
                        line.kind === "error"  ? "text-red-400 bg-red-950/20 rounded-sm px-1" :
                        line.kind === "system" ? "text-white font-bold"  : "text-[#a0a0a0]"
                      )}>
                        <span className="text-[#666666] flex-shrink-0 select-none">{line.timestamp}</span>
                        <span className="break-all">{line.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mail digest + Todo row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Mail digest */}
            <div className="rounded border border-border-core bg-[#0a0a0a] overflow-hidden flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-white" />
                  <h2 className="text-[10px] font-mono text-white uppercase tracking-widest">Mail Digest</h2>
                  {unreadMails > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-white text-black text-[9px] font-mono font-bold">
                      {unreadMails} New
                    </span>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {mails.length === 0 ? (
                    <div className="text-center py-8 flex flex-col items-center justify-center">
                      <InboxIcon className="w-8 h-8 text-[#666666] mb-2" />
                      <p className="text-xs font-mono text-[#a0a0a0]">Inbox empty</p>
                    </div>
                  ) : (
                    mails.map((mail) => (
                      <div
                        key={mail.id}
                        onClick={() => setOpenMail(mail)}
                        className={cn(
                          "p-3 rounded border transition-all cursor-pointer text-left relative",
                          mail.unread
                            ? "bg-[#111111] border-white/20 hover:border-white"
                            : "bg-[#0a0a0a] border-[#222222] hover:border-[#444444] opacity-70"
                        )}
                      >
                        {mail.unread && (
                          <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                        <div className="text-xs font-mono font-bold text-white truncate pr-4">{mail.subject}</div>
                        <div className="text-[10px] font-mono text-[#a0a0a0] mt-1 truncate">{mail.sender}</div>
                        <p className="text-[10px] font-mono text-[#666666] mt-2 line-clamp-2">{mail.preview}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Todo checklist */}
            <div className="rounded border border-border-core bg-[#0a0a0a] overflow-hidden flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-3.5 h-3.5 text-white" />
                  <h2 className="text-[10px] font-mono text-white uppercase tracking-widest">Tasks & Checklist</h2>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {todos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs font-mono text-[#a0a0a0]">No tasks found</p>
                    </div>
                  ) : (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        onClick={() => toggleTodo(todo.id)}
                        className={cn(
                          "flex items-start gap-3 p-2.5 rounded border transition-colors cursor-pointer",
                          todo.done
                            ? "bg-[#111111]/30 border-[#222222]/50 text-[#666666]"
                            : "bg-[#0a0a0a] border-[#222222] text-white hover:border-[#444444]"
                        )}
                      >
                        <button className="mt-0.5 text-[#a0a0a0] hover:text-white flex-shrink-0 transition-colors">
                          {todo.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Square className="w-4 h-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={cn("text-xs font-mono", todo.done && "line-through")}>{todo.text}</div>
                          <span className="text-[8px] font-mono text-[#666666] uppercase tracking-wider block mt-1">
                            List: {todo.list}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Quick Actions grid */}
          <div className="pt-4 border-t border-[#222222]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest">Quick Command Center</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHelp(true)}
                  className="text-[10px] font-mono text-[#444444] hover:text-[#999999] transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Help
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-[10px] font-mono text-[#444444] hover:text-[#999999] transition-colors flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <QuickAction
                  key={action.label}
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

      <MailDetailModal mail={openMail} onClose={() => setOpenMail(null)} />
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => { localStorage.setItem('archon_onboarded', '1'); setShowOnboarding(false); }}
          onSkip={() => { localStorage.setItem('archon_onboarded', '1'); setShowOnboarding(false); }}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpSystem onClose={() => setShowHelp(false)} />}
    </>
  );
}

