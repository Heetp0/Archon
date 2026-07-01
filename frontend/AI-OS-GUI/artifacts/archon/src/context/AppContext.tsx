import React, { createContext, useContext, useState, ReactNode } from "react";

export type AppMode = "chat" | "council" | "research" | "agents" | "settings";

export interface HistoryItem {
  id: string;
  title: string;
  mode: AppMode;
  preview: string;
  timestamp: string;
}

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  contextSidebarOpen: boolean;
  setContextSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeContextFiles: string[];
  toggleContextFile: (fileId: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  history: HistoryItem[];
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("chat");
  const [contextSidebarOpen, setContextSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeContextFiles, setActiveContextFiles] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleContextFile = (fileId: string) => {
    setActiveContextFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSetMode = (newMode: AppMode) => {
    if (newMode === "settings") {
      setSettingsOpen(true);
    } else {
      setMode(newMode);
    }
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        contextSidebarOpen,
        setContextSidebarOpen,
        rightSidebarOpen,
        setRightSidebarOpen,
        activeContextFiles,
        toggleContextFile,
        settingsOpen,
        setSettingsOpen,
        // TODO: history should be populated from a real session log endpoint
        // once the daemon exposes GET /sessions
        history: [],
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
