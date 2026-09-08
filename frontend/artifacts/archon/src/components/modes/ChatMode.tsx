import React, { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Bot, User, Loader2, Copy, X, Globe, Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebSocketStore, Message as ChatMessage } from "@/store/websocketStore";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export interface ModelMeta {
  model_id: string;
  label: string;
}

const CopyButton = React.memo(function CopyButton({ content }: { content: string }) {
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(content); toast.success("Copied to clipboard"); }}
      className="absolute top-2 right-2 p-1 rounded bg-panel-bg/85 border border-border-core/30 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity z-10"
      title="Copy to clipboard"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
});

const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-4 motion-safe:animate-in ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border ${
        msg.role === "user"
          ? "bg-panel-bg border-border-core/60 text-text-primary"
          : "bg-blue-900/30 border-blue-500/50 text-accent-indigo "
      }`}>
        {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
        {msg.role === "assistant" && msg.model && (
          <span className="text-[10px] font-mono text-text-secondary mb-1 px-1">{msg.model}</span>
        )}
        {msg.role === "user" ? (
          <div className="p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap font-sans bg-panel-bg border border-border-core/60 text-text-primary rounded-tr-none relative group">
            <CopyButton content={msg.content} />
            {msg.content}
          </div>
        ) : (
          <div className="p-4 rounded-lg text-sm leading-relaxed font-sans bg-blue-950/20 border border-blue-900/50 text-text-primary rounded-tl-none font-light relative group">
            <CopyButton content={msg.content} />
            <ReactMarkdown className="prose prose-invert max-w-none text-sm break-words prose-p:first:mt-0 prose-p:last:mb-0 prose-p:leading-relaxed prose-pre:my-2 prose-ul:my-2 prose-li:my-0">
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const StatusPill = () => {
  const lastStatus = useWebSocketStore(s => s.lastStatus);
  const isStreaming = useWebSocketStore(s => s.isStreaming);
  if (!isStreaming || !lastStatus) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono text-text-secondary"
    >
      <span className="w-1 h-1 rounded-full bg-accent-indigo animate-pulse" />
      {lastStatus}
    </motion.div>
  );
};

export default function ChatMode() {
  const { sendChat, connected, cancelStream } = useWebSocketContext();
  const isStreaming = useWebSocketStore(s => s.isStreaming);
  const availableModels = useWebSocketStore(s => s.availableModels);
  const messagesMap = useWebSocketStore(s => s.messagesMap);
  const { activeProjectId, activeChatId, createChat, projects, removeContextFile } = useProjectsContext();
  const chatMessages = activeChatId ? messagesMap[activeChatId] || [] : [];
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeFiles = activeProject?.contextFiles || [];

  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(() => availableModels?.[0]?.model_id ?? "groq/llama-3.1-8b-instant");
  const [webSearch, setWebSearch] = useState(false);
  const [useVault, setUseVault] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (availableModels?.length && !availableModels.find((m: ModelMeta) => m.model_id === model)) {
      setModel(availableModels[0].model_id);
    }
  }, [availableModels, model]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, isStreaming]);

  const handleCancel = () => {
    cancelStream();
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    
    if (!activeChatId) {
      createChat(activeProjectId, "chat");
      // Give store a tick to update before sending (optimistic send uses latest context)
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    lastSentRef.current = input.trim();
    sendChat(input.trim(), model, { web_search: webSearch, use_vault: useVault });
    setInput("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) { 
      el.style.height = "auto"; 
      el.style.height = `${el.scrollHeight}px`; 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "ArrowUp" && !input && lastSentRef.current) {
      e.preventDefault();
      setInput(lastSentRef.current);
      setTimeout(handleInput, 0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
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

      <ScrollArea className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6 pb-32">
          {chatMessages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-10 h-10 rounded-xl border border-border-core flex items-center justify-center">
                <Bot className="w-5 h-5 text-text-secondary" />
              </div>
              <p className="text-sm font-mono text-text-secondary">The Core is ready.</p>
              <p className="text-xs font-mono text-text-secondary/50">Ask anything. Attach files. Switch models.</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
          {isStreaming && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border bg-blue-900/30 border-blue-500/50 text-accent-indigo ">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 px-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo motion-safe:animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo motion-safe:animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo motion-safe:animate-bounce" />
                </div>
              </div>
              <div className="pl-12">
                <StatusPill />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-app-bg via-app-bg to-transparent pt-12">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel border border-border-core rounded-xl p-2 focus-within:border-blue-500/50 focus-within:transition-all">
            {activeFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {activeFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 px-2 py-1 bg-panel-bg border border-border-core rounded-md text-xs font-mono text-text-secondary">
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[150px] truncate">{f.name}</span>
                    <button onClick={() => activeProjectId && removeContextFile(activeProjectId, f.id)} className="hover:text-accent-rose ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={connected ? "Command the OS..." : "Waiting for daemon connection..."}
              disabled={!connected || isStreaming}
              className="min-h-[60px] max-h-[200px] overflow-y-auto bg-transparent border-0 focus-visible:ring-0 resize-none text-text-primary placeholder:text-text-secondary font-sans"
            />
            <p className="text-[10px] font-mono text-text-secondary/50 mt-1 ml-1 mb-2">
              Enter to send · Shift+Enter for newline · ↑ to recall
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-core/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={!activeProjectId}
                  title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
                  className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setWebSearch(!webSearch)}
                  title="Enable web search"
                  className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${webSearch ? 'text-accent-indigo bg-accent-indigo/10' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <Globe className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  onClick={() => setUseVault(!useVault)}
                  title="Use vault context"
                  className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${useVault ? 'text-accent-indigo bg-accent-indigo/10' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <Database className="w-4 h-4" />
                </button>

                <span className={`text-xs font-mono select-none ${
                  input.length > 3000 ? "text-accent-rose" : "text-text-secondary"
                }`}>
                  {input.length}
                </span>

                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-[200px] h-8 bg-panel-bg/50 border-border-core text-xs font-mono text-text-secondary">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-panel-bg border-border-core">
                    {availableModels && availableModels.length > 0 ? (
                      availableModels.map((m: ModelMeta) => (
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
