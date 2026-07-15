import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { NotebookChatMessage, Citation } from "@/types/notebook";
import CitationHoverCard from "./CitationHoverCard";
import { cn } from "@/lib/utils";
import { Copy, ArrowsClockwise, Check, Notebook } from "@phosphor-icons/react";
import { useNotebookContext } from "@/context/NotebookContext";

interface ChatMessageProps {
  message: NotebookChatMessage;
  onCitationClick: (citation: Citation) => void;
  onRegenerate?: (message: NotebookChatMessage) => void;
}

export default function ChatMessage({ message, onCitationClick, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const { createNote } = useNotebookContext();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCitations = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const citationIdx = parseInt(match[1], 10) - 1;
      const citation = message.citations?.[citationIdx];
      if (citation) {
        parts.push(
          <CitationHoverCard
            key={`cite-${match.index}`}
            citation={citation}
            onClick={() => onCitationClick(citation)}
          >
            [{match[1]}]
          </CitationHoverCard>
        );
      } else {
        parts.push(match[0]);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderMessageContent = () => {
    if (isUser) {
      return <p className="text-xs font-medium leading-relaxed">{message.content}</p>;
    }

    return (
      <div className="text-xs leading-relaxed space-y-2 select-text font-sans">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => {
              if (typeof children === "string") {
                return <p className="mb-2 last:mb-0">{formatCitations(children)}</p>;
              }
              return <p className="mb-2 last:mb-0">{children}</p>;
            },
            pre: ({ children }) => (
              <pre className="p-3 bg-app-bg rounded-lg border border-border-core overflow-x-auto text-[11px] font-mono text-text-primary mb-2">
                {children}
              </pre>
            ),
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 bg-app-bg rounded border border-border-core text-[10px] font-mono text-accent-emerald">
                {children}
              </code>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={cn("flex w-full mb-3.5 group", isUser ? "justify-end" : "justify-start")}>
      <div className="relative max-w-[75%]">
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-xl border transition-all",
            isUser
              ? "bg-border-core/40 border-border-core text-text-primary rounded-tr-none"
              : "bg-panel-bg border-border-core/60 text-text-primary rounded-tl-none"
          )}
        >
          {renderMessageContent()}
        </div>

        {/* Action buttons - appear on hover */}
        <div
          className={cn(
            "absolute top-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "right-full mr-2" : "left-full ml-2"
          )}
        >
          {/* Copy button */}
          <button
            onClick={handleCopy}
            title="Copy message"
            className="w-6 h-6 flex items-center justify-center rounded-md bg-panel-bg border border-border-core text-text-secondary hover:text-text-primary hover:bg-border-core transition-all"
          >
            {copied
              ? <Check className="w-3 h-3 text-accent-emerald" />
              : <Copy className="w-3 h-3" />
            }
          </button>

          {/* Save as note button - only on AI messages */}
          {!isUser && (
            <button
              onClick={() => createNote(message.content, "Saved Chat Note")}
              title="Save as note"
              className="w-6 h-6 flex items-center justify-center rounded-md bg-panel-bg border border-border-core text-text-secondary hover:text-text-primary hover:bg-border-core transition-all"
            >
              <Notebook className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Regenerate button - only on AI messages */}
          {!isUser && onRegenerate && (
            <button
              onClick={() => onRegenerate(message)}
              title="Regenerate response"
              className="w-6 h-6 flex items-center justify-center rounded-md bg-panel-bg border border-border-core text-text-secondary hover:text-text-primary hover:bg-border-core transition-all"
            >
              <ArrowsClockwise className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
