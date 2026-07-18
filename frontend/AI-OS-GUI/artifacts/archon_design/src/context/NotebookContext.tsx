import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import type {
  Notebook,
  Source,
  NotebookChatMessage,
  IngestionJob,
  StudioArtifact,
  Citation,
  SlashCommand,
} from "@/types/notebook";
import { notebookApi } from "@/lib/notebookApi";
import { toast } from "sonner";

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  createdAt: number;
}

interface NotebookState {
  // Notebooks
  notebooks: Notebook[];
  currentNotebookId: string | null;
  currentNotebook: Notebook | null;
  // Studio Open state
  isStudioOpen: boolean;
  setStudioOpen: (open: boolean) => void;
  // Sources
  sources: Source[];
  // Chat
  chatHistory: NotebookChatMessage[];
  isChatLoading: boolean;
  // Ingestion jobs
  ingestionJobs: IngestionJob[];
  // Source drawer
  isSourceDrawerOpen: boolean;
  setSourceDrawerOpen: (open: boolean) => void;
  // Citation preview
  selectedCitation: Citation | null;
  setSelectedCitation: (c: Citation | null) => void;
  // Studio
  currentArtifact: StudioArtifact | null;
  isArtifactOpen: boolean;
  isArtifactLoading: boolean;
  // Selected sources
  selectedSourceIds: string[];
  toggleSourceId: (id: string) => void;
  setSelectedSourceIds: (ids: string[]) => void;
  // Active view tab (Chat vs Analytics)
  activeTab: "chat" | "analytics";
  setActiveTab: (tab: "chat" | "analytics") => void;
  // Notes
  notes: Note[];
  createNote: (content: string, title?: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  // Actions
  loadNotebooks: () => Promise<void>;
  createNotebook: (name: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  switchNotebook: (id: string) => Promise<void>;
  sendChat: (message: string, command?: SlashCommand) => Promise<void>;
  generateArtifact: (type: import("@/types/notebook").ArtifactType) => Promise<void>;
  closeArtifact: () => void;
  addIngestionJob: (job: IngestionJob) => void;
  updateIngestionJob: (jobId: string, update: Partial<IngestionJob>) => void;
}

const NotebookContext = createContext<NotebookState | undefined>(undefined);

export function NotebookProvider({ children }: { children: ReactNode }) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);
  const [isStudioOpen, setStudioOpen] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [chatHistory, setChatHistory] = useState<NotebookChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>([]);
  const [isSourceDrawerOpen, setSourceDrawerOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<StudioArtifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isArtifactLoading, setIsArtifactLoading] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "analytics">("chat");
  const msgIdCounter = useRef(0);

  const currentNotebook = notebooks.find((n) => n.notebook_id === currentNotebookId) ?? null;

