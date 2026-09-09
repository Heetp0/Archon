import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Server,
  FileText,
  FileCode,
  FileJson,
  Terminal,
  Copy,
  Check,
  RotateCw,
  Download,
  Eye,
  Code2,
  GitCompare,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  Clock,
  HardDrive,
  Cpu
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ContextFilesSection } from "./ContextFilesSection";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useWebSocketStore, PlanStep } from "@/store/websocketStore";
import { getDaemonConnectionDetails } from "@/lib/storage";
import ReactMarkdown from "react-markdown";

export type AgentFileId = "plan_md" | "plan_json" | "solution_py" | "dev_log";

export interface AgentFileMeta {
  id: AgentFileId;
  path: string;
  name: string;
  category: "Plan" | "Codes" | "Logs";
  language: "markdown" | "json" | "python";
  icon: React.ElementType;
  iconColor: string;
  badgeColor: string;
  description: string;
  generator: string;
}

export const AGENT_WORKSPACE_FILES: AgentFileMeta[] = [
  {
    id: "plan_md",
    path: "Plan/current_plan.md",
    name: "current_plan.md",
    category: "Plan",
    language: "markdown",
    icon: FileText,
    iconColor: "text-accent-indigo",
    badgeColor: "bg-accent-indigo/10 text-accent-indigo border-accent-indigo/30",
    description: "Planner node generated task roadmap & acceptance criteria",
    generator: "Planner Node"
  },
  {
    id: "plan_json",
    path: "Plan/current_plan.json",
    name: "current_plan.json",
    category: "Plan",
    language: "json",
    icon: FileJson,
    iconColor: "text-amber-400",
    badgeColor: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    description: "Structured step definitions parsed and verified by supervisor",
    generator: "Planner Node"
  },
  {
    id: "solution_py",
    path: "Codes/solution.py",
    name: "solution.py",
    category: "Codes",
    language: "python",
    icon: FileCode,
    iconColor: "text-accent-emerald",
    badgeColor: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/30",
    description: "Coder node compiled Python implementation code",
    generator: "Coder Node"
  },
  {
    id: "dev_log",
    path: "Logs/dev_log.md",
    name: "dev_log.md",
    category: "Logs",
    language: "markdown",
    icon: Terminal,
    iconColor: "text-accent-rose",
    badgeColor: "bg-accent-rose/10 text-accent-rose border-accent-rose/30",
    description: "Logger node session audit trail and test verifications",
    generator: "Logger Node"
  }
];

