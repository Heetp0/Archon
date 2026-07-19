# Shared Layout Components

## App.tsx
- **Path**: `src/App.tsx`
- **Description**: Root Application component
```tsx
import React, { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { WebSocketProvider, useWebSocketContext } from "@/context/WebSocketContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import LoadingScreen from "@/components/LoadingScreen";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";


interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback flex flex-col items-center justify-center h-screen bg-[#020617] text-text-primary p-6 font-mono">
          <h2 className="text-sm font-bold text-accent-rose mb-2">Something went wrong</h2>
          <p className="text-xs text-text-secondary mb-4 max-w-md text-center">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-text-primary transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


const queryClient = new QueryClient();

// Module-level flag survives HMR remounts of child components
let APP_BOOTED_ONCE = false;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function BootDismissHandler({ onDismiss }: { onDismiss: () => void }) {
  const { connected } = useWebSocketContext();
  useEffect(() => {
    if (connected) {
      onDismiss();
    }
  }, [connected, onDismiss]);
  return null;
}

function App() {
  const [booted, setBooted] = useState(() =>
    APP_BOOTED_ONCE || new URLSearchParams(window.location.search).has("noboot")
  );

  const handleBootDone = () => {
    APP_BOOTED_ONCE = true;
    setBooted(true);
  };

  return (
    <>
      {!booted && <LoadingScreen onDismiss={handleBootDone} />}
      {booted && <button data-testid="button-enter-interface" style={{ display: 'none' }} />}
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <WebSocketProvider>
            {!booted && <BootDismissHandler onDismiss={handleBootDone} />}
            <ProjectsProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <ErrorBoundary>
                    <Router />
                  </ErrorBoundary>
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </ProjectsProvider>
          </WebSocketProvider>
        </AppProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
```

## Home.tsx
- **Path**: `src/pages/Home.tsx`
- **Description**: Main Layout Shell and Workspace Wrapper
```tsx
import React, { useState, useCallback, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import type { AppMode } from "@/context/AppContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { CaretRight, CaretLeft } from "@phosphor-icons/react";
import NavRail from "@/components/NavRail";
import ContextSidebar from "@/components/ContextSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMode from "@/components/modes/ChatMode";
import CouncilMode from "@/components/modes/CouncilMode";
import ResearchMode from "@/components/modes/ResearchMode";
import AgentMode from "@/components/modes/AgentMode";
import DashboardMode from "@/components/modes/DashboardMode";
import ObsidianMode from "@/components/modes/ObsidianMode";
import AgentsDirectoryMode from "@/components/modes/AgentsDirectoryMode";
import NotebookMode from "@/components/modes/NotebookMode";
import SettingsModal from "@/components/SettingsModal";

// Modes that can show the left context sidebar (user toggles)
const LEFT_CAPABLE_MODES = new Set<AppMode>(["chat", "council", "research", "agents", "obsidian", "directory"]);

const MODE_LABELS: Record<AppMode, string> = {
  dashboard: "Dashboard",
  chat: "Chat",
  council: "Council",
  research: "Research",
  agents: "Agent Runtime",
  obsidian: "Obsidian",
  directory: "Agents",
  notebook: "Notebook Mode",
};


export default function Home() {
  const { mode, settingsOpen, setSettingsOpen, contextSidebarOpen, setContextSidebarOpen, rightSidebarOpen, setRightSidebarOpen } = useAppContext();
  const { activeProjectId, projects } = useProjectsContext();
  const { connected, connecting, isStreaming } = useWebSocketContext();
  // Right sidebar width — draggable
  const [rightWidth, setRightWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Listen to mouse events globally when resizing is active
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Dynamically update document.title based on streaming state
  useEffect(() => {
    if (isStreaming) {
      document.title = "[Streaming...] Archon";
    } else {
      document.title = "Archon";
    }
  }, [isStreaming]);

  const canShowLeft = LEFT_CAPABLE_MODES.has(mode);
  const showLeft = canShowLeft && contextSidebarOpen;

  return (
    <div
      className="relative flex h-screen w-full bg-app-bg text-text-primary font-sans overflow-hidden select-none"
      
      
      
      style={{ cursor: isResizing ? "ew-resize" : "default" }}
    >
      {/* Nav Rail */}
      <NavRail />

      {/* Left context sidebar */}
      {showLeft && (
        <div className="w-56 flex-shrink-0 border-r border-border-core/60 overflow-hidden animate-in slide-in-from-left duration-200">
          <ContextSidebar />
        </div>
      )}

      {/* Center column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top bar: sidebar open buttons + breadcrumb/title */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-border-core/60 flex-shrink-0 bg-app-bg">
          <div className="flex items-center gap-2">
            {/* Open left sidebar button (when hidden) */}
            {canShowLeft && !showLeft && (
              <button
                onClick={() => setContextSidebarOpen(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
                title="Open left sidebar"
              >
                <CaretRight className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Mode title */}
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary ml-1">
              {(() => {
                const baseTitle = MODE_LABELS[mode] ?? "";
                
                const activeProject = projects.find(p => p.id === activeProjectId);
                if (activeProject && activeProject.mode === mode) {
                  return `${baseTitle} - [${activeProject.name}]`;
                }
                return baseTitle;
              })()}
            </span>
          </div>
          {/* Open right sidebar button (when hidden) — hidden in notebook mode which has its own Source Drawer */}
          {!rightSidebarOpen && mode !== "notebook" && (
            <button
              onClick={() => setRightSidebarOpen(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
              title="Open right sidebar"
            >
              <CaretLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {mode === "dashboard" && <DashboardMode />}
          {mode === "chat"      && <ChatMode />}
          {mode === "council"   && <CouncilMode />}
          {mode === "research"  && <ResearchMode />}
          {mode === "agents"    && <AgentMode />}
          {mode === "obsidian"  && <ObsidianMode />}
          {mode === "directory" && <AgentsDirectoryMode />}
          {mode === "notebook"  && <NotebookMode />}
        </div>
      </div>

      {/* Right sidebar — universal, toggleable, resizable — hidden in notebook mode */}
      {rightSidebarOpen && mode !== "notebook" && (
        <div
          className="flex-shrink-0 border-l border-border-core/60 overflow-hidden relative animate-in slide-in-from-right duration-200"
          style={{ width: `${rightWidth}px` }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-accent-indigo/30 transition-colors"
            title="Drag to resize"
          />
          <RightSidebar />
        </div>
      )}

      <SettingsModal />
    </div>
  );
}

```

