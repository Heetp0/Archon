import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { CaretLeft, Clock, FolderOpen } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ProjectHistoryPanel from "@/components/ProjectHistoryPanel";

export default function ContextSidebar() {
  const { mode, setContextSidebarOpen } = useAppContext();
  const [tab, setTab] = useState<"vault" | "history">("history");

  return (
    <div className="flex flex-col h-full bg-panel-bg/95 border-r border-border-core/60 w-56 flex-shrink-0">
      {/* Header with collapse button */}
      <div className="px-3 py-2.5 border-b border-border-core/60 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary">
          {tab === "vault" ? "Local Brain" : "Sessions"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab((t) => (t === "vault" ? "history" : "vault"))}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all",
              "border-border-core text-text-secondary hover:text-text-primary hover:border-border-core/80"
            )}
            title={tab === "vault" ? "Switch to Sessions" : "Switch to Vault"}
          >
            {tab === "vault" ? (
              <><Clock className="w-3 h-3" /> Sessions</>
            ) : (
              <><FolderOpen className="w-3 h-3" /> Vault</>
            )}
          </button>
          <button
            onClick={() => setContextSidebarOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
            title="Collapse sidebar"
          >
            <CaretLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {tab === "vault" && (
          <div className="p-2 space-y-0.5">
            <div className="text-xs font-mono text-text-secondary text-center py-8">
              No vault connected.
            </div>
          </div>
        )}

        {tab === "history" && (
          <ProjectHistoryPanel currentMode={mode} />
        )}
      </ScrollArea>
    </div>
  );
}
