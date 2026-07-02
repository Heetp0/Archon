import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
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
import LoadingScreen from "@/components/LoadingScreen";

// Modes that benefit from both sidebars
const SIDEBAR_MODES = new Set(["chat", "council", "research", "agents"]);
// Modes that only show the left context sidebar
const LEFT_ONLY_MODES = new Set(["dashboard", "obsidian", "directory"]);

export default function Home() {
  const { mode, settingsOpen, setSettingsOpen } = useAppContext();
  const { connected, connecting } = useWebSocketContext();
  const [loadingDismissed, setLoadingDismissed] = useState(false);

  const showLeft  = SIDEBAR_MODES.has(mode) || LEFT_ONLY_MODES.has(mode);
  const showRight = SIDEBAR_MODES.has(mode);

  return (
    <div className="flex h-screen w-full bg-[#08090f] text-slate-300 font-sans overflow-hidden">
      {!loadingDismissed && (
        <LoadingScreen onDismiss={() => setLoadingDismissed(true)} />
      )}

      {/* Nav Rail */}
      <NavRail />

      {/* Left context sidebar */}
      {showLeft && <ContextSidebar />}

      {/* Center column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
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

      {/* Right sidebar */}
      {showRight && (
        <div className="w-64 flex-shrink-0 border-l border-slate-800/60 overflow-hidden">
          <RightSidebar />
        </div>
      )}

      <SettingsModal />
    </div>
  );
}
