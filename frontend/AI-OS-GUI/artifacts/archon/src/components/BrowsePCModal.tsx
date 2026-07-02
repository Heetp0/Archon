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

  if (!open) return null;

  const handleSelect = () => {
    const trimmed = manualPath.trim();
    if (!trimmed) return;
    onSelect(trimmed);
    setManualPath("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[720px] h-[480px] bg-[#0d1117] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Title bar */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-mono text-slate-300">Select Project Folder</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left rail — quick locations */}
          <div className="w-40 border-r border-slate-800 p-2 space-y-0.5 flex-shrink-0">
            <div className="px-2 py-1 text-[9px] font-mono text-slate-700 uppercase tracking-widest">
              Locations
            </div>
            {QUICK_LOCATIONS.map((loc) => (
              <button
                key={loc}
                className="w-full text-left px-2 py-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 rounded transition-colors"
              >
                {loc}
              </button>
            ))}
          </div>

          {/* Main pane */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-mono text-slate-500 leading-relaxed">
                Live PC folder browsing connects once the local Bridge Agent is running.
              </p>
              <p className="text-xs font-mono text-slate-700 mt-2">
                For now, type the full folder path in the bar below.
              </p>
            </div>
          </div>
        </div>

        {/* Footer — manual path entry */}
        <div className="p-3 border-t border-slate-800 flex gap-2 flex-shrink-0">
          <input
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSelect(); if (e.key === "Escape") onClose(); }}
            placeholder='e.g. D:\Projects\my-app  or  /home/user/projects/my-app'
            autoFocus
            className="flex-1 bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-green-500/50"
          />
          <Button
            onClick={handleSelect}
            disabled={!manualPath.trim()}
            className="bg-green-600 hover:bg-green-500 text-white font-mono text-xs disabled:opacity-40 px-4"
          >
            Select
          </Button>
        </div>
      </div>
    </div>
  );
}
