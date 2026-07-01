import React from "react";
import { useAppContext, AppMode } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import {
  LayoutDashboard, MessageSquare, Users, Search, Cpu,
  BookOpen, Bot, Settings, Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  id: AppMode;
  icon: React.ElementType;
  label: string;
  color: string;
  activeClass: string;
  dot: string;
}[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    color: "text-cyan-400",
    activeClass: "shadow-[0_0_12px_rgba(34,211,238,0.5)] bg-cyan-500/10 border-cyan-500/40",
    dot: "bg-cyan-400",
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "Chat",
    color: "text-blue-400",
    activeClass: "shadow-[0_0_12px_rgba(59,130,246,0.5)] bg-blue-500/10 border-blue-500/40",
    dot: "bg-blue-400",
  },
  {
    id: "council",
    icon: Users,
    label: "Council",
    color: "text-orange-400",
    activeClass: "shadow-[0_0_12px_rgba(249,115,22,0.5)] bg-orange-500/10 border-orange-500/40",
    dot: "bg-orange-400",
  },
  {
    id: "research",
    icon: Search,
    label: "Research",
    color: "text-purple-400",
    activeClass: "shadow-[0_0_12px_rgba(168,85,247,0.5)] bg-purple-500/10 border-purple-500/40",
    dot: "bg-purple-400",
  },
  {
    id: "agents",
    icon: Cpu,
    label: "Agent Runtime",
    color: "text-green-400",
    activeClass: "shadow-[0_0_12px_rgba(34,197,94,0.5)] bg-green-500/10 border-green-500/40",
    dot: "bg-green-400",
  },
  {
    id: "obsidian",
    icon: BookOpen,
    label: "Obsidian",
    color: "text-violet-400",
    activeClass: "shadow-[0_0_12px_rgba(139,92,246,0.5)] bg-violet-500/10 border-violet-500/40",
    dot: "bg-violet-400",
  },
  {
    id: "directory",
    icon: Bot,
    label: "Agents",
    color: "text-indigo-400",
    activeClass: "shadow-[0_0_12px_rgba(99,102,241,0.5)] bg-indigo-500/10 border-indigo-500/40",
    dot: "bg-indigo-400",
  },
];

export default function NavRail() {
  const { mode, setMode, setSettingsOpen } = useAppContext();
  const { connected } = useWebSocketContext();

  return (
    <div className="flex flex-col items-center h-full w-14 bg-[#08090f] border-r border-white/[0.05] py-3 z-20 flex-shrink-0">
      {/* Logo mark */}
      <button
        onClick={() => setMode("dashboard")}
        className="mb-5 flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 hover:border-cyan-400/40 transition-all"
        title="The Core"
      >
        <Terminal className="w-4 h-4 text-cyan-400" />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-white/5 mb-3" />

      {/* Mode buttons */}
      <nav className="flex flex-col items-center gap-0.5 flex-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label, color, activeClass, dot }) => {
          const active = mode === id;
          return (
            <div key={id} className="relative group">
              <button
                onClick={() => setMode(id)}
                data-testid={`nav-${id}`}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200",
                  active
                    ? cn(color, activeClass, "border")
                    : "text-slate-600 border-transparent hover:text-slate-400 hover:bg-white/[0.04] hover:border-white/[0.06]"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>

              {/* Active indicator */}
              {active && (
                <div className={cn(
                  "absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full",
                  dot
                )} />
              )}

              {/* Tooltip */}
              <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-[#0d0e16] border border-white/[0.08] text-[10px] font-mono text-slate-300 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
                {label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: connection dot + settings */}
      <div className="flex flex-col items-center gap-2">
        {/* Connection indicator */}
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            connected ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-red-500/60"
          )}
          title={connected ? "Daemon connected" : "Daemon offline"}
        />

        {/* Settings */}
        <div className="relative group">
          <button
            onClick={() => setSettingsOpen(true)}
            data-testid="nav-settings"
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] hover:border-white/[0.06] transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-[#0d0e16] border border-white/[0.08] text-[10px] font-mono text-slate-300 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
            Settings
          </div>
        </div>
      </div>
    </div>
  );
}
