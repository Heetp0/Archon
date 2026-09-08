import React, { useState, useCallback, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import type { AppMode } from "@/context/AppContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebSocketStore } from "@/store/websocketStore";
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
import CanvasMode from "@/components/modes/CanvasMode";
import SettingsModal from "@/components/SettingsModal";

// Modes that can show the left context sidebar (user toggles)
const LEFT_CAPABLE_MODES = new Set<AppMode>(["chat", "council", "research", "agents", "obsidian", "directory"]);

const TopBar = React.memo(function TopBar({
  mode,
  canShowLeft,
  showLeft,
  setContextSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
  activeProjectId,
  projects
}: any) {
  return (
    <div className="h-9 flex items-center justify-between px-3 border-b border-border-core/60 flex-shrink-0 bg-app-bg">
      <div className="flex items-center gap-2">
        {canShowLeft && !showLeft && (
          <button
            onClick={() => setContextSidebarOpen(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
            title="Open left sidebar"
          >
            <CaretRight className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary ml-1">
          {(() => {
            const baseTitle = 
              mode === "dashboard" ? "Dashboard" :
              mode === "chat" ? "Chat" :
              mode === "council" ? "Council" :
              mode === "research" ? "Research" :
              mode === "agents" ? "Agent Runtime" :
              mode === "obsidian" ? "Obsidian" :
              mode === "directory" ? "Agents" :
              mode === "canvas" ? "Canvas" : "";
            
            const activeProject = projects.find((p: any) => p.id === activeProjectId);
            if (activeProject && activeProject.mode === mode) {
              return `${baseTitle} - [${activeProject.name}]`;
            }
            return baseTitle;
          })()}
        </span>
      </div>
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
  );
});

export default function Home() {
  const { mode, settingsOpen, setSettingsOpen, contextSidebarOpen, setContextSidebarOpen, rightSidebarOpen, setRightSidebarOpen } = useAppContext();
  const { activeProjectId, projects } = useProjectsContext();
  const { connected, connecting } = useWebSocketContext();
  const isStreaming = useWebSocketStore((state) => state.isStreaming);
  const [rightWidth, setRightWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

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

  useEffect(() => {
    if (isStreaming) {
      document.title = "[Streaming...] Archon";
    } else {
      document.title = "Archon";
    }
  }, [isStreaming]);

  const canShowLeft = LEFT_CAPABLE_MODES.has(mode);
  const showLeft = canShowLeft && contextSidebarOpen;

  const activeModeComponent = React.useMemo(() => {
    switch (mode) {
      case "dashboard": return <DashboardMode />;
      case "chat": return <ChatMode />;
      case "council": return <CouncilMode />;
      case "research": return <ResearchMode />;
      case "agents": return <AgentMode />;
      case "obsidian": return <ObsidianMode />;
      case "directory": return <AgentsDirectoryMode />;
      case "canvas": return <CanvasMode />;
      default: return null;
    }
  }, [mode]);

  const navRail = React.useMemo(() => <NavRail />, []);
  const contextSidebar = React.useMemo(() => {
    return showLeft ? (
      <div className="w-56 flex-shrink-0 border-r border-border-core/60 overflow-hidden animate-in slide-in-from-left duration-200">
        <ContextSidebar />
      </div>
    ) : null;
  }, [showLeft]);

  const rightSidebarContent = React.useMemo(() => {
    return rightSidebarOpen ? (
      <div
        className="flex-shrink-0 border-l border-border-core/60 overflow-hidden relative animate-in slide-in-from-right duration-200"
        style={{ width: `${rightWidth}px` }}
      >
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-accent-indigo/30 transition-colors"
          title="Drag to resize"
        />
        <RightSidebar />
      </div>
    ) : null;
  }, [rightSidebarOpen, rightWidth, handleResizeStart]);

  const settingsModal = React.useMemo(() => <SettingsModal />, []);

  return (
    <div
      className="relative flex h-screen w-full bg-app-bg text-text-primary font-sans overflow-hidden select-none"
      style={{ cursor: isResizing ? "ew-resize" : "default" }}
    >
      {navRail}
      {contextSidebar}

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <TopBar
          mode={mode}
          canShowLeft={canShowLeft}
          showLeft={showLeft}
          setContextSidebarOpen={setContextSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          setRightSidebarOpen={setRightSidebarOpen}
          activeProjectId={activeProjectId}
          projects={projects}
        />
        <div className="flex-1 overflow-hidden">
          {activeModeComponent}
        </div>
      </div>

      {rightSidebarContent}
      {settingsModal}
    </div>
  );
}
