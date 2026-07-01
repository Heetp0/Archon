import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import NavRail from "@/components/NavRail";
import ContextSidebar from "@/components/ContextSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMode from "@/components/modes/ChatMode";
import CouncilMode from "@/components/modes/CouncilMode";
import ResearchMode from "@/components/modes/ResearchMode";
import AgentMode from "@/components/modes/AgentMode";
import SettingsModal from "@/components/SettingsModal";
import LoadingScreen from "@/components/LoadingScreen";
import { PanelLeft, PanelRight, Wifi, WifiOff, Loader2 } from "lucide-react";

const RIGHT_MIN = 220;
const RIGHT_MAX = 700;
const RIGHT_DEFAULT = 320;

export default function Home() {
  const {
    mode,
    contextSidebarOpen,
    setContextSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    settingsOpen,
    setSettingsOpen,
  } = useAppContext();
  const { connected, connecting } = useWebSocketContext();
  const [loadingDismissed, setLoadingDismissed] = useState(false);

  // â”€â”€ Resizable right sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(RIGHT_DEFAULT);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    setIsResizing(true);
    startX.current = e.clientX;
    startW.current = rightWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [rightWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const newW = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startW.current + delta));
      setRightWidth(newW);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#020817] text-slate-300 font-sans overflow-hidden">
      {!loadingDismissed && (
        <LoadingScreen onDismiss={() => setLoadingDismissed(true)} />
      )}

      {/* â”€â”€ Nav Rail â”€â”€ */}
      <NavRail />

      {/* â”€â”€ Context Sidebar â”€â”€ */}
      <div
        className="h-full border-r border-slate-800/60 overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out"
        style={{ width: contextSidebarOpen ? 224 : 0 }}
      >
        <ContextSidebar />
      </div>

      {/* â”€â”€ Center column â”€â”€ */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* Top toolbar â€” part of normal flow, never overlaps content */}
        <div className="flex items-center h-10 px-3 border-b border-slate-800/50 flex-shrink-0 bg-[#020817]">
          {/* Left: context sidebar toggle */}
          <button
            onClick={() => setContextSidebarOpen((v) => !v)}
            data-testid="button-toggle-context-sidebar"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>

          {/* Center: connection status */}
          <div className="flex-1 flex justify-center">
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest ${
              connected    ? "text-green-500"
              : connecting ? "text-orange-400"
              :              "text-red-400/80"
            }`}>
              {connected
                ? <><Wifi className="w-3 h-3" /><span>Connected</span></>
                : connecting
                ? <><Loader2 className="w-3 h-3 animate-spin" /><span>connecting...</span></>
                : <><WifiOff className="w-3 h-3" /><span>daemon offline</span></>
              }
            </div>
          </div>

          {/* Right: right sidebar toggle */}
          <button
            onClick={() => setRightSidebarOpen((v) => !v)}
            data-testid="button-toggle-right-sidebar"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mode content */}
        <div className="flex-1 overflow-hidden">
          {mode === "chat"     && <ChatMode />}
          {mode === "council"  && <CouncilMode />}
          {mode === "research" && <ResearchMode />}
          {mode === "agents"   && <AgentMode />}
        </div>
      </div>

      {/* â”€â”€ Resize handle â”€â”€ */}
      {rightSidebarOpen && (
        <div
          onMouseDown={onDragStart}
          className="w-1 h-full flex-shrink-0 cursor-col-resize bg-slate-800/40 hover:bg-purple-500/30 transition-colors z-20"
        />
      )}

      {/* â”€â”€ Right Sidebar â”€â”€ */}
      <div
        className={`h-full border-l border-slate-800/60 flex flex-col flex-shrink-0 overflow-hidden bg-[#020817] ${
          isResizing ? "" : "transition-all duration-200 ease-in-out"
        }`}
        style={{ width: rightSidebarOpen ? rightWidth : 0 }}
      >
        <div className="h-full flex flex-col" style={{ width: rightSidebarOpen ? rightWidth : 0 }}>
          <RightSidebar />
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}



