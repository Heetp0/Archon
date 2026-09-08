import React from "react";
import { Server, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ALL_FILE_TABS } from "./FileViewerTabs";
import { ContextFilesSection } from "./ContextFilesSection";

interface AgentFileInspectorPanelProps {
  handleSetPanelView: (view: "context" | "files") => void;
  activeProjectId: string | null;
}

export const AgentFileInspectorPanel = React.memo(function AgentFileInspectorPanel({
  handleSetPanelView,
  activeProjectId
}: AgentFileInspectorPanelProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-2 border-b border-border-core/60 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-accent-emerald" />
          <span className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase">File Inspector</span>
        </div>
        <div className="relative group">
          <button className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="absolute right-0 top-6 z-30 hidden group-hover:block w-36 bg-panel-bg border border-border-core rounded overflow-hidden">
            {ALL_FILE_TABS.filter((f) => f.id !== "analysis" && f.id !== "schema" && f.id !== "config" && f.id !== "readme").map((f) => (
              <button
                key={f.id}
                onClick={() => handleSetPanelView("files")}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-text-secondary hover:bg-panel-bg hover:text-text-primary transition-colors"
              >
                <f.icon className={cn("w-3 h-3 flex-shrink-0", f.iconColor)} />
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="text-xs font-mono text-text-secondary text-center py-8">
          Switch to "File Viewer" panel to inspect agent-generated files.
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border-core/60 flex-shrink-0">
        <ContextFilesSection projectId={activeProjectId} />
      </div>
    </div>
  );
});
