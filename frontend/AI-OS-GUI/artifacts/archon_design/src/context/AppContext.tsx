import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppMode = "dashboard" | "chat" | "council" | "research" | "agents" | "obsidian" | "directory" | "notebook";

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
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem("archon_appMode");
      if (saved && ["dashboard", "chat", "council", "research", "agents", "obsidian", "directory", "notebook"].includes(saved)) {
        return saved as AppMode;
      }
      return "dashboard";
    } catch {
      return "dashboard";
    }
  });
  const [contextSidebarOpen, setContextSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("archon_contextSidebarOpen");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("archon_rightSidebarOpen");
      return saved === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("archon_appMode", mode);
    } catch (e) {
      console.error("Failed to save appMode to localStorage:", e);
    }
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem("archon_contextSidebarOpen", String(contextSidebarOpen));
    } catch (e) {
      console.error("Failed to save contextSidebarOpen to localStorage:", e);
    }
  }, [contextSidebarOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("archon_rightSidebarOpen", String(rightSidebarOpen));
    } catch (e) {
      console.error("Failed to save rightSidebarOpen to localStorage:", e);
    }
  }, [rightSidebarOpen]);
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
