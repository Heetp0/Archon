import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Copy, X, Edit, RotateCcw, Volume2, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "../CodeBlock";
import { toast } from "sonner";
import ChatInput from "../chat/ChatInput";

function SkeletonMessage() {
  return (
    <div className="flex gap-4 animate-pulse py-4">
      <div className="flex-shrink-0 w-8 h-8 rounded bg-[#222222]" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-[#222222] rounded w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-[#222222] rounded w-3/4" />
          <div className="h-4 bg-[#222222] rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function ChatMode() {
  const { messages: chatMessages, isStreaming, sendChat, connected, availableModels, cancelStream } = useWebSocketContext();
  const { activeProjectId, activeChatId, createChat } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [input, setInput] = useState("");
  const [model, setModel] = useState("groq/llama-3.1-8b-instant");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<string>("");

  const handleScroll = useCallback((e: Event) => {
    const target = e.currentTarget as HTMLElement;
    if (!target) return;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
    setShowScrollButton(!isAtBottom);
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current?.closest("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll);
      return () => {
        viewport.removeEventListener("scroll", handleScroll);
      };
    }
    return;
  }, [handleScroll]);

  const scrollToBottom = useCallback(() => {
    const viewport = scrollRef.current?.closest("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current?.closest("[data-radix-scroll-area-viewport]");
    if (viewport) {
      const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200;
      if (isNearBottom) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [chatMessages, isStreaming]);

  const handleCancel = useCallback(() => {
    cancelStream();
  }, [cancelStream]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    if (!activeChatId) {
      createChat(activeProjectId, "chat");
    }
    lastSentRef.current = input.trim();
    sendChat(input.trim(), model);
    setInput("");
  }, [input, isStreaming, activeChatId, activeProjectId, createChat, sendChat, model]);

  const handleRegenerate = useCallback((msgId: string) => {
    const idx = chatMessages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    for (let i = idx - 1; i >= 0; i--) {
      if (chatMessages[i].role === "user") {
        sendChat(chatMessages[i].content, model);
        break;
      }
    }
  }, [chatMessages, sendChat, model]);

  const handleReadAloud = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Speech synthesis not supported in this browser");
    }
  }, []);

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
                  ? "bg-panel-bg border-border-core text-text-primary"
                  : "bg-panel-bg border-border-core text-text-primary"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "assistant" && (
                  <span className="text-[10px] font-mono text-text-secondary mb-1 px-1">{msg.model}</span>
                )}
                {msg.role === "user" ? (
                  <div className="p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap font-sans bg-panel-bg border border-border-core text-text-primary rounded-tr-none relative group">
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          toast.success("Copied to clipboard");
                        }}
                        className="p-1 rounded bg-[#0a0a0a] border border-[#222222] text-[#a0a0a0] hover:text-white"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setInput(msg.content)}
                        className="p-1 rounded bg-[#0a0a0a] border border-[#222222] text-[#a0a0a0] hover:text-white"
                        title="Edit message"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                    {msg.content}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg text-sm leading-relaxed font-sans bg-[#0a0a0a] border border-border-core text-text-primary rounded-tl-none font-normal relative group">
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          toast.success("Copied to clipboard");
                        }}
                        className="p-1 rounded bg-[#0a0a0a] border border-[#222222] text-[#a0a0a0] hover:text-white"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRegenerate(msg.id)}
                        className="p-1 rounded bg-[#0a0a0a] border border-[#222222] text-[#a0a0a0] hover:text-white"
                        title="Regenerate message"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleReadAloud(msg.content)}
                        className="p-1 rounded bg-[#0a0a0a] border border-[#222222] text-[#a0a0a0] hover:text-white"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ReactMarkdown
                      className="prose prose-invert max-w-none text-sm break-words prose-p:first:mt-0 prose-p:last:mb-0 prose-p:leading-relaxed prose-pre:my-2 prose-ul:my-2 prose-li:my-0"
                      components={{
                        pre({ children }) {
                          return <div className="my-2">{children}</div>;
                        },
                        code({ className, children, ...props }: any) {
                          const match = /language-(w+)/.exec(className || "");
                          const isBlock = className || String(children).includes("\n");
                          if (isBlock) {
                            return (
                              <CodeBlock
                                code={String(children).replace(/\n$/, "")}
                                language={match ? match[1] : "text"}
                                isStreaming={isStreaming && msg.id === chatMessages[chatMessages.length - 1]?.id}
                              />
                            );
                          }
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isStreaming && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "user" && (
            <SkeletonMessage />
          )}
        </div>
      </ScrollArea>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#0a0a0a] border border-[#222222] text-white rounded-full shadow-lg hover:bg-[#111111] transition-colors"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          Jump to latest
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent pt-12">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isStreaming={isStreaming}
            onStop={handleCancel}
            mode="chat"
            placeholder={connected ? "Command the OS..." : "Waiting for daemon connection..."}
            disabled={!connected}
            model={model}
            setModel={setModel}
            onAttachClick={openPicker}
          />
        </div>
      </div>
    </motion.div>
  );
}
