import React, { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Bot, User, Loader2, Copy, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function ChatMode() {
  const { messages: chatMessages, isStreaming, sendChat, connected, availableModels, cancelStream } = useWebSocketContext();
  const { activeProjectId, activeChatId, createChat } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [input, setInput] = useState("");
  const [model, setModel] = useState("groq/llama-3.1-8b-instant");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<string>("");

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

  const handleCancel = () => {
    cancelStream();
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    // Auto-create a chat session if none is active so messages are not silently dropped
    if (!activeChatId) {
      createChat(activeProjectId, "chat");
    }
    lastSentRef.current = input.trim();
    sendChat(input.trim(), model);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "ArrowUp" && !input && lastSentRef.current) {
      e.preventDefault();
      setInput(lastSentRef.current);
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
            <div className="flex items-center justify-center h-64 text-text-secondary text-sm font-mono">
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
                  ? "bg-panel-bg border-border-core/60 text-text-primary"
                  : "bg-blue-900/30 border-blue-500/50 text-accent-indigo "
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "assistant" && (
                  <span className="text-[10px] font-mono text-text-secondary mb-1 px-1">{msg.model}</span>
                )}
                {msg.role === "user" ? (
                  <div className="p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap font-sans bg-panel-bg border border-border-core/60 text-text-primary rounded-tr-none relative group">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                        toast.success("Copied to clipboard");
                      }}
                      className="absolute top-2 right-2 p-1 rounded bg-panel-bg/85 border border-border-core/30 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {msg.content}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg text-sm leading-relaxed font-sans bg-blue-950/20 border border-blue-900/50 text-text-primary rounded-tl-none font-light relative group">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                        toast.success("Copied to clipboard");
                      }}
                      className="absolute top-2 right-2 p-1 rounded bg-panel-bg/85 border border-border-core/30 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <ReactMarkdown className="prose prose-invert max-w-none text-sm break-words prose-p:first:mt-0 prose-p:last:mb-0 prose-p:leading-relaxed prose-pre:my-2 prose-ul:my-2 prose-li:my-0">
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border bg-blue-900/30 border-blue-500/50 text-accent-indigo ">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 px-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#020817] via-[#020817] to-transparent pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel border border-border-core rounded-xl p-2 focus-within:border-blue-500/50 focus-within:transition-all">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? "Command the OS..." : "Waiting for daemon connection..."}
              disabled={!connected || isStreaming}
              className="min-h-[60px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-text-primary placeholder:text-text-secondary font-sans"
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-core/50">
              <div className="flex items-center gap-2">
                {/* Real native file attach */}
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={!activeProjectId}
                  title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
                  className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono text-text-secondary select-none">{input.length}</span>

                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-[200px] h-8 bg-panel-bg/50 border-border-core text-xs font-mono text-text-secondary">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-panel-bg border-border-core">
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
              {isStreaming ? (
                <Button
                  size="sm"
                  onClick={handleCancel}
                  className="bg-accent-rose hover:bg-accent-rose text-text-primary"
                >
                  <X className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!connected || !input.trim()}
                  className="bg-accent-indigo hover:bg-accent-indigo text-text-primary disabled:opacity-40 "
                >
                  <Send className="w-4 h-4 mr-2" />
                  Execute
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