## NavRail.tsx
- **Path**: `src/components/NavRail.tsx`
- **Description**: Global Left Navigation Rail
```tsx
import React from "react";
import { useAppContext, AppMode } from "@/context/AppContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import {
  House,
  ChatCircle,
  Users,
  MagnifyingGlass,
  Cpu,
  Book,
  Robot,
  Gear,
  Notebook
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  id: AppMode;
  icon: React.ElementType;
  label: string;
}[] = [
  {
    id: "dashboard",
    icon: House,
    label: "Dashboard",
  },
  {
    id: "chat",
    icon: ChatCircle,
    label: "Chat",
  },
  {
    id: "council",
    icon: Users,
    label: "Council",
  },
  {
    id: "research",
    icon: MagnifyingGlass,
    label: "Research",
  },
  {
    id: "agents",
    icon: Cpu,
    label: "Agent Runtime",
  },
  {
    id: "obsidian",
    icon: Book,
    label: "Obsidian",
  },
  {
    id: "directory",
    icon: Robot,
    label: "Agents",
  },
  {
    id: "notebook",
    icon: Notebook,
    label: "Notebook Mode",
  },
];

export default function NavRail() {
  const { mode, setMode, setSettingsOpen } = useAppContext();
  const { connected } = useWebSocketContext();

  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === mode);

  return (
    <div className="flex flex-col items-center h-full w-14 bg-app-bg border-r border-border-core py-3 z-20 flex-shrink-0">
      {/* Logo mark */}
      <button
        onClick={() => setMode("dashboard")}
        className="mb-5 flex items-center justify-center w-9 h-9 rounded-xl border border-border-core bg-panel-bg hover:bg-panel-bg/80 transition-all overflow-hidden"
        title="Archon"
      >
        <img src="/archon-logo.png" alt="Archon" className="w-7 h-7 object-contain" />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-text-primary/5 mb-3" />

      {/* Mode buttons */}
      <nav className="relative flex flex-col items-center gap-0.5 flex-1 w-10">
        {/* Sliding active indicator */}
        {activeIndex !== -1 && (
          <div 
            className="absolute right-[-4px] w-[2px] bg-white transition-all duration-400 ease-in-out rounded-full z-20"
            style={{
              top: `${activeIndex * 42 + 8}px`, // 40px button + 2px gap, centered for 24px height
              height: "24px",
            }}
          />
        )}
        
        {NAV_ITEMS.map(({ id, icon: Icon, label }, index) => {
          const active = mode === id;
          const distance = activeIndex !== -1 ? Math.abs(activeIndex - index) : 10;
          const spotlightOpacity = active ? 1 : Math.max(0, 1 - distance * 0.6);
          
          return (
            <div key={id} className="relative group">
              <button
                onClick={() => setMode(id)}
                data-testid={`nav-${id}`}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 relative overflow-hidden",
                  active
                    ? "text-text-primary border-border-core bg-panel-bg"
                    : "text-text-secondary border-transparent hover:text-text-primary hover:bg-panel-bg/40 hover:border-border-core/25"
                )}
              >
                {/* Spotlight hover glow */}
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 blur-md rounded-full pointer-events-none transition-opacity duration-400"
                  style={{
                    opacity: spotlightOpacity,
                    transitionDelay: active ? "0.1s" : "0s",
                  }}
                />
                
                <Icon className="w-4 h-4 relative z-10" weight={active ? "fill" : "regular"} />
              </button>

              {/* Tooltip */}
              <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-panel-bg border border-border-core/30 text-[10px] font-mono text-text-primary whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: connection dot + settings */}
      <div className="flex flex-col items-center gap-2">
        {/* Connection indicator */}
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            connected ? "bg-accent-emerald" : "bg-accent-rose/60"
          )}
          title={connected ? "Daemon connected" : "Daemon offline"}
        />

        {/* Settings */}
        <div className="relative group">
          <button
            onClick={() => setSettingsOpen(true)}
            data-testid="nav-settings"
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/40 hover:border-border-core/25 transition-all duration-200"
          >
            <Gear className="w-4 h-4" />
          </button>
          <div className="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-lg bg-panel-bg border border-border-core/30 text-[10px] font-mono text-text-primary whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            Settings
          </div>
        </div>
      </div>
    </div>
  );
}

```

## RightSidebar.tsx
- **Path**: `src/components/RightSidebar.tsx`
- **Description**: Workspace Right Information Panel
```tsx
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
                    className="bg-accent-indigo hover:bg-accent-indigo text-text-primary px-3 py-1 h-auto disabled:opacity-40"
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

```

