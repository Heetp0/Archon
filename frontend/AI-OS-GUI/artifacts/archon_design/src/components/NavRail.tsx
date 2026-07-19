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
  Gear,
  Notebook
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  id: AppMode;
  icon: React.ElementType;
  label: string;
}[] = [
  {
    id: "dashboard",
    icon: House,
    label: "Dashboard",
  },
  {
    id: "chat",
    icon: ChatCircle,
    label: "Chat",
  },
  {
    id: "council",
    icon: Users,
    label: "Council",
  },
  {
    id: "research",
    icon: MagnifyingGlass,
    label: "Research",
  },
  {
    id: "agents",
    icon: Cpu,
    label: "Agent Runtime",
  },
  {
    id: "obsidian",
    icon: Book,
    label: "Obsidian",
  },
  {
    id: "directory",
    icon: Robot,
    label: "Agents",
  },
  {
    id: "notebook",
    icon: Notebook,
    label: "Notebook Mode",
  },
];

export default function NavRail() {
  const { mode, setMode, setSettingsOpen } = useAppContext();
  const { connected } = useWebSocketContext();

  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === mode);

  return (
    <div className="flex flex-col items-center h-full w-14 bg-app-bg border-r border-border-core py-3 z-20 flex-shrink-0">
      {/* Logo mark */}
      <button
        onClick={() => setMode("dashboard")}
        className="mb-5 flex items-center justify-center w-9 h-9 rounded-xl border border-border-core bg-panel-bg hover:bg-panel-bg/80 transition-all overflow-hidden"
        title="Archon"
      >
        <img src="/archon-logo.png" alt="Archon" className="w-7 h-7 object-contain" />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-text-primary/5 mb-3" />

      {/* Mode buttons */}
      <nav className="relative flex flex-col items-center gap-0.5 flex-1 w-full overflow-y-auto scrollbar-none py-1">
        {/* Sliding active indicator */}
        {activeIndex !== -1 && (
          <div 
            className="absolute right-[-4px] w-[2px] bg-white transition-all duration-400 ease-in-out rounded-full z-20"
            style={{
              top: `${activeIndex * 42 + 8}px`, // 40px button + 2px gap, centered for 24px height
              height: "24px",
            }}
          />
        )}
        
        {NAV_ITEMS.map(({ id, icon: Icon, label }, index) => {
          const active = mode === id;
          const distance = activeIndex !== -1 ? Math.abs(activeIndex - index) : 10;
          const spotlightOpacity = active ? 1 : Math.max(0, 1 - distance * 0.6);
          
          return (
            <div key={id} className="relative group flex-shrink-0">
              <button
                onClick={() => setMode(id)}
                data-testid={`nav-${id}`}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 relative overflow-hidden flex-shrink-0",
                  active
                    ? "text-text-primary border-border-core bg-panel-bg"
                    : "text-text-secondary border-transparent hover:text-text-primary hover:bg-panel-bg/40 hover:border-border-core/25"
                )}
              >
                {/* Spotlight hover glow */}
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 blur-md rounded-full pointer-events-none transition-opacity duration-400"
                  style={{
                    opacity: spotlightOpacity,
                    transitionDelay: active ? "0.1s" : "0s",
                  }}
                />
                
                <Icon className="w-4 h-4 relative z-10" weight={active ? "fill" : "regular"} />
              </button>

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
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/40 hover:border-border-core/25 transition-all duration-200"
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
