import React, { useState } from "react";
import { Plus, X, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ALL_FILE_TABS } from "./FileViewerTabs";

export function FileViewerPanel() {
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem("archon_active_tab") || "config"; } catch { return "config"; }
  });
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem("archon_open_tabs");
      return stored ? JSON.parse(stored) : ["config", "readme"];
    } catch {
      return ["config", "readme"];
    }
  });

  const handleSetActiveTab = (tabId: string) => {
    setActiveTab(tabId);
    try { sessionStorage.setItem("archon_active_tab", tabId); } catch {}
  };

  const handleSetOpenTabs = (tabs: string[]) => {
    setOpenTabs(tabs);
    try { sessionStorage.setItem("archon_open_tabs", JSON.stringify(tabs)); } catch {}
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openTabs.filter((t) => t !== id);
    handleSetOpenTabs(next);
    if (activeTab === id) {
      const newActive = next[next.length - 1] ?? "";
      handleSetActiveTab(newActive);
    }
  };

  const openTab = (id: string) => {
    if (!openTabs.includes(id)) {
      handleSetOpenTabs([...openTabs, id]);
    }
    handleSetActiveTab(id);
  };

  const activeTabData = ALL_FILE_TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex flex-col h-full bg-panel-bg/95">
      {/* Tab strip + new tab */}
      <div className="flex items-center border-b border-border-core/60 bg-panel-bg flex-shrink-0">
        <div className="flex-1 flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {openTabs.map((tabId) => {
            const tab = ALL_FILE_TABS.find((t) => t.id === tabId);
            if (!tab) return null;
            const active = activeTab === tabId;
            return (
              <div
                key={tabId}
                onClick={() => handleSetActiveTab(tabId)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-border-core/60 flex-shrink-0 group transition-colors",
                  active ? "bg-panel-bg border-b-2 border-b-cyan-500" : "text-text-secondary hover:text-text-secondary hover:bg-panel-bg/40"
                )}
              >
                <tab.icon className={cn("w-3 h-3 flex-shrink-0", active ? tab.iconColor : "text-text-secondary")} />
                <span className={cn("text-[10px] font-mono", active ? "text-text-primary" : "text-text-secondary")}>{tab.name}</span>
                <button
                  onClick={(e) => closeTab(tabId, e)}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
        {/* New tab dropdown */}
        <div className="relative group flex-shrink-0">
          <button className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors border-l border-border-core/60">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="absolute right-0 top-8 z-30 hidden group-hover:block w-48 bg-panel-bg border border-border-core rounded overflow-hidden">
            {ALL_FILE_TABS.filter((f) => !openTabs.includes(f.id)).map((f) => (
              <button
                key={f.id}
                onClick={() => openTab(f.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-text-secondary hover:bg-panel-bg hover:text-text-primary transition-colors"
              >
                <f.icon className={cn("w-3 h-3 flex-shrink-0", f.iconColor)} />
                {f.name}
              </button>
            ))}
            {ALL_FILE_TABS.length === openTabs.length && (
              <div className="px-3 py-2 text-xs font-mono text-text-secondary italic">All tabs open</div>
            )}
          </div>
        </div>
      </div>

      {/* File content */}
      <div className="flex-1 overflow-hidden bg-panel-bg relative">
        <div className="absolute top-2 right-2 z-10 text-[9px] font-mono text-text-secondary bg-panel-bg px-1">READ-ONLY</div>
        {openTabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary font-mono text-xs gap-3">
            <FileText className="w-6 h-6 text-text-secondary/70" />
            <span>No files open</span>
            <span className="text-text-secondary/70">Use the + button above to open a file</span>
          </div>
        ) : activeTabData ? (
          <ScrollArea className="h-full">{activeTabData.content}</ScrollArea>
        ) : null}
      </div>
    </div>
  );
}
