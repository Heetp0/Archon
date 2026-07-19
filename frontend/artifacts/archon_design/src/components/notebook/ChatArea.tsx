import React, { useRef, useEffect } from "react";
import { useNotebookContext } from "@/context/NotebookContext";
import ChatMessage from "./ChatMessage";
import SlashCommandInput from "./SlashCommandInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { BookOpen, FolderOpen } from "@phosphor-icons/react";
import type { Citation, NotebookChatMessage, SlashCommand } from "@/types/notebook";
import { cn } from "@/lib/utils";

export default function ChatArea() {
  const {
    currentNotebookId,
    chatHistory,
    isChatLoading,
    sendChat,
    setSelectedCitation,
    setSourceDrawerOpen,
    isStudioOpen,
    setStudioOpen,
  } = useNotebookContext();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever chat history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  // Regenerate: resend the user message that preceded this AI response
  const handleRegenerate = (aiMsg: NotebookChatMessage) => {
    const aiIndex = chatHistory.findIndex((m) => m.id === aiMsg.id);
    const userMsg = chatHistory.slice(0, aiIndex).reverse().find((m) => m.role === "user");
    if (userMsg) {
      sendChat(userMsg.content, userMsg.command);
    }
  };

  if (!currentNotebookId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-app-bg text-text-secondary">
        <BookOpen className="w-8 h-8 mb-3 text-text-muted" />
        <span className="text-xs font-mono">Select or create a notebook to begin</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg overflow-hidden relative border-r border-border-core/40">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-core/40 flex-shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
          {chatHistory.length === 0 ? "Start a conversation" : `${chatHistory.filter(m => m.role === "user").length} queries`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSourceDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border-core/60 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:bg-panel-bg hover:border-border-core transition-all"
            title="Open sources drawer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Sources
          </button>
          <button
            onClick={() => setStudioOpen(!isStudioOpen)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-all",
              isStudioOpen
                ? "bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald hover:bg-accent-emerald/20"
                : "border-border-core/60 text-text-secondary hover:text-text-primary hover:bg-panel-bg hover:border-border-core"
            )}
            title="Toggle Studio Panel"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isStudioOpen ? "Hide Studio" : "Show Studio"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {chatHistory.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onCitationClick={handleCitationClick}
              onRegenerate={msg.role === "assistant" ? handleRegenerate : undefined}
            />
          ))}

          {/* Typing indicator */}
          {isChatLoading && (
            <div className="flex w-full mb-3.5 justify-start">
              <div className="bg-panel-bg border border-border-core/60 px-3.5 py-2.5 rounded-xl rounded-tl-none flex items-center gap-2">
                <Spinner className="w-3.5 h-3.5 text-accent-emerald" />
                <span className="text-[10px] font-mono text-text-secondary">Synthesizing response...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Query input */}
      <div className="px-4 py-3 bg-app-bg flex-shrink-0 border-t border-border-core/40">
        <SlashCommandInput onSend={sendChat} disabled={isChatLoading} />
      </div>
    </div>
  );
}
