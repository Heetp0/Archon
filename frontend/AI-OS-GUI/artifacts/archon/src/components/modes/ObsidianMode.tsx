import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Play, Clock, Plus, Trash2, Edit3, Check, X,
  Calendar, FileText, Search, Lightbulb, Mail, ListTodo,
  Star, Zap, RefreshCw, BookMarked, Brain, Target
} from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Built-in skills ───────────────────────────────────────────────────────────
const DEFAULT_SKILLS: Skill[] = [
  {
    id: "daily-briefing",
    icon: Star,
    name: "Daily Briefing",
    description: "Summarize your active tasks, priorities, and key notes from today's vault entries.",
    prompt: "Give me a concise daily briefing from my Obsidian vault. Summarize active projects, today's tasks, and any critical notes.",
    category: "briefing",
    color: "text-amber-400",
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/20",
  },
  {
    id: "vault-search",
    icon: Search,
    name: "Vault Search",
    description: "AI-powered semantic search across all your vault notes and knowledge base.",
    prompt: "Search my Obsidian vault semantically and find the most relevant notes.",
    category: "research",
    color: "text-blue-400",
    bg: "bg-blue-500/[0.06]",
    border: "border-blue-500/20",
  },
  {
    id: "project-summary",
    icon: Target,
    name: "Project Summary",
    description: "Generate a concise status report for all active projects tracked in your vault.",
    prompt: "Summarize all active projects in my vault. Show their current status, blockers, and next actions.",
    category: "briefing",
    color: "text-green-400",
    bg: "bg-green-500/[0.06]",
    border: "border-green-500/20",
  },
  {
    id: "idea-capture",
    icon: Lightbulb,
    name: "Idea Capture & Refine",
    description: "Expand and refine your latest ideas into structured Obsidian notes.",
    prompt: "Review my recent idea notes and help me refine and expand the most promising ones into detailed outlines.",
    category: "creative",
    color: "text-yellow-400",
    bg: "bg-yellow-500/[0.06]",
    border: "border-yellow-500/20",
  },
  {
    id: "study-review",
    icon: BookMarked,
    name: "Study Review",
    description: "Review your study notes and generate a spaced-repetition quiz from recent material.",
    prompt: "Review my study notes and generate a short quiz to test my knowledge on the most recent topics.",
    category: "research",
    color: "text-purple-400",
    bg: "bg-purple-500/[0.06]",
    border: "border-purple-500/20",
  },
  {
    id: "weekly-review",
    icon: Calendar,
    name: "Weekly Review",
    description: "Compile a full weekly review from your journal entries, tasks, and project updates.",
    prompt: "Compile a comprehensive weekly review from my Obsidian vault. Include accomplished tasks, lessons learned, and goals for next week.",
    category: "briefing",
    color: "text-cyan-400",
    bg: "bg-cyan-500/[0.06]",
    border: "border-cyan-500/20",
  },
  {
    id: "mail-digest",
    icon: Mail,
    name: "Mail Digest",
    description: "Summarize your latest emails via Gmail MCP and log key action items to vault.",
    prompt: "Using Gmail MCP, fetch my latest unread emails and generate a concise digest with action items.",
    category: "briefing",
    color: "text-rose-400",
    bg: "bg-rose-500/[0.06]",
    border: "border-rose-500/20",
  },
  {
    id: "todo-sync",
    icon: ListTodo,
    name: "Todo Sync",
    description: "Sync Google Keep checklists via MCP and update your vault task list.",
    prompt: "Using Google Keep MCP, sync my latest checklists and update my vault TODO list accordingly.",
    category: "productivity",
    color: "text-indigo-400",
    bg: "bg-indigo-500/[0.06]",
    border: "border-indigo-500/20",
  },
  {
    id: "knowledge-graph",
    icon: Brain,
    name: "Knowledge Graph",
    description: "Analyze note connections and suggest new links or orphaned notes to connect.",
    prompt: "Analyze my vault's knowledge graph. Identify orphaned notes, suggest new connections, and highlight clusters.",
    category: "research",
    color: "text-violet-400",
    bg: "bg-violet-500/[0.06]",
    border: "border-violet-500/20",
  },
  {
    id: "new-note",
    icon: FileText,
    name: "Create Structured Note",
    description: "Generate a new well-structured note on any topic with proper vault formatting.",
    prompt: "Create a new structured Obsidian note with frontmatter, headings, and content.",
    category: "creative",
    color: "text-slate-400",
    bg: "bg-slate-500/[0.06]",
    border: "border-slate-500/20",
  },
];

