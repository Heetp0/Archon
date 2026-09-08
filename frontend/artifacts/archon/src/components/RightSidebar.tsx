import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebSocketStore } from "@/store/websocketStore";
import { useProjectsContext } from "@/context/ProjectsContext";
import {
  Activity, Zap, Server,
  Link as LinkIcon, Wifi, WifiOff,
  Loader2, Search, Send, Plus, X,
  LayoutList
} from "lucide-react";
import { CaretRight, List, FileText as PhFileText } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ContextFilesSection } from "./RightSidebar/ContextFilesSection";
import { CouncilPanel } from "./RightSidebar/CouncilPanel";
import { FileViewerPanel } from "./RightSidebar/FileViewerPanel";
import { ALL_FILE_TABS } from "./RightSidebar/FileViewerTabs";
import { ChatInspectorPanel } from "./RightSidebar/ChatInspectorPanel";
import { ResearchOutputPanel } from "./RightSidebar/ResearchOutputPanel";
import { AgentFileInspectorPanel } from "./RightSidebar/AgentFileInspectorPanel";

export default function RightSidebar() {
  const { mode, rightSidebarOpen, setRightSidebarOpen } = useAppContext();
  const { activeProjectId } = useProjectsContext();
  const { connected, connecting, sendResearch } = useWebSocketContext();
  const telemetry = useWebSocketStore(s => s.telemetry);
  const citations = useWebSocketStore(s => s.citations);
  const researchText = useWebSocketStore(s => s.researchText);
  const isStreaming = useWebSocketStore(s => s.isStreaming);
  const clearChat = useWebSocketStore(s => s.clearChat);

  const [researchQuery, setResearchQuery] = useState("");
  const [panelView, setPanelView] = useState<"context" | "files">(() => {
    try {
      return (sessionStorage.getItem("archon_right_panel_view") as "context" | "files") || "context";
    } catch {
      return "context";
    }
  });

  const handleSetPanelView = (view: "context" | "files") => {
    setPanelView(view);
    try { sessionStorage.setItem("archon_right_panel_view", view); } catch {}
  };

  const handleResearchSend = () => {
    if (!researchQuery.trim() || isStreaming) return;
    sendResearch(researchQuery.trim());
    setResearchQuery("");
  };

  return (
    <div className="flex flex-col h-full bg-panel-bg/95">
      {/* Connection status bar + panel switcher */}
      <div className="px-3 py-2 border-b border-border-core/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-3 h-3 text-accent-emerald" />
          ) : connecting ? (
            <Loader2 className="w-3 h-3 text-accent-rose animate-spin" />
          ) : (
            <WifiOff className="w-3 h-3 text-accent-rose" />
          )}
          <span className={cn("text-[10px] font-mono uppercase tracking-widest", {
            "text-accent-emerald":  connected,
            "text-accent-rose": !connected,
          })}>
            {connected ? "Online" : connecting ? "Connecting..." : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Panel switcher */}
          <button
            onClick={() => handleSetPanelView("context")}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-mono transition-colors",
              panelView === "context" ? "bg-accent-indigo/10 text-accent-indigo" : "text-text-secondary hover:text-text-secondary"
            )}
            title="Context Panel"
          >
            <List className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleSetPanelView("files")}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-mono transition-colors",
              panelView === "files" ? "bg-accent-indigo/10 text-accent-indigo" : "text-text-secondary hover:text-text-secondary"
            )}
            title="File Viewer"
          >
            <PhFileText className="w-3 h-3" />
          </button>
          {/* Collapse sidebar */}
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
            title="Collapse sidebar"
          >
            <CaretRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel switcher label */}
      <div className="px-3 py-1.5 border-b border-border-core/60 flex-shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
          {panelView === "context" ? "Mode Context" : "File Viewer"}
        </span>
      </div>

      {/* ── Context Panels ── */}
      {panelView === "context" && (
        <>
          {/* Chat Inspector */}
          {mode === "chat" && (
            <ChatInspectorPanel
              telemetry={telemetry}
              clearChat={clearChat}
              activeProjectId={activeProjectId}
            />
          )}

          {/* Council Consensus */}
          {mode === "council" && (
            <CouncilPanel activeProjectId={activeProjectId} telemetry={telemetry} />
          )}

          {/* Research Output */}
          {mode === "research" && (
            <ResearchOutputPanel
              researchQuery={researchQuery}
              setResearchQuery={setResearchQuery}
              handleResearchSend={handleResearchSend}
              connected={connected}
              isStreaming={isStreaming}
              researchText={researchText}
              citations={citations}
              activeProjectId={activeProjectId}
            />
          )}

          {/* Agent File Inspector */}
          {mode === "agents" && (
            <AgentFileInspectorPanel
              handleSetPanelView={handleSetPanelView}
              activeProjectId={activeProjectId}
            />
          )}

          {/* Fallback for modes without specific context panel */}
          {!["chat", "council", "research", "agents"].includes(mode) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <LayoutList className="w-6 h-6 text-text-secondary/70" />
              <span className="text-xs font-mono text-text-secondary">
                No mode-specific context for {mode}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                Switch to File Viewer to browse files
              </span>
            </div>
          )}
        </>
      )}

      {/* ── File Viewer Panel ── */}
      {panelView === "files" && <FileViewerPanel />}
    </div>
  );
}
