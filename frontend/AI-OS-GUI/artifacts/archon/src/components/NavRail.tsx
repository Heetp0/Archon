import React from "react";
import { useAppContext, AppMode } from "@/context/AppContext";
import { MessageSquare, Users, Search, Cpu, Settings, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { id: AppMode; icon: React.ElementType; label: string; color: string; glow: string }[] = [
  { id: "chat",     icon: MessageSquare, label: "Chat",     color: "text-blue-400",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.6)] bg-blue-500/10 border-blue-500/40" },
  { id: "council",  icon: Users,         label: "Council",  color: "text-orange-400", glow: "shadow-[0_0_12px_rgba(249,115,22,0.6)] bg-orange-500/10 border-orange-500/40" },
  { id: "research", icon: Search,        label: "Research", color: "text-purple-400", glow: "shadow-[0_0_12px_rgba(168,85,247,0.6)] bg-purple-500/10 border-purple-500/40" },
  { id: "agents",   icon: Cpu,           label: "Agents",   color: "text-green-400",  glow: "shadow-[0_0_12px_rgba(34,197,94,0.6)]  bg-green-500/10  border-green-500/40" },
];

export default function NavRail() {
  const { mode, setMode } = useAppContext();

  return (
    <div className="flex flex-col items-center h-full w-14 bg-[#010710] border-r border-slate-800/60 py-3 z-20 flex-shrink-0">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-slate-700">
        <Terminal className="w-4 h-4 text-cyan-400" />
      </div>

      {/* Mode buttons */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label, color, glow }) => {
          const active = mode === id;
          return (
            <div key={id} className="relative group">
              <button
                onClick={() => setMode(id)}
                data-testid={`nav-${id}`}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-200",
                  active
                    ? cn(color, glow)
                    : "text-slate-600 border-transparent hover:text-slate-300 hover:bg-slate-800/60"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
              {/* Active indicator dot */}
              {active && (
                <div className={cn("absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full", {
                  "bg-blue-400":   id === "chat",
                  "bg-orange-400": id === "council",
                  "bg-purple-400": id === "research",
                  "bg-green-400":  id === "agents",
                })} />
              )}
              {/* Tooltip */}
              <div className="absolute left-12 top-1/2 -translate-y-1/2 z-50 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="relative group">
        <button
          onClick={() => setMode("settings")}
          data-testid="nav-settings"
          className="w-10 h-10 rounded-lg flex items-center justify-center border border-transparent text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-all duration-200"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="absolute left-12 top-1/2 -translate-y-1/2 z-50 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Settings
        </div>
      </div>
    </div>
  );
}
