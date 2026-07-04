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
  settingsProjectId: string | null;
  setSettingsProjectId: (id: string | null) => void;
  openProjectSettings: (id: string) => void;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const saved = sessionStorage.getItem("archon_mode");
      return (saved as AppMode) || "dashboard";
    } catch {
      return "dashboard";
    }
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    try {
      sessionStorage.setItem("archon_mode", newMode);
    } catch (e) {
      console.error(e);
    }
  };

  const [contextSidebarOpen, setContextSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeContextFiles, setActiveContextFiles] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

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
        history,
        setHistory,
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

export function useNavigationHistory() {
  const { history, setHistory } = useAppContext();
  
  const pushView = (mode: AppMode, title: string, preview: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).slice(2),
      title,
      mode,
      preview,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setHistory((prev) => [newItem, ...prev]);
  };

  return { history, pushView };
}
