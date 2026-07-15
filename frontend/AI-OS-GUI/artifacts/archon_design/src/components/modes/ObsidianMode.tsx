import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Play, Clock, Plus, Trash2, X,
  Calendar, FileText, Search, Lightbulb, Mail, ListTodo,
  Star, Zap, RefreshCw, BookMarked, Brain, Target, Folder, Trash
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Skill {
  id: string;
  icon: React.ElementType;
  name: string;
  description: string;
  prompt: string;
  category: "briefing" | "research" | "productivity" | "creative";
  color: string;
  bg: string;
  border: string;
}

interface ScheduledTask {
  id: string;
  skillId: string;
  skillName: string;
  time: string;
  days: string[];
  enabled: boolean;
}

const DEFAULT_SKILLS: Skill[] = [
  {
    id: "daily-briefing",
    icon: Star,
    name: "Daily Briefing",
    description: "Summarize task documents in your active vault notes.",
    prompt: "Give me a daily briefing. Summarize active projects, tasks, and critical notes.",
    category: "briefing",
    color: "text-white",
    bg: "bg-[#111111]",
    border: "border-[#222222]",
  },
  {
    id: "vault-search",
    icon: Search,
    name: "Vault Search",
    description: "AI-powered semantic search across vault notes.",
    prompt: "Search my Obsidian vault semantically.",
    category: "research",
    color: "text-white",
    bg: "bg-[#111111]",
    border: "border-[#222222]",
  },
  {
    id: "project-summary",
    icon: Target,
    name: "Project Summary",
    description: "Generate status reports for active projects.",
    prompt: "Summarize all active projects in my vault.",
    category: "briefing",
    color: "text-white",
    bg: "bg-[#111111]",
    border: "border-[#222222]",
  },
  {
    id: "idea-capture",
    icon: Lightbulb,
    name: "Idea Capture",
    description: "Expand idea fragments into detailed outlines.",
    prompt: "Review my recent ideas and expand them into outlines.",
    category: "creative",
    color: "text-white",
    bg: "bg-[#111111]",
    border: "border-[#222222]",
  },
];

