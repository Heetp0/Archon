import React, { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Gavel, CheckCircle2, XCircle, Loader2, MinusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import ReactMarkdown from "react-markdown";
import ChatInput from "../chat/ChatInput";

const ROLES = ["Skeptic", "Optimist", "Domain Expert", "Synthesizer"];
const COLORS = ["text-[#a0a0a0]", "text-[#ffffff]", "text-[#a0a0a0]", "text-[#ffffff]"];
const BORDERS = ["border-[#222222]", "border-[#222222]", "border-[#222222]", "border-[#222222]"];
const BGS = ["bg-[#0a0a0a]", "bg-[#0a0a0a]", "bg-[#0a0a0a]", "bg-[#0a0a0a]"];
const HEADERS = ["bg-[#111111]", "bg-[#111111]", "bg-[#111111]", "bg-[#111111]"];
const GLOWS = ["", "", "", ""];
const DOTS = ["bg-[#666666]", "bg-white", "bg-[#666666]", "bg-white"];

const VERDICT_ITEMS = [
  { icon: CheckCircle2, color: "text-white", label: "Architecture", value: "Modular Monolith (Phase 1 -> extract services at 6mo)" },
  { icon: CheckCircle2, color: "text-white", label: "Database",     value: "PostgreSQL 16 + JSONB + read replica at scale" },
  { icon: MinusCircle,  color: "text-[#666666]",  label: "Deployment",   value: "PaaS initially; Kubernetes migration deferred" },
  { icon: XCircle,      color: "text-[#666666]",      label: "Rejected",     value: "Greenfield microservices due to insufficient team maturity" },
];

const FALLBACK_MODELS = [
  { model_id: "groq/llama-3.3-70b-versatile",        label: "Groq Llama 3.3 70B" },
  { model_id: "gemini/gemini-2.5-flash",              label: "Gemini 2.5 Flash" },
  { model_id: "openrouter/deepseek/deepseek-r1:free", label: "OpenRouter DeepSeek R1" },
  { model_id: "openai/llama3.3-70b",               label: "Cerebras Llama 3.3 70B" },
];

export default function CouncilMode() {
  const { councilMessages, isStreaming, sendCouncil, connected, availableModels, cancelStream } = useWebSocketContext();
  const { activeProjectId } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [input, setInput] = useState("");
  const [model, setModel] = useState("groq/llama-3.1-8b-instant");
  const [stoppedModels, setStoppedModels] = useState<string[]>([]);

  const modelSource = (availableModels && availableModels.length > 0) ? availableModels : FALLBACK_MODELS;
  const activeModels = modelSource.slice(0, 4).map((m: any, i: number) => ({
    key: m.model_id,
    name: (m.label || m.model_id).split(" ").pop() || m.label || m.model_id,
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
      if (stoppedModels.includes(m.key)) return;
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

  const handleBroadcast = () => {
    if (!input.trim() || isStreaming) return;
    setStoppedModels([]);
    sendCouncil(input.trim(), activeModels.map((m: any) => m.key));
    setInput("");
  };

  const getMessages = (modelKey: string) => {
    if (stoppedModels.includes(modelKey)) return [];
    return councilMessages[modelKey] || [];
  };

  const handleGlobalStop = useCallback(() => {
    cancelStream();
  }, [cancelStream]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full bg-app-bg relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.md,.py,.js,.ts,.json,.csv"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-border-core flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded border font-mono text-xs flex items-center gap-2 bg-[#0a0a0a] border-border-core">
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-white animate-pulse" : "bg-[#222222]"}`} />
            {isStreaming ? "DEBATE ACTIVE" : "AWAITING DEBATE"}
          </div>
          <div className="flex gap-1">
            {activeModels.map((m: any) => (
              <span key={m.key} className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#222222] bg-[#0a0a0a] text-white">
                {m.role}
              </span>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="border-border-core text-text-secondary hover:text-text-primary bg-[#0a0a0a] text-xs">
          <Download className="w-3.5 h-3.5 mr-2" />
          Export
        </Button>
      </div>

      {/* Debate area - 2x2 grid */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 p-4 bg-app-bg min-h-0 overflow-y-auto">
        {activeModels.map((col: any) => {
          const msgs = getMessages(col.key);
          const isModelStreaming = isStreaming && !stoppedModels.includes(col.key);
          return (
            <div key={col.key} className="flex flex-col bg-[#0a0a0a] border border-[#222222] rounded-lg overflow-hidden transition-all duration-200 hover:border-[#444444]">
              <div className="px-4 py-2.5 bg-[#111111] border-b border-[#222222] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dot} ${isModelStreaming ? "animate-pulse" : ""}`} />
                  <span className="font-mono font-bold text-sm text-white">{col.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">{col.role}</span>
                  {isStreaming && !stoppedModels.includes(col.key) ? (
                    <button
                      onClick={() => setStoppedModels(prev => [...prev, col.key])}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-red-950 bg-red-950/20 text-red-400 hover:bg-red-900/40 transition-colors"
                    >
                      Stop
                    </button>
                  ) : stoppedModels.includes(col.key) ? (
                    <span className="text-[10px] text-[#666666] font-mono uppercase">Stopped</span>
                  ) : null}
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {msgs.length === 0 && !isModelStreaming && (
                    <div className="text-xs font-mono text-text-secondary text-center py-8">
                      {stoppedModels.includes(col.key) ? "Model stream stopped." : "No response yet."}
                    </div>
                  )}
                  {msgs.map((msg, j) => (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: j * 0.08 }}
                      key={msg.id}
                      className="p-4 rounded border border-[#222222] bg-[#111111]/40 text-xs text-text-primary leading-relaxed shadow-sm"
                    >
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#a0a0a0] mb-1.5">
                        Round {j + 1}
                      </div>
                      {msg.content}
                    </motion.div>
                  ))}
                  {isModelStreaming && (
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
      <div className="mx-4 mb-4 p-5 flex-shrink-0 bg-[#0a0a0a] rounded-lg border border-[#222222] shadow-2xl transition-all duration-200 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-[#222222] pb-3">
          <Gavel className="w-4 h-4 text-white" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-white">Council Verdict</span>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-[10px] font-mono text-text-secondary">
              {consensusText
                ? (isStreaming ? "Synthesizing consensus..." : "Consensus synthesized")
                : "Consensus pending"}
            </div>
          </div>
        </div>
        {consensusText ? (
          <ScrollArea className="h-32 pr-2">
            <div className="prose prose-invert max-w-none text-xs font-mono text-text-primary leading-relaxed">
              <ReactMarkdown>{consensusText}</ReactMarkdown>
            </div>
          </ScrollArea>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {VERDICT_ITEMS.map(({ icon: Icon, color, label, value }) => (
              <div key={label} className="flex items-start gap-2 p-3 rounded bg-[#111111] border border-[#222222]">
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

      {/* Broadcast bar with new ChatInput */}
      <div className="px-4 py-3 bg-[#0a0a0a] border-t border-border-core flex-shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleBroadcast}
          isStreaming={isStreaming}
          onStop={handleGlobalStop}
          mode="council"
          placeholder={connected ? "Broadcast directive to all council members..." : "Daemon offline"}
          disabled={!connected}
          model={model}
          setModel={setModel}
          onAttachClick={openPicker}
        />
      </div>
    </motion.div>
  );
}
