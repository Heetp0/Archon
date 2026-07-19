import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Gavel, CheckCircle2, XCircle, MinusCircle, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import ReactMarkdown from "react-markdown";

const ROLES = ["Proposer", "Critic", "Domain Expert", "Synthesizer"];
const COLORS = ["text-accent-indigo", "text-accent-rose", "text-accent-indigo", "text-accent-emerald"];
const BORDERS = ["border-blue-500/30", "border-orange-500/30", "border-purple-500/30", "border-emerald-500/30"];
const BGS = ["bg-blue-950/10", "bg-orange-950/10", "bg-purple-950/10", "bg-emerald-950/10"];
const HEADERS = ["bg-blue-900/30", "bg-orange-900/30", "bg-purple-900/30", "bg-emerald-900/30"];
const GLOWS = ["", "", "", ""];
const DOTS = ["bg-accent-indigo", "bg-accent-rose", "bg-accent-indigo", "bg-accent-emerald"];

const VERDICT_ITEMS = [
  { icon: CheckCircle2, color: "text-accent-emerald", label: "Architecture", value: "Modular Monolith (Phase 1 → extract services at 6mo)" },
  { icon: CheckCircle2, color: "text-accent-emerald", label: "Database",     value: "PostgreSQL 16 + JSONB + read replica at scale" },
  { icon: MinusCircle,  color: "text-accent-rose",  label: "Deployment",   value: "PaaS initially; Kubernetes migration deferred" },
  { icon: XCircle,      color: "text-accent-rose",      label: "Rejected",     value: "Greenfield microservices — insufficient team maturity" },
];

const FALLBACK_MODELS = [
  { model_id: "groq/llama-3.3-70b-versatile",        label: "Groq · Llama 3.3 70B" },
  { model_id: "gemini/gemini-2.5-flash",              label: "Gemini · 2.5 Flash" },
  { model_id: "openrouter/deepseek/deepseek-r1:free", label: "OpenRouter · DeepSeek R1" },
  { model_id: "openai/llama3.3-70b",               label: "Cerebras · Llama 3.3 70B" },
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


  const consensusText = councilMessages["Council Consensus"]?.[0]?.content || "";

  const handleExport = () => {
    let markdown = `# AI Council Debate Transcript\n\n`;
    
    // Find original directive from any model's messages
    let originalDirective = "";
    for (const modelKey of Object.keys(councilMessages)) {
      const msgs = councilMessages[modelKey];
      const userMsg = msgs.find(m => m.role === "user");
      if (userMsg) {
        originalDirective = userMsg.content;
        break;
      }
    }
    
    if (originalDirective) {
      markdown += `## Original Directive\n> ${originalDirective}\n\n`;
    }
    
    activeModels.forEach((m: any) => {
      const msgs = councilMessages[m.key] || [];
      const assistantMsgs = msgs.filter(msg => msg.role === "assistant");
      if (assistantMsgs.length > 0) {
        markdown += `## Council Member: ${m.name} (${m.role})\n\n`;
        assistantMsgs.forEach((msg, idx) => {
          markdown += `### Round ${idx + 1}\n${msg.content}\n\n`;
        });
        markdown += `---\n\n`;
      }
    });
    
    if (consensusText) {
      markdown += `## Council Consensus Verdict\n\n${consensusText}\n\n`;
    }
    
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `council-debate-${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="flex justify-between items-center px-4 py-3 border-b border-border-core/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded border font-mono text-xs flex items-center gap-2 ${
            isStreaming
              ? "bg-accent-rose/10 border-orange-500/30 text-accent-rose"
              : "bg-panel-bg border-border-core/60 text-text-secondary"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-accent-rose animate-pulse" : "bg-panel-bg"}`} />
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
        <Button variant="outline" size="sm" onClick={handleExport} className="border-border-core/60 text-text-secondary hover:text-text-primary bg-panel-bg/50 text-xs">
          <Download className="w-3.5 h-3.5 mr-2" />
          Export
        </Button>
      </div>

      {/* Debate area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {activeModels.map((col: any) => {
          const msgs = getMessages(col.key);
          return (
            <div key={col.key} className={`flex-1 flex flex-col border-r border-border-core/50 last:border-r-0 ${col.bg} ${col.glow}`}>
              <div className={`px-4 py-2.5 ${col.header} border-b ${col.border} flex items-center justify-between flex-shrink-0`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dot} ${isStreaming ? "animate-pulse" : ""}`} />
                  <span className={`font-mono font-bold text-sm ${col.color}`}>{col.name}</span>
                </div>
                <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">{col.role}</span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {msgs.length === 0 && !isStreaming && (
                    <div className="text-xs font-mono text-text-secondary text-center py-8">
                      No response yet. Broadcast a directive below.
                    </div>
                  )}
                  {msgs.map((msg, j) => (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: j * 0.08 }}
                      key={msg.id}
                      className={`p-3 rounded border ${col.border} bg-[#020611]/60 text-xs text-text-primary leading-relaxed`}
                    >
                      <div className={`text-[9px] font-mono uppercase tracking-widest ${col.color} mb-1.5`}>
                        Round {j + 1}
                      </div>
                      {msg.content}
                    </motion.div>
                  ))}
                  {isStreaming && (
                    <div className="flex items-center gap-2 text-xs font-mono text-text-secondary p-2">
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
          <Gavel className="w-4 h-4 text-accent-rose" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent-rose">Council Verdict</span>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-[10px] font-mono text-text-secondary">
              {consensusText
                ? (isStreaming ? "Synthesizing consensus..." : "Consensus synthesized")
                : "Consensus pending"}
            </div>
          </div>
        </div>
        {consensusText ? (
          <ScrollArea className="h-32 px-4 py-3">
            <div className="prose prose-invert max-w-none text-xs font-mono text-text-primary leading-relaxed">
              <ReactMarkdown>{consensusText}</ReactMarkdown>
            </div>
          </ScrollArea>
        ) : (
          <div className="px-4 py-3 grid grid-cols-4 gap-3">
            {VERDICT_ITEMS.map(({ icon: Icon, color, label, value }) => (
              <div key={label} className="flex items-start gap-2 p-2.5 rounded bg-panel-bg/50 border border-border-core">
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-0.5">{label}</div>
                  <div className="text-[11px] font-mono text-text-primary leading-snug">{value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-t border-border-core flex gap-3 items-center flex-shrink-0">
        {/* Attach button */}
        <button
          type="button"
          onClick={openPicker}
          disabled={!activeProjectId}
          title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
          className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center px-4 py-2 bg-slate-950 border border-border-core/60 rounded font-mono text-sm focus-within:border-orange-500/50 transition-colors">
          <span className="text-accent-rose mr-3 select-none">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Broadcast directive to all council members..." : "Daemon offline"}
            disabled={!connected || isStreaming}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary outline-none text-sm"
          />
        </div>
        <Button
          onClick={handleBroadcast}
          disabled={!connected || isStreaming || !input.trim()}
          className="bg-orange-600 hover:bg-accent-rose text-text-primary disabled:opacity-40 "
        >
          {isStreaming && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Inject Context
        </Button>
      </div>
    </motion.div>
  );
}
