import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrowsePCModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

const QUICK_LOCATIONS = ["Home", "Desktop", "Documents", "Downloads"];

export default function BrowsePCModal({ open, onClose, onSelect }: BrowsePCModalProps) {
  const [manualPath, setManualPath] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSelect = () => {
    const trimmed = manualPath.trim();
    if (!trimmed) return;
    if (/[?*<>|]/.test(trimmed)) {
      setError("Invalid characters in path");
      return;
    }
    setError(null);
    onSelect(trimmed);
    setManualPath("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-app-bg/60 flex items-center justify-center">
      <div className="w-[720px] h-[480px] bg-panel-bg border border-border-core rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Title bar */}
        <div className="px-4 py-3 border-b border-border-core flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-mono text-text-primary">Select Project Folder</span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left rail — quick locations */}
          <div className="w-40 border-r border-border-core p-2 space-y-0.5 flex-shrink-0">
            <div className="px-2 py-1 text-[9px] font-mono text-text-secondary uppercase tracking-widest">
              Locations
            </div>
            {QUICK_LOCATIONS.map((loc) => {
              const handleQuickClick = () => {
                setManualPath(`~/${loc}`);
              };
              return (
                <button
                  key={loc}
                  onClick={handleQuickClick}
                  className="w-full text-left px-2 py-1.5 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 rounded transition-colors"
                >
                  {loc}
                </button>
              );
            })}
          </div>

          {/* Main pane */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-panel-bg/60 border border-border-core flex items-center justify-center">
              <svg className="w-7 h-7 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-mono text-text-secondary leading-relaxed">
                Live PC folder browsing connects once the local Bridge Agent is running.
              </p>
              <p className="text-xs font-mono text-text-secondary mt-2">
                For now, type the full folder path in the bar below.
              </p>
            </div>
          </div>
        </div>

        {/* Footer — manual path entry */}
        <div className="flex flex-col border-t border-border-core p-3 gap-1.5 flex-shrink-0">
          {error && <div className="text-[10px] font-mono text-accent-rose px-1">{error}</div>}
          <div className="flex gap-2">
            <input
            value={manualPath}
            onChange={(e) => { setManualPath(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSelect(); if (e.key === "Escape") onClose(); }}
            placeholder='e.g. D:\Projects\my-app  or  /home/user/projects/my-app'
            autoFocus
            className="flex-1 bg-app-bg border border-border-core rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-green-500/50"
          />
          <Button
            onClick={handleSelect}
            disabled={!manualPath.trim()}
            className="bg-accent-emerald hover:bg-accent-emerald text-text-primary font-mono text-xs disabled:opacity-40 px-4"
          >
            Select
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
