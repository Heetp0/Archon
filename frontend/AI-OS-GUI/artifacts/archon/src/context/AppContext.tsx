import React, { createContext, useContext, useState, ReactNode } from "react";

export type AppMode = "dashboard" | "chat" | "council" | "research" | "agents" | "obsidian" | "directory";

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
  // Opens Settings modal directly to a specific project's detail page
  settingsProjectId: string | null;
  setSettingsProjectId: (id: string | null) => void;
  openProjectSettings: (id: string) => void;
  history: HistoryItem[];
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("dashboard");
  const [contextSidebarOpen, setContextSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeContextFiles, setActiveContextFiles] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);

  const toggleContextFile = (fileId: string) => {
    setActiveContextFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const openProjectSettings = (id: string) => {
    setSettingsProjectId(id);
    setSettingsOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        contextSidebarOpen,
        setContextSidebarOpen,
        rightSidebarOpen,
        setRightSidebarOpen,
        activeContextFiles,
        toggleContextFile,
        settingsOpen,
        setSettingsOpen,
        settingsProjectId,
        setSettingsProjectId,
        openProjectSettings,
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
