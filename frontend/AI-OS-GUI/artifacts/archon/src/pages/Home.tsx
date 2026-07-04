import React, { useState, useCallback, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import type { AppMode } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { CaretRight, CaretLeft } from "@phosphor-icons/react";
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
      className="relative flex h-screen w-full bg-app-bg text-text-primary font-sans overflow-hidden select-none"
      
      
      
      style={{ cursor: isResizing ? "ew-resize" : "default" }}
    >
      {/* Nav Rail */}
      <NavRail />

      {/* Left context sidebar */}
      {showLeft && (
        <div className="w-56 flex-shrink-0 border-r border-border-core/60 overflow-hidden animate-in slide-in-from-left duration-200">
          <ContextSidebar />
        </div>
      )}

      {/* Center column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top bar: sidebar open buttons + breadcrumb/title */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-border-core/60 flex-shrink-0 bg-app-bg">
          <div className="flex items-center gap-2">
            {/* Open left sidebar button (when hidden) */}
            {canShowLeft && !showLeft && (
              <button
                onClick={() => setContextSidebarOpen(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
                title="Open left sidebar"
              >
                <CaretRight className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Mode title */}
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary ml-1">
              {mode === "dashboard" && "Dashboard"}
              {mode === "chat" && "Chat"}
              {mode === "council" && "Council"}
              {mode === "research" && "Research"}
              {mode === "agents" && "Agent Runtime"}
              {mode === "obsidian" && "Obsidian"}
              {mode === "directory" && "Agents"}
            </span>
          </div>
          {/* Open right sidebar button (when hidden) — positioned on the right */}
          {!rightSidebarOpen && (
            <button
              onClick={() => setRightSidebarOpen(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
              title="Open right sidebar"
            >
              <CaretLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
          className="flex-shrink-0 border-l border-border-core/60 overflow-hidden relative animate-in slide-in-from-right duration-200"
          style={{ width: `${rightWidth}px` }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-accent-indigo/30 transition-colors"
            title="Drag to resize"
          />
          <RightSidebar />
        </div>
      )}

      <SettingsModal />
    </div>
  );
}
