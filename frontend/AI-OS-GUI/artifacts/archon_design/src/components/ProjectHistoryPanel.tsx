import React, { useState } from "react";
import { ChevronRight, Plus, Settings, MessageSquare, Pencil, Check, FolderOpen, Cpu, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectsContext, Project, ProjectMode } from "@/context/ProjectsContext";
import { useAppContext } from "@/context/AppContext";
import BrowsePCModal from "@/components/BrowsePCModal";
import type { AppMode } from "@/context/AppContext";

// ── Renameable chat row ────────────────────────────────────────────────────────
function ChatRow({ chat, onRename }: { chat: { id: string; name: string }; onRename: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.name);
  const { deleteChat } = useProjectsContext();

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chat.name) onRename(chat.id, trimmed);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5 pl-5 pr-2 py-1 rounded hover:bg-panel-bg/40 group">
      <MessageSquare className="w-2.5 h-2.5 text-text-secondary flex-shrink-0" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(chat.name); setEditing(false); } }}
          className="flex-1 bg-transparent text-xs font-mono text-text-primary outline-none border-b border-border-core/80 min-w-0"
        />
      ) : (
        <span className="flex-1 text-xs font-mono text-text-secondary truncate min-w-0">{chat.name}</span>
      )}
      {!editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => { setDraft(chat.name); setEditing(true); }}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Rename chat"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete chat "${chat.name}"?`)) {
                deleteChat(chat.id);
              }
            }}
            className="text-text-secondary hover:text-red-500 transition-colors"
            title="Delete chat"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
      {editing && (
        <button onClick={commit} className="text-text-secondary hover:text-text-primary flex-shrink-0">
          <Check className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

// ── Project row (name + [+] + [⚙]) ────────────────────────────────────────────
function ProjectRow({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const { createChat, renameChat, deleteProject } = useProjectsContext();
  const { openProjectSettings } = useAppContext();

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-panel-bg/60 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={cn("w-3 h-3 flex-shrink-0 text-text-secondary transition-transform", expanded && "rotate-90")}
          />
          <span className="text-xs font-mono text-text-primary truncate">{project.name}</span>
          {project.kind === "agent" && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 flex-shrink-0">
              Agent
            </span>
          )}
        </button>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => createChat(project.id, project.mode)}
            className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            title="New chat in this project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openProjectSettings(project.id)}
            className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            title="Project settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                deleteProject(project.id);
              }
            }}
            className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-2 border-l border-border-core/60 pl-1 space-y-0.5 py-0.5">
          {project.folderPath && (
            <div className="flex items-center gap-1.5 pl-4 py-1">
              <FolderOpen className="w-2.5 h-2.5 text-text-secondary flex-shrink-0" />
              <span className="text-[10px] font-mono text-text-secondary truncate">{project.folderPath}</span>
            </div>
          )}
          {project.chats.map((chat) => (
            <ChatRow key={chat.id} chat={chat} onRename={renameChat} />
          ))}
          <button
            onClick={() => createChat(project.id, project.mode)}
            className="flex items-center gap-1.5 pl-5 pr-2 py-1 text-[10px] font-mono text-text-secondary hover:text-text-secondary rounded hover:bg-panel-bg/40 w-full transition-colors"
          >
            <Plus className="w-2.5 h-2.5" /> New Chat
          </button>
        </div>
      )}
    </div>
  );
}

// ── Light project creation inline form ─────────────────────────────────────────
function NewLightProjectForm({ mode, onDone }: { mode: ProjectMode; onDone: () => void }) {
  const [name, setName] = useState("");
  const { createLightProject } = useProjectsContext();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createLightProject(mode, trimmed);
    onDone();
  };

  return (
    <div className="px-2 py-2 space-y-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onDone(); }}
        placeholder="Project name..."
        className="w-full bg-panel-bg/60 border border-border-core rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/80"
      />
      <div className="flex gap-1.5">
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex-1 py-1 rounded-lg bg-accent-indigo/80 hover:bg-accent-indigo text-text-primary text-[10px] font-mono disabled:opacity-30 transition-colors"
        >
          Create
        </button>
        <button
          onClick={onDone}
          className="px-3 py-1 rounded-lg border border-border-core text-text-secondary hover:text-text-primary text-[10px] font-mono transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Agent project creation flow ────────────────────────────────────────────────
function NewAgentProjectFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"name" | "folder">("name");
  const [name, setName] = useState("");
  const [browsePCOpen, setBrowsePCOpen] = useState(false);
  const { createAgentProject } = useProjectsContext();

  const goToFolder = () => {
    if (!name.trim()) return;
    setStep("folder");
    setBrowsePCOpen(true);
  };

  const handleFolderSelect = (path: string) => {
    setBrowsePCOpen(false);
    createAgentProject(name.trim(), path);
    onDone();
  };

  return (
    <>
      {step === "name" && (
        <div className="px-2 py-2 space-y-1.5">
          <div className="text-[9px] font-mono text-text-secondary uppercase tracking-widest px-0.5">New Agent Project</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goToFolder(); if (e.key === "Escape") onDone(); }}
            placeholder="Project name..."
            className="w-full bg-panel-bg/60 border border-border-core rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/80"
          />
          <div className="flex gap-1.5">
            <button
              onClick={goToFolder}
              disabled={!name.trim()}
              className="flex-1 py-1 rounded-lg bg-accent-emerald/80 hover:bg-accent-emerald text-text-primary text-[10px] font-mono disabled:opacity-30 transition-colors"
            >
              Next: Select Folder →
            </button>
            <button
              onClick={onDone}
              className="px-3 py-1 rounded-lg border border-border-core text-text-secondary hover:text-text-primary text-[10px] font-mono transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <BrowsePCModal
        open={browsePCOpen}
        onClose={() => { setBrowsePCOpen(false); onDone(); }}
        onSelect={handleFolderSelect}
      />
    </>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
const SIDEBAR_MODES = new Set<AppMode>(["chat", "council", "research", "agents"]);

export default function ProjectHistoryPanel({ currentMode }: { currentMode: AppMode }) {
  const { projects, ungroupedChats, createChat, renameChat } = useProjectsContext();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewAgentProject, setShowNewAgentProject] = useState(false);

  // Modes where sidebar projects aren't scoped
  if (!SIDEBAR_MODES.has(currentMode)) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-[10px] font-mono text-text-secondary leading-relaxed">
          History is scoped to Chat, Council, Research, and Agents.
        </p>
      </div>
    );
  }

  if (currentMode === "agents") {
    const agentProjects = projects.filter((p) => p.mode === "agents" && p.kind === "agent");
    return (
      <div className="flex flex-col">
        {/* Header action */}
        <div className="px-2 py-2">
          {showNewAgentProject ? (
            <NewAgentProjectFlow onDone={() => setShowNewAgentProject(false)} />
          ) : (
            <button
              onClick={() => setShowNewAgentProject(true)}
              className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-dashed border-border-core text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/80 transition-all"
            >
              <Cpu className="w-3 h-3" />
              New Agent Project
            </button>
          )}
        </div>

        <div className="px-1 space-y-0.5">
          {agentProjects.length === 0 && !showNewAgentProject && (
            <div className="text-[10px] font-mono text-text-secondary text-center py-4 px-2">
              No agent projects yet.
            </div>
          )}
          {agentProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      </div>
    );
  }

  // chat | council | research — light projects
  const mode = currentMode as Exclude<typeof currentMode, "agents" | "dashboard" | "obsidian" | "directory" | "notebook">;
  const modeProjects = projects.filter((p) => p.mode === mode && p.kind === "light");
  const ungrouped = ungroupedChats[mode as "chat" | "council" | "research"] ?? [];

  return (
    <div className="flex flex-col">
      {/* New project / new chat actions */}
      <div className="px-2 py-2 space-y-1">
        {showNewProject ? (
          <NewLightProjectForm mode={mode} onDone={() => setShowNewProject(false)} />
        ) : (
          <button
            onClick={() => setShowNewProject(true)}
            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-border-core text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/80 transition-all"
          >
            <FolderOpen className="w-3 h-3" />
            New Project
          </button>
        )}
        <button
          onClick={() => createChat(null, mode)}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-core/50 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/60 transition-all"
        >
          <Plus className="w-3 h-3" />
          New Chat (ungrouped)
        </button>
      </div>

      {/* Projects */}
      {modeProjects.length > 0 && (
        <div className="px-1 space-y-0.5 border-t border-border-core/40 pt-2 mt-1">
          <div className="px-2 py-1 text-[9px] font-mono text-text-secondary uppercase tracking-widest">Projects</div>
          {modeProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      )}

      {/* Ungrouped chats */}
      {ungrouped.length > 0 && (
        <div className="px-1 space-y-0.5 border-t border-border-core/40 pt-2 mt-1">
          <div className="px-2 py-1 text-[9px] font-mono text-text-secondary uppercase tracking-widest">Ungrouped</div>
          {ungrouped.map((chat) => (
            <ChatRow key={chat.id} chat={chat} onRename={renameChat} />
          ))}
        </div>
      )}

      {modeProjects.length === 0 && ungrouped.length === 0 && !showNewProject && (
        <div className="text-[10px] font-mono text-text-secondary text-center py-4 px-2">
          No sessions yet.
        </div>
      )}
    </div>
  );
}
