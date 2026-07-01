import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  FolderOpen, MessageSquare, Users, Search, Cpu, Clock, ChevronRight
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AppMode } from "@/context/AppContext";

const HISTORY_MODE_ICON: Record<AppMode | string, React.ElementType> = {
  chat: MessageSquare, council: Users, research: Search, agents: Cpu, settings: Clock,
};
const HISTORY_MODE_COLOR: Record<string, string> = {
  chat: "text-blue-400", council: "text-orange-400", research: "text-purple-400", agents: "text-green-400",
};

export default function ContextSidebar() {
  const { history } = useAppContext();
  const [tab, setTab] = useState<"vault" | "history">("vault");

  return (
    <div className="flex flex-col h-full bg-[#020817]/95 border-r border-slate-800/60 w-56 flex-shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-800/60 flex items-center gap-2">
        <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Local Brain</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60">
        <button
          onClick={() => setTab("vault")}
          data-testid="tab-vault"
          className={cn(
            "flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors",
            tab === "vault"
              ? "text-slate-200 border-b-2 border-slate-400 bg-slate-800/30"
              : "text-slate-600 hover:text-slate-400"
          )}
        >
          Vault
        </button>
        <button
          onClick={() => setTab("history")}
          data-testid="tab-history"
          className={cn(
            "flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors",
            tab === "history"
              ? "text-slate-200 border-b-2 border-slate-400 bg-slate-800/30"
              : "text-slate-600 hover:text-slate-400"
          )}
        >
          History
        </button>
      </div>

      <ScrollArea className="flex-1">
        {tab === "vault" && (
          <div className="p-2 space-y-0.5">
            <div className="text-xs font-mono text-slate-600 text-center py-8">
              No vault connected.
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="p-2 space-y-1">
            {history.length === 0 && (
              <div className="text-xs font-mono text-slate-600 text-center py-8">
                No session history yet.
              </div>
            )}
            {history.map((item) => {
              const Icon = HISTORY_MODE_ICON[item.mode] || Clock;
              const color = HISTORY_MODE_COLOR[item.mode] || "text-slate-400";
              return (
                <button
                  key={item.id}
                  data-testid={`history-item-${item.id}`}
                  className="w-full text-left p-2 rounded border border-transparent hover:bg-slate-900/60 hover:border-slate-800 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className={cn("w-3 h-3 flex-shrink-0", color)} />
                      <span className="text-xs font-mono text-slate-300 truncate">{item.title}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 truncate pl-4">{item.preview}</p>
                  <div className="text-[9px] font-mono text-slate-700 pl-4 mt-0.5">{item.timestamp}</div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