interface DiskFilePayload {
  path: string;
  name: string;
  size: number;
  modified_at: string | null;
  exists: boolean;
  content: string;
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export function computeUnifiedDiff(oldText: string, newText: string): DiffLine[] {
  if (!oldText && !newText) return [];
  if (!oldText) {
    return newText.split("\n").map((line, idx) => ({
      type: "added",
      newLineNumber: idx + 1,
      content: line,
    }));
  }
  if (!newText) {
    return oldText.split("\n").map((line, idx) => ({
      type: "removed",
      oldLineNumber: idx + 1,
      content: line,
    }));
  }

  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  if (oldText === newText) {
    return oldLines.map((line, idx) => ({
      type: "unchanged",
      oldLineNumber: idx + 1,
      newLineNumber: idx + 1,
      content: line,
    }));
  }

  const maxLines = 600;
  const oldSlice = oldLines.slice(0, maxLines);
  const newSlice = newLines.slice(0, maxLines);

  const dp: number[][] = Array.from({ length: oldSlice.length + 1 }, () =>
    new Array(newSlice.length + 1).fill(0)
  );

  for (let i = 1; i <= oldSlice.length; i++) {
    for (let j = 1; j <= newSlice.length; j++) {
      if (oldSlice[i - 1] === newSlice[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = oldSlice.length;
  let j = newSlice.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldSlice[i - 1] === newSlice[j - 1]) {
      diff.unshift({
        type: "unchanged",
        oldLineNumber: i,
        newLineNumber: j,
        content: oldSlice[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: "added",
        newLineNumber: j,
        content: newSlice[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({
        type: "removed",
        oldLineNumber: i,
        content: oldSlice[i - 1],
      });
      i--;
    }
  }

  return diff;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return "Live Preview";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoString;
  }
}

// ── Syntax Highlighting Helpers ─────────────────────────────────────────────
function highlightPython(line: string): React.ReactNode {
  const commentIndex = line.indexOf("#");
  let codePart = line;
  let commentPart = "";
  if (commentIndex !== -1) {
    codePart = line.slice(0, commentIndex);
    commentPart = line.slice(commentIndex);
  }

  const regex = /(".*?"|'.*?'|\b(?:def|class|import|from|return|async|await|if|elif|else|try|except|finally|raise|with|as|in|for|while|yield|pass|break|continue|lambda|not|and|or|is)\b|\b(?:True|False|None|self)\b|\b\d+\b|@[a-zA-Z0-9_]+|[a-zA-Z_][a-zA-Z0-9_]*(?=\()|[a-zA-Z_][a-zA-Z0-9_]*|[^\s\w])/g;

  const tokens: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(codePart.slice(lastIndex, match.index));
    }
    const token = match[0];
    const isKeyword = /^(def|class|import|from|return|async|await|if|elif|else|try|except|finally|raise|with|as|in|for|while|yield|pass|break|continue|lambda|not|and|or|is)$/.test(token);
    const isConst = /^(True|False|None|self)$/.test(token);
    const isString = (token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"));
    const isNumber = /^\d+$/.test(token);
    const isDecorator = token.startsWith("@");
    const isFunctionCall = codePart[regex.lastIndex] === "(";

    if (isKeyword) {
      tokens.push(<span key={match.index} className="text-accent-indigo font-semibold">{token}</span>);
    } else if (isConst) {
      tokens.push(<span key={match.index} className="text-cyan-400 font-semibold">{token}</span>);
    } else if (isString) {
      tokens.push(<span key={match.index} className="text-emerald-400">{token}</span>);
    } else if (isNumber) {
      tokens.push(<span key={match.index} className="text-amber-400">{token}</span>);
    } else if (isDecorator) {
      tokens.push(<span key={match.index} className="text-rose-400">{token}</span>);
    } else if (isFunctionCall) {
      tokens.push(<span key={match.index} className="text-blue-400">{token}</span>);
    } else {
      tokens.push(<span key={match.index}>{token}</span>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < codePart.length) {
    tokens.push(codePart.slice(lastIndex));
  }

  return (
    <>
      {tokens}
      {commentPart && <span className="text-text-secondary/60 italic">{commentPart}</span>}
    </>
  );
}

function highlightJson(line: string): React.ReactNode {
  const regex = /("([^"\\]|\\.)*")\s*(:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|([{}[\],])/g;
  const tokens: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    const isKey = match[1] && match[3] === ":";
    const isStringVal = match[1] && !isKey;
    const isLiteral = match[4];
    const isNumber = /^-?\d+(\.\d+)?/.test(token);
    const isPunct = match[5];

    if (isKey) {
      tokens.push(<span key={match.index} className="text-cyan-400 font-semibold">{match[1]}</span>);
      tokens.push(<span key={`${match.index}-c`} className="text-text-secondary">: </span>);
    } else if (isStringVal) {
      tokens.push(<span key={match.index} className="text-emerald-400">{token}</span>);
    } else if (isLiteral) {
      tokens.push(<span key={match.index} className="text-rose-400 font-semibold">{token}</span>);
    } else if (isNumber) {
      tokens.push(<span key={match.index} className="text-amber-400">{token}</span>);
    } else if (isPunct) {
      tokens.push(<span key={match.index} className="text-text-secondary">{token}</span>);
    } else {
      tokens.push(<span key={match.index}>{token}</span>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push(line.slice(lastIndex));
  }

  return <>{tokens}</>;
}

function highlightMarkdownLine(line: string): React.ReactNode {
  if (line.startsWith("# ")) {
    return <span className="text-emerald-400 font-bold text-sm">{line}</span>;
  }
  if (line.startsWith("## ")) {
    return <span className="text-emerald-300 font-semibold">{line}</span>;
  }
  if (line.startsWith("### ")) {
    return <span className="text-cyan-300 font-medium">{line}</span>;
  }
  if (line.startsWith("- [x]") || line.startsWith("* [x]")) {
    return (
      <span>
        <span className="text-accent-emerald font-bold">✔ </span>
        <span className="text-text-secondary line-through">{line.slice(5)}</span>
      </span>
    );
  }
  if (line.startsWith("- [ ]") || line.startsWith("* [ ]")) {
    return (
      <span>
        <span className="text-amber-400 font-bold">◻ </span>
        <span className="text-text-primary">{line.slice(5)}</span>
      </span>
    );
  }
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <span>
        <span className="text-accent-emerald font-bold">• </span>
        <span className="text-text-primary">{line.slice(2)}</span>
      </span>
    );
  }
  if (line.startsWith(">")) {
    return <span className="text-text-secondary italic border-l-2 border-accent-emerald/40 pl-2">{line}</span>;
  }
  return <span className="text-text-primary">{line}</span>;
}

interface AgentFileInspectorPanelProps {
  handleSetPanelView: (view: "context" | "files") => void;
  activeProjectId: string | null;
}

export const AgentFileInspectorPanel = React.memo(function AgentFileInspectorPanel({
  handleSetPanelView,
  activeProjectId
}: AgentFileInspectorPanelProps) {
  const { projects } = useProjectsContext();
  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId), [projects, activeProjectId]);

  // Live WebSocket Store Data
  const planSteps = useWebSocketStore((s) => s.planSteps);
  const dangerousCommand = useWebSocketStore((s) => s.dangerousCommand);
  const sessionMetadata = useWebSocketStore((s) => s.sessionMetadata);
  const terminalLines = useWebSocketStore((s) => s.terminalLines);
  const lastStatus = useWebSocketStore((s) => s.lastStatus);

  // Active File Selection
  const [selectedFileId, setSelectedFileId] = useState<AgentFileId>("plan_md");
  const [viewMode, setViewMode] = useState<"preview" | "code" | "diff">("code");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diskFiles, setDiskFiles] = useState<DiskFilePayload[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showContextFiles, setShowContextFiles] = useState(false);

  // Snapshot memory for diff comparison
  const [fileSnapshots, setFileSnapshots] = useState<Record<AgentFileId, string>>({
    plan_md: "",
    plan_json: "",
    solution_py: "",
    dev_log: ""
  });

  const activeFileDef = useMemo(
    () => AGENT_WORKSPACE_FILES.find((f) => f.id === selectedFileId) || AGENT_WORKSPACE_FILES[0],
    [selectedFileId]
  );

  // ── Fetch Files from Daemon REST Endpoint ──────────────────────────────────
  const fetchAgentFiles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { httpUrl } = getDaemonConnectionDetails();
      const token = localStorage.getItem("archon_token") || "";
      const folder = activeProject?.folderPath;
      const url = new URL(`${httpUrl}/agents/files`);
      if (folder) {
        url.searchParams.set("folder", folder);
      }

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          setDiskFiles(data.files);
        }
      }
    } catch {
      // Daemon offline or endpoint unreachable: gracefully fallback to store preview
    } finally {
      setIsRefreshing(false);
    }
  }, [activeProject?.folderPath]);

  useEffect(() => {
    fetchAgentFiles();
  }, [fetchAgentFiles, activeProjectId, lastStatus]);

  // ── Live Content Synthesis (fallback when disk file is pending/empty) ───────
  const liveContentMap = useMemo(() => {
    // 1. Plan Markdown
    let planMd = "";
    if (planSteps && planSteps.length > 0) {
      planMd = `# Execution Plan\n**Task ID**: ${sessionMetadata?.task_id || "Active Task"}\n**Verdict**: ${sessionMetadata?.verdict || "IN_PROGRESS"}\n\n## Checklist Steps (${planSteps.length})\n\n`;
      planMd += planSteps
        .map(
          (s: PlanStep, idx: number) =>
            `### Step ${s.id ?? idx + 1}: ${s.title}\n${s.status === "completed" ? "- [x]" : "- [ ]"} **Criteria**: ${s.acceptance_criteria || "None specified"}`
        )
        .join("\n\n");
    }

    // 2. Plan JSON
    let planJson = "";
    if (planSteps && planSteps.length > 0) {
      planJson = JSON.stringify(planSteps, null, 2);
    }

    // 3. Solution Python
    const solutionPy = dangerousCommand?.solution_preview || "";

    // 4. Dev Log Markdown
    let devLog = "";
    if (terminalLines && terminalLines.length > 0) {
      devLog = `# Agent Execution Dev Log\n**Task ID**: ${sessionMetadata?.task_id || "Active Task"}\n**Status**: ${sessionMetadata?.status?.toUpperCase() || "RUNNING"}\n**Retries**: ${sessionMetadata?.retries ?? 0}\n\n## Stream Log\n\n`;
      devLog += terminalLines
        .slice(-60)
        .map((l: any) => `- \`${l.timestamp}\` [${(l.kind || "OUT").toUpperCase()}] ${l.text}`)
        .join("\n");
    }

    return {
      plan_md: planMd,
      plan_json: planJson,
      solution_py: solutionPy,
      dev_log: devLog
    };
  }, [planSteps, sessionMetadata, dangerousCommand, terminalLines]);

  // Determine current active content & metadata
  const currentFileInfo = useMemo(() => {
    const disk = diskFiles.find((f) => f.path === activeFileDef.path);
    const hasDiskContent = !!(disk && disk.exists && disk.content.trim().length > 0);
    const liveContent = liveContentMap[activeFileDef.id] || "";

    const content = hasDiskContent ? disk!.content : liveContent;
    const isFromDisk = hasDiskContent;
    const size = hasDiskContent ? disk!.size : new Blob([content]).size;
    const modifiedAt = hasDiskContent ? disk!.modified_at : null;
    const exists = hasDiskContent || content.length > 0;

    return {
      content,
      isFromDisk,
      size,
      modifiedAt,
      exists
    };
  }, [diskFiles, activeFileDef, liveContentMap]);

  // Track file snapshots for diff computation
  useEffect(() => {
    if (currentFileInfo.content) {
      setFileSnapshots((prev) => {
        if (!prev[activeFileDef.id]) {
          return { ...prev, [activeFileDef.id]: currentFileInfo.content };
        }
        return prev;
      });
    }
  }, [currentFileInfo.content, activeFileDef.id]);

  // Reset view mode when switching file types
  const handleSelectFile = (fileId: AgentFileId) => {
    setSelectedFileId(fileId);
    setSearchQuery("");
    const fileDef = AGENT_WORKSPACE_FILES.find((f) => f.id === fileId);
    if (fileDef?.language === "markdown") {
      setViewMode("preview");
    } else {
      setViewMode("code");
    }
  };

  const handleCopyCode = () => {
    if (!currentFileInfo.content) return;
    navigator.clipboard.writeText(currentFileInfo.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentFileInfo.content) return;
    const blob = new Blob([currentFileInfo.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFileDef.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Diff lines
  const diffLines = useMemo(() => {
    if (viewMode !== "diff") return [];
    const previous = fileSnapshots[activeFileDef.id] || "";
    return computeUnifiedDiff(previous, currentFileInfo.content);
  }, [viewMode, fileSnapshots, activeFileDef.id, currentFileInfo.content]);

  // Content lines for code view
  const displayLines = useMemo(() => {
    if (!currentFileInfo.content) return [];
    const allLines = currentFileInfo.content.split("\n");
    if (!searchQuery.trim()) {
      return allLines.map((text, idx) => ({ lineNum: idx + 1, text, matches: false }));
    }
    const q = searchQuery.toLowerCase();
    return allLines.map((text, idx) => ({
      lineNum: idx + 1,
      text,
      matches: text.toLowerCase().includes(q)
    }));
  }, [currentFileInfo.content, searchQuery]);

  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return displayLines.filter((l) => l.matches).length;
  }, [displayLines, searchQuery]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-panel-bg">
      {/* ── Top Panel Header ── */}
      <div className="px-3 py-2 border-b border-border-core/60 flex-shrink-0 flex items-center justify-between bg-panel-bg">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-accent-emerald" />
          <span className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase">
            Workspace Inspector
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30">
            4 FILES
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh Action */}
          <button
            onClick={fetchAgentFiles}
            disabled={isRefreshing}
            title="Refresh Files from Daemon REST Endpoint"
            className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 transition-colors"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-accent-emerald", isRefreshing && "animate-spin")} />
          </button>

          {/* Jump to File Viewer */}
          <button
            onClick={() => handleSetPanelView("files")}
            title="Open in Full File Viewer"
            className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── File Selector Strip (Devin/Cursor Tabs) ── */}
      <div className="grid grid-cols-2 gap-1 p-2 bg-app-bg/60 border-b border-border-core/40 flex-shrink-0">
        {AGENT_WORKSPACE_FILES.map((file) => {
          const isSelected = selectedFileId === file.id;
          const disk = diskFiles.find((f) => f.path === file.path);
          const hasDisk = !!(disk && disk.exists);
          const hasLive = !!liveContentMap[file.id];
          const hasContent = hasDisk || hasLive;
          const Icon = file.icon;

          return (
            <button
              key={file.id}
              onClick={() => handleSelectFile(file.id)}
              className={cn(
                "flex items-center justify-between p-1.5 rounded border text-left font-mono text-xs transition-all",
                isSelected
                  ? "bg-panel-bg border-accent-emerald/60 text-text-primary shadow-sm"
                  : "bg-panel-bg/40 border-border-core/40 text-text-secondary hover:text-text-primary hover:border-border-core"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", file.iconColor)} />
                <span className="truncate text-[11px] font-semibold">{file.name}</span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {hasDisk ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" title="Saved to disk" />
                ) : hasLive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title="Live in memory stream" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-text-secondary/40" title="Awaiting generation" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active File Metadata & Toolbar Bar ── */}
      <div className="px-3 py-2 border-b border-border-core/40 bg-panel-bg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <span className="text-[10px] font-mono font-bold text-accent-emerald truncate">
            {activeFileDef.path}
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded border border-border-core/60 text-text-secondary bg-app-bg flex-shrink-0">
            {formatBytes(currentFileInfo.size)}
          </span>
          <span
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.2 rounded border flex-shrink-0",
              currentFileInfo.isFromDisk
                ? "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/10"
                : currentFileInfo.exists
                ? "text-cyan-400 border-cyan-400/30 bg-cyan-400/10"
                : "text-text-secondary border-border-core/40 bg-app-bg"
            )}
          >
            {currentFileInfo.isFromDisk ? "DISK" : currentFileInfo.exists ? "LIVE" : "EMPTY"}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch((s) => !s)}
            title="Search inside file"
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary transition-colors",
              showSearch && "text-accent-emerald bg-accent-emerald/10"
            )}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            disabled={!currentFileInfo.exists}
            title="Copy file content to clipboard"
            className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            disabled={!currentFileInfo.exists}
            title="Download file"
            className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Optional Search Bar ── */}
      {showSearch && (
        <div className="px-3 py-1.5 border-b border-border-core/40 bg-app-bg flex items-center gap-2 flex-shrink-0">
          <Search className="w-3 h-3 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find in file..."
            autoFocus
            className="flex-1 bg-transparent text-xs font-mono text-text-primary outline-none placeholder:text-text-secondary/50"
          />
          {searchQuery && (
            <span className="text-[10px] font-mono text-accent-emerald">
              {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
          )}
          <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} className="text-text-secondary hover:text-text-primary">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Sub-header: View Mode Tabs (Preview / Code / Diff) + Timestamp ── */}
      <div className="px-3 py-1 bg-app-bg border-b border-border-core/40 flex items-center justify-between text-[10px] font-mono flex-shrink-0">
        <div className="flex items-center gap-1">
          {activeFileDef.language === "markdown" && (
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded transition-colors",
                viewMode === "preview" ? "bg-panel-bg text-accent-emerald font-bold border border-border-core" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Eye className="w-2.5 h-2.5" /> Preview
            </button>
          )}

          <button
            onClick={() => setViewMode("code")}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded transition-colors",
              viewMode === "code" ? "bg-panel-bg text-accent-emerald font-bold border border-border-core" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Code2 className="w-2.5 h-2.5" /> Code
          </button>

          <button
            onClick={() => setViewMode("diff")}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded transition-colors",
              viewMode === "diff" ? "bg-panel-bg text-accent-emerald font-bold border border-border-core" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <GitCompare className="w-2.5 h-2.5" /> Diff
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-text-secondary text-[9px]">
          <Clock className="w-2.5 h-2.5" />
          <span>{formatTimestamp(currentFileInfo.modifiedAt)}</span>
        </div>
      </div>

      {/* ── Main Inspector Content Area ── */}
      <div className="flex-1 overflow-hidden relative bg-app-bg">
        {/* Empty / Not yet generated state */}
        {!currentFileInfo.exists ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3 font-mono">
            <div className="w-10 h-10 rounded-xl bg-panel-bg border border-border-core flex items-center justify-center text-text-secondary">
              <Cpu className="w-5 h-5 text-accent-emerald/60" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
                Awaiting {activeFileDef.generator}
              </h4>
              <p className="text-[11px] text-text-secondary max-w-xs leading-relaxed">
                {activeFileDef.description}.
              </p>
            </div>
            <span className="text-[10px] text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/30 px-2.5 py-1 rounded">
              Run Agent task to synthesize {activeFileDef.name}
            </span>
          </div>
        ) : viewMode === "preview" && activeFileDef.language === "markdown" ? (
          /* Rendered Markdown Mode */
          <ScrollArea className="h-full p-4 font-sans">
            <ReactMarkdown className="prose prose-invert max-w-none text-xs leading-relaxed break-words prose-p:my-2 prose-headings:font-mono prose-headings:text-accent-emerald prose-headings:font-bold prose-headings:my-2 prose-code:font-mono prose-code:text-accent-emerald prose-code:bg-panel-bg prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-panel-bg prose-pre:border prose-pre:border-border-core prose-ul:my-2 prose-li:my-0.5">
              {currentFileInfo.content}
            </ReactMarkdown>
          </ScrollArea>
        ) : viewMode === "diff" ? (
          /* Unified Diff Mode */
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5 font-mono text-[11px]">
              <div className="px-2 py-1 mb-2 rounded bg-panel-bg border border-border-core/60 text-[10px] flex items-center justify-between text-text-secondary">
                <span>Unified Diff View ({activeFileDef.name})</span>
                <span className="text-accent-emerald">
                  {diffLines.filter((l) => l.type === "added").length} additions ·{" "}
                  {diffLines.filter((l) => l.type === "removed").length} deletions
                </span>
              </div>

              {diffLines.map((line, idx) => {
                const isAdded = line.type === "added";
                const isRemoved = line.type === "removed";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex leading-5 hover:bg-panel-bg/60 transition-colors select-text font-mono",
                      isAdded && "bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500",
                      isRemoved && "bg-rose-950/30 text-rose-300 border-l-2 border-rose-500",
                      !isAdded && !isRemoved && "text-text-secondary"
                    )}
                  >
                    <div className="w-7 text-right pr-2 text-[9px] text-text-secondary/40 select-none flex-shrink-0">
                      {line.oldLineNumber ?? ""}
                    </div>
                    <div className="w-7 text-right pr-2 text-[9px] text-text-secondary/40 select-none flex-shrink-0">
                      {line.newLineNumber ?? ""}
                    </div>
                    <div className="w-4 text-center select-none font-bold flex-shrink-0 text-[10px]">
                      {isAdded ? "+" : isRemoved ? "-" : " "}
                    </div>
                    <div className="flex-1 overflow-x-auto whitespace-pre pr-2">
                      {line.content || " "}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          /* Syntax-Highlighted Code Mode with Line Numbers */
          <ScrollArea className="h-full">
            <div className="p-2 font-mono text-xs leading-relaxed select-text">
              {displayLines.map(({ lineNum, text, matches }) => (
                <div
                  key={lineNum}
                  className={cn(
                    "flex hover:bg-panel-bg/60 transition-colors group",
                    matches && "bg-accent-emerald/15"
                  )}
                >
                  <div className="w-8 text-right pr-3 text-[10px] text-text-secondary/40 select-none flex-shrink-0 group-hover:text-text-secondary">
                    {lineNum}
                  </div>
                  <div className="flex-1 overflow-x-auto whitespace-pre pr-2 text-text-primary">
                    {activeFileDef.language === "python"
                      ? highlightPython(text)
                      : activeFileDef.language === "json"
                      ? highlightJson(text)
                      : highlightMarkdownLine(text)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Bottom Section: Collapsible Context Files ── */}
      <div className="border-t border-border-core/60 bg-panel-bg flex-shrink-0">
        <button
          onClick={() => setShowContextFiles((prev) => !prev)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-panel-bg/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-accent-indigo" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary font-semibold">
              Context Attachments
            </span>
          </div>
          {showContextFiles ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>

        {showContextFiles && (
          <div className="px-3 pb-3 border-t border-border-core/30">
            <ContextFilesSection projectId={activeProjectId} />
          </div>
        )}
      </div>
    </div>
  );
});
