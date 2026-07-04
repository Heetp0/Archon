import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Gavel, CheckCircle2, XCircle, MinusCircle, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";

const ROLES = ["Proposer", "Critic", "Domain Expert", "Synthesizer"];
const COLORS = ["text-blue-400", "text-orange-400", "text-purple-400", "text-emerald-400"];
const BORDERS = ["border-blue-500/30", "border-orange-500/30", "border-purple-500/30", "border-emerald-500/30"];
const BGS = ["bg-blue-950/10", "bg-orange-950/10", "bg-purple-950/10", "bg-emerald-950/10"];
const HEADERS = ["bg-blue-900/30", "bg-orange-900/30", "bg-purple-900/30", "bg-emerald-900/30"];
const GLOWS = ["shadow-[0_0_20px_rgba(59,130,246,0.08)]", "shadow-[0_0_20px_rgba(249,115,22,0.08)]", "shadow-[0_0_20px_rgba(168,85,247,0.08)]", "shadow-[0_0_20px_rgba(16,185,129,0.08)]"];
const DOTS = ["bg-blue-500", "bg-orange-500", "bg-purple-500", "bg-emerald-500"];

const VERDICT_ITEMS = [
  { icon: CheckCircle2, color: "text-emerald-400", label: "Architecture", value: "Modular Monolith (Phase 1 → extract services at 6mo)" },
  { icon: CheckCircle2, color: "text-emerald-400", label: "Database",     value: "PostgreSQL 16 + JSONB + read replica at scale" },
  { icon: MinusCircle,  color: "text-yellow-400",  label: "Deployment",   value: "PaaS initially; Kubernetes migration deferred" },
  { icon: XCircle,      color: "text-red-400",      label: "Rejected",     value: "Greenfield microservices — insufficient team maturity" },
];

const FALLBACK_MODELS = [
  { model_id: "groq/llama-3.3-70b-versatile",        label: "Groq · Llama 3.3 70B" },
  { model_id: "gemini/gemini-2.5-flash",              label: "Gemini · 2.5 Flash" },
  { model_id: "openrouter/deepseek/deepseek-r1:free", label: "OpenRouter · DeepSeek R1" },
  { model_id: "cerebras/llama-3.3-70b",               label: "Cerebras · Llama 3.3 70B" },
];

export default function CouncilMode() {
  const { councilMessages, isStreaming, sendCouncil, connected, availableModels } = useWebSocketContext();
  const { activeProjectId } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const modelSource = (availableModels && availableModels.length > 0) ? availableModels : FALLBACK_MODELS;
  const activeModels = modelSource.slice(0, 4).map((m: any, i: number) => ({
    key: m.model_id,
    name: (m.label || m.model_id).split(" · ")[1] || m.label || m.model_id,
    role: ROLES[i % ROLES.length],
    color: COLORS[i % COLORS.length],
    border: BORDERS[i % BORDERS.length],
    bg: BGS[i % BGS.length],
    header: HEADERS[i % HEADERS.length],
    glow: GLOWS[i % GLOWS.length],
    dot: DOTS[i % DOTS.length],
  }));

  const [input, setInput] = useState("");

  const handleBroadcast = () => {
    if (!input.trim() || isStreaming) return;
    sendCouncil(input.trim(), activeModels.map((m: any) => m.key));
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBroadcast(); }
  };

  const getMessages = (modelKey: string) => councilMessages[modelKey] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full bg-[#020611] relative"
    >
      {/* Hidden native file picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.md,.py,.js,.ts,.json,.csv"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded border font-mono text-xs flex items-center gap-2 ${
            isStreaming
              ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
              : "bg-slate-900 border-slate-700 text-slate-500"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-orange-500 animate-pulse" : "bg-slate-700"}`} />
            {isStreaming ? "DEBATE ACTIVE" : "AWAITING DEBATE"}
          </div>
          <div className="flex gap-1">
            {activeModels.map((m: any) => (
              <span key={m.key} className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${m.color} ${m.border} bg-transparent`}>
                {m.role}
              </span>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 hover:text-white bg-slate-900/50 text-xs">
          <Download className="w-3.5 h-3.5 mr-2" />
          Export
        </Button>
      </div>

      {/* Debate area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 flex-1 overflow-y-auto lg:overflow-hidden min-h-0">
        {activeModels.map((col: any) => {
          const msgs = getMessages(col.key);
          return (
            <div key={col.key} className={`flex flex-col border-b md:border-b-0 md:border-r border-slate-800/50 last:border-b-0 last:border-r-0 min-h-[300px] lg:min-h-0 ${col.bg} ${col.glow}`}>
              <div className={`px-4 py-2.5 ${col.header} border-b ${col.border} flex items-center justify-between flex-shrink-0`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dot} ${isStreaming ? "animate-pulse" : ""}`} />
                  <span className={`font-mono font-bold text-sm ${col.color}`}>{col.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{col.role}</span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {msgs.length === 0 && !isStreaming && (
                    <div className="text-xs font-mono text-slate-700 text-center py-8">
                      No response yet. Broadcast a directive below.
                    </div>
                  )}
                  {msgs.map((msg, j) => (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: j * 0.08 }}
                      key={msg.id}
                      className={`p-3 rounded border ${col.border} bg-[#020611]/60 text-xs text-slate-300 leading-relaxed`}
                    >
                      <div className={`text-[9px] font-mono uppercase tracking-widest ${col.color} mb-1.5`}>
                        Round {j + 1}
                      </div>
                      {msg.content}
                    </motion.div>
                  ))}
                  {isStreaming && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600 p-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Awaiting response...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Council Verdict */}
      <div className="flex-shrink-0 border-t border-amber-900/40 bg-gradient-to-r from-amber-950/20 via-[#020611] to-amber-950/20">
        <div className="px-4 py-2.5 border-b border-amber-900/30 flex items-center gap-3">
          <Gavel className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">Council Verdict</span>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-[10px] font-mono text-slate-600">Consensus pending</div>
          </div>
        </div>
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {VERDICT_ITEMS.map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="flex items-start gap-2 p-2.5 rounded bg-slate-900/50 border border-slate-800">
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} />
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
                <div className="text-[11px] font-mono text-slate-300 leading-snug">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex gap-3 items-center flex-shrink-0">
        {/* Attach button */}
        <button
          type="button"
          onClick={openPicker}
          disabled={!activeProjectId}
          title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center px-4 py-2 bg-slate-950 border border-slate-700 rounded font-mono text-sm focus-within:border-orange-500/50 transition-colors">
          <span className="text-orange-500 mr-3 select-none">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Broadcast directive to all council members..." : "Daemon offline"}
            disabled={!connected || isStreaming}
            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 outline-none text-sm"
          />
        </div>
        <Button
          onClick={handleBroadcast}
          disabled={!connected || isStreaming || !input.trim()}
          className="bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-40 disabled:shadow-none"
        >
          {isStreaming && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Inject Context
        </Button>
      </div>
    </motion.div>
  );
}
