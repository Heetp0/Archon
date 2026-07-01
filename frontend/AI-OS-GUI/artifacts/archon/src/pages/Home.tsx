import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import NavRail from "@/components/NavRail";
import ChatMode from "@/components/modes/ChatMode";
import CouncilMode from "@/components/modes/CouncilMode";
import ResearchMode from "@/components/modes/ResearchMode";
import AgentMode from "@/components/modes/AgentMode";
import DashboardMode from "@/components/modes/DashboardMode";
import ObsidianMode from "@/components/modes/ObsidianMode";
import AgentsDirectoryMode from "@/components/modes/AgentsDirectoryMode";
import SettingsModal from "@/components/SettingsModal";
import LoadingScreen from "@/components/LoadingScreen";

export default function Home() {
  const { mode, settingsOpen, setSettingsOpen } = useAppContext();
  const { connected, connecting } = useWebSocketContext();
  const [loadingDismissed, setLoadingDismissed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#08090f] text-slate-300 font-sans overflow-hidden">
      {!loadingDismissed && (
        <LoadingScreen onDismiss={() => setLoadingDismissed(true)} />
      )}

      {/* Nav Rail */}
      <NavRail />

      {/* Center column — full width, no sidebars */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mode content */}
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

      <SettingsModal />
    </div>
  );
}
