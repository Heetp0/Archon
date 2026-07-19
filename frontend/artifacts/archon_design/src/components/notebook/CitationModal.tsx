import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Citation } from "@/types/notebook";
import { FileText } from "@phosphor-icons/react";

interface CitationModalProps {
  citation: Citation | null;
  onOpenChange: (open: boolean) => void;
}

export default function CitationModal({ citation, onOpenChange }: CitationModalProps) {
  return (
    <Dialog open={!!citation} onOpenChange={onOpenChange}>
      <DialogContent className="bg-panel-bg border-border-core max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border-core pb-2">
          <DialogTitle className="flex items-center gap-2 text-text-primary text-sm font-medium">
            <FileText className="w-4 h-4 text-accent-emerald" />
            <span>Citation Details: {citation?.source_id}</span>
          </DialogTitle>
        </DialogHeader>
        {citation && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed font-sans">
            <div className="flex justify-between text-[10px] font-mono text-text-secondary border-b border-border-core/40 pb-2">
              <span>Source: <strong className="text-text-primary">{citation.source_id}</strong></span>
              {citation.page && <span>Page: <strong className="text-text-primary">{citation.page}</strong></span>}
              {citation.location && <span>Location: <strong className="text-text-primary">{citation.location}</strong></span>}
            </div>

            <div className="bg-app-bg p-3.5 rounded-lg border border-border-core font-mono text-text-primary text-xs overflow-auto whitespace-pre-wrap leading-relaxed">
              {citation.text || "No preview content available."}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