  // Toggling helper for sources
  const toggleSourceId = useCallback((id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // Update selected sources whenever sources changes
  React.useEffect(() => {
    setSelectedSourceIds(sources.map((s) => s.source_id));
  }, [sources]);

  // Load notes from localStorage when notebook changes
  React.useEffect(() => {
    if (currentNotebookId) {
      const saved = localStorage.getItem(`archon_notebook_notes_${currentNotebookId}`);
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch (e) {
          console.error(e);
          setNotes([]);
        }
      } else {
        setNotes([]);
      }
    } else {
      setNotes([]);
    }
  }, [currentNotebookId]);

  const saveNotesToStorage = (notebookId: string, updatedNotes: Note[]) => {
    localStorage.setItem(`archon_notebook_notes_${notebookId}`, JSON.stringify(updatedNotes));
  };

  const createNote = useCallback((content: string, title?: string) => {
    if (!currentNotebookId) return;
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      notebookId: currentNotebookId,
      title: title || "Untitled Note",
      content,
      createdAt: Date.now(),
    };
    setNotes((prev) => {
      const next = [newNote, ...prev];
      saveNotesToStorage(currentNotebookId, next);
      return next;
    });
    toast.success("Note created");
  }, [currentNotebookId]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    if (!currentNotebookId) return;
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...updates } : n));
      saveNotesToStorage(currentNotebookId, next);
      return next;
    });
    toast.success("Note updated");
  }, [currentNotebookId]);

  const deleteNote = useCallback((id: string) => {
    if (!currentNotebookId) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotesToStorage(currentNotebookId, next);
      return next;
    });
    toast.success("Note deleted");
  }, [currentNotebookId]);

  const loadNotebooks = useCallback(async () => {
    try {
      const nbs = await notebookApi.listNotebooks();
      setNotebooks(nbs);
      if (nbs.length > 0 && !currentNotebookId) {
        setCurrentNotebookId(nbs[0].notebook_id);
        setSources(nbs[0].sources ?? []);
      }
    } catch (e) {
      toast.error("Failed to load notebooks");
      console.error(e);
    }
  }, [currentNotebookId]);

  const createNotebook = useCallback(async (name: string) => {
    try {
      const res = await notebookApi.createNotebook({ name });
      const fresh = await notebookApi.getNotebook(res.notebook_id);
      setNotebooks((prev) => [...prev, fresh]);
      setCurrentNotebookId(res.notebook_id);
      setSources([]);
      setChatHistory([]);
      toast.success(`Notebook "${name}" created`);
    } catch (e) {
      toast.error("Failed to create notebook");
      console.error(e);
    }
  }, []);

  const deleteNotebook = useCallback(async (id: string) => {
    try {
      await notebookApi.deleteNotebook(id);
      setNotebooks((prev) => {
        const next = prev.filter((n) => n.notebook_id !== id);
        if (currentNotebookId === id) {
          const newCurrent = next[0] ?? null;
          setCurrentNotebookId(newCurrent?.notebook_id ?? null);
          setSources(newCurrent?.sources ?? []);
          setChatHistory([]);
        }
        return next;
      });
      toast.success("Notebook deleted");
    } catch (e) {
      toast.error("Failed to delete notebook");
      console.error(e);
    }
  }, [currentNotebookId]);

  const switchNotebook = useCallback(async (id: string) => {
    if (id === currentNotebookId) return;
    try {
      const nb = await notebookApi.getNotebook(id);
      const srcs = await notebookApi.listSources(id);
      setCurrentNotebookId(id);
      setSources(srcs);
      setChatHistory([]);
      setNotebooks((prev) => prev.map((n) => (n.notebook_id === id ? { ...n, sources: srcs } : n)));
    } catch (e) {
      toast.error("Failed to switch notebook");
      console.error(e);
    }
  }, [currentNotebookId]);

  const sendChat = useCallback(async (message: string, command?: SlashCommand) => {
    if (!currentNotebookId) { toast.error("No notebook selected"); return; }
    const userMsg: NotebookChatMessage = {
      id: `user-${msgIdCounter.current++}`,
      role: "user",
      content: message,
      command,
      createdAt: Date.now(),
    };
    setChatHistory((prev) => [...prev, userMsg]);
    setIsChatLoading(true);
    const botMsgId = `bot-${msgIdCounter.current++}`;
    setChatHistory((prev) => [
      ...prev,
      { id: botMsgId, role: "assistant", content: "", createdAt: Date.now(), isStreaming: true },
    ]);
    try {
      const res = await notebookApi.chat(currentNotebookId, {
        message,
        command,
        source_ids: selectedSourceIds,
      });
      setChatHistory((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: res.response, citations: res.citations, isStreaming: false }
            : m
        )
      );
    } catch (e) {
      toast.error("Chat request failed");
      setChatHistory((prev) => prev.filter((m) => m.id !== botMsgId));
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  }, [currentNotebookId, selectedSourceIds]);

  const generateArtifact = useCallback(async (type: import("@/types/notebook").ArtifactType) => {
    if (!currentNotebookId) { toast.error("No notebook selected"); return; }
    setIsArtifactLoading(true);
    setIsArtifactOpen(true);
    try {
      const art = await notebookApi.generateArtifact(currentNotebookId, type);
      setCurrentArtifact(art);
    } catch (e) {
      toast.error("Failed to generate artifact");
      setIsArtifactOpen(false);
      console.error(e);
    } finally {
      setIsArtifactLoading(false);
    }
  }, [currentNotebookId]);

  const closeArtifact = useCallback(() => {
    setIsArtifactOpen(false);
    setCurrentArtifact(null);
  }, []);

  const addIngestionJob = useCallback((job: IngestionJob) => {
    setIngestionJobs((prev) => [job, ...prev]);
  }, []);

  const updateIngestionJob = useCallback((jobId: string, update: Partial<IngestionJob>) => {
    setIngestionJobs((prev) => prev.map((j) => (j.job_id === jobId ? { ...j, ...update } : j)));
  }, []);

  return (
    <NotebookContext.Provider
      value={{
        notebooks, currentNotebookId, currentNotebook,
        isStudioOpen, setStudioOpen,
        sources, chatHistory, isChatLoading,
        ingestionJobs, isSourceDrawerOpen, setSourceDrawerOpen,
        selectedCitation, setSelectedCitation,
        currentArtifact, isArtifactOpen, isArtifactLoading,
        selectedSourceIds, toggleSourceId, setSelectedSourceIds,
        notes, createNote, updateNote, deleteNote,
        loadNotebooks, createNotebook, deleteNotebook, switchNotebook,
        activeTab, setActiveTab,
        sendChat, generateArtifact, closeArtifact,
        addIngestionJob, updateIngestionJob,
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebookContext() {
  const ctx = useContext(NotebookContext);
  if (!ctx) throw new Error("useNotebookContext must be used within NotebookProvider");
  return ctx;
}
