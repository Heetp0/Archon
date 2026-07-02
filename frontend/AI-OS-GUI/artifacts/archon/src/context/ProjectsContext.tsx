import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ProjectMode = "chat" | "council" | "research" | "agents";

export interface ChatSession {
  id: string;
  name: string;
  createdAt: string;
}

export interface ContextFile {
  id: string;
  name: string;
  kind: "image" | "pdf" | "text" | "other";
  localBlobUrl?: string;
}

export interface AgentSettings {
  securityPreset: "strict" | "standard" | "custom";
  outsideFolderAccess: "always-ask" | "allow" | "deny";
  terminalExecution: "always-ask" | "allow" | "deny";
}

export interface Project {
  id: string;
  name: string;
  mode: ProjectMode;
  kind: "light" | "agent";
  folderPath?: string; // only set when kind === "agent"
  chats: ChatSession[];
  contextFiles: ContextFile[];
  agentSettings?: AgentSettings; // only for agent kind
}

interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
  activeChatId: string | null;
  createLightProject: (mode: ProjectMode, name: string) => void;
  createAgentProject: (name: string, folderPath: string) => void;
  createChat: (projectId: string | null, mode: ProjectMode) => void;
  renameChat: (chatId: string, newName: string) => void;
  addContextFile: (projectId: string, file: ContextFile) => void;
  removeContextFile: (projectId: string, fileId: string) => void;
  setActiveProject: (projectId: string | null) => void;
  setActiveChat: (chatId: string | null) => void;
  updateAgentSettings: (projectId: string, settings: Partial<AgentSettings>) => void;
  ungroupedChats: Record<Exclude<ProjectMode, "agents">, ChatSession[]>;
  getProjectsForMode: (mode: ProjectMode) => Project[];
}

const ProjectsContext = createContext<ProjectsState | undefined>(undefined);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [ungroupedChats, setUngroupedChats] = useState<
    Record<Exclude<ProjectMode, "agents">, ChatSession[]>
  >({ chat: [], council: [], research: [] });

  const createLightProject = (mode: ProjectMode, name: string) => {
    const p: Project = {
      id: `proj-${Date.now()}`,
      name,
      mode,
      kind: "light",
      chats: [],
      contextFiles: [],
    };
    setProjects((prev) => [...prev, p]);
    setActiveProjectId(p.id);
  };

  const createAgentProject = (name: string, folderPath: string) => {
    const p: Project = {
      id: `proj-${Date.now()}`,
      name,
      mode: "agents",
      kind: "agent",
      folderPath,
      chats: [],
      contextFiles: [],
      agentSettings: {
        securityPreset: "standard",
        outsideFolderAccess: "always-ask",
        terminalExecution: "always-ask",
      },
    };
    setProjects((prev) => [...prev, p]);
    setActiveProjectId(p.id);
  };

  const createChat = (projectId: string | null, mode: ProjectMode) => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      name: "New Chat",
      createdAt: new Date().toISOString(),
    };
    if (projectId) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, chats: [...p.chats, newChat] } : p))
      );
    } else if (mode !== "agents") {
      setUngroupedChats((prev) => ({ ...prev, [mode]: [...prev[mode], newChat] }));
    }
    setActiveChatId(newChat.id);
  };

  const renameChat = (chatId: string, newName: string) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        chats: p.chats.map((c) => (c.id === chatId ? { ...c, name: newName } : c)),
      }))
    );
    setUngroupedChats((prev) => {
      const next = { ...prev };
      (Object.keys(next) as Array<keyof typeof next>).forEach((m) => {
        next[m] = next[m].map((c) => (c.id === chatId ? { ...c, name: newName } : c));
      });
      return next;
    });
  };

  const addContextFile = (projectId: string, file: ContextFile) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, contextFiles: [...p.contextFiles, file] } : p
      )
    );
  };

  const removeContextFile = (projectId: string, fileId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const removed = p.contextFiles.find((f) => f.id === fileId);
        if (removed?.localBlobUrl) URL.revokeObjectURL(removed.localBlobUrl);
        return { ...p, contextFiles: p.contextFiles.filter((f) => f.id !== fileId) };
      })
    );
  };

  // Revoke all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setProjects((prev) => {
        prev.forEach((p) =>
          p.contextFiles.forEach((f) => {
            if (f.localBlobUrl) URL.revokeObjectURL(f.localBlobUrl);
          })
        );
        return prev;
      });
    };
  }, []);

  const updateAgentSettings = (projectId: string, settings: Partial<AgentSettings>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, agentSettings: { ...p.agentSettings!, ...settings } }
          : p
      )
    );
  };

  const getProjectsForMode = (mode: ProjectMode) => projects.filter((p) => p.mode === mode);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        activeProjectId,
        activeChatId,
        createLightProject,
        createAgentProject,
        createChat,
        renameChat,
        addContextFile,
        removeContextFile,
        setActiveProject: setActiveProjectId,
        setActiveChat: setActiveChatId,
        updateAgentSettings,
        ungroupedChats,
        getProjectsForMode,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjectsContext() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error("useProjectsContext must be used within a ProjectsProvider");
  }
  return context;
}
