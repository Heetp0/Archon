import { useEffect, useState, useRef, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { modules as discoveredModules } from "./.generated/mockup-components";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) return;
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();
    return () => { cancelled = true; };
  }, [componentPath, modules]);

  if (error) {
    return (
      <motion.pre
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          color: "oklch(0.577 0.245 27.3)",
          padding: "2rem",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.875rem",
          lineHeight: 1.6,
        }}
      >
        {error}
      </motion.pre>
    );
  }

  if (!Component) {
    return (
      <div style={{ padding: "2rem", display: "flex", gap: "0.5rem", flexDirection: "column" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-md bg-muted"
            style={{ height: "1rem", width: `${60 + i * 10}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Component />
    </motion.div>
  );
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

// ================================================================
// THE CORE: Multi-Agent AI OS Interface React Implementation
// ================================================================

type ViewType = "cmd" | "ide" | "research" | "council" | "terminal";

interface FeedItem {
  t: string;
  a: string;
  m: string;
}

interface CouncilNode {
  id: string;
  label: string;
  title: string;
  desc: string;
  x: number;
  y: number;
  type: "input" | "active" | "listening" | "review";
}

function TheCoreDashboard() {
  const [activeView, setActiveView] = useState<ViewType>("cmd");
  const [activeIDETab, setActiveIDETab] = useState<"code" | "test" | "term" | "browser">("code");
  const [model, setModel] = useState("Claude 4 Sonnet");
  const [cpu, setCpu] = useState(37);
  const [gpu, setGpu] = useState(81);
  const [rp1, setRp1] = useState(67);
  const [rp2, setRp2] = useState(34);
  const [sysTime, setSysTime] = useState("15:13:34");
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [sysLogs, setSysLogs] = useState<string[]>([
    "[2026-07-04T15:00:02Z] [info] systemd booted Core v2.4.1",
    "[2026-07-04T15:00:03Z] [info] Loaded modules: auth-provider, filesystem-agent, search-rabbit, pipeline-agent-council",
    "[2026-07-04T15:00:04Z] [debug] Initialized LLM connector pool (Claude 4, GPT-4o, Gemini 3.5 Flash)",
    "[2026-07-04T15:00:04Z] [success] Connection established with sandbox filesystem hook",
    "[2026-07-04T15:04:12Z] [info] Agent 0xc42 initialized. Role: RESEARCHER_AGENT",
    "[2026-07-04T15:04:15Z] [info] Agent 0x4f1 initialized. Role: CODER_AGENT",
    "[2026-07-04T15:04:16Z] [success] Web Socket pipeline operational",
    "[2026-07-04T15:10:02Z] [info] Received client request: auth migration",
    "[2026-07-04T15:10:04Z] [debug] Spawning sub-daemon @supabase/supabase-js install"
  ]);

  const [feedItems] = useState<FeedItem[]>([
    { t: "12:09 PM", a: "Coder Agent", m: "Swapped verify() logic to Supabase getUser() in auth.ts" },
    { t: "12:08 PM", a: "Validator", m: "Security audit passed for package dependencies" },
    { t: "12:05 PM", a: "Researcher", m: "Retrieved public schema docs from supabase.com/docs" },
    { t: "12:04 PM", a: "System", m: "Created workspace replica sandbox 0xcf4" },
    { t: "12:00 PM", a: "User", m: "Initiated auth migration command" }
  ]);

  // Node Board Graph State
  const [nodes, setNodes] = useState<CouncilNode[]>([
    { id: "n1", label: "Input Portal", title: "User Prompt Request", desc: "Triggers execution chain upon receipt of query matching authorization patterns.", x: 40, y: 120, type: "input" },
    { id: "n2", label: "Refactoring Node", title: "Coder Agent v2.4", desc: "Implements refactoring proposals, files replacement, test suite validation.", x: 310, y: 60, type: "active" },
    { id: "n3", label: "Scraper Node", title: "Researcher Agent", desc: "Performs multi-hop web queries, scrapes API references, returns summarized context.", x: 310, y: 250, type: "listening" },
    { id: "n4", label: "Evaluation Node", title: "Validator Guard", desc: "Compares test output, lint status, security policies. Prevents faulty code merge.", x: 580, y: 150, type: "review" }
  ]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Time & Stats loops
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setSysTime(d.toISOString().substring(11, 19) + "Z");
    }, 1000);

    const stats = setInterval(() => {
      setCpu(Math.floor(Math.random() * 25) + 20);
      setGpu(Math.floor(Math.random() * 20) + 65);

      setRp1(prev => (prev + 1 > 100 ? 20 : prev + 1));
      setRp2(prev => (prev + 1 > 100 ? 5 : prev + 1));
    }, 1200);

    return () => {
      clearInterval(timer);
      clearInterval(stats);
    };
  }, []);

  // Trigger Toast Notification
  const addToast = (msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Add Dynamic Agent Node
  const spawnNode = () => {
    const nextId = "n" + (nodes.length + 1);
    const newNode: CouncilNode = {
      id: nextId,
      label: "Dynamic Node",
      title: `Agent Daemon ${nodes.length + 1}`,
      desc: "Spawned on-the-fly to handle subtask routines and file mutations.",
      x: 180,
      y: 180,
      type: "listening"
    };
    setNodes(prev => [...prev, newNode]);
    addToast(`Spawned new daemon node ${nextId} on the canvas.`);
  };

  // Handle Drag / Pointer Movements for Canvas Nodes
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    let left = e.clientX - canvasRect.left - dragOffset.current.x;
    let top = e.clientY - canvasRect.top - dragOffset.current.y;

    // Boundary constraints
    left = Math.max(10, Math.min(left, canvasRect.width - 240));
    top = Math.max(10, Math.min(top, canvasRect.height - 150));

    setNodes(prev => prev.map(n => n.id === draggingId ? { ...n, x: left, y: top } : n));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingId(null);
    }
  };

  // Calculate lines between node centers
  const getCenter = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 110, y: node.y + 60 };
  };

  const c1 = getCenter("n1");
  const c2 = getCenter("n2");
  const c3 = getCenter("n3");
  const c4 = getCenter("n4");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0f] text-[#f2f0f5] select-none" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Subtle Scanline Overlay */}
      <div id="sl" className="fixed inset-0 pointer-events-none z-[9999]" />

      {/* TOPBAR */}
      <header className="h-11 bg-[#12121c] border-b border-[#252538] flex items-center px-3.5 gap-2 shrink-0 z-[40]">
        <div className="flex items-center gap-1.5 mr-1.5">
          <div className="w-7 h-7 bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] rounded-lg flex items-center justify-center shadow-[0_0_18px_rgba(124,58,237,0.35)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              <circle cx="12" cy="12" r="3" fill="white" stroke="none" />
            </svg>
          </div>
          <span className="text-15 font-extrabold tracking-tight bg-gradient-to-r from-[#f2f0f5] to-[#9c89b8] bg-clip-text text-transparent">
            The Core
          </span>
          <span className="b bz text-[10px] py-0.5 px-1.5 border border-[#252538] bg-[#1a1a26] text-[#b0a8c2] rounded-full">v2.4.1</span>
        </div>
        <span className="text-[#252538] text-sm">›</span>
        <span className="text-[12px] text-[#b0a8c2] capitalize">
          {activeView === "cmd" ? "Command Center" : activeView === "ide" ? "Agent IDE" : activeView === "research" ? "Deep Research" : activeView === "council" ? "Agent Council" : "Live Terminal"}
        </span>

        <div className="flex-1" />

        {/* Model switcher */}
        <button
          className="btn bou flex items-center gap-1.5 border border-[#252538] bg-transparent text-[#b0a8c2] hover:text-white hover:bg-[#1a1a26] rounded-md px-3 py-1 text-xs"
          onClick={() => {
            const nextModel = model === "Claude 4 Sonnet" ? "Gemini 3.5 Flash" : model === "Gemini 3.5 Flash" ? "GPT-4o" : "Claude 4 Sonnet";
            setModel(nextModel);
            addToast(`Swapped model endpoint to ${nextModel}`);
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          <span>{model}</span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        {/* Active agents count */}
        <div className="flex items-center gap-1.5 bg-[#171724] border border-[#252538] rounded-md px-2.5 py-1 text-xs text-[#b0a8c2]">
          <div className="d d-r w-1.5 h-1.5 rounded-full" />
          <span>4 agents live</span>
        </div>

        {/* Token status */}
        <div className="text-xs text-[#706a80] flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <span>2.4M tkns</span>
        </div>

        {/* Avatar */}
        <div className="w-7 h-7 bg-gradient-to-br from-[#7c3aed] to-[#d946ef] rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer shrink-0">H</div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <div id="ws" className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-[212px] shrink-0 bg-[#12121c] border-r border-[#252538] flex flex-col p-2 z-[50] overflow-y-auto">
          <div className="ns text-[10px] font-semibold text-[#706a80] tracking-widest uppercase px-2 pt-2.5 pb-1">Workspace</div>
          
          <div className={`ni ${activeView === "cmd" ? "on" : ""}`} onClick={() => setActiveView("cmd")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>
            Command Center
            <span className="b bg ml-auto text-[9px] py-0.5 px-1 bg-[#102d20] text-[#4ade80] border border-[#14532d] rounded-full">4</span>
          </div>

          <div className={`ni ${activeView === "ide" ? "on" : ""}`} onClick={() => setActiveView("ide")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            Agent IDE
            <span className="b bv ml-auto text-[9px] py-0.5 px-1 bg-[#23153c] text-[#a78bfa] border border-[#4c1d95] rounded-full">live</span>
          </div>

          <div className={`ni ${activeView === "research" ? "on" : ""}`} onClick={() => setActiveView("research")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
            Deep Research
            <span className="b bc ml-auto text-[9px] py-0.5 px-1 bg-[#12283a] text-[#22d3ee] border border-[#164e63] rounded-full">24</span>
          </div>

          <div className={`ni ${activeView === "council" ? "on" : ""}`} onClick={() => setActiveView("council")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4M8.5 16.5L12 11l3.5 5.5" /></svg>
            Agent Council
            <span className="b ba ml-auto text-[9px] py-0.5 px-1 bg-[#322015] text-[#fbbf24] border border-[#78350f] rounded-full">mesh</span>
          </div>

          <div className={`ni ${activeView === "terminal" ? "on" : ""}`} onClick={() => setActiveView("terminal")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
            System Logs
          </div>

          <div className="ndiv h-[1px] bg-[#252538] my-1.5 mx-1" />
          <div className="ns text-[10px] font-semibold text-[#706a80] tracking-widest uppercase px-2 pt-2.5 pb-1">Vault</div>
          <div className="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>Knowledge Vault</div>
          <div className="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>Memory Store</div>

          <div className="ndiv h-[1px] bg-[#252538] my-1.5 mx-1" />

          {/* Health monitor widget */}
          <div className="bg-[#171724] border border-[#252538] rounded-lg p-2.5 mt-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#b0a8c2] mb-2">
              <div className="d d-r w-1.5 h-1.5 rounded-full" />
              <span>System Nominal</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div>
                <div className="flex justify-between text-[11px] text-[#706a80] mb-0.5">
                  <span>CPU</span>
                  <span className="font-mono text-[#b0a8c2]">{cpu}%</span>
                </div>
                <div className="pg h-1 bg-[#252538] rounded overflow-hidden">
                  <div className="pf pv h-full" style={{ width: `${cpu}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#706a80] mb-0.5">
                  <span>GPU</span>
                  <span className="font-mono text-[#b0a8c2]">{gpu}%</span>
                </div>
                <div className="pg h-1 bg-[#252538] rounded overflow-hidden">
                  <div className="pf pc h-full" style={{ width: `${gpu}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1" />
          <div className="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>Settings</div>
        </aside>

        {/* WORKSPACE CENTRAL MAIN */}
        <main className="flex-1 overflow-hidden flex flex-col">

          {/* VIEW 1: COMMAND CENTER */}
          {activeView === "cmd" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-[18px] py-3 border-b border-[#252538] flex items-center shrink-0">
                <div>
                  <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-[#f2f0f5] to-[#9c89b8] bg-clip-text text-transparent">Command Center</h1>
                  <p className="text-xs text-[#706a80] mt-0.5">Multi-agent orchestration dashboard</p>
                </div>
                <div className="flex-1" />
                <button className="btn bou border border-[#252538] text-xs px-3 py-1 rounded" onClick={() => addToast("Refreshed workspace components status.")}>Refresh</button>
              </div>

              {/* Metrics */}
              <div className="flex gap-2.5 p-4 shrink-0 border-b border-[#252538]">
                <div className="met flex-1 bg-[#12121c] border border-[#252538] rounded-lg p-3">
                  <div className="mlbl text-[10px] font-bold text-[#706a80] uppercase tracking-wider">Active Agents</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="mval font-mono text-2xl font-bold text-[#f2f0f5]">4</span>
                    <span className="text-[11px] text-[#4ade80]">↑ +2 live</span>
                  </div>
                </div>
                <div className="met flex-1 bg-[#12121c] border border-[#252538] rounded-lg p-3">
                  <div className="mlbl text-[10px] font-bold text-[#706a80] uppercase tracking-wider">Tasks Today</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="mval font-mono text-2xl font-bold text-[#f2f0f5]">47</span>
                    <span className="text-[11px] text-[#706a80]">12 pending</span>
                  </div>
                </div>
                <div className="met flex-1 bg-[#12121c] border border-[#252538] rounded-lg p-3">
                  <div className="mlbl text-[10px] font-bold text-[#706a80] uppercase tracking-wider">Tokens Spent</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="mval font-mono text-2xl font-bold bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">2.4M</span>
                    <span className="text-[11px] text-[#fbbf24]">18% limit</span>
                  </div>
                </div>
                <div className="met flex-1 bg-[#12121c] border border-[#252538] rounded-lg p-3">
                  <div className="mlbl text-[10px] font-bold text-[#706a80] uppercase tracking-wider">Budget limit</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="mval font-mono text-2xl font-bold text-[#f2f0f5]">$1.84</span>
                    <span className="text-[11px] text-[#706a80]">of $10.00</span>
                  </div>
                </div>
              </div>

              {/* Kanban board */}
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 p-4 flex gap-3.5 overflow-x-auto">
                  
                  {/* Column 1: Queued */}
                  <div className="kcol w-[240px] shrink-0 bg-[#12121c] border border-[#252538] rounded-xl p-3 flex flex-col gap-2.5 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-1 shrink-0">
                      <div className="d d-q w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                      <span className="text-[11px] font-bold text-[#fbbf24] uppercase tracking-wider">Queued</span>
                      <span className="ml-auto font-mono text-xs text-[#706a80]">2</span>
                    </div>
                    
                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-3 hover:border-[#b0a8c2] transition-all">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-7 h-7 bg-[#322015] border border-[#78350f] rounded-lg flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#f2f0f5] truncate">Analyze Q3 Data</div>
                          <div className="text-[11px] text-[#706a80]">Priority High</div>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#b0a8c2] line-clamp-2">Parse SEC filings, extract financial targets vs Q2.</p>
                      <div className="flex items-center gap-1 text-[11px] text-[#706a80] mt-3.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        <span>8 min</span>
                        <div className="flex-1" />
                        <span className="b bz text-[9px] py-0.5 px-1 bg-[#1c1c2b] border border-[#252538] rounded text-[#706a80]">Claude 4</span>
                      </div>
                    </div>

                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-3 hover:border-[#b0a8c2] transition-all">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-7 h-7 bg-[#23153c] border border-[#4c1d95] rounded-lg flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#f2f0f5] truncate">Docs Generator</div>
                          <div className="text-[11px] text-[#706a80]">Priority Med</div>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#b0a8c2] line-clamp-2">Auto-generate OpenAPI 3.1 documentation from workspace code.</p>
                      <div className="flex items-center gap-1 text-[11px] text-[#706a80] mt-3.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        <span>4 min</span>
                        <div className="flex-1" />
                        <span className="b bz text-[9px] py-0.5 px-1 bg-[#1c1c2b] border border-[#252538] rounded text-[#706a80]">GPT-4o</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Running */}
                  <div className="kcol w-[240px] shrink-0 bg-[#12121c] border border-[#252538] rounded-xl p-3 flex flex-col gap-2.5 overflow-y-auto border-l-[#22c55e]/30">
                    <div className="flex items-center gap-2 mb-1 shrink-0">
                      <div className="d d-r w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                      <span className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider">Running</span>
                      <span className="ml-auto font-mono text-xs text-[#706a80]">2</span>
                    </div>

                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-3 border-[#22d3ee]/20 shadow-[0_0_12px_rgba(34,211,238,0.04)]" onClick={() => setActiveView("ide")}>
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-7 h-7 bg-[#12283a] border border-[#164e63] rounded-lg flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#f2f0f5] truncate">Research Competitors</div>
                          <div className="text-[11px] text-[#22d3ee] font-mono">Researcher · 4m</div>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#b0a8c2] line-clamp-2">Scanning 24 target competitor pricing pages...</p>
                      <div className="my-3">
                        <div className="flex justify-between text-[10px] text-[#706a80] mb-1">
                          <span>Scraping Page 16</span>
                          <span>{rp1}%</span>
                        </div>
                        <div className="pg h-1 bg-[#252538] rounded overflow-hidden">
                          <div className="pf pg_g h-full bg-[#4ade80]" style={{ width: `${rp1}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#706a80] mt-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        <span>$0.18</span>
                        <div className="flex-1" />
                        <span className="b bz text-[9px] py-0.5 px-1 bg-[#12283a] text-[#22d3ee] border border-[#164e63] rounded">Research</span>
                      </div>
                    </div>

                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-3 border-[#7c3aed]/30 shadow-[0_0_12px_rgba(124,58,237,0.06)]">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-7 h-7 bg-[#23153c] border border-[#4c1d95] rounded-lg flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#f2f0f5] truncate">Refactor Auth JWT</div>
                          <div className="text-[11px] text-[#a78bfa] font-mono">Coder · 12m</div>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#b0a8c2] line-clamp-2">Swapping token hooks, verifying Supabase calls.</p>
                      <div className="my-3">
                        <div className="flex justify-between text-[10px] text-[#706a80] mb-1">
                          <span>Writing auth.test.ts</span>
                          <span>{rp2}%</span>
                        </div>
                        <div className="pg h-1 bg-[#252538] rounded overflow-hidden">
                          <div className="pf pv h-full bg-[#7c3aed]" style={{ width: `${rp2}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#706a80] mt-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        <span>$0.51</span>
                        <div className="flex-1" />
                        <span className="b bz text-[9px] py-0.5 px-1 bg-[#23153c] text-[#a78bfa] border border-[#4c1d95] rounded">Coder</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Reviewing */}
                  <div className="kcol w-[240px] shrink-0 bg-[#12121c] border border-[#252538] rounded-xl p-3 flex flex-col gap-2.5 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-1 shrink-0">
                      <div className="d d-v w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
                      <span className="text-[11px] font-bold text-[#22d3ee] uppercase tracking-wider">Reviewing</span>
                      <span className="ml-auto font-mono text-xs text-[#706a80]">1</span>
                    </div>

                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-3 border-[#22d3ee]/20">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-7 h-7 bg-[#12283a] border border-[#164e63] rounded-lg flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#f2f0f5] truncate">Marketing Copy v2</div>
                          <div className="text-[11px] text-[#706a80]">Awaiting approval</div>
                        </div>
                      </div>
                      <div className="bg-[#12121c] border border-[#252538] border-l-2 border-l-[#22d3ee] rounded-md p-2 text-xs text-[#b0a8c2] italic mb-3">
                        "The AI OS that thinks, builds, and ships — while you sleep."
                      </div>
                      <button className="w-full text-center py-1.5 bg-[#12283a] hover:bg-[#163852] text-[#22d3ee] border border-[#164e63] rounded text-xs" onClick={() => addToast("Marketing Headline copy approved & shipped.")}>✓ Approve &amp; Deploy</button>
                    </div>
                  </div>

                  {/* Column 4: Complete */}
                  <div className="kcol w-[240px] shrink-0 bg-[#12121c] border border-[#252538] rounded-xl p-3 flex flex-col gap-2.5 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-1 shrink-0">
                      <div className="d d-d w-1.5 h-1.5 rounded-full bg-[#706a80]" />
                      <span className="text-[11px] font-bold text-[#706a80] uppercase tracking-wider">Completed</span>
                      <span className="ml-auto font-mono text-xs text-[#706a80]">14</span>
                    </div>

                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-2.5 opacity-60 hover:opacity-90 transition-opacity">
                      <div className="flex items-center gap-2 text-xs text-[#b0a8c2] font-semibold">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        <span>Build landing page hero</span>
                      </div>
                      <div className="text-[10px] text-[#706a80] mt-1.5 font-mono">2h ago · $0.12</div>
                    </div>
                    <div className="card bg-[#171724] border border-[#252538] rounded-lg p-2.5 opacity-60 hover:opacity-90 transition-opacity">
                      <div className="flex items-center gap-2 text-xs text-[#b0a8c2] font-semibold">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        <span>Database migration</span>
                      </div>
                      <div className="text-[10px] text-[#706a80] mt-1.5 font-mono">3h ago · $0.22</div>
                    </div>
                  </div>

                </div>

                {/* Right activity list */}
                <div className="w-[270px] shrink-0 border-l border-[#252538] flex flex-col bg-[#12121c]">
                  <div className="px-3.5 py-2.5 border-b border-[#252538] text-xs font-bold text-[#b0a8c2] flex items-center gap-1.5 shrink-0">
                    <div className="d d-r w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                    <span>Live Activity Feed</span>
                  </div>
                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
                    {feedItems.map((item, idx) => (
                      <div key={idx} className="fr flex gap-2 border-b border-[#252538]/50 pb-2.5 last:border-0 last:pb-0 text-xs">
                        <div className="font-mono text-[#706a80] shrink-0">{item.t}</div>
                        <div className="flex-1">
                          <span className="font-bold text-[#a78bfa]">{item.a}:</span>{" "}
                          <span className="text-[#b0a8c2]">{item.m}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: AGENT IDE */}
          {activeView === "ide" && (
            <div className="flex flex-1 overflow-hidden">
              {/* Left Chat panel */}
              <div className="w-[360px] shrink-0 border-r border-[#252538] flex flex-col bg-[#12121c]">
                <div className="p-3.5 border-b border-[#252538] flex items-center gap-2 shrink-0">
                  <div className="w-7 h-7 bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] rounded-full flex items-center justify-center text-xs font-bold text-white">C</div>
                  <div>
                    <div className="text-xs font-semibold text-[#f2f0f5]">Coder Agent</div>
                    <div className="text-[10px] text-[#4ade80] flex items-center gap-1">
                      <div className="w-1 h-1 bg-[#4ade80] rounded-full" />
                      <span>Running refactoring module</span>
                    </div>
                  </div>
                </div>

                {/* Chat content */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-[#23153c] border border-[#4c1d95]/30 rounded-xl rounded-br-none p-3 text-xs text-[#f2f0f5] leading-relaxed">
                      Migrate our JWT authentication to Supabase auth. Keep existing middleware patterns, add refresh token rotation, and write tests for all auth flows.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">C</div>
                    <div className="flex-1 max-w-[85%] bg-[#171724] border border-[#252538] rounded-xl rounded-bl-none p-3 text-xs text-[#b0a8c2] leading-relaxed">
                      ✓ Analyzing current JWT implementation... Found <code className="text-[#22d3ee] font-mono">src/middleware/auth.ts</code> and <code className="text-[#22d3ee] font-mono">src/utils/jwt.ts</code>.<br/><br/>
                      Transforming verify() logic to use Supabase sessions, writing auth validation tests...
                    </div>
                  </div>

                  {/* Typing action indicator */}
                  <div className="flex gap-2 items-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0">C</div>
                    <div className="bg-[#171724] border border-[#252538] rounded-xl rounded-bl-none px-3 py-2 text-xs text-[#706a80] flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                        <div className="w-1.5 h-1.5 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                      </div>
                      <span>Writing auth.test.ts</span>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="p-3 border-t border-[#252538] shrink-0">
                  <div className="bg-[#171724] border border-[#252538] rounded-lg p-1.5 flex items-center gap-2">
                    <input className="bg-transparent border-0 outline-none text-xs text-[#f2f0f5] flex-1 px-1.5 py-1 placeholder-[#706a80]" placeholder="Instruct Coder Agent..." />
                    <button className="bg-[#7c3aed] hover:bg-[#8b5cf6] text-white p-1.5 rounded-md" onClick={() => addToast("Instruction dispatched to Coder Agent.")}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Code Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#07070a]">
                <div className="tbar border-b border-[#252538] flex shrink-0 bg-[#12121c] px-3.5">
                  <div className={`t ${activeIDETab === "code" ? "on" : ""}`} onClick={() => setActiveIDETab("code")}>auth.ts</div>
                  <div className={`t ${activeIDETab === "test" ? "on" : ""}`} onClick={() => setActiveIDETab("test")}>auth.test.ts</div>
                  <div className={`t ${activeIDETab === "term" ? "on" : ""}`} onClick={() => setActiveIDETab("term")}>Terminal</div>
                  <div className={`t ${activeIDETab === "browser" ? "on" : ""}`} onClick={() => setActiveIDETab("browser")}>API Preview</div>
                </div>

                {activeIDETab === "code" && (
                  <div className="flex flex-1 overflow-hidden">
                    {/* Explorer sidebar */}
                    <div className="w-[160px] border-r border-[#252538] bg-[#12121c] p-2 flex flex-col gap-1 shrink-0 overflow-y-auto">
                      <div className="text-[10px] font-bold text-[#706a80] uppercase tracking-wider px-1.5 py-1">Explorer</div>
                      <div className="ft px-2 py-1 rounded text-[#b0a8c2] hover:bg-[#1c1c2b] text-[11.5px] font-mono">src/</div>
                      <div className="ft px-2 py-1 rounded text-[#b0a8c2] hover:bg-[#1c1c2b] text-[11.5px] font-mono pl-5">middleware/</div>
                      <div className="ft on px-2 py-1 rounded bg-[#23153c] text-[#a78bfa] text-[11.5px] font-mono pl-8">auth.ts</div>
                      <div className="ft px-2 py-1 rounded text-[#b0a8c2] hover:bg-[#1c1c2b] text-[11.5px] font-mono pl-5">utils/</div>
                    </div>

                    {/* Editor canvas */}
                    <div className="flex-1 overflow-auto flex py-3">
                      <div className="gut text-right px-3 text-[#706a80] font-mono border-r border-[#252538]/30 select-none">
                        1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10<br/>11<br/>12<br/>13
                      </div>
                      <div className="cod px-4 text-xs font-mono text-[#f2f0f5]">
                        <span className="cc">// src/middleware/auth.ts — Supabase auth migration</span><br/>
                        <span className="ck text-[#c084fc]">import</span> <span className="cv">{"{ createClient }"}</span> <span className="ck text-[#c084fc]">from</span> <span className="cs text-[#4ade80]">{"'@supabase/supabase-js'"}</span><span className="cv">;</span><br/>
                        <span className="ck text-[#c084fc]">import</span> <span className="cv">{"{ Request, Response, NextFunction }"}</span> <span className="ck text-[#c084fc]">from</span> <span className="cs text-[#4ade80]">{"'express'"}</span><span className="cv">;</span><br/>
                        <br/>
                        <span className="ck text-[#c084fc]">const</span> <span className="cv">supabase</span> <span className="cv">=</span> <span className="cf text-[#22d3ee]">createClient</span><span className="cv">(</span><br/>
                        &nbsp;&nbsp;<span className="cv">process.env.SUPABASE_URL!,</span><br/>
                        &nbsp;&nbsp;<span className="cv">process.env.SUPABASE_ANON_KEY!</span><br/>
                        <span className="cv">);</span><br/>
                        <br/>
                        <span className="ck text-[#c084fc]">export const</span> <span className="cf text-[#22d3ee]">authMiddleware</span> <span className="cv">=</span> <span className="ck text-[#c084fc]">async</span> <span className="cv">(req, res, next) =&gt; {"{"}</span><br/>
                        &nbsp;&nbsp;<span className="ck text-[#c084fc]">const</span> <span className="cv">token = req.headers.authorization?.split(' ')[1];</span><br/>
                        &nbsp;&nbsp;<span className="ck text-[#c084fc]">if</span> <span className="cv">(!token)</span> <span className="ck text-[#c084fc]">return</span> <span className="cv">res.status(401).json({"{ error: 'Unauthorized' }"});</span><br/>
                        <br/>
                        &nbsp;&nbsp;<span className="ck text-[#c084fc]">const</span> <span className="cv">{"{ data }"} =</span> <span className="ck text-[#c084fc]">await</span> <span className="cv">supabase.auth.getUser(token);</span><br/>
                        &nbsp;&nbsp;<span className="cur"></span>
                      </div>
                    </div>
                  </div>
                )}

                {activeIDETab === "test" && (
                  <div className="flex-1 overflow-auto flex py-3 bg-[#07070a]">
                    <div className="gut text-right px-3 text-[#706a80] font-mono border-r border-[#252538]/30">1<br/>2<br/>3<br/>4<br/>5</div>
                    <div className="cod px-4 text-xs font-mono text-[#f2f0f5]">
                      <span className="cc">// src/tests/auth.test.ts</span><br/>
                      <span className="ck text-[#c084fc]">import</span> <span className="cv">{"{ authMiddleware }"}</span> <span className="ck text-[#c084fc]">from</span> <span className="cs text-[#4ade80]">{"'../middleware/auth'"}</span><span className="cv">;</span><br/>
                      <span className="cf text-[#22d3ee]">describe</span><span className="cv">(</span><span className="cs text-[#4ade80]">"Auth validation suite"</span><span className="cv">, () =&gt; {"{"}</span><br/>
                      &nbsp;&nbsp;<span className="cf text-[#22d3ee]">it</span><span className="cv">(</span><span className="cs text-[#4ade80]">"should return 401 on empty header"</span><span className="cv">, () =&gt; {"{ ... }"});</span><br/>
                      <span className="cv">{"}"});</span>
                    </div>
                  </div>
                )}

                {activeIDETab === "term" && (
                  <div className="flex-1 p-4 overflow-y-auto bg-black font-mono text-xs leading-relaxed text-[#b0a8c2]">
                    <div className="tr">
                      <span className="tp text-[#22c55e]">→</span> <span className="tc text-white">npm install @supabase/supabase-js</span><br/>
                      <span className="to text-[#706a80]">added 14 packages, audited 847 packages in 4.2s</span><br/>
                      <br/>
                      <span className="tp text-[#22c55e]">→</span> <span className="tc text-white">npx ts-node scripts/migrate-auth.ts</span><br/>
                      <span className="ti text-[#22d3ee]">[migrate] Reading auth.ts ... 312 lines</span><br/>
                      <span className="to text-[#706a80]">[migrate] Transforming verify() calls → 8 instances swapped</span><br/>
                      <span className="tp text-[#22c55e]">[migrate] Done. 7 files successfully updated.</span><br/>
                      <br/>
                      <span className="tp text-[#22c55e]">→</span> <span className="cur"></span>
                    </div>
                  </div>
                )}

                {activeIDETab === "browser" && (
                  <div className="flex-1 flex flex-col bg-[#07070a]">
                    <div className="bg-[#12121c] border-b border-[#252538] px-3.5 py-1.5 flex items-center gap-2 text-xs">
                      <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /><div className="w-2 h-2 rounded-full bg-[#fbbf24]" /><div className="w-2 h-2 rounded-full bg-[#22c55e]" /></div>
                      <div className="bg-black border border-[#252538] rounded px-3 py-1 font-mono text-[11.5px] text-[#b0a8c2] flex-1">http://localhost:3000/api/auth/status</div>
                    </div>
                    <pre className="p-4 font-mono text-xs text-[#22d3ee] leading-relaxed overflow-auto">
{`{
  "status": "ok",
  "auth_provider": "supabase",
  "jwt_algo": "ES256",
  "session_ttl": 3600,
  "refresh_rotation": true,
  "endpoints": ["/auth/login", "/auth/refresh", "/auth/logout"]
}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: DEEP RESEARCH */}
          {activeView === "research" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-[18px] py-3 border-b border-[#252538] flex items-center shrink-0">
                <div>
                  <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-[#f2f0f5] to-[#9c89b8] bg-clip-text text-transparent">Deep Research</h1>
                  <p className="text-xs text-[#706a80] mt-0.5">Multi-hop literature mapping graph</p>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 bg-[#171724] border border-[#252538] rounded-md px-2.5 py-1 text-xs text-[#22d3ee] font-mono">
                  <span>2 active tasks running</span>
                </div>
              </div>

              <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Column 1: Root */}
                <div className="w-[260px] shrink-0 bg-[#12121c] border border-[#252538] rounded-xl flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-[#252538] bg-[#171724] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#b0a8c2] uppercase tracking-wider">01 · Root query</span>
                    <span className="b bv text-[9px] py-0.5 px-1 bg-[#23153c] text-[#a78bfa] border border-[#4c1d95] rounded">seed</span>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2.5">
                    <div className="card bg-[#171724] border border-[#7c3aed]/30 p-2.5 rounded-lg shadow-[0_0_12px_rgba(124,58,237,0.05)]">
                      <div className="text-xs font-bold text-white">"Supabase JWT verification"</div>
                      <p className="text-[11px] text-[#706a80] mt-1.5 leading-normal">Initial search query for GoTrue middleware token validation patterns.</p>
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#b0a8c2] mt-3 pt-2 border-t border-[#252538]/50">
                        <span>18 sources</span>
                        <span className="text-[#4ade80]">Passed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Web hops */}
                <div className="w-[280px] shrink-0 bg-[#12121c] border border-[#252538] rounded-xl flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-[#252538] bg-[#171724] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#b0a8c2] uppercase tracking-wider">02 · Discovered Sources</span>
                    <span className="b bc text-[9px] py-0.5 px-1 bg-[#12283a] text-[#22d3ee] border border-[#164e63] rounded">12 links</span>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3">
                    <div className="card bg-[#171724] border border-[#252538] p-3 rounded-lg hover:border-[#b0a8c2] transition-colors" onClick={() => addToast("Selected repository codebase reference.")}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="b bz text-[9px] px-1 bg-[#1e1e2d] text-[#b0a8c2] border border-[#252538] rounded">GitHub</span>
                        <span className="text-[10px] text-[#706a80] font-mono">4.8k ★</span>
                      </div>
                      <div className="text-xs font-bold text-white">supabase/supabase-js</div>
                      <p className="text-[11px] text-[#706a80] mt-1">Official repository docs for client auth-helpers.</p>
                    </div>

                    <div className="card bg-[#171724] border border-[#252538] p-3 rounded-lg hover:border-[#b0a8c2] transition-colors" onClick={() => addToast("Selected official API reference docs.")}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="b bz text-[9px] px-1 bg-[#1e1e2d] text-[#b0a8c2] border border-[#252538] rounded">Docs</span>
                        <span className="text-[10px] text-[#706a80]">2d ago</span>
                      </div>
                      <div className="text-xs font-bold text-white">Auth Architecture Guide</div>
                      <p className="text-[11px] text-[#706a80] mt-1">Reference manuals explaining JWT payload verification steps.</p>
                    </div>
                  </div>
                </div>

                {/* Column 3: SVG relation canvas */}
                <div className="flex-1 bg-[#12121c] border border-[#252538] rounded-xl flex flex-col overflow-hidden relative">
                  <div className="p-3 border-b border-[#252538] bg-[#171724] flex items-center justify-between text-xs z-10 shrink-0">
                    <span className="font-bold text-[#b0a8c2] uppercase tracking-wider">03 · Graph Visualizer</span>
                    <span className="b bg text-[9px] py-0.5 px-1 bg-[#102d20] text-[#4ade80] border border-[#14532d] rounded">active</span>
                  </div>

                  <div className="flex-1 relative bg-black dgrid">
                    <svg className="absolute inset-0 w-full h-full">
                      <line className="ge-v" x1="100" y1="150" x2="210" y2="100" />
                      <line className="ge-c" x1="210" y1="100" x2="340" y2="70" />
                      <line className="ge" x1="210" y1="100" x2="320" y2="190" />
                      <line className="ge-g" x1="100" y1="150" x2="180" y2="240" />

                      {/* JWT seed */}
                      <g className="gn" onClick={() => addToast("Clicked 'JWT' root node.")}>
                        <circle cx="100" cy="150" r="20" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" strokeWidth="2" />
                        <text x="100" y="153" textAnchor="middle" fill="white" className="font-mono text-[9px] font-bold">JWT</text>
                      </g>

                      {/* Client */}
                      <g className="gn" onClick={() => addToast("Clicked 'Client' reference node.")}>
                        <circle cx="210" cy="100" r="17" fill="rgba(34,211,238,0.12)" stroke="#22d3ee" strokeWidth="2" />
                        <text x="210" y="103" textAnchor="middle" fill="white" className="font-mono text-[8.5px]">Client</text>
                      </g>

                      {/* GoTrue */}
                      <g className="gn" onClick={() => addToast("Clicked 'GoTrue' node.")}>
                        <circle cx="340" cy="70" r="14" fill="#171724" stroke="#252538" strokeWidth="1.5" />
                        <text x="340" y="73" textAnchor="middle" fill="#b0a8c2" className="font-mono text-[8px]">GoTrue</text>
                      </g>

                      {/* JWKS */}
                      <g className="gn" onClick={() => addToast("Clicked 'JWKS' certificate node.")}>
                        <circle cx="320" cy="190" r="14" fill="#171724" stroke="#252538" strokeWidth="1.5" />
                        <text x="320" y="193" textAnchor="middle" fill="#b0a8c2" className="font-mono text-[8px]">JWKS</text>
                      </g>
                    </svg>

                    <div className="absolute bottom-3.5 left-3.5 bg-[#171724] border border-[#252538] p-3 rounded-lg max-w-[200px]">
                      <div className="text-xs font-bold text-white">Relation Map</div>
                      <p className="text-[10px] text-[#706a80] mt-1.5 leading-normal">Node clusters group by relevance tags. Click node circles to view citations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: AGENT COUNCIL (Drag & Drop Node Board) */}
          {activeView === "council" && (
            <div className="flex flex-col flex-1 overflow-hidden" onPointerMove={handlePointerMove}>
              <div className="px-[18px] py-3 border-b border-[#252538] flex items-center shrink-0">
                <div>
                  <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-[#f2f0f5] to-[#9c89b8] bg-clip-text text-transparent">Agent Council</h1>
                  <p className="text-xs text-[#706a80] mt-0.5">Visual orchestration and messaging pipeline</p>
                </div>
                <div className="flex-1" />
                <div className="flex gap-2">
                  <button className="btn bou border border-[#252538] text-xs px-3 py-1 rounded" onClick={spawnNode}>+ Spawn Node</button>
                  <button className="btn bpr bg-[#7c3aed] text-white hover:bg-[#8b5cf6] text-xs px-3 py-1 rounded" onClick={() => addToast("Saved Council node coordinate pipeline changes.")}>Save Pipeline</button>
                </div>
              </div>

              {/* Node Board Canvas */}
              <div ref={canvasRef} className="flex-1 relative bg-black dgrid overflow-hidden">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {nodes.find(n => n.id === "n1") && nodes.find(n => n.id === "n2") && (
                    <line className="ge-v" x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} />
                  )}
                  {nodes.find(n => n.id === "n2") && nodes.find(n => n.id === "n4") && (
                    <line className="ge-c" x1={c2.x} y1={c2.y} x2={c4.x} y2={c4.y} />
                  )}
                  {nodes.find(n => n.id === "n1") && nodes.find(n => n.id === "n3") && (
                    <line className="ge-g" x1={c1.x} y1={c1.y} x2={c3.x} y2={c3.y} />
                  )}
                  {nodes.find(n => n.id === "n3") && nodes.find(n => n.id === "n4") && (
                    <line className="ge" x1={c3.x} y1={c3.y} x2={c4.x} y2={c4.y} />
                  )}
                </svg>

                {nodes.map(node => (
                  <div
                    key={node.id}
                    id={node.id}
                    className={`card absolute w-[220px] p-3 rounded-lg bg-[#12121c] border z-[5] cursor-grab select-none ${node.id === draggingId ? "opacity-60 border-[#7c3aed]" : "border-[#252538] hover:border-[#b0a8c2]"} ${node.type === "input" ? "border-l-2 border-l-[#7c3aed]" : node.type === "active" ? "border-l-2 border-l-[#22c55e]" : node.type === "review" ? "border-l-2 border-l-[#22d3ee]" : "border-l-2 border-l-[#fbbf24]"}`}
                    style={{ left: node.x, top: node.y, touchAction: "none" }}
                    onPointerDown={(e) => handlePointerDown(e, node.id)}
                    onPointerUp={handlePointerUp}
                  >
                    <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#252538] text-[10px] font-bold text-[#706a80] uppercase tracking-wider">
                      <span>{node.label}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ml-auto ${node.type === "active" ? "bg-[#4ade80]" : node.type === "input" ? "bg-[#7c3aed]" : node.type === "review" ? "bg-[#22d3ee]" : "bg-[#fbbf24]"}`} />
                    </div>
                    <div className="text-xs font-bold text-white">{node.title}</div>
                    <p className="text-[11px] text-[#706a80] mt-1.5 leading-normal">{node.desc}</p>
                  </div>
                ))}

                <div className="absolute top-4 right-4 bg-[#171724] border border-[#252538] p-3 rounded-lg max-w-[240px]">
                  <div className="text-xs font-bold text-white">Workspace Canvas</div>
                  <p className="text-[10px] text-[#706a80] mt-1.5 leading-normal">Drag and drop agent cards to adjust execution pipelines. Edges automatically recalculate coordinates.</p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: SYSTEM LOGS */}
          {activeView === "terminal" && (
            <div className="flex flex-col flex-1 overflow-hidden bg-black">
              <div className="px-4 py-3 border-b border-[#252538] bg-[#12121c] flex items-center shrink-0">
                <div>
                  <h1 className="text-xs font-bold font-mono text-[#22d3ee]">core-systemd-logs</h1>
                  <p className="text-[10px] text-[#706a80] mt-0.5">Stdout stream log listener daemon</p>
                </div>
                <div className="flex-1" />
                <button className="btn bou border border-[#252538] text-xs px-3 py-1 rounded text-[#b0a8c2] hover:text-white" onClick={() => setSysLogs(["[console logs cleared]"])}>Clear Logs</button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed text-[#b0a8c2]">
                {sysLogs.map((log, idx) => {
                  let cls = "to";
                  if (log.includes("[success]")) cls = "tp text-[#22c55e]";
                  else if (log.includes("[debug]")) cls = "ti text-[#22d3ee]";
                  else if (log.includes("[warn]")) cls = "tw text-[#fbbf24]";
                  return (
                    <div key={idx} className={cls}>
                      {log}
                    </div>
                  );
                })}
                <div className="cur mt-1" />
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FOOTER STATUS BAR */}
      <footer id="stat" className="h-5.5 bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] flex items-center px-3.5 gap-3.5 text-[11px] text-[#f2f0f5] shrink-0 z-[40]">
        <div className="flex items-center gap-1.5 font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>PIPELINE: ACTIVE</span>
        </div>
        <span>|</span>
        <span>MODEL: {model.toUpperCase()}</span>
        <span>|</span>
        <span>PORT: 3000</span>
        <span>|</span>
        <span>LINT: PASSED</span>
        <div className="flex-1" />
        <span className="font-mono">{sysTime}</span>
      </footer>

      {/* TOAST CONTAINER */}
      <div id="toast-box" className="fixed bottom-8 right-5 flex flex-col gap-2 z-[300] pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#171724] border border-[#3c3c54] border-l-4 border-l-[#7c3aed] p-3 rounded-lg shadow-xl max-w-xs text-xs pointer-events-auto text-[#f2f0f5] font-semibold"
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname } = window.location;
  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const previewPath = getPreviewPath();

  if (previewPath) {
    return (
      <PreviewRenderer
        componentPath={previewPath}
        modules={discoveredModules}
      />
    );
  }

  return <TheCoreDashboard />;
}

export default App;
