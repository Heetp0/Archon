import React, { useState, useEffect } from "react";
import { useNotebookContext } from "@/context/NotebookContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { FilePdf, GithubLogo, Waveform, Plus, Trash } from "@phosphor-icons/react";
import type { Source } from "@/types/notebook";
import { cn } from "@/lib/utils";

function sourceIcon(type: Source["source_type"]) {
  if (type === "pdf") return <FilePdf className="w-3.5 h-3.5 text-white" />;
  if (type === "codebase") return <GithubLogo className="w-3.5 h-3.5 text-text-secondary" />;
  return <Waveform className="w-3.5 h-3.5 text-white" />;
}

export default function NotebookSidebar() {
  const {
    notebooks, currentNotebookId, sources,
    loadNotebooks, createNotebook, deleteNotebook, switchNotebook,
    setSourceDrawerOpen,
    selectedSourceIds, toggleSourceId, setSelectedSourceIds,
    notes, createNote, updateNote, deleteNote,
  } = useNotebookContext();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id?: string; title: string; content: string } | null>(null);

  useEffect(() => { loadNotebooks(); }, [loadNotebooks]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createNotebook(newName.trim());
    setNewName("");
    setCreateOpen(false);
  };

  const handleOpenCreateNote = () => {
    setEditingNote({ title: "", content: "" });
    setNoteDialogOpen(true);
  };

  const handleOpenEditNote = (note: any) => {
    setEditingNote({ id: note.id, title: note.title, content: note.content });
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!editingNote) return;
    if (editingNote.id) {
      updateNote(editingNote.id, { title: editingNote.title, content: editingNote.content });
    } else {
      createNote(editingNote.content, editingNote.title);
    }
    setNoteDialogOpen(false);
    setEditingNote(null);
  };

  const allSelected = sources.length > 0 && selectedSourceIds.length === sources.length;
  const handleSelectAllToggle = () => {
    if (allSelected) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map((s) => s.source_id));
    }
  };

  return (
    <div className="flex flex-col h-full w-[280px] flex-shrink-0 border-r border-border-core bg-panel-bg">
      {/* Top notebook selector */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border-core">
        <div className="flex-1">
          <Select value={currentNotebookId ?? ""} onValueChange={switchNotebook}>
            <SelectTrigger className="w-full bg-app-bg border-border-core text-text-primary text-xs h-8">
              <SelectValue placeholder="Select notebook..." />
            </SelectTrigger>
            <SelectContent className="bg-panel-bg border-border-core">
              {notebooks.map((nb) => (
                <SelectItem key={nb.notebook_id} value={nb.notebook_id} className="text-xs text-text-primary hover:bg-[#111111]">
                  {nb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {currentNotebookId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded text-accent-rose hover:bg-accent-rose/10">
                <Trash className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-panel-bg border-border-core">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-text-primary text-sm">Delete Notebook?</AlertDialogTitle>
                <AlertDialogDescription className="text-text-secondary text-xs">
                  This will permanently delete this notebook. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-accent-rose hover:bg-accent-rose/80 text-xs text-white"
                  onClick={() => deleteNotebook(currentNotebookId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded text-text-secondary hover:text-text-primary hover:bg-border-core/50">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0a0a0a] border-border-core w-[320px] max-w-full">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-sm font-semibold">New Notebook</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Notebook name..."
                className="bg-app-bg border-border-core text-text-primary text-xs"
              />
              <Button size="sm" onClick={handleCreate} className="w-full text-xs bg-white text-black hover:bg-neutral-200">
                Create Notebook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources list (Stacked top half) */}
      <div className="flex-[4] flex flex-col overflow-hidden border-b border-border-core">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-core/55 bg-app-bg/50">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAllToggle}
              className="rounded border-border-core bg-app-bg text-white focus:ring-white/30 w-3 h-3 cursor-pointer accent-white"
              disabled={sources.length === 0}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
              Sources ({selectedSourceIds.length}/{sources.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-white hover:text-neutral-200 px-1.5 flex items-center gap-1 hover:bg-[#111111]"
            onClick={() => setSourceDrawerOpen(true)}
            disabled={!currentNotebookId}
          >
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sources.map((src) => {
              const isSelected = selectedSourceIds.includes(src.source_id);
              return (
                <div
                  key={src.source_id}
                  onClick={() => toggleSourceId(src.source_id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded border border-transparent transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#111111] border-border-core text-text-primary"
                      : "text-text-secondary hover:bg-[#111111]/50 hover:text-text-primary"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // parent onClick does toggling
                    className="rounded border-border-core bg-app-bg text-white focus:ring-white/30 w-3.5 h-3.5 cursor-pointer accent-white"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    {sourceIcon(src.source_type)}
                    <span className="truncate text-xs font-medium">{src.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] uppercase tracking-wider h-4 px-1 flex-shrink-0 bg-border-core/60">
                    {src.source_type}
                  </Badge>
                </div>
              );
            })}
            {sources.length === 0 && currentNotebookId && (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-text-secondary mb-2">No sources yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-border-core text-text-secondary hover:text-text-primary"
                  onClick={() => setSourceDrawerOpen(true)}
                >
                  Add Source
                </Button>
              </div>
            )}
            {!currentNotebookId && (
              <p className="text-xs text-text-muted text-center py-8">Select or create a notebook first.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Notes list (Stacked bottom half) */}
      <div className="flex-[6] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-core/55 bg-app-bg/50">
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
            Notes ({notes.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-white hover:text-neutral-200 px-1.5 flex items-center gap-1 hover:bg-[#111111]"
            onClick={handleOpenCreateNote}
            disabled={!currentNotebookId}
          >
            <Plus className="w-3 h-3" /> New Note
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className="bg-app-bg border-border-core hover:border-white transition-all cursor-pointer group relative p-3 rounded"
                  onClick={() => handleOpenEditNote(note)}
                >
                  <div className="flex flex-col gap-1 pr-6">
                    <h4 className="text-xs font-semibold text-text-primary truncate">{note.title || "Untitled Note"}</h4>
                    <p className="text-[11px] text-text-secondary line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                    <span className="text-[9px] text-text-muted mt-1.5 font-mono">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-accent-rose/20 text-accent-rose"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </Card>
              ))}
            </div>
            {notes.length === 0 && currentNotebookId && (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-text-secondary mb-2">No notes yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-border-core text-text-secondary hover:text-text-primary"
                  onClick={handleOpenCreateNote}
                >
                  Create Note
                </Button>
              </div>
            )}
            {!currentNotebookId && (
              <p className="text-xs text-text-muted text-center py-8">Select or create a notebook first.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Note CRUD Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="bg-panel-bg border-border-core w-[400px] max-w-full">
          <DialogHeader>
            <DialogTitle className="text-text-primary text-sm font-semibold">
              {editingNote?.id ? "Edit Note" : "New Note"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-text-secondary">Title</label>
              <Input
                value={editingNote?.title ?? ""}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Note title..."
                className="bg-app-bg border-border-core text-text-primary text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-text-secondary">Content</label>
              <textarea
                value={editingNote?.content ?? ""}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="Write your note here..."
                rows={6}
                className="w-full rounded-md border border-border-core bg-app-bg px-3 py-2 text-xs text-text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-[#666666]/30 resize-y"
              />
            </div>
            <Button size="sm" onClick={handleSaveNote} className="w-full text-xs bg-white text-black hover:bg-neutral-200">
              Save Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
