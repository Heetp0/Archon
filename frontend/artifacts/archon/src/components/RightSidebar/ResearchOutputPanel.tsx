import React from "react";
import { Search, Zap, Link as LinkIcon, Loader2, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ContextFilesSection } from "./ContextFilesSection";

interface ResearchOutputPanelProps {
  researchQuery: string;
  setResearchQuery: (val: string) => void;
  handleResearchSend: () => void;
  connected: boolean;
  isStreaming: boolean;
  researchText: string;
  citations: any[];
  activeProjectId: string | null;
}

export const ResearchOutputPanel = React.memo(function ResearchOutputPanel({
  researchQuery,
  setResearchQuery,
  handleResearchSend,
  connected,
  isStreaming,
  researchText,
  citations,
  activeProjectId
}: ResearchOutputPanelProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b border-border-core/60 flex-shrink-0">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-accent-indigo" />
          Research Output
        </h3>
      </div>
      <div className="p-3 border-b border-border-core/60 bg-panel-bg/20 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResearchSend()}
            placeholder={connected ? "Research vector..." : "Daemon offline"}
            disabled={!connected || isStreaming}
            data-testid="input-research-query-sidebar"
            className="flex-1 bg-app-bg border border-border-core rounded px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo/50 disabled:opacity-40"
          />
          <Button
            size="sm"
            onClick={handleResearchSend}
            disabled={!connected || isStreaming || !researchQuery.trim()}
            className="bg-accent-indigo hover:bg-accent-indigo text-text-primary px-3 py-1 h-auto disabled:opacity-40"
          >
            {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-5">
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono flex items-center gap-2">
              <Zap className="w-3 h-3 text-accent-indigo" />
              Live Stream
              {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-pulse" />}
            </h4>
            <div className="bg-panel-bg/50 border border-border-core rounded p-3 max-h-40 overflow-y-auto relative">
              <pre className="text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                {researchText || "Awaiting research directive..."}
              </pre>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Citation Vault</h4>
            <div className="space-y-2">
              {citations.length > 0 ? (
                citations.map((c: any) => (
                  <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer"
                    className="block bg-panel-bg/80 border border-border-core hover:border-purple-500/50 rounded p-2 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-accent-indigo mb-1">
                      <LinkIcon className="w-3 h-3" /> [{c.id}]
                    </div>
                    <div className="text-xs text-text-primary line-clamp-1">{c.title}</div>
                  </a>
                ))
              ) : (
                <div className="text-xs font-mono text-text-secondary italic text-center py-2">
                  No citations yet.
                </div>
              )}
            </div>
          </div>
          <ContextFilesSection projectId={activeProjectId} />
        </div>
      </ScrollArea>
    </div>
  );
});
