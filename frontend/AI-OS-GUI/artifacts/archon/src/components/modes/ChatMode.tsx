import React, { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Bot, User, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";

export default function ChatMode() {
  const { messages: chatMessages, isStreaming, sendChat, connected, availableModels } = useWebSocketContext();
  const { activeProjectId } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [input, setInput] = useState("");
  const [model, setModel] = useState("groq/llama-3.1-8b-instant");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.closest("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [chatMessages, isStreaming]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendChat(input.trim(), model);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#030712] relative"
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

      <ScrollArea className="flex-1 p-4 md:p-8">
        <div ref={scrollRef} className="max-w-4xl mx-auto space-y-6 pb-32">
          {chatMessages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-64 text-slate-600 text-sm font-mono">
              No messages yet. Start a conversation below.
            </div>
          )}
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border ${
                msg.role === "user"
                  ? "bg-slate-800 border-slate-700 text-slate-300"
                  : "bg-blue-900/30 border-blue-500/50 text-blue-400 glow-chat"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "assistant" && (
                  <span className="text-[10px] font-mono text-slate-500 mb-1 px-1">{msg.model}</span>
                )}
                <div className={`p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                  msg.role === "user"
                    ? "bg-slate-800 border border-slate-700 text-slate-200 rounded-tr-none"
                    : "bg-blue-950/20 border border-blue-900/50 text-slate-300 rounded-tl-none font-light"
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border bg-blue-900/30 border-blue-500/50 text-blue-400 glow-chat">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 px-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#020817] via-[#020817] to-transparent pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel border border-slate-800 rounded-xl p-2 focus-within:border-blue-500/50 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? "Command the OS..." : "Waiting for daemon connection..."}
              disabled={!connected || isStreaming}
              className="min-h-[60px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-slate-200 placeholder:text-slate-600 font-sans"
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
              <div className="flex items-center gap-2">
                {/* Real native file attach */}
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={!activeProjectId}
                  title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-[200px] h-8 bg-slate-900/50 border-slate-800 text-xs font-mono text-slate-400">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {availableModels && availableModels.length > 0 ? (
                      availableModels.map((m: any) => (
                        <SelectItem key={m.model_id} value={m.model_id}>{m.label}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="groq/llama-3.1-8b-instant">Default Llama</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!connected || isStreaming || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                <Send className="w-4 h-4 mr-2" />
                Execute
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
