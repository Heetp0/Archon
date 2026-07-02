import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { FolderOpen, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ProjectHistoryPanel from "@/components/ProjectHistoryPanel";

export default function ContextSidebar() {
  const { mode } = useAppContext();
  const [tab, setTab] = useState<"vault" | "history">("history");

  return (
    <div className="flex flex-col h-full bg-[#020817]/95 border-r border-slate-800/60 w-56 flex-shrink-0">
      {/* Header — single toggle button */}
      <div className="px-3 py-3 border-b border-slate-800/60 flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
          {tab === "vault" ? "Local Brain" : "Sessions"}
        </span>
        <button
          onClick={() => setTab((t) => (t === "vault" ? "history" : "vault"))}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all",
            "border-slate-800 text-slate-600 hover:text-slate-300 hover:border-slate-600"
          )}
          title={tab === "vault" ? "Switch to Sessions" : "Switch to Vault"}
        >
          {tab === "vault" ? (
            <><History className="w-3 h-3" /> Sessions</>
          ) : (
            <><FolderOpen className="w-3 h-3" /> Vault</>
          )}
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
          <ProjectHistoryPanel currentMode={mode} />
        )}
      </ScrollArea>
    </div>
  );
}