## ContextSidebar.tsx
- **Path**: `src/components/ContextSidebar.tsx`
- **Description**: Active context and documents browser
```tsx
import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { CaretLeft, Clock, FolderOpen } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ProjectHistoryPanel from "@/components/ProjectHistoryPanel";

export default function ContextSidebar() {
  const { mode, setContextSidebarOpen } = useAppContext();
  const [tab, setTab] = useState<"vault" | "history">("history");

  return (
    <div className="flex flex-col h-full bg-panel-bg/95 border-r border-border-core/60 w-56 flex-shrink-0">
      {/* Header with collapse button */}
      <div className="px-3 py-2.5 border-b border-border-core/60 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary">
          {tab === "vault" ? "Local Brain" : "Sessions"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab((t) => (t === "vault" ? "history" : "vault"))}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all",
              "border-border-core text-text-secondary hover:text-text-primary hover:border-border-core/80"
            )}
            title={tab === "vault" ? "Switch to Sessions" : "Switch to Vault"}
          >
            {tab === "vault" ? (
              <><Clock className="w-3 h-3" /> Sessions</>
            ) : (
              <><FolderOpen className="w-3 h-3" /> Vault</>
            )}
          </button>
          <button
            onClick={() => setContextSidebarOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"
            title="Collapse sidebar"
          >
            <CaretLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {tab === "vault" && (
          <div className="p-2 space-y-0.5">
            <div className="text-xs font-mono text-text-secondary text-center py-8">
              No vault connected.
            </div>
          </div>
        )}

        {tab === "history" && (
          <ProjectHistoryPanel currentMode={mode} />
        )}
      </ScrollArea>
    </div>
  );
}

```

## LoadingScreen.tsx
- **Path**: `src/components/LoadingScreen.tsx`
- **Description**: Initial application loader spinner
```tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startBoot, markBootDone, isBootDone, getBootState, getBootSteps } from "@/lib/bootState";

interface LoadingScreenProps {
  onDismiss: () => void;
}

export default function LoadingScreen({ onDismiss }: LoadingScreenProps) {
  const [visible, setVisible] = useState(() => !isBootDone());
  const [{ stepIdx, progress, offline }, setState] = useState(() => getBootState());

  useEffect(() => {
    if (!visible) return;
    const unsub = startBoot(
      (s, p) => setState((prev) => ({ ...prev, stepIdx: s, progress: p })),
      () => setState((prev) => ({ ...prev, offline: true }))
    );
    return unsub;
  }, [visible, offline]);

  const handleSkip = () => {
    markBootDone();
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  if (!visible) return null;

  const steps = getBootSteps();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-app-bg"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.04)_0%,transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-[460px] bg-app-bg border border-border-core/30 rounded-2xl overflow-hidden"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-indigo/50 to-transparent" />
            <div className="p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-indigo/15 border border-accent-indigo/30 mb-4 overflow-hidden">
                  <img src="/archon-logo.png" alt="Archon" className="w-7 h-7 object-contain" />
                </div>
                <h1 className="text-2xl font-mono font-bold tracking-[0.18em] text-text-primary mb-1">ARCHON</h1>
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">AI Operating System v2.4.1</p>
              </div>

              <div className="mb-6">
                <div className="h-0.5 w-full bg-panel-bg/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      background: "linear-gradient(90deg, rgba(79,70,229,0.6), rgba(79,70,229,0.9))",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-text-secondary">{progress}%</span>
                  <span className="text-[10px] font-mono text-text-secondary">
                    {offline ? "DAEMON OFFLINE" : "BOOTING"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 min-h-[110px]">
                {steps.slice(0, stepIdx + 1).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2.5 text-[11px] font-mono"
                  >
                    <span className={i < stepIdx ? "text-accent-emerald" : "text-accent-indigo/80"}>
                      {i < stepIdx ? "✓" : "›"}
                    </span>
                    <span className={i < stepIdx ? "text-text-secondary" : "text-text-secondary"}>{step}</span>
                  </motion.div>
                ))}

                {offline && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-1"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono text-accent-rose/80">
                      <span>⚠</span>
                      <span>Daemon not reachable — start it locally to connect.</span>
                    </div>
                    <button
                      onClick={handleSkip}
                      data-testid="button-enter-interface"
                      className="w-full py-2.5 rounded-xl border border-border-core/30 bg-panel-bg/30 text-text-secondary font-mono text-xs tracking-widest hover:border-accent-indigo/30 hover:text-accent-indigo transition-all"
                    >
                      ENTER INTERFACE
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

```

