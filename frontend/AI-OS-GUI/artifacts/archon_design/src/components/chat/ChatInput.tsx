import React, { useRef, useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { 
  Paperclip, 
  Send, 
  X, 
  Sparkles, 
  FileText, 
  FileType, 
  File, 
  Image, 
  Globe, 
  Code, 
  Search, 
  Terminal 
} from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  onStop: () => void;
  mode: "chat" | "council" | "research" | "agents" | "notebook";
  placeholder?: string;
  disabled?: boolean;
  model: string;
  setModel: (model: string) => void;
  onAttachClick?: () => void;
}

const KIND_ICON: Record<string, React.ElementType> = {
  image: Image,
  pdf: FileType,
  text: FileText,
  other: File,
};

interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

const AVAILABLE_TOOLS: ToolItem[] = [
  { id: "web_search", name: "Web Search", description: "Search the internet for current info", icon: Globe },
  { id: "file_search", name: "File Search", description: "Search files in project workspace", icon: Search },
  { id: "code_review", name: "Code Review", description: "Audit and analyze source code", icon: Code },
  { id: "terminal", name: "Terminal Execute", description: "Execute safe shell commands", icon: Terminal },
];

export default function ChatInput({
  value,
  onChange,
  onSend,
  isStreaming,
  onStop,
  mode,
  placeholder = "Command the OS...",
  disabled = false,
  model,
  setModel,
  onAttachClick,
}: ChatInputProps) {
  const { availableModels } = useWebSocketContext();
  const { activeProjectId, projects, removeContextFile } = useProjectsContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>(["file_search"]);

  // Find files for active project
  const project = projects.find((p) => p.id === activeProjectId);
  const files = project?.contextFiles ?? [];

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`archon_draft_${mode}`);
    if (savedDraft && !value) {
      onChange(savedDraft);
    }
  }, [mode]);

  // Save draft on change
  const handleTextChange = (val: string) => {
    onChange(val);
    localStorage.setItem(`archon_draft_${mode}`, val);
  };

  // Clear draft on send
  const handleSendClick = () => {
    localStorage.removeItem(`archon_draft_${mode}`);
    onSend();
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isStreaming && !disabled) {
        handleSendClick();
      }
    }
  };

  const toggleTool = (toolId: string) => {
    setActiveTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  return (
    <div className="relative w-full">
      {/* Tools Popover Overlay */}
      {isToolsOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-80 p-3 bg-[#0a0a0a] border border-[#222222] rounded-lg shadow-xl animate-fade-in-gpu">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222222]">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Explore Tools</span>
            <button 
              onClick={() => setIsToolsOpen(false)} 
              className="text-[#666666] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {AVAILABLE_TOOLS.map((tool) => {
              const ToolIcon = tool.icon;
              const isActive = activeTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  type="button"
                  className={`flex items-start gap-3 p-2 rounded text-left transition-colors ${
                    isActive ? "bg-[#1f1f1f] text-white" : "hover:bg-[#111111] text-[#a0a0a0]"
                  }`}
                >
                  <ToolIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? "text-white" : "text-[#666666]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium font-sans">{tool.name}</div>
                    <div className="text-[10px] text-[#666666] truncate">{tool.description}</div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white self-center flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Attachment Previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto p-1">
          {files.map((file) => {
            const Icon = KIND_ICON[file.kind] || File;
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 text-xs font-mono text-[#a0a0a0] bg-[#0a0a0a] px-2 py-1 rounded border border-[#222222] group max-w-[200px]"
              >
                <Icon className="w-3 h-3 text-[#666666] flex-shrink-0" />
                <span className="flex-1 truncate min-w-0">{file.name}</span>
                <button
                  type="button"
                  onClick={() => activeProjectId && removeContextFile(activeProjectId, file.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-white transition-opacity flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input container styled like a premium Vercel panel */}
      <div className="vercel-panel rounded-lg p-2 focus-within:border-white/40 transition-colors">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[50px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-white placeholder:text-[#666666] font-sans p-2 text-sm leading-relaxed"
        />

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#222222]">
          <div className="flex items-center gap-2">
            {/* Paperclip attach button */}
            {onAttachClick && (
              <button
                type="button"
                onClick={onAttachClick}
                disabled={!activeProjectId || disabled}
                title={activeProjectId ? "Attach files" : "Select a project first"}
                className="w-8 h-8 flex items-center justify-center text-[#666666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}

            {/* Explore Tools toggle button */}
            <button
              type="button"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              disabled={disabled}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isToolsOpen || activeTools.length > 1 ? "text-white" : "text-[#666666] hover:text-white"
              }`}
              title="Explore Tools"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Model selector dropdown */}
            <Select value={model} onValueChange={setModel} disabled={disabled}>
              <SelectTrigger className="w-[180px] h-8 bg-transparent border-[#222222] text-xs font-mono text-[#a0a0a0] focus:ring-0">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-[#222222]">
                {availableModels && availableModels.length > 0 ? (
                  availableModels.map((m: any) => (
                    <SelectItem key={m.model_id} value={m.model_id} className="text-xs font-mono text-[#a0a0a0] focus:bg-[#111111] focus:text-white">
                      {m.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="groq/llama-3.1-8b-instant" className="text-xs font-mono text-[#a0a0a0]">
                    groq/llama-3.1-8b-instant
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {value.length > 0 && (
              <span className="text-[10px] font-mono text-[#666666] select-none">{value.length} chars</span>
            )}
          </div>

          {/* Send or Stop button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="w-8 h-8 flex items-center justify-center rounded bg-[#222222] hover:bg-[#333333] transition-colors border border-[#444444]"
              title="Stop Generation"
            >
              <div className="w-3 h-3 bg-white rounded-sm" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendClick}
              disabled={disabled || !value.trim()}
              className="w-8 h-8 flex items-center justify-center rounded bg-white text-black hover:bg-neutral-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
