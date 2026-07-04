import React, { useState, useCallback, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import type { AppMode } from "@/context/AppContext";

import { PanelLeftClose, PanelRightOpen } from "lucide-react";
import NavRail from "@/components/NavRail";
import ContextSidebar from "@/components/ContextSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMode from "@/components/modes/ChatMode";
import CouncilMode from "@/components/modes/CouncilMode";
import ResearchMode from "@/components/modes/ResearchMode";
import AgentMode from "@/components/modes/AgentMode";
import DashboardMode from "@/components/modes/DashboardMode";
import ObsidianMode from "@/components/modes/ObsidianMode";
import AgentsDirectoryMode from "@/components/modes/AgentsDirectoryMode";
import SettingsModal from "@/components/SettingsModal";

// Modes that can show the left context sidebar (user toggles)
const LEFT_CAPABLE_MODES = new Set<AppMode>(["chat", "council", "research", "agents", "obsidian", "directory"]);

export default function Home() {
  const { mode, settingsOpen, setSettingsOpen, contextSidebarOpen, setContextSidebarOpen, rightSidebarOpen, setRightSidebarOpen } = useAppContext();

  // Right sidebar width — draggable
  const [rightWidth, setRightWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Listen to mouse events globally when resizing is active
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const canShowLeft = LEFT_CAPABLE_MODES.has(mode);
  const showLeft = canShowLeft && contextSidebarOpen;

  return (
    <div
      className="relative flex h-screen w-full bg-[#08090f] text-slate-300 font-sans overflow-hidden select-none"
      style={{ cursor: isResizing ? "ew-resize" : "default" }}
    >
      {/* Nav Rail */}
      <NavRail />

      {/* Left context sidebar */}
      {showLeft ? (
        <div className="w-56 flex-shrink-0 border-r border-slate-800/60 overflow-hidden animate-in slide-in-from-left duration-200 relative">
          {/* Collapse handle on left edge of sidebar */}
          <button
            onClick={() => setContextSidebarOpen(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 w-6 h-10 rounded-full bg-[#0d0e16] border border-slate-700 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-lg cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-3 h-3" />
          </button>
          <ContextSidebar />
        </div>
      ) : (
        /* Open-left button when sidebar is hidden */
        canShowLeft && (
          <button
            onClick={() => setContextSidebarOpen(true)}
            className="absolute left-[52px] top-1/2 -translate-y-1/2 z-30 w-6 h-10 rounded-full bg-[#0d0e16] border border-slate-700 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-lg cursor-pointer"
            title="Open left sidebar"
          >
            <PanelLeftClose className="w-3 h-3 rotate-180" />
          </button>
        )
      )}

      {/* Center column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-hidden">
          {mode === "dashboard" && <DashboardMode />}
          {mode === "chat"      && <ChatMode />}
          {mode === "council"   && <CouncilMode />}
          {mode === "research"  && <ResearchMode />}
          {mode === "agents"    && <AgentMode />}
          {mode === "obsidian"  && <ObsidianMode />}
          {mode === "directory" && <AgentsDirectoryMode />}
        </div>
      </div>

      {/* Right sidebar — universal, toggleable, resizable */}
      {rightSidebarOpen ? (
        <div
          className="flex-shrink-0 border-l border-slate-800/60 overflow-hidden relative animate-in slide-in-from-right duration-200"
          style={{ width: `${rightWidth}px` }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-cyan-500/30 transition-colors"
            title="Drag to resize"
          />
          {/* Collapse handle on right edge of sidebar */}
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30 w-6 h-10 rounded-full bg-[#0d0e16] border border-slate-700 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-lg cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelRightOpen className="w-3 h-3" />
          </button>
          <RightSidebar />
        </div>
      ) : (
        /* Open-right button on screen edge */
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-6 h-10 rounded-full bg-[#0d0e16] border border-slate-700 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-all shadow-lg cursor-pointer"
          title="Open right sidebar"
        >
          <PanelRightOpen className="w-3 h-3 rotate-180" />
        </button>
      )}

      <SettingsModal />
    </div>
  );
}