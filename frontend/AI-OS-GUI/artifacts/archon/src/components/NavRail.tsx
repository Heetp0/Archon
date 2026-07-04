import React from "react";
import { useAppContext, AppMode } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import {
  House,
  ChatCircle,
  Users,
  MagnifyingGlass,
  Cpu,
  Book,
  Robot,
  Gear
} from "@phosphor-icons/react";
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
    icon: House,
    label: "Dashboard",
    color: "text-accent-indigo",
    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",
    dot: "bg-accent-indigo",
  },
  {
    id: "chat",
    icon: ChatCircle,
    label: "Chat",
    color: "text-accent-indigo",
    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",
    dot: "bg-accent-indigo",
  },
  {
    id: "council",
    icon: Users,
    label: "Council",
    color: "text-accent-rose",
    activeClass: "bg-accent-rose/10 border-accent-rose/40",
    dot: "bg-accent-rose",
  },
  {
    id: "research",
    icon: MagnifyingGlass,
    label: "Research",
    color: "text-accent-indigo",
    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",
    dot: "bg-accent-indigo",
  },
  {
    id: "agents",
    icon: Cpu,
    label: "Agent Runtime",
    color: "text-accent-emerald",
    activeClass: "bg-accent-emerald/10 border-accent-emerald/40",
    dot: "bg-accent-emerald",
  },
  {
    id: "obsidian",
    icon: Book,
    label: "Obsidian",
    color: "text-accent-indigo",
    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",
    dot: "bg-accent-indigo",
  },
  {
    id: "directory",
    icon: Robot,
    label: "Agents",
    color: "text-accent-indigo",
    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",
    dot: "bg-accent-indigo",
  },
];

export default function NavRail() {
  const { mode, setMode, setSettingsOpen } = useAppContext();
  const { connected } = useWebSocketContext();

  return (
    <div className="flex flex-col items-center h-full w-14 bg-app-bg border-r border-border-core/20 py-3 z-20 flex-shrink-0">
      {/* Logo mark */}
      <button
        onClick={() => setMode("dashboard")}
        className="mb-5 flex items-center justify-center w-9 h-9 rounded-xl border border-accent-indigo/30 bg-accent-indigo/10 hover:bg-accent-indigo/20 hover:border-accent-indigo/50 transition-all overflow-hidden"
        title="Archon"
      >
        <img src="/archon-logo.png" alt="Archon" className="w-7 h-7 object-contain" />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-text-primary/5 mb-3" />

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
                    : "text-text-secondary border-transparent hover:text-text-secondary hover:bg-panel-bg/40 hover:border-border-core/25"
                )}
              >
                <Icon className="w-4 h-4" weight={active ? "fill" : "regular"} />
              </button>

              {/* Active indicator */}
              {active && (
                <div className={cn(
                  "absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full",
                  dot
                )} />
              )}

              {/* Tooltip */}
              <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-panel-bg border border-border-core/30 text-[10px] font-mono text-text-primary whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
            connected ? "bg-accent-emerald" : "bg-accent-rose/60"
          )}
          title={connected ? "Daemon connected" : "Daemon offline"}
        />

        {/* Settings */}
        <div className="relative group">
          <button
            onClick={() => setSettingsOpen(true)}
            data-testid="nav-settings"
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent text-text-secondary hover:text-text-secondary hover:bg-panel-bg/40 hover:border-border-core/25 transition-all duration-200"
          >
            <Gear className="w-4 h-4" />
          </button>
          <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-panel-bg border border-border-core/30 text-[10px] font-mono text-text-primary whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            Settings
          </div>
        </div>
      </div>
    </div>
  );
}
