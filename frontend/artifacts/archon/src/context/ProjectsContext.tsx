import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

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
  content?: string;
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
  deleteProject: (projectId: string) => void;
  deleteChat: (chatId: string) => void;
}

const ProjectsContext = createContext<ProjectsState | undefined>(undefined);

// Cross-context subscription to share activeChatId regardless of provider nesting order
export let globalActiveChatId: string | null = null;
const activeChatListeners = new Set<(id: string | null) => void>();

export function subscribeActiveChat(cb: (id: string | null) => void) {
  activeChatListeners.add(cb);
  cb(globalActiveChatId);
  return () => {
    activeChatListeners.delete(cb);
  };
}

export let globalActiveProjectFiles: ContextFile[] = [];
const activeProjectFilesListeners = new Set<(files: ContextFile[]) => void>();

export function subscribeActiveProjectFiles(cb: (files: ContextFile[]) => void) {
  activeProjectFilesListeners.add(cb);
  cb(globalActiveProjectFiles);
  return () => {
    activeProjectFilesListeners.delete(cb);
  };
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("archon_projects");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("archon_activeProjectId") || null;
    } catch {
      return null;
    }
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("archon_activeChatId");
      if (saved) {
        globalActiveChatId = saved;
        return saved;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [ungroupedChats, setUngroupedChats] = useState<
    Record<Exclude<ProjectMode, "agents">, ChatSession[]>
  >(() => {
    try {
      const saved = localStorage.getItem("archon_ungroupedChats");
      return saved ? JSON.parse(saved) : { chat: [], council: [], research: [] };
    } catch {
      return { chat: [], council: [], research: [] };
    }
  });

  const revokedUrls = useRef<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem("archon_projects", JSON.stringify(projects));
    } catch (e) {
      console.error("Failed to save projects to localStorage:", e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem("archon_activeProjectId", activeProjectId);
      } else {
        localStorage.removeItem("archon_activeProjectId");
      }
    } catch (e) {
      console.error("Failed to save activeProjectId to localStorage:", e);
    }
  }, [activeProjectId]);

  useEffect(() => {
    try {
      if (activeChatId) {
        localStorage.setItem("archon_activeChatId", activeChatId);
      } else {
        localStorage.removeItem("archon_activeChatId");
      }
    } catch (e) {
      console.error("Failed to save activeChatId to localStorage:", e);
    }
  }, [activeChatId]);

  useEffect(() => {
    try {
      localStorage.setItem("archon_ungroupedChats", JSON.stringify(ungroupedChats));
    } catch (e) {
      console.error("Failed to save ungroupedChats to localStorage:", e);
    }
  }, [ungroupedChats]);

  useEffect(() => {
    const activeProject = projects.find((p) => p.id === activeProjectId);
    const files = activeProject ? activeProject.contextFiles : [];
    globalActiveProjectFiles = files;
    activeProjectFilesListeners.forEach((l) => l(files));
  }, [projects, activeProjectId]);

  const handleSetActiveChat = useCallback((chatId: string | null) => {
    globalActiveChatId = chatId;
    activeChatListeners.forEach((l) => l(chatId));
    setActiveChatId(chatId);
  }, []);

  const createLightProject = useCallback((mode: ProjectMode, name: string) => {
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
  }, []);

  const createAgentProject = useCallback((name: string, folderPath: string) => {
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
  }, []);

  const createChat = useCallback((projectId: string | null, mode: ProjectMode) => {
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
    globalActiveChatId = newChat.id;
    activeChatListeners.forEach((l) => l(newChat.id));
    setActiveChatId(newChat.id);
  }, []);

  const renameChat = useCallback((chatId: string, newName: string) => {
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
  }, []);

  const addContextFile = useCallback((projectId: string, file: ContextFile) => {
    if (file.localBlobUrl) {
      revokedUrls.current.push(file.localBlobUrl);
    }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, contextFiles: [...p.contextFiles, file] } : p
      )
    );
  }, []);

  const removeContextFile = useCallback((projectId: string, fileId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const removed = p.contextFiles.find((f) => f.id === fileId);
        if (removed?.localBlobUrl) {
          try { URL.revokeObjectURL(removed.localBlobUrl); } catch {}
        }
        return { ...p, contextFiles: p.contextFiles.filter((f) => f.id !== fileId) };
      })
    );
  }, []);

  // Revoke all blob URLs on unmount to prevent memory leaks (M-01)
  useEffect(() => {
    return () => {
      revokedUrls.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
    };
  }, []);

  const updateAgentSettings = useCallback((projectId: string, settings: Partial<AgentSettings>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, agentSettings: { ...p.agentSettings!, ...settings } }
          : p
      )
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => {
      const projectToDelete = prev.find((p) => p.id === projectId);
      if (projectToDelete) {
        projectToDelete.contextFiles.forEach((file) => {
          if (file.localBlobUrl) {
            try { URL.revokeObjectURL(file.localBlobUrl); } catch {}
          }
        });
        const hasActiveChat = projectToDelete.chats.some((c) => c.id === activeChatId);
        if (hasActiveChat) {
          handleSetActiveChat(null);
        }
      }
      return prev.filter((p) => p.id !== projectId);
    });
    setActiveProjectId((prev) => (prev === projectId ? null : prev));
  }, [activeChatId, handleSetActiveChat]);

  const deleteChat = useCallback((chatId: string) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        chats: p.chats.filter((c) => c.id !== chatId),
      }))
    );
    setUngroupedChats((prev) => {
      const next = { ...prev };
      (Object.keys(next) as Array<keyof typeof next>).forEach((m) => {
        next[m] = next[m].filter((c) => c.id !== chatId);
      });
      return next;
    });
    if (activeChatId === chatId) {
      handleSetActiveChat(null);
    }
  }, [activeChatId, handleSetActiveChat]);

  const getProjectsForMode = useCallback((mode: ProjectMode) => {
    return projects.filter((p) => p.mode === mode);
  }, [projects]);

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
        setActiveChat: handleSetActiveChat,
        updateAgentSettings,
        ungroupedChats,
        getProjectsForMode,
        deleteProject,
        deleteChat,
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