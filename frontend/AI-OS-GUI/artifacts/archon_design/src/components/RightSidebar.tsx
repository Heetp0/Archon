import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import {
  Activity, ShieldAlert, Zap, Server,
  BarChart, FileText, Link as LinkIcon, Wifi, WifiOff,
  Loader2, Search, Send, FileCode, Database, FileJson,
  X, Plus, Image, FileType, File, FileClock, ChevronDown,
  PanelLeft, PanelRightClose, LayoutList
} from "lucide-react";
// Phosphor icons for header controls
import { CaretRight, List, FileText as PhFileText } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContextFile } from "@/context/ProjectsContext";

// ── Context Files compact list ─────────────────────────────────────────────────
const KIND_ICON: Record<ContextFile["kind"], React.ElementType> = {
  image: Image, pdf: FileType, text: FileText, other: File,
};

function ContextFilesSection({ projectId }: { projectId: string | null }) {
  const { projects, removeContextFile } = useProjectsContext();
  const project = projects.find((p) => p.id === projectId);
  const files = project?.contextFiles ?? [];

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Context Files</h4>
      {files.length === 0 ? (
        <div className="text-xs text-text-secondary font-mono italic">
          {projectId ? "No files attached" : "No active project"}
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((f) => {
            const Icon = KIND_ICON[f.kind];
            return (
              <div
                key={f.id}
                className="flex items-center gap-2 text-xs font-mono text-text-secondary bg-panel-bg/50 p-2 rounded border border-border-core group"
              >
                <Icon className="w-3 h-3 text-text-secondary flex-shrink-0" />
                <span className="flex-1 truncate min-w-0">{f.name}</span>
                <button
                  onClick={() => projectId && removeContextFile(projectId, f.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent-rose transition-all flex-shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── File Tab definitions for universal file viewer ──────────────────────────────
interface FileTabDef {
  id: string;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  content: React.ReactNode;
}

const ALL_FILE_TABS: FileTabDef[] = [
  {
    id: "analysis",
    name: "analysis.py",
    icon: FileCode,
    iconColor: "text-accent-indigo",
    content: (
      <div className="p-4 font-mono text-xs text-text-secondary text-center py-8">
        No file selected. Agent-generated files appear here when a project is active.
      </div>
    ),
  },
  {
    id: "schema",
    name: "schema.sql",
    icon: Database,
    iconColor: "text-accent-indigo",
    content: (
      <div className="p-4 font-mono text-xs text-text-secondary text-center py-8">
        No schema generated yet.
      </div>
    ),
  },
  {
    id: "config",
    name: "config.json",
    icon: FileJson,
    iconColor: "text-accent-rose",
    content: (
      <div className="p-4 font-mono text-xs leading-relaxed text-text-primary">
        {([
          ["1", <span className="text-text-secondary">{"{"}</span>],
          ["2", <><span className="pl-4 text-accent-indigo">"model"</span><span className="text-text-secondary">: </span><span className="text-accent-emerald">"groq/llama-3.1-8b-instant"</span><span className="text-text-secondary">,</span></>],
          ["3", <><span className="pl-4 text-accent-indigo">"temperature"</span><span className="text-text-secondary">: </span><span className="text-accent-rose">0.7</span><span className="text-text-secondary">,</span></>],
          ["4", <><span className="pl-4 text-accent-indigo">"daemon_port"</span><span className="text-text-secondary">: </span><span className="text-accent-rose">{localStorage.getItem("archon_daemon_port") || "8765"}</span></>],
          ["5", <span className="text-text-secondary">{"}"}</span>],
        ] as [string, React.ReactNode][]).map(([num, content]) => (
          <div key={num} className="flex hover:bg-panel-bg/30">
            <div className="w-7 text-text-secondary select-none text-right pr-3 flex-shrink-0">{num}</div>
            <div className="flex-1">{content}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "readme",
    name: "README.md",
    icon: FileText,
    iconColor: "text-text-primary",
    content: (
      <div className="p-4 font-mono text-xs text-text-secondary text-center py-8">
        No README generated yet.
      </div>
    ),
  },
  {
    id: "mail-digest",
    name: "Mail Digest",
    icon: FileClock,
    iconColor: "text-accent-emerald",
    content: (
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Gmail Summary</div>
        <div className="text-xs font-mono text-text-secondary">Connect daemon to fetch mail digests.</div>
      </div>
    ),
  },
  {
    id: "research-report",
    name: "Research Report",
    icon: Search,
    iconColor: "text-accent-indigo",
    content: (
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Latest Report</div>
        <div className="text-xs font-mono text-text-secondary">Run a research query to generate a report here.</div>
      </div>
    ),
  },
  {
    id: "impl-plan",
    name: "Impl Plan",
    icon: FileText,
    iconColor: "text-accent-indigo",
    content: (
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Implementation Plan</div>
        <div className="text-xs font-mono text-text-secondary">Generated plans from Agent Runtime appear here.</div>
      </div>
    ),
  },
];

// ── Council panel ──────────────────────────────────────────────────────────────
function CouncilPanel({ activeProjectId, telemetry }: { activeProjectId: string | null; telemetry: { tokens: number; cost: number; latency: number }; }) {
  const [gpt4oTemp, setGpt4oTemp] = useState(70);
  const [claudeTemp, setClaudeTemp] = useState(40);
  const [geminiTemp, setGeminiTemp] = useState(55);

  return (
    <>
      <div className="p-4 border-b border-border-core/60 flex-shrink-0">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-2">
          <BarChart className="w-3.5 h-3.5 text-accent-rose" />
          Consensus Tracker
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Model Parameters</h4>
            <div className="space-y-4">
              {[
                { label: "GPT-4o", color: "text-accent-indigo", val: gpt4oTemp, set: setGpt4oTemp, sliderClass: "[&_[role=slider]]:bg-accent-indigo" },
                { label: "Claude 3.5", color: "text-accent-rose", val: claudeTemp, set: setClaudeTemp, sliderClass: "[&_[role=slider]]:bg-accent-rose" },
                { label: "Gemini 1.5", color: "text-accent-indigo", val: geminiTemp, set: setGeminiTemp, sliderClass: "[&_[role=slider]]:bg-accent-indigo" },
              ].map(({ label, color, val, set, sliderClass }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={color}>{label}</span>
                    <span className="text-accent-rose">{(val / 100).toFixed(2)}</span>
                  </div>
                  <Slider value={[val]} onValueChange={([v]) => set(v)} max={100} step={1} className={sliderClass} />
                </div>
              ))}
            </div>
          </div>
          <ContextFilesSection projectId={activeProjectId} />
        </div>
      </ScrollArea>
    </>
  );
}

// ── Universal File Viewer ────────────────────────────────────────────────────
function FileViewerPanel() {
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem("archon_active_tab") || "config"; } catch { return "config"; }
  });
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem("archon_open_tabs");
      return stored ? JSON.parse(stored) : ["config", "readme"];
    } catch {
      return ["config", "readme"];
    }
  });

  const handleSetActiveTab = (tabId: string) => {
    setActiveTab(tabId);
    try { sessionStorage.setItem("archon_active_tab", tabId); } catch {}
  };

  const handleSetOpenTabs = (tabs: string[]) => {
    setOpenTabs(tabs);
    try { sessionStorage.setItem("archon_open_tabs", JSON.stringify(tabs)); } catch {}
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openTabs.filter((t) => t !== id);
    handleSetOpenTabs(next);
    if (activeTab === id) {
      const newActive = next[next.length - 1] ?? "";
      handleSetActiveTab(newActive);
    }
  };

  const openTab = (id: string) => {
    if (!openTabs.includes(id)) {
      handleSetOpenTabs([...openTabs, id]);
    }
    handleSetActiveTab(id);
  };

  const activeTabData = ALL_FILE_TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex flex-col h-full bg-panel-bg/95">
      {/* Tab strip + new tab */}
      <div className="flex items-center border-b border-border-core/60 bg-panel-bg flex-shrink-0">
        <div className="flex-1 flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {openTabs.map((tabId) => {
            const tab = ALL_FILE_TABS.find((t) => t.id === tabId);
            if (!tab) return null;
            const active = activeTab === tabId;
            return (
              <div
                key={tabId}
                onClick={() => handleSetActiveTab(tabId)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-border-core/60 flex-shrink-0 group transition-colors",
                  active ? "bg-panel-bg border-b-2 border-b-cyan-500" : "text-text-secondary hover:text-text-secondary hover:bg-panel-bg/40"
                )}
              >
                <tab.icon className={cn("w-3 h-3 flex-shrink-0", active ? tab.iconColor : "text-text-secondary")} />
                <span className={cn("text-[10px] font-mono", active ? "text-text-primary" : "text-text-secondary")}>{tab.name}</span>
                <button
                  onClick={(e) => closeTab(tabId, e)}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
        {/* New tab dropdown */}
        <div className="relative group flex-shrink-0">
          <button className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors border-l border-border-core/60">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="absolute right-0 top-8 z-30 hidden group-hover:block w-48 bg-panel-bg border border-border-core rounded overflow-hidden">
            {ALL_FILE_TABS.filter((f) => !openTabs.includes(f.id)).map((f) => (
              <button
                key={f.id}
                onClick={() => openTab(f.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-text-secondary hover:bg-panel-bg hover:text-text-primary transition-colors"
              >
                <f.icon className={cn("w-3 h-3 flex-shrink-0", f.iconColor)} />
                {f.name}
              </button>
            ))}
            {ALL_FILE_TABS.length === openTabs.length && (
              <div className="px-3 py-2 text-xs font-mono text-text-secondary italic">All tabs open</div>
            )}
          </div>
        </div>
      </div>

      {/* File content */}
      <div className="flex-1 overflow-hidden bg-panel-bg relative">
        <div className="absolute top-2 right-2 z-10 text-[9px] font-mono text-text-secondary bg-panel-bg px-1">READ-ONLY</div>
        {openTabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary font-mono text-xs gap-3">
            <FileText className="w-6 h-6 text-text-secondary/70" />
            <span>No files open</span>
            <span className="text-text-secondary/70">Use the + button above to open a file</span>
          </div>
        ) : activeTabData ? (
          <ScrollArea className="h-full">{activeTabData.content}</ScrollArea>
        ) : null}
      </div>
    </div>
  );
}

// ── Main right sidebar ─────────────────────────────────────────────────────────
export default function RightSidebar() {
  const { mode, rightSidebarOpen, setRightSidebarOpen } = useAppContext();
  const { activeProjectId } = useProjectsContext();
  const {
    connected, connecting, telemetry, citations, researchText, isStreaming, sendResearch, clearChat,
  } = useWebSocketContext();

  const [researchQuery, setResearchQuery] = useState("");
  const [panelView, setPanelView] = useState<"context" | "files">(() => {
    try {
      return (sessionStorage.getItem("archon_right_panel_view") as "context" | "files") || "context";
    } catch {
      return "context";
    }
  });

  const [activeFileTab, setActiveFileTab] = useState<string>(() => {
    try {
      return sessionStorage.getItem("archon_active_file_tab") || "analysis";
    } catch {
      return "analysis";
    }
  });

  const handleSetPanelView = (view: "context" | "files") => {
    setPanelView(view);
    try { sessionStorage.setItem("archon_right_panel_view", view); } catch {}
  };

  const handleSetActiveFileTab = (tab: string) => {
    setActiveFileTab(tab);
    try { sessionStorage.setItem("archon_active_file_tab", tab); } catch {}
  };

  const handleResearchSend = () => {
    if (!researchQuery.trim() || isStreaming) return;
    sendResearch(researchQuery.trim());
    setResearchQuery("");
  };

  return (
    <div className="flex flex-col h-full bg-panel-bg/95">
      {/* Connection status bar + panel switcher */}
      <div className="px-3 py-2 border-b border-border-core/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-3 h-3 text-accent-emerald" />
          ) : connecting ? (
            <Loader2 className="w-3 h-3 text-accent-rose animate-spin" />
          ) : (
            <WifiOff className="w-3 h-3 text-accent-rose" />
          )}
          <span className={cn("text-[10px] font-mono uppercase tracking-widest", {
            "text-accent-emerald":  connected,
            "text-accent-rose": !connected,
          })}>
            {connected ? "Online" : connecting ? "Connecting..." : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Panel switcher */}
          <button
            onClick={() => handleSetPanelView("context")}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-mono transition-colors",
              panelView === "context" ? "bg-accent-indigo/10 text-accent-indigo" : "text-text-secondary hover:text-text-secondary"
            )}
            title="Context Panel"
          >
            <List className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleSetPanelView("files")}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-mono transition-colors",
              panelView === "files" ? "bg-accent-indigo/10 text-accent-indigo" : "text-text-secondary hover:text-text-secondary"
            )}
            title="File Viewer"
          >
            <PhFileText className="w-3 h-3" />
          </button>
          {/* Collapse sidebar */}
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
            title="Collapse sidebar"
          >
            <CaretRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel switcher label */}
      <div className="px-3 py-1.5 border-b border-border-core/60 flex-shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
          {panelView === "context" ? "Mode Context" : "File Viewer"}
        </span>
      </div>

      {/* ── Context Panels ── */}
      {panelView === "context" && (
        <>
          {/* Chat Inspector */}
          {mode === "chat" && (
            <>
              <div className="p-4 border-b border-border-core/60 flex-shrink-0">
                <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-accent-indigo" />
                  Telemetry
                </h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Session Metrics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-panel-bg/80 border border-border-core rounded p-3">
                        <div className="text-[10px] text-text-secondary font-mono mb-1">TOKENS</div>
                        <div className="text-lg font-mono text-accent-indigo">
                          {telemetry.tokens > 0 ? `${(telemetry.tokens / 1000).toFixed(1)}k` : "—"}
                        </div>
                      </div>
                      <div className="bg-panel-bg/80 border border-border-core rounded p-3">
                        <div className="text-[10px] text-text-secondary font-mono mb-1">EST. COST</div>
                        <div className="text-lg font-mono text-accent-emerald">
                          {telemetry.cost > 0 ? `$${telemetry.cost.toFixed(4)}` : "—"}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to clear this session? All conversation and telemetry history will be lost.")) {
                          clearChat();
                        }
                      }}
                      className="w-full text-xs font-mono border-border-core hover:bg-panel-bg/60 text-text-secondary hover:text-text-primary"
                    >
                      Clear Session
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Model Engine</h4>
                    <div className="bg-panel-bg/80 border border-border-core rounded p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-text-secondary">Latency</span>
                        <span className="text-accent-emerald">{telemetry.latency > 0 ? `${telemetry.latency}ms` : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <ContextFilesSection projectId={activeProjectId} />
                </div>
              </ScrollArea>
            </>
          )}

          {/* Council Consensus */}
          {mode === "council" && (
            <CouncilPanel activeProjectId={activeProjectId} telemetry={telemetry} />
          )}

          {/* Research Output */}
          {mode === "research" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-border-core/60 flex-shrink-0">
                <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-accent-indigo" />
                  Research Output
                </h3>
              </div>
              <div className="p-3 border-b border-border-core/60 bg-panel-bg/20 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResearchSend()}
                    placeholder={connected ? "Research vector..." : "Daemon offline"}
                    disabled={!connected || isStreaming}
                    data-testid="input-research-query-sidebar"
                    className="flex-1 bg-app-bg border border-border-core rounded px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-indigo/50 disabled:opacity-40"
                  />
                  <Button
                    size="sm"
                    onClick={handleResearchSend}
                    disabled={!connected || isStreaming || !researchQuery.trim()}
                    className="bg-accent-indigo hover:bg-accent-indigo/90 text-text-on-accent px-3 py-1 h-auto disabled:opacity-40"
                  >
                    {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono flex items-center gap-2">
                      <Zap className="w-3 h-3 text-accent-indigo" />
                      Live Stream
                      {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-pulse" />}
                    </h4>
                    <div className="bg-panel-bg/50 border border-border-core rounded p-3 max-h-40 overflow-y-auto relative">
                      <pre className="text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                        {researchText || "Awaiting research directive..."}
                      </pre>
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Citation Vault</h4>
                    <div className="space-y-2">
                      {citations.length > 0 ? (
                        citations.map((c) => (
                          <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer"
                            className="block bg-panel-bg/80 border border-border-core hover:border-purple-500/50 rounded p-2 transition-colors">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-accent-indigo mb-1">
                              <LinkIcon className="w-3 h-3" /> [{c.id}]
                            </div>
                            <div className="text-xs text-text-primary line-clamp-1">{c.title}</div>
                          </a>
                        ))
                      ) : (
                        <div className="text-xs font-mono text-text-secondary italic text-center py-2">
                          No citations yet.
                        </div>
                      )}
                    </div>
                  </div>
                  <ContextFilesSection projectId={activeProjectId} />
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Agent File Inspector */}
          {mode === "agents" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-border-core/60 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-accent-emerald" />
                  <span className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase">File Inspector</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute right-0 top-6 z-30 hidden group-hover:block w-36 bg-panel-bg border border-border-core rounded overflow-hidden">
                    {ALL_FILE_TABS.filter((f) => f.id !== "analysis" && f.id !== "schema" && f.id !== "config" && f.id !== "readme").map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleSetPanelView("files")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-text-secondary hover:bg-panel-bg hover:text-text-primary transition-colors"
                      >
                        <f.icon className={cn("w-3 h-3 flex-shrink-0", f.iconColor)} />
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="text-xs font-mono text-text-secondary text-center py-8">
                  Switch to "File Viewer" panel to inspect agent-generated files.
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border-core/60 flex-shrink-0">
                <ContextFilesSection projectId={activeProjectId} />
              </div>
            </div>
          )}

          {/* Fallback for modes without specific context panel */}
          {!["chat", "council", "research", "agents"].includes(mode) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <LayoutList className="w-6 h-6 text-text-secondary/70" />
              <span className="text-xs font-mono text-text-secondary">
                No mode-specific context for {mode}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                Switch to File Viewer to browse files
              </span>
            </div>
          )}
        </>
      )}

      {/* ── File Viewer Panel ── */}
      {panelView === "files" && <FileViewerPanel />}
    </div>
  );
}
