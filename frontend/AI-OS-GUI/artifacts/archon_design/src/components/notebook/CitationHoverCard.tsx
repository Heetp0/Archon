import React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Citation } from "@/types/notebook";

interface CitationHoverCardProps {
  citation: Citation;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function CitationHoverCard({ citation, children, onClick }: CitationHoverCardProps) {
  return (
    <HoverCard openDelay={200} closeDelay={200}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded text-[10px] font-mono bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald hover:bg-accent-emerald/20 cursor-pointer transition-colors"
        >
          {children}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3 bg-panel-bg border-border-core text-text-primary">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Source context</span>
            {citation.page && (
              <span className="text-[10px] font-mono text-accent-emerald">Page {citation.page}</span>
            )}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed max-h-24 overflow-y-auto font-sans italic">
            "{citation.text || "No preview text available."}"
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