## SettingsModal.tsx
- **Path**: `src/components/SettingsModal.tsx`
- **Description**: Archon Global Settings controls
```tsx
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/context/AppContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useProjectsContext } from "@/context/ProjectsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  KeyRound, Network, Cpu, Save, Eye, EyeOff, BrainCircuit,
  Plus, X, Database, Trash2, CheckCircle2, Circle, Settings2,
  FolderKanban, ArrowLeft, Folder, FolderOpen, Image, FileType, FileText, File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Project, ContextFile } from "@/context/ProjectsContext";

type SettingsTab = "api" | "models" | "parameters" | "network" | "mcp" | "projects";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "api",        label: "Providers",  icon: KeyRound },
  { id: "models",     label: "Models",     icon: BrainCircuit },
  { id: "parameters", label: "Parameters", icon: Cpu },
  { id: "network",    label: "Network",    icon: Network },
  { id: "mcp",        label: "MCP",        icon: Database },
  { id: "projects",   label: "Projects",   icon: FolderKanban },
];

// ─── Provider types ────────────────────────────────────────────────────────────

interface Provider {
  value: string; label: string; desc: string; tag?: string; color: string; letter: string;
}

interface CustomProvider {
  id: string; name: string; baseUrl: string; apiKey: string;
}

const PROVIDERS: Provider[] = [
  { value: "gemini",     label: "Gemini",        desc: "Google Gemini 2.0 & 2.5 Flash — free tier",       tag: "Free",        color: "bg-accent-indigo",    letter: "G"  },
  { value: "groq",       label: "Groq",          desc: "Llama 3.1/3.3, Gemma — ultra-fast inference",     tag: "Free",        color: "bg-accent-rose",  letter: "Q"  },
  { value: "openrouter", label: "OpenRouter",    desc: "DeepSeek R1, Llama and other free-tier models",   tag: "Multi-model", color: "bg-accent-indigo",  letter: "OR" },
  { value: "cerebras",   label: "Cerebras",      desc: "Llama 3.3 70B on custom AI silicon — free tier",  tag: "Free",        color: "bg-accent-emerald", letter: "CB" },
  { value: "mistral",    label: "Mistral",       desc: "Mistral Nemo and open-weight models — free tier", tag: "Free",        color: "bg-pink-500",    letter: "M"  },
  { value: "cloudflare", label: "Cloudflare AI", desc: "Workers AI — serverless inference at the edge",   tag: "Edge",        color: "bg-accent-rose",   letter: "CF" },
];

// ─── Provider components ───────────────────────────────────────────────────────

function ConnectedRow({ provider, onDisconnect }: { provider: Provider; onDisconnect: () => void }) {
  return (
    <div className="flex items-center gap-4 py-3 px-1 border-b border-border-core/15 last:border-b-0">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-text-primary font-bold text-[10px] flex-shrink-0", provider.color)}>
        {provider.letter}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-mono text-text-primary">{provider.label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">Connected</span>
      </div>
      <button onClick={onDisconnect} className="text-xs font-mono text-text-secondary hover:text-accent-rose transition-colors">
        Disconnect
      </button>
    </div>
  );
}

function AvailableRow({ provider, onConnect }: { provider: Provider; onConnect: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState("");
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onConnect(trimmed);
    setDraft(""); setExpanded(false);
  };

  const handleTest = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setTesting(true);
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      
      const res = await fetch(`${protocol}://${host}:${port}/settings/api-keys/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.value,
          api_key: trimmed
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(`${provider.label} connection validation succeeded!`);
        } else {
          toast.error(`Validation failed: ${data.error}`);
        }
      } else {
        toast.error("Daemon responded with an error");
      }
    } catch (e) {
      toast.error("Failed to connect to daemon settings server");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border-b border-border-core/15 last:border-b-0">
      <div className="flex items-center gap-4 py-3 px-1">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-text-primary font-bold text-[10px] flex-shrink-0", provider.color)}>
          {provider.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-text-primary">{provider.label}</span>
            {provider.tag && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-panel-bg/80 text-text-secondary border border-border-core/20">
                {provider.tag}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-secondary mt-0.5">{provider.desc}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex-shrink-0",
            expanded ? "border-border-core/30 text-text-primary bg-panel-bg/60" : "border-border-core/25 text-text-secondary hover:border-border-core/30 hover:text-text-primary"
          )}
        >
          {expanded ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {expanded ? "Cancel" : "Connect"}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="pb-3 px-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={show ? "text" : "password"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setExpanded(false); }}
                  placeholder="Paste API key..."
                  autoFocus
                  className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40 pr-10"
                />
                <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary">
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={handleTest}
                disabled={!draft.trim() || testing}
                className="bg-transparent hover:bg-panel-bg border border-border-core/25 text-text-secondary hover:text-text-primary font-mono text-xs h-9 px-3 flex-shrink-0 rounded-xl"
              >
                {testing ? "Testing..." : "Test Connection"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!draft.trim() || testing} className="bg-accent-indigo hover:bg-accent-indigo text-text-primary disabled:opacity-30 font-mono text-xs h-9 px-4 flex-shrink-0 rounded-xl">
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomProviderRow({ provider, onRemove }: { provider: CustomProvider; onRemove: () => void }) {
  const masked = provider.apiKey.length > 8 ? provider.apiKey.slice(0, 4) + "••••" + provider.apiKey.slice(-4) : "••••••••";
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-border-core/15 last:border-b-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-panel-bg text-text-primary font-bold text-[10px] flex-shrink-0">
        <Settings2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-text-primary">{provider.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">Custom</span>
        </div>
        <p className="text-[10px] font-mono text-text-secondary truncate mt-0.5">{provider.baseUrl}</p>
        {provider.apiKey && <p className="text-[10px] font-mono text-text-secondary mt-0.5 tracking-wider">{masked}</p>}
      </div>
      <button onClick={onRemove} className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AddCustomProviderForm({ onAdd }: { onAdd: (p: CustomProvider) => void }) {
  const [open, setOpen] = useState(false);
  const focusTrapRef = useFocusTrap(open, () => setOpen(false));
  const [name, setName] = useState(""); const [baseUrl, setBaseUrl] = useState(""); const [apiKey, setApiKey] = useState(""); const [showKey, setShowKey] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !baseUrl.trim()) return;
    onAdd({ id: Math.random().toString(36).slice(2), name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    setName(""); setBaseUrl(""); setApiKey(""); setOpen(false);
  };

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className={cn("flex items-center gap-1.5 text-[10px] font-mono border px-2.5 py-1 rounded-lg transition-all", open ? "border-border-core/30 text-text-primary bg-panel-bg/60" : "border-border-core/25 text-text-secondary hover:border-border-core/30 hover:text-text-primary")}>
        {open ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}{open ? "Cancel" : "Add Custom"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div ref={focusTrapRef} className="mt-3 space-y-2.5 pb-1">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Provider name</Label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setOpen(false); }} placeholder="e.g. My OpenAI Proxy" className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Base URL</Label>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">API key (optional)</Label>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40 pr-10" />
                  <button onClick={() => setShowKey((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary">{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={!name.trim() || !baseUrl.trim()} className="w-full bg-accent-indigo hover:bg-accent-indigo text-text-primary text-xs font-mono disabled:opacity-30 rounded-xl" size="sm">Add Provider</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProvidersTab() {
  const getKey = (v: string) => localStorage.getItem(`archon_apikey_${v}`) || "";
  const [keys, setKeys] = useState<Record<string, string>>(() => Object.fromEntries(PROVIDERS.map((p) => [p.value, getKey(p.value)])));
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>(() => { try { const s = localStorage.getItem("archon_custom_providers"); return s ? JSON.parse(s) : []; } catch { return []; } });

  const connect = useCallback((providerValue: string, key: string) => { localStorage.setItem(`archon_apikey_${providerValue}`, key); setKeys((prev) => ({ ...prev, [providerValue]: key })); }, []);
  const disconnect = useCallback((providerValue: string) => { localStorage.removeItem(`archon_apikey_${providerValue}`); setKeys((prev) => ({ ...prev, [providerValue]: "" })); }, []);

  const addCustom = useCallback((p: CustomProvider) => {
    const next = [...customProviders, p];
    setCustomProviders(next);
    localStorage.setItem("archon_custom_providers", JSON.stringify(next));
    if (p.apiKey) localStorage.setItem(`archon_apikey_custom_${p.id}`, p.apiKey);
  }, [customProviders]);

  const removeCustom = useCallback((id: string) => {
    const next = customProviders.filter((p) => p.id !== id);
    setCustomProviders(next);
    localStorage.setItem("archon_custom_providers", JSON.stringify(next));
    localStorage.removeItem(`archon_apikey_custom_${id}`);
  }, [customProviders]);

  const connectedBuiltin = PROVIDERS.filter((p) => (keys[p.value] || "").length > 10);
  const availableBuiltin = PROVIDERS.filter((p) => (keys[p.value] || "").length <= 10);

  return (
    <div className="space-y-6">
      {connectedBuiltin.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3">Connected</h3>
          <div className="rounded-xl border border-border-core/20 bg-panel-bg px-3">
            {connectedBuiltin.map((p) => <ConnectedRow key={p.value} provider={p} onDisconnect={() => disconnect(p.value)} />)}
          </div>
        </div>
      )}
      {availableBuiltin.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3">{connectedBuiltin.length > 0 ? "Available" : "Providers"}</h3>
          <div className="rounded-xl border border-border-core/20 bg-panel-bg px-3">
            {availableBuiltin.map((p) => <AvailableRow key={p.value} provider={p} onConnect={(key) => connect(p.value, key)} />)}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Custom Providers</h3>
          <AddCustomProviderForm onAdd={addCustom} />
        </div>
        {customProviders.length > 0 ? (
          <div className="rounded-xl border border-border-core/20 bg-panel-bg px-3">
            {customProviders.map((p) => <CustomProviderRow key={p.id} provider={p} onRemove={() => removeCustom(p.id)} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-core/25 bg-panel-bg/50 px-4 py-5 text-center">
            <p className="text-[11px] font-mono text-text-secondary">Add any OpenAI-compatible endpoint — local models, proxies, or private deployments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Network Tab ───────────────────────────────────────────────────────────────

function NetworkTab() {
  const [host, setHost] = useState(() => localStorage.getItem("archon_daemon_host") || "localhost");
  const [port, setPort] = useState(() => localStorage.getItem("archon_daemon_port") || "8765");
  useEffect(() => { localStorage.setItem("archon_daemon_host", host); }, [host]);
  useEffect(() => { localStorage.setItem("archon_daemon_port", port); }, [port]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-text-secondary">Daemon Host</Label>
        <input value={host} onChange={(e) => setHost(e.target.value)} className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40" />
      </div>
      <div className="space-y-2">
        <Label className="font-mono text-xs text-text-secondary">WebSocket Port</Label>
        <input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="w-48 bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40" />
        <p className="text-[10px] font-mono text-text-secondary">Default: 8765. Must match daemon --port flag.</p>
      </div>
      <p className="text-[10px] font-mono text-accent-rose/80">Changes take effect after page reload.</p>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-panel-bg border border-border-core/20">
        <div className="w-2 h-2 rounded-full bg-accent-rose" />
        <span className="text-xs font-mono text-text-secondary">{window.location.protocol === "https:" ? "wss" : "ws"}://{host}:{port} — Offline</span>
      </div>
    </div>
  );
}

// ─── MCP Tab ───────────────────────────────────────────────────────────────────

interface McpServer { id: string; name: string; url: string; description: string; enabled: boolean; connected: boolean; }

function McpTab() {
  const [servers, setServers] = useState<McpServer[]>(() => { try { const s = localStorage.getItem("archon_mcp_servers"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState(""); const [newUrl, setNewUrl] = useState(""); const [newDesc, setNewDesc] = useState("");

  const save = (updated: McpServer[]) => { setServers(updated); localStorage.setItem("archon_mcp_servers", JSON.stringify(updated)); };
  const addServer = () => { if (!newName || !newUrl) return; save([...servers, { id: Math.random().toString(), name: newName, url: newUrl, description: newDesc, enabled: true, connected: false }]); setNewName(""); setNewUrl(""); setNewDesc(""); setShowAdd(false); };
  const toggle = (id: string) => save(servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const remove = (id: string) => save(servers.filter((s) => s.id !== id));

  const PRESETS = [
    { name: "Gmail MCP",       url: "http://localhost:3100/mcp", description: "Gmail read/write via MCP server" },
    { name: "Google Keep MCP", url: "http://localhost:3101/mcp", description: "Keep notes & checklists" },
    { name: "Obsidian MCP",    url: "http://localhost:3102/mcp", description: "Vault file read/write operations" },
    { name: "Calendar MCP",    url: "http://localhost:3103/mcp", description: "Google Calendar events" },
    { name: "File System MCP", url: "http://localhost:3104/mcp", description: "Local file system access" },
  ];

  return (
    <div className="space-y-6">
      <div className="px-4 py-3 rounded-xl bg-accent-indigo/[0.05] border border-blue-500/10">
        <p className="text-xs font-mono text-accent-indigo/80">MCP servers extend the AI with tools like Gmail, Obsidian, Calendar, and more. Add a URL and enable it to make it available to agents.</p>
      </div>
      {servers.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3">Connected Servers</h3>
          <div className="space-y-2">
            {servers.map((server) => (
              <div key={server.id} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border transition-all", server.enabled ? "border-emerald-500/15 bg-accent-emerald/[0.03]" : "border-border-core/20 bg-panel-bg opacity-60")}>
                <button onClick={() => toggle(server.id)} className="flex-shrink-0">
                  {server.enabled ? <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> : <Circle className="w-4 h-4 text-text-secondary" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-text-primary font-medium">{server.name}</div>
                  <div className="text-[10px] font-mono text-text-secondary truncate">{server.url}</div>
                  {server.description && <div className="text-[10px] font-mono text-text-secondary mt-0.5">{server.description}</div>}
                </div>
                <button onClick={() => remove(server.id)} className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Add MCP Server</h3>
          <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary hover:text-text-primary border border-border-core/25 px-2.5 py-1 rounded-lg transition-all">
            {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}{showAdd ? "Cancel" : "Custom"}
          </button>
        </div>
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 pb-4">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Server name..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="ws://localhost:3100/mcp or http://..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
                <Button onClick={addServer} disabled={!newName || !newUrl} className="w-full bg-accent-indigo hover:bg-accent-indigo text-text-primary text-xs font-mono disabled:opacity-30 rounded-xl" size="sm">Add Server</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div>
          <p className="text-[10px] font-mono text-text-secondary mb-2">Common presets:</p>
          <div className="space-y-1.5">
            {PRESETS.filter((p) => !servers.find((s) => s.url === p.url)).map((preset) => (
              <button key={preset.url} onClick={() => save([...servers, { id: Math.random().toString(), ...preset, enabled: true, connected: false }])} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-border-core/15 bg-panel-bg hover:border-border-core/30 text-left transition-all">
                <Plus className="w-3 h-3 text-text-secondary flex-shrink-0" />
                <div><div className="text-xs font-mono text-text-secondary">{preset.name}</div><div className="text-[10px] font-mono text-text-secondary">{preset.description}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Projects Tab ──────────────────────────────────────────────────────────────

const KIND_ICON: Record<ContextFile["kind"], React.ElementType> = {
  image: Image, pdf: FileType, text: FileText, other: File,
};

const MODE_COLORS: Record<string, string> = {
  chat: "text-accent-indigo", council: "text-accent-rose", research: "text-accent-indigo", agents: "text-accent-emerald",
};
const KIND_COLORS: Record<string, string> = {
  light: "bg-accent-indigo/10 text-accent-indigo border-blue-500/20",
  agent: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
};

function ProjectDetailView({ project, onBack }: { project: Project; onBack: () => void }) {
  const { addContextFile, removeContextFile, updateAgentSettings } = useProjectsContext();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    // Just shows in the UI — in a real setup, addContextFile is called from the project
  };

  const settings = project.agentSettings;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors mb-3">
          <ArrowLeft className="w-3 h-3" /> Back to projects
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-mono text-text-primary font-semibold">{project.name}</h3>
            <p className="text-[10px] font-mono text-text-secondary mt-0.5">Manage project folder, agent settings, and context files.</p>
          </div>
          <span className={cn("text-[9px] font-mono px-2 py-1 rounded-lg border", KIND_COLORS[project.kind])}>
            {project.kind === "agent" ? "Agent Project" : "Light Project"}
          </span>
        </div>
      </div>

      {/* Folders */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Folders</h4>
        <div className="rounded-xl border border-border-core/20 bg-panel-bg p-3 flex items-center gap-3">
          <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" />
          <span className="text-xs font-mono text-text-secondary flex-1 truncate">
            {project.folderPath || "No folder (Light Project)"}
          </span>
          {project.folderPath && (
            <button className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {project.kind === "agent" && (
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-core/25 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/30 transition-all">
            <Plus className="w-3 h-3" /> Add Folder
          </button>
        )}
      </div>

      {/* Context Files */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Context Files</h4>
        {project.contextFiles.length > 0 ? (
          <div className="space-y-1.5">
            {project.contextFiles.map((f) => {
              const Icon = KIND_ICON[f.kind];
              return (
                <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-core/20 bg-panel-bg group">
                  <Icon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                  <span className="flex-1 text-xs font-mono text-text-secondary truncate min-w-0">{f.name}</span>
                  <span className="text-[9px] font-mono text-text-secondary">{f.kind}</span>
                  <button onClick={() => removeContextFile(project.id, f.id)} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent-rose transition-all flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] font-mono text-text-secondary text-center py-3 rounded-xl border border-dashed border-border-core/20">
            No context files attached
          </div>
        )}
        <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,.txt,.md,.py,.js,.ts,.json,.csv" className="hidden" onChange={handleAddFile} />
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-core/25 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/30 transition-all">
          <Plus className="w-3 h-3" /> Add File
        </button>
      </div>

      {/* Agent Settings (only for agent projects) */}
      {project.kind === "agent" && settings && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Agent Settings</h4>
          {[
            { label: "Security Preset",              key: "securityPreset",       options: ["strict", "standard", "custom"] },
            { label: "Outside-folder file access",   key: "outsideFolderAccess",  options: ["always-ask", "allow", "deny"] },
            { label: "Terminal Command Execution",   key: "terminalExecution",    options: ["always-ask", "allow", "deny"] },
          ].map(({ label, key, options }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="font-mono text-xs text-text-secondary">{label}</Label>
              <Select
                value={(settings as any)[key]}
                onValueChange={(v) => updateAgentSettings(project.id, { [key]: v } as any)}
              >
                <SelectTrigger className="w-36 bg-panel-bg border-border-core/25 font-mono text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-panel-bg border-border-core/30 rounded-xl">
                  {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ initialProjectId, onConsumeInitialId }: { initialProjectId: string | null; onConsumeInitialId: () => void }) {
  const { projects } = useProjectsContext();
  const [detailId, setDetailId] = useState<string | null>(null);

  // Consume the initial project ID from AppContext (opened via gear icon)
  useEffect(() => {
    if (initialProjectId) {
      setDetailId(initialProjectId);
      onConsumeInitialId();
    }
  }, [initialProjectId, onConsumeInitialId]);

  const detailProject = projects.find((p) => p.id === detailId);

  if (detailProject) {
    return <ProjectDetailView project={detailProject} onBack={() => setDetailId(null)} />;
  }

  // List view — grouped by mode
  const modes = ["chat", "council", "research", "agents"] as const;
  const modeLabels: Record<string, string> = { chat: "Chat", council: "Council", research: "Research", agents: "Agent Runtime" };

  return (
    <div className="space-y-6">
      {projects.length === 0 ? (
        <div className="text-center py-10">
          <FolderKanban className="w-8 h-8 text-text-secondary mx-auto mb-3" />
          <p className="text-xs font-mono text-text-secondary">No projects yet.</p>
          <p className="text-[10px] font-mono text-text-secondary mt-1">Create a project from the sidebar to get started.</p>
        </div>
      ) : (
        modes.map((mode) => {
          const modeProjects = projects.filter((p) => p.mode === mode);
          if (modeProjects.length === 0) return null;
          return (
            <div key={mode}>
              <h3 className={cn("text-[10px] font-mono uppercase tracking-widest mb-2", MODE_COLORS[mode])}>{modeLabels[mode]}</h3>
              <div className="space-y-1.5">
                {modeProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetailId(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-core/20 bg-panel-bg hover:border-border-core/30 text-left transition-all group"
                  >
                    <Folder className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                    <span className="flex-1 text-xs font-mono text-text-primary truncate">{p.name}</span>
                    <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0", KIND_COLORS[p.kind])}>
                      {p.kind === "agent" ? "Agent" : "Light"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Modal shell ───────────────────────────────────────────────────────────────

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, settingsProjectId, setSettingsProjectId } = useAppContext();
  const focusTrapRef = useFocusTrap(settingsOpen, () => setSettingsOpen(false));
  const [tab, setTab] = useState<SettingsTab>("api");
  const [temp, setTemp] = useState(() => {
    try { return Number(localStorage.getItem("archon_temperature") || "70"); } catch { return 70; }
  });
  const [maxTok, setMaxTok] = useState(() => {
    try { return Number(localStorage.getItem("archon_max_tokens") || "4096"); } catch { return 4096; }
  });
  const [autopilotBehavior, setAutopilotBehavior] = useState(() => {
    try { return localStorage.getItem("archon_autopilot_behavior") || "confirm"; } catch { return "confirm"; }
  });
  const [maxSteps, setMaxSteps] = useState(() => {
    try { return Number(localStorage.getItem("archon_max_steps") || "30"); } catch { return 30; }
  });
  const [tokenBudget, setTokenBudget] = useState(() => {
    try { return Number(localStorage.getItem("archon_token_budget") || "500000"); } catch { return 500000; }
  });

  const [chatModel, setChatModel] = useState(() => localStorage.getItem("archon_chat_model") || "groq/llama-3.1-8b-instant");
  const [proposerModel, setProposerModel] = useState(() => localStorage.getItem("archon_proposer_model") || "groq/llama-3.3-70b-versatile");
  const [criticModel, setCriticModel] = useState(() => localStorage.getItem("archon_critic_model") || "gemini/gemini-2.5-flash");
  const [expertModel, setExpertModel] = useState(() => localStorage.getItem("archon_expert_model") || "openrouter/deepseek/deepseek-r1:free");
  const [researchModel, setResearchModel] = useState(() => localStorage.getItem("archon_research_model") || "gemini/gemini-2.0-flash");
  const [agentModel, setAgentModel] = useState(() => localStorage.getItem("archon_agent_model") || "groq/llama-3.3-70b-versatile");

  const handleSaveAndPush = async () => {
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      
      const keys = {
        OPENAI_API_KEY: localStorage.getItem("archon_apikey_openai") || "",
        ANTHROPIC_API_KEY: localStorage.getItem("archon_apikey_anthropic") || "",
        GEMINI_API_KEY: localStorage.getItem("archon_apikey_gemini") || "",
        GROQ_API_KEY: localStorage.getItem("archon_apikey_groq") || "",
        MISTRAL_API_KEY: localStorage.getItem("archon_apikey_mistral") || "",
        OPENROUTER_API_KEY: localStorage.getItem("archon_apikey_openrouter") || "",
        CEREBRAS_API_KEY: localStorage.getItem("archon_apikey_cerebras") || "",
      };

      const response = await fetch(`${protocol}://${host}:${port}/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });

      if (response.ok) {
        alert("Settings saved and pushed to daemon successfully!");
        setSettingsOpen(false);
      } else {
        alert("Failed to push settings to daemon.");
      }
    } catch (err) {
      alert("Error connecting to daemon: " + (err as Error).message);
    }
  };

  // When a project ID arrives, switch to the projects tab
  useEffect(() => {
    if (settingsProjectId) setTab("projects");
  }, [settingsProjectId]);

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="w-[95vw] max-w-[820px] w-full p-0 bg-app-bg border border-border-core/30 text-text-primary overflow-hidden rounded-2xl">
        <div ref={focusTrapRef} className="flex h-[620px]">
          {/* Left tab rail */}
          <div className="w-44 flex-shrink-0 bg-app-bg border-r border-border-core/20 flex flex-col py-4">
            <div className="px-4 mb-4">
              <h2 className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary">System Config</h2>
            </div>
            <nav className="flex-1 px-2 space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  data-testid={`settings-tab-${id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all border",
                    tab === id ? "bg-panel-bg/20 border-border-core/30 text-text-primary" : "border-transparent text-text-secondary hover:text-text-secondary hover:bg-panel-bg/30"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="px-3 mt-4">
              <Button className="w-full bg-accent-indigo/80 hover:bg-accent-indigo text-text-primary text-xs font-mono rounded-xl" size="sm" onClick={handleSaveAndPush} data-testid="button-settings-save">
                <Save className="w-3.5 h-3.5 mr-2" />
                Save & Push
              </Button>
              <p className="text-[9px] font-mono text-text-secondary text-center mt-2">Push keys to daemon .env</p>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border-core/20 flex-shrink-0">
              <DialogTitle className="font-mono text-sm text-text-primary">
                {TABS.find((t) => t.id === tab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}>
              {tab === "api"        && <ProvidersTab />}
              {tab === "network"    && <NetworkTab />}
              {tab === "mcp"        && <McpTab />}
              {tab === "projects"   && (
                <ProjectsTab
                  initialProjectId={settingsProjectId}
                  onConsumeInitialId={() => setSettingsProjectId(null)}
                />
              )}
              {tab === "models" && (
                <div className="space-y-5">
                  {[
                    { label: "Chat Mode default",  def: "groq/llama-3.1-8b-instant" },
                    { label: "Council (Proposer)", def: "groq/llama-3.3-70b-versatile" },
                    { label: "Council (Critic)",   def: "gemini/gemini-2.5-flash" },
                    { label: "Council (Expert)",   def: "openrouter/deepseek/deepseek-r1:free" },
                    { label: "Research mode",      def: "gemini/gemini-2.0-flash" },
                    { label: "Agent executor",     def: "groq/llama-3.3-70b-versatile" },
                  ].map(({ label, def }) => (
                    <div key={label} className="flex items-center justify-between">
                      <Label className="font-mono text-xs text-text-secondary">{label}</Label>
                      <Select defaultValue={def}>
                        <SelectTrigger className="w-56 bg-panel-bg border-border-core/25 font-mono text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-panel-bg border-border-core/30 rounded-xl">
                          <SelectItem value="groq/llama-3.1-8b-instant">Groq · Llama 3.1 8B</SelectItem>
                          <SelectItem value="groq/llama-3.3-70b-versatile">Groq · Llama 3.3 70B</SelectItem>
                          <SelectItem value="gemini/gemini-2.0-flash">Gemini · 2.0 Flash</SelectItem>
                          <SelectItem value="gemini/gemini-2.5-flash">Gemini · 2.5 Flash</SelectItem>
                          <SelectItem value="mistral/open-mistral-nemo">Mistral · Nemo</SelectItem>
                          <SelectItem value="openrouter/deepseek/deepseek-r1:free">OpenRouter · DeepSeek R1</SelectItem>
                          <SelectItem value="openai/llama3.3-70b">Cerebras · Llama 3.3 70B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
              {tab === "parameters" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="font-mono text-xs text-text-secondary">Default Temperature</Label>
                      <span className="font-mono text-xs text-text-primary">{(temp / 100).toFixed(2)}</span>
                    </div>
                    <Slider value={[temp]} onValueChange={([v]) => { setTemp(v); localStorage.setItem("archon_temperature", v.toString()); }} max={100} step={1} className="[&_[role=slider]]:bg-text-secondary [&_[role=slider]]:rounded-lg" />
                    <div className="flex justify-between text-[10px] font-mono text-text-secondary"><span>Deterministic (0.0)</span><span>Creative (1.0)</span></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="font-mono text-xs text-text-secondary">Max Output Tokens</Label>
                      <span className="font-mono text-xs text-text-primary">{maxTok.toLocaleString()}</span>
                    </div>
                    <Slider value={[maxTok]} onValueChange={([v]) => { setMaxTok(v); localStorage.setItem("archon_max_tokens", v.toString()); }} min={512} max={32768} step={512} className="[&_[role=slider]]:bg-text-secondary [&_[role=slider]]:rounded-lg" />
                    <div className="flex justify-between text-[10px] font-mono text-text-secondary"><span>512</span><span>32,768</span></div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border-core/15">
                    <Label className="font-mono text-xs text-text-secondary block">Autopilot Behavior</Label>
                    <Select value={autopilotBehavior} onValueChange={(v) => { setAutopilotBehavior(v); localStorage.setItem("archon_autopilot_behavior", v); }}>
                      <SelectTrigger className="bg-panel-bg border-border-core/25 font-mono text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-panel-bg border-border-core/30 rounded-xl">
                        <SelectItem value="confirm">Always confirm dangerous commands</SelectItem>
                        <SelectItem value="auto">Fully autonomous (no confirmation)</SelectItem>
                        <SelectItem value="readonly">Read-only (no execution)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border-core/15">
                    <Label className="font-mono text-xs text-text-secondary block">Max Steps (Autopilot)</Label>
                    <input
                      type="number"
                      value={maxSteps}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setMaxSteps(val);
                        localStorage.setItem("archon_max_steps", val.toString());
                      }}
                      className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40"
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <Label className="font-mono text-xs text-text-secondary block">Token Budget (Autopilot)</Label>
                    <input
                      type="number"
                      value={tokenBudget}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTokenBudget(val);
                        localStorage.setItem("archon_token_budget", val.toString());
                      }}
                      className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```