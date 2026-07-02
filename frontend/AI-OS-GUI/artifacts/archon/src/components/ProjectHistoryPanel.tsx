import React, { useState } from "react";
import { ChevronRight, Plus, Settings, MessageSquare, Pencil, Check, FolderOpen, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectsContext, Project, ProjectMode } from "@/context/ProjectsContext";
import { useAppContext } from "@/context/AppContext";
import BrowsePCModal from "@/components/BrowsePCModal";
import type { AppMode } from "@/context/AppContext";

// ── Renameable chat row ────────────────────────────────────────────────────────
function ChatRow({ chat, onRename }: { chat: { id: string; name: string }; onRename: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chat.name) onRename(chat.id, trimmed);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5 pl-5 pr-2 py-1 rounded hover:bg-slate-900/40 group">
      <MessageSquare className="w-2.5 h-2.5 text-slate-700 flex-shrink-0" />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 bg-transparent text-xs font-mono text-slate-300 outline-none border-b border-slate-600 min-w-0"
        />
      ) : (
        <span className="flex-1 text-xs font-mono text-slate-500 truncate min-w-0">{chat.name}</span>
      )}
      {!editing && (
        <button
          onClick={() => { setDraft(chat.name); setEditing(true); }}
          className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-slate-400 transition-all flex-shrink-0"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
      )}
      {editing && (
        <button onClick={commit} className="text-slate-600 hover:text-slate-300 flex-shrink-0">
          <Check className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

// ── Project row (name + [+] + [⚙]) ────────────────────────────────────────────
function ProjectRow({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const { createChat, renameChat } = useProjectsContext();
  const { openProjectSettings } = useAppContext();

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-900/60 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={cn("w-3 h-3 flex-shrink-0 text-slate-600 transition-transform", expanded && "rotate-90")}
          />
          <span className="text-xs font-mono text-slate-300 truncate">{project.name}</span>
          {project.kind === "agent" && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20 flex-shrink-0">
              Agent
            </span>
          )}
        </button>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => createChat(project.id, project.mode)}
            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-200 transition-colors"
            title="New chat in this project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openProjectSettings(project.id)}
            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-200 transition-colors"
            title="Project settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-2 border-l border-slate-800/60 pl-1 space-y-0.5 py-0.5">
          {project.folderPath && (
            <div className="flex items-center gap-1.5 pl-4 py-1">
              <FolderOpen className="w-2.5 h-2.5 text-slate-700 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-700 truncate">{project.folderPath}</span>
            </div>
          )}
          {project.chats.map((chat) => (
            <ChatRow key={chat.id} chat={chat} onRename={renameChat} />
          ))}
          <button
            onClick={() => createChat(project.id, project.mode)}
            className="flex items-center gap-1.5 pl-5 pr-2 py-1 text-[10px] font-mono text-slate-700 hover:text-slate-400 rounded hover:bg-slate-900/40 w-full transition-colors"
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
        className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-600"
      />
      <div className="flex gap-1.5">
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex-1 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-[10px] font-mono disabled:opacity-30 transition-colors"
        >
          Create
        </button>
        <button
          onClick={onDone}
          className="px-3 py-1 rounded-lg border border-slate-800 text-slate-600 hover:text-slate-300 text-[10px] font-mono transition-colors"
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
          <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest px-0.5">New Agent Project</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goToFolder(); if (e.key === "Escape") onDone(); }}
            placeholder="Project name..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-600"
          />
          <div className="flex gap-1.5">
            <button
              onClick={goToFolder}
              disabled={!name.trim()}
              className="flex-1 py-1 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-[10px] font-mono disabled:opacity-30 transition-colors"
            >
              Next: Select Folder →
            </button>
            <button
              onClick={onDone}
              className="px-3 py-1 rounded-lg border border-slate-800 text-slate-600 hover:text-slate-300 text-[10px] font-mono transition-colors"
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
        <p className="text-[10px] font-mono text-slate-700 leading-relaxed">
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
              className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-dashed border-slate-800 text-[10px] font-mono text-slate-600 hover:text-slate-300 hover:border-slate-600 transition-all"
            >
              <Cpu className="w-3 h-3" />
              New Agent Project
            </button>
          )}
        </div>

        <div className="px-1 space-y-0.5">
          {agentProjects.length === 0 && !showNewAgentProject && (
            <div className="text-[10px] font-mono text-slate-700 text-center py-4 px-2">
              No agent projects yet.
            </div>
          )}
          {agentProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      </div>
    );
  }

  // chat | council | research — light projects
  const mode = currentMode as Exclude<typeof currentMode, "agents" | "dashboard" | "obsidian" | "directory">;
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
            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-800 text-[10px] font-mono text-slate-600 hover:text-slate-300 hover:border-slate-600 transition-all"
          >
            <FolderOpen className="w-3 h-3" />
            New Project
          </button>
        )}
        <button
          onClick={() => createChat(null, mode)}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800/50 text-[10px] font-mono text-slate-600 hover:text-slate-300 hover:border-slate-700 transition-all"
        >
          <Plus className="w-3 h-3" />
          New Chat (ungrouped)
        </button>
      </div>

      {/* Projects */}
      {modeProjects.length > 0 && (
        <div className="px-1 space-y-0.5 border-t border-slate-800/40 pt-2 mt-1">
          <div className="px-2 py-1 text-[9px] font-mono text-slate-700 uppercase tracking-widest">Projects</div>
          {modeProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      )}

      {/* Ungrouped chats */}
      {ungrouped.length > 0 && (
        <div className="px-1 space-y-0.5 border-t border-slate-800/40 pt-2 mt-1">
          <div className="px-2 py-1 text-[9px] font-mono text-slate-700 uppercase tracking-widest">Ungrouped</div>
          {ungrouped.map((chat) => (
            <ChatRow key={chat.id} chat={chat} onRename={renameChat} />
          ))}
        </div>
      )}

      {modeProjects.length === 0 && ungrouped.length === 0 && !showNewProject && (
        <div className="text-[10px] font-mono text-slate-700 text-center py-4 px-2">
          No sessions yet.
        </div>
      )}
    </div>
  );
}