const CATEGORY_LABELS: Record<Skill["category"], string> = {
  briefing: "Briefing",
  research: "Research",
  productivity: "Productivity",
  creative: "Creative",
};

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Schedule Modal ─────────────────────────────────────────────────────────────
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-md mx-6 bg-[#0d0e18] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-200">Schedule Skill</h3>
            <p className="text-[11px] font-mono text-slate-600 mt-0.5">{skill.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Run Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-[#0b0c13] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-violet-500/50 w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS_SHORT.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
                    days.includes(d)
                      ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                      : "bg-transparent border-white/[0.06] text-slate-600 hover:text-slate-400"
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
            className="flex-1 py-2.5 rounded-xl border border-white/[0.06] text-sm font-mono text-slate-500 hover:text-slate-300 hover:border-white/[0.10] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ skillId: skill.id, skillName: skill.name, time, days, enabled: true });
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-mono text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            Schedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Skill Card ─────────────────────────────────────────────────────────────────
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
    <div className={cn(
      "relative rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:border-white/[0.10]",
      "bg-[#0b0c13] border-white/[0.05]"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", skill.bg, skill.border, "border")}>
          <Icon className={cn("w-4 h-4", skill.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-mono font-medium text-slate-200">{skill.name}</div>
          <div className="text-[11px] font-mono text-slate-600 mt-1 leading-relaxed">{skill.description}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
        <button
          onClick={onSchedule}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-[11px] font-mono text-slate-500 hover:text-slate-300 hover:border-white/[0.10] transition-all"
        >
          <Clock className="w-3 h-3" />
          Schedule
        </button>
        <button
          onClick={onRun}
          disabled={running}
          className={cn(
            "flex items-center gap-1.5 ml-auto px-4 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all",
            "bg-violet-600/80 hover:bg-violet-500 text-white border border-violet-500/40",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          )}
        >
          {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? "Running…" : "Run Now"}
        </button>
      </div>
    </div>
  );
}

// ── Add Skill Modal ───────────────────────────────────────────────────────────
function AddSkillModal({
  onSave,
  onClose,
}: {
  onSave: (skill: Omit<Skill, "id" | "icon" | "color" | "bg" | "border">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<Skill["category"]>("productivity");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-lg mx-6 bg-[#0d0e18] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-slate-200">Add New Skill</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Standup"
              className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill do?"
              className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">AI Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="The prompt that gets sent to the AI when you run this skill..."
              className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Skill["category"])}
              className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-violet-500/50"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.06] text-sm font-mono text-slate-500 hover:text-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name && prompt) {
                onSave({ name, description, prompt, category });
                onClose();
              }
            }}
            disabled={!name || !prompt}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-mono text-white transition-all"
          >
            Add Skill
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Obsidian Mode ─────────────────────────────────────────────────────────
export default function ObsidianMode() {
  const { sendChat, isStreaming, connected } = useWebSocketContext();
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [scheduled, setScheduled] = useState<ScheduledTask[]>([]);
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Skill | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [filter, setFilter] = useState<Skill["category"] | "all">("all");
  const [output, setOutput] = useState<{ skillName: string; text: string } | null>(null);

  const handleRun = (skill: Skill) => {
    if (!connected || isStreaming) return;
    setRunningSkillId(skill.id);
    setOutput(null);
    sendChat(skill.prompt, "groq/llama-3.3-70b-versatile");
    setTimeout(() => setRunningSkillId(null), 3000);
  };

  const handleAddSchedule = (task: Omit<ScheduledTask, "id">) => {
    setScheduled((prev) => [...prev, { ...task, id: Math.random().toString() }]);
  };

  const handleAddSkill = (data: Omit<Skill, "id" | "icon" | "color" | "bg" | "border">) => {
    setSkills((prev) => [
      ...prev,
      {
        ...data,
        id: Math.random().toString(),
        icon: Zap,
        color: "text-slate-400",
        bg: "bg-slate-500/[0.06]",
        border: "border-slate-500/20",
      },
    ]);
  };

  const filteredSkills = filter === "all" ? skills : skills.filter((s) => s.category === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#08090f] overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-base font-mono font-bold text-slate-100">Obsidian Control Center</h1>
              <p className="text-[11px] font-mono text-slate-600 mt-0.5">Skills · Automation · Vault Intelligence</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddSkill(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-500 border border-violet-500/40 text-xs font-mono text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Skill
          </button>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mt-5">
          {(["all", "briefing", "research", "productivity", "creative"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all capitalize",
                filter === cat
                  ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                  : "border-white/[0.06] text-slate-600 hover:text-slate-400 hover:border-white/[0.10]"
              )}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Skills grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Skills · {filteredSkills.length}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Scheduled Tasks */}
          {scheduled.length > 0 && (
            <div>
              <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
                Scheduled · {scheduled.length}
              </h2>
              <div className="space-y-2">
                {scheduled.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 px-5 py-3.5 rounded-xl border border-white/[0.05] bg-[#0b0c13]"
                  >
                    <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-slate-300">{task.skillName}</div>
                      <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                        {task.time} · {task.days.join(", ")}
                      </div>
                    </div>
                    <button
                      onClick={() => setScheduled((prev) => prev.filter((t) => t.id !== task.id))}
                      className="text-slate-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {scheduleTarget && (
          <ScheduleModal
            skill={scheduleTarget}
            onSave={handleAddSchedule}
            onClose={() => setScheduleTarget(null)}
          />
        )}
        {showAddSkill && (
          <AddSkillModal
            onSave={handleAddSkill}
            onClose={() => setShowAddSkill(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
