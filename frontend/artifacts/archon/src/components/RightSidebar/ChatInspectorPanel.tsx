import React from "react";
import { Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ContextFilesSection } from "./ContextFilesSection";

interface ChatInspectorPanelProps {
  telemetry: any;
  clearChat: () => void;
  activeProjectId: string | null;
}

export const ChatInspectorPanel = React.memo(function ChatInspectorPanel({
  telemetry,
  clearChat,
  activeProjectId
}: ChatInspectorPanelProps) {
  return (
    <>
      <div className="p-4 border-b border-border-core/60 flex-shrink-0">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-accent-indigo" />
          Telemetry
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Session Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-panel-bg/80 border border-border-core rounded p-3">
                <div className="text-[10px] text-text-secondary font-mono mb-1">TOKENS</div>
                <div className="text-lg font-mono text-accent-indigo">
                  {telemetry.tokens > 0 ? `${(telemetry.tokens / 1000).toFixed(1)}k` : "—"}
                </div>
              </div>
              <div className="bg-panel-bg/80 border border-border-core rounded p-3">
                <div className="text-[10px] text-text-secondary font-mono mb-1">EST. COST</div>
                <div className="text-lg font-mono text-accent-emerald">
                  {telemetry.cost > 0 ? `$${telemetry.cost.toFixed(4)}` : "—"}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear this session? All conversation and telemetry history will be lost.")) {
                  clearChat();
                }
              }}
              className="w-full text-xs font-mono border-border-core hover:bg-panel-bg/60 text-text-secondary hover:text-text-primary"
            >
              Clear Session
            </Button>
          </div>
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Model Engine</h4>
            <div className="bg-panel-bg/80 border border-border-core rounded p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-text-secondary">Latency</span>
                <span className="text-accent-emerald">{telemetry.latency > 0 ? `${telemetry.latency}ms` : "—"}</span>
              </div>
            </div>
          </div>
          <ContextFilesSection projectId={activeProjectId} />
        </div>
      </ScrollArea>
    </>
  );
});