const CATEGORY_LABELS: Record<Skill["category"], string> = {
  briefing: "Briefing",
  research: "Research",
  productivity: "Productivity",
  creative: "Creative",
};

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ScheduleModal({
  skill,
  onSave,
  onClose,
}: {
  skill: Skill;
  onSave: (task: Omit<ScheduledTask, "id">) => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState("08:00");
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  const toggleDay = (d: string) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-md mx-6 bg-[#0a0a0a] border border-[#222222] rounded overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-[#222222] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold text-white">Schedule Skill</h3>
            <p className="text-[11px] font-mono text-[#a0a0a0] mt-0.5">{skill.name}</p>
          </div>
          <button onClick={onClose} className="text-[#a0a0a0] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest">Run Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent border border-[#222222] rounded px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-white/40 w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest">Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS_SHORT.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono border transition-all",
                    days.includes(d)
                      ? "bg-white text-black border-white"
                      : "bg-transparent border-[#222222] text-[#a0a0a0] hover:text-white"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded border border-[#222222] text-sm font-mono text-[#a0a0a0] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ skillId: skill.id, skillName: skill.name, time, days, enabled: true });
              onClose();
            }}
            className="flex-1 py-2.5 rounded bg-white text-black hover:bg-neutral-200 text-sm font-mono transition-all"
          >
            Schedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkillCard({
  skill,
  onRun,
  onSchedule,
  running,
}: {
  skill: Skill;
  onRun: () => void;
  onSchedule: () => void;
  running: boolean;
}) {
  const Icon = skill.icon;
  return (
    <div className="relative rounded border p-4 flex flex-col gap-3 transition-all bg-[#0a0a0a] border-[#222222] hover:border-[#444444]">
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-[#111111] border border-[#222222]")}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-medium text-white">{skill.name}</div>
          <div className="text-[10px] font-mono text-[#a0a0a0] mt-1 leading-relaxed">{skill.description}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[#222222]">
        <button
          onClick={onSchedule}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#222222] text-[10px] font-mono text-[#a0a0a0] hover:text-white transition-all"
        >
          <Clock className="w-3 h-3" />
          Schedule
        </button>
        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1.5 ml-auto px-3 py-1 rounded text-[10px] font-mono font-medium bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors"
        >
          {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? "Running..." : "Run"}
        </button>
      </div>
    </div>
  );
}

export default function ObsidianMode() {
  const { sendChat, isStreaming, connected } = useWebSocketContext();
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [scheduled, setScheduled] = useState<ScheduledTask[]>([]);
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Skill | null>(null);
  const [filter, setFilter] = useState<Skill["category"] | "all">("all");

  const [selectedNoteName, setSelectedNoteName] = useState("readme.md");
  const [selectedNoteContent, setSelectedNoteContent] = useState(
    "# Obsidian Vault\n\nWelcome to your AI OS local vault database.\nUse Skills panel to the right to analyze and synthesize task documents."
  );

  const handleRun = (skill: Skill) => {
    if (!connected || isStreaming) return;
    setRunningSkillId(skill.id);
    sendChat(`Running skill "${skill.name}" on note "${selectedNoteName}":\n\n${selectedNoteContent}`, "groq/llama-3.3-70b-versatile");
    setTimeout(() => setRunningSkillId(null), 3000);
  };

  const handleAddSchedule = (task: Omit<ScheduledTask, "id">) => {
    setScheduled((prev) => [...prev, { ...task, id: Math.random().toString() }]);
  };

  const filteredSkills = filter === "all" ? skills : skills.filter((s) => s.category === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-app-bg overflow-hidden"
    >
      {/* 3-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Folder Tree Sidebar */}
        <div className="w-60 border-r border-border-core bg-[#0a0a0a] flex flex-col flex-shrink-0 font-mono text-xs text-text-secondary select-none">
          <div className="p-3 border-b border-border-core flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-white">Vault Files</span>
            <button 
              onClick={() => {
                const name = prompt("Enter note name:");
                if (name) {
                  setSelectedNoteName(name.endsWith(".md") ? name : `${name}.md`);
                  setSelectedNoteContent(`# ${name}\n\nStart writing note...`);
                }
              }}
              className="hover:text-white transition-colors" 
              title="New Note"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-white font-semibold">
                  <Folder className="w-3.5 h-3.5 text-[#666666]" />
                  <span>Daily Notes</span>
                </div>
                <div className="pl-4 space-y-0.5">
                  <button 
                    onClick={() => {
                      setSelectedNoteName("2026-07-15.md");
                      setSelectedNoteContent("# 2026-07-15\n\n## Priorities\n- [ ] Complete Archon redesign\n- [x] Unify chat inputs\n\n## Notes\nToday implemented Vercel True Dark theme and unified inputs.");
                    }} 
                    className={cn(
                      "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#111111] hover:text-white truncate",
                      selectedNoteName === "2026-07-15.md" ? "bg-[#111111] text-white" : ""
                    )}
                  >
                    <FileText className="w-3 h-3 text-[#666666]" />
                    <span>2026-07-15.md</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedNoteName("2026-07-14.md");
                      setSelectedNoteContent("# 2026-07-14\n\n## Summary\nWorked on API servers and finalized research protocols.");
                    }} 
                    className={cn(
                      "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#111111] hover:text-white truncate",
                      selectedNoteName === "2026-07-14.md" ? "bg-[#111111] text-white" : ""
                    )}
                  >
                    <FileText className="w-3 h-3 text-[#666666]" />
                    <span>2026-07-14.md</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-white font-semibold">
                  <Folder className="w-3.5 h-3.5 text-[#666666]" />
                  <span>Projects</span>
                </div>
                <div className="pl-4 space-y-0.5">
                  <button 
                    onClick={() => {
                      setSelectedNoteName("archon-redesign.md");
                      setSelectedNoteContent("# Archon Redesign Specification\n\n## Overview\nRedesign frontend dashboard, council grids, and chat interface.\n\n## Milestones\n1. Global Theme Overhaul\n2. Unified ChatInput\n3. Universal Interactions\n4. Mode-specific panel redesigns");
                    }} 
                    className={cn(
                      "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#111111] hover:text-white truncate",
                      selectedNoteName === "archon-redesign.md" ? "bg-[#111111] text-white" : ""
                    )}
                  >
                    <FileText className="w-3 h-3 text-[#666666]" />
                    <span>archon-redesign.md</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-white font-semibold">
                  <Folder className="w-3.5 h-3.5 text-[#666666]" />
                  <span>Vault Intelligence</span>
                </div>
                <div className="pl-4 space-y-0.5">
                  <button 
                    onClick={() => {
                      setSelectedNoteName("readme.md");
                      setSelectedNoteContent("# Obsidian Vault\n\nWelcome to your AI OS local vault database.\nUse Skills panel to the right to analyze and synthesize task documents.");
                    }} 
                    className={cn(
                      "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#111111] hover:text-white truncate",
                      selectedNoteName === "readme.md" ? "bg-[#111111] text-white" : ""
                    )}
                  >
                    <FileText className="w-3 h-3 text-[#666666]" />
                    <span>readme.md</span>
                  </button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Center Pane: Wide-margin Markdown Canvas */}
        <div className="flex-1 bg-app-bg flex flex-col min-w-0 overflow-y-auto border-r border-border-core">
          <div className="max-w-3xl w-full mx-auto py-12 px-8 flex-1 flex flex-col">
            <div className="border-b border-[#222222] pb-4 mb-6">
              <h2 className="text-xl font-bold text-white font-sans">{selectedNoteName}</h2>
              <span className="text-[10px] text-text-secondary font-mono">Markdown Editor</span>
            </div>
            
            <textarea
              value={selectedNoteContent}
              onChange={(e) => setSelectedNoteContent(e.target.value)}
              className="flex-1 w-full bg-transparent border-0 outline-none text-white text-sm font-mono leading-relaxed resize-none p-0 focus:ring-0 min-h-[400px]"
              placeholder="Start typing markdown here..."
            />
          </div>
        </div>

        {/* Right Pane: Skills Control Panel */}
        <div className="w-80 border-l border-border-core bg-[#0a0a0a] flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border-core">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Skills Panel</span>
            
            {/* Category filter */}
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {(["all", "briefing", "research", "creative"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-2 py-1 rounded text-[9px] font-mono border transition-all capitalize",
                    filter === cat
                      ? "bg-white text-black border-white"
                      : "border-[#222222] text-[#a0a0a0] hover:text-white"
                  )}
                >
                  {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onRun={() => handleRun(skill)}
                    onSchedule={() => setScheduleTarget(skill)}
                    running={runningSkillId === skill.id}
                  />
                ))}
              </div>

              {/* Scheduled Tasks */}
              {scheduled.length > 0 && (
                <div className="pt-4 border-t border-[#222222]">
                  <span className="text-[10px] font-mono text-[#a0a0a0] uppercase tracking-widest mb-3 block">
                    Scheduled ({scheduled.length})
                  </span>
                  <div className="space-y-2">
                    {scheduled.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-3 py-2 rounded border border-[#222222] bg-[#111111]/30"
                      >
                        <Clock className="w-3.5 h-3.5 text-white flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono text-white truncate">{task.skillName}</div>
                          <div className="text-[9px] font-mono text-[#a0a0a0] mt-0.5">
                            {task.time} | {task.days.join(", ")}
                          </div>
                        </div>
                        <button
                          onClick={() => setScheduled((prev) => prev.filter((t) => t.id !== task.id))}
                          className="text-[#a0a0a0] hover:text-white transition-colors"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <AnimatePresence>
        {scheduleTarget && (
          <ScheduleModal
            skill={scheduleTarget}
            onSave={handleAddSchedule}
            onClose={() => setScheduleTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
