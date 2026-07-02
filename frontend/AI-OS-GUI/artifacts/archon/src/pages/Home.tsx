import React, { useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import type { AppMode } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
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
  const { connected, connecting } = useWebSocketContext();
  // Right sidebar width — draggable
  const [rightWidth, setRightWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: React.MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
    setRightWidth(newWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  const canShowLeft = LEFT_CAPABLE_MODES.has(mode);
  const showLeft = canShowLeft && contextSidebarOpen;

  return (
    <div
      className="flex h-screen w-full bg-[#08090f] text-slate-300 font-sans overflow-hidden select-none"
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
      style={{ cursor: isResizing ? "ew-resize" : "default" }}
    >
      {/* Nav Rail */}
      <NavRail />

      {/* Left context sidebar */}
      {showLeft && (
        <div className="w-56 flex-shrink-0 border-r border-slate-800/60 overflow-hidden animate-in slide-in-from-left duration-200">
          <ContextSidebar />
        </div>
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
      {rightSidebarOpen && (
        <div
          className="flex-shrink-0 border-l border-slate-800/60 overflow-hidden relative animate-in slide-in-from-right duration-200"
          style={{ width: rightWidth }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-cyan-500/30 transition-colors"
            title="Drag to resize"
          />
          <RightSidebar />
        </div>
      )}

      <SettingsModal />
    </div>
  );
}
