import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Paperclip, Download, Globe, ChevronDown, ChevronRight, BookMarked } from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebSocketStore, ResearchSource } from "@/store/websocketStore";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface GraphNode { id: string; label: string; x: number; y: number; r: number; primary?: boolean }
interface GraphEdge { from: string; to: string }

const NODES: GraphNode[] = [
  { id: "qec",   label: "Quantum Error\nCorrection", x: 380, y: 220, r: 30, primary: true },
  { id: "sc",    label: "Surface\nCodes",            x: 190, y: 120, r: 20 },
  { id: "lq",    label: "Logical\nQubits",           x: 570, y: 110, r: 18 },
  { id: "gai",   label: "Google AI\nQuantum",        x: 100, y: 270, r: 15 },
  { id: "hvd",   label: "Harvard Lab",               x: 650, y: 270, r: 15 },
  { id: "ft",    label: "Fault\nTolerance",          x: 220, y: 350, r: 18 },
  { id: "et",    label: "Error\nThreshold",          x: 520, y: 360, r: 15 },
  { id: "na",    label: "Neutral\nAtoms",            x: 670, y: 165, r: 13 },
  { id: "tq",    label: "Topological\nQubits",       x: 130, y: 400, r: 12 },
  { id: "arxiv", label: "arXiv\n2401.1234",          x: 370, y: 400, r: 11 },
];

const EDGES: GraphEdge[] = [
  { from: "qec", to: "sc"    }, { from: "qec", to: "lq"    },
  { from: "qec", to: "ft"    }, { from: "qec", to: "et"    },
  { from: "sc",  to: "gai"   }, { from: "sc",  to: "ft"    },
  { from: "lq",  to: "hvd"   }, { from: "lq",  to: "na"    },
  { from: "hvd", to: "na"    }, { from: "ft",  to: "arxiv" },
  { from: "et",  to: "arxiv" }, { from: "ft",  to: "tq"    },
];

const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n]));


function getDynamicGraph(text: string) {
  if (!text) {
    return { nodes: NODES, edges: EDGES, nodeMap: NODE_MAP };
  }

  const terms: string[] = [];
  const headingRegex = /(?:^|\n)#+\s+([^\n]+)/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  
  let match;
  while ((match = headingRegex.exec(text)) !== null && terms.length < 12) {
    const heading = match[1].trim();
    if (heading && !terms.includes(heading)) {
      terms.push(heading);
    }
  }
  
  while ((match = boldRegex.exec(text)) !== null && terms.length < 12) {
    const bold = match[1].trim();
    if (bold && !terms.includes(bold)) {
      terms.push(bold);
    }
  }

  if (terms.length === 0) {
    return { nodes: NODES, edges: EDGES, nodeMap: NODE_MAP };
  }

  const centerX = 380;
  const centerY = 230;
  const radius = 160;

  const nodes: GraphNode[] = terms.map((term, i) => {
    let label = term;
    if (term.length > 15) {
      const words = term.split(" ");
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        label = words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
      }
    }

    const id = `node-${i}`;
    if (i === 0) {
      return { id, label, x: centerX, y: centerY, r: 28, primary: true };
    } else {
      const angle = ((i - 1) / (terms.length - 1)) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      return { id, label, x, y, r: 18 };
    }
  });

  const edges: GraphEdge[] = [];
  for (let i = 1; i < nodes.length; i++) {
    edges.push({ from: nodes[0].id, to: nodes[i].id });
  }

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return { nodes, edges, nodeMap };
}

// ── Citation badge shown inline in markdown text ──────────────────────────────

function CitationBadge({ id, sources }: { id: number; sources: ResearchSource[] }) {
  const src = sources.find(s => s.id === id);
  const [show, setShow] = useState(false);
  const domain = src ? (() => { try { return new URL(src.url).hostname.replace('www.', ''); } catch { return src.url; } })() : '';
  return (
    <sup
      className="relative inline-flex items-center cursor-pointer"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="inline-flex items-center gap-0.5 bg-accent-indigo/15 hover:bg-accent-indigo/30 text-accent-indigo text-[9px] font-mono px-1 py-0.5 rounded border border-accent-indigo/30 transition-colors">
        {domain && <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=12`} className="w-3 h-3" alt="" />}
        {domain ? `${domain} [${id}]` : `[${id}]`}
      </span>
      {show && src && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-56 bg-panel-bg border border-border-core rounded-lg p-2.5 shadow-xl text-left pointer-events-none">
          <div className="text-[10px] font-mono text-text-primary font-semibold line-clamp-2 mb-1">{src.title}</div>
          <div className="text-[9px] font-mono text-text-secondary line-clamp-3">{src.snippet}</div>
        </div>
      )}
    </sup>
  );
}

// ── Inline text renderer that replaces [N] with CitationBadge ─────────────────

function CitingText({ children, citations }: { children: string; citations: ResearchSource[] }) {
  const parts = children.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          return <CitationBadge key={i} id={parseInt(match[1])} sources={citations} />;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ResearchMode() {
  const isStreaming = useWebSocketStore(s => s.isStreaming);
  const researchText = useWebSocketStore(s => s.researchText);
  const citations = useWebSocketStore(s => s.citations);
  const researchOutline = useWebSocketStore(s => s.researchOutline);
  const researchGraphData = useWebSocketStore(s => s.researchGraphData);
  const researchSuggestions = useWebSocketStore(s => s.researchSuggestions);

  const { activeProjectId } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);
  const { sendResearch } = useWebSocketContext();

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(true);

  // Save to Notebook dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>("");
  const [notebooks, setNotebooks] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  // Research query stored for export/save metadata
  const [researchQuery, setResearchQuery] = useState("");

  const { nodes, edges, nodeMap } = useMemo(() => {
    if (researchGraphData && researchGraphData.nodes.length > 0) {
      const nodeMap = Object.fromEntries(researchGraphData.nodes.map(n => [n.id, n]));
      return { nodes: researchGraphData.nodes, edges: researchGraphData.edges, nodeMap };
    }
    return getDynamicGraph(researchText);
  }, [researchText, researchGraphData]);

  const handleExport = () => {
    if (!researchText) return;
    
    let markdown = `# Research Report\n\n`;
    markdown += researchText;
    
    if (citations && citations.length > 0) {
      markdown += `\n\n## References\n`;
      citations.forEach((c) => {
        markdown += `[${c.id}] ${c.title} — ${c.url}\n`;
      });
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `research-report-${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFollowUp = useCallback((s: string) => {
    sendResearch(s);
  }, [sendResearch]);

  const openSaveDialog = useCallback(async () => {
    setSaveDialogOpen(true);
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      const token = localStorage.getItem("archon_token") || "";
      const res = await fetch(`${protocol}://${host}:${port}/api/notebooks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.notebooks || []);
        setNotebooks(list);
        if (list.length > 0) setSelectedNotebookId(list[0].id);
      }
    } catch {
      // ignore fetch errors
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedNotebookId || !researchText) return;
    setSaving(true);
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      const token = localStorage.getItem("archon_token") || "";
      await fetch(`${protocol}://${host}:${port}/notebooks/${selectedNotebookId}/sources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          source_type: "text",
          content: researchText,
          metadata: {
            title: researchQuery || "Research Report",
            citations: citations.map(c => c.url)
          }
        })
      });
    } catch {
      // ignore
    }
    setSaving(false);
    setSaveDialogOpen(false);
  }, [selectedNotebookId, researchText, researchQuery, citations]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-app-bg"
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

      {/* Header */}
      <div className="px-5 py-3 border-b border-border-core/60 flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-mono text-text-secondary">Knowledge Graph</span>
        <span className="text-text-secondary">›</span>
        <span className="text-xs font-mono text-text-secondary truncate max-w-[200px]">
          {researchQuery || "Research Report"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary">
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-pulse" />}
            {isStreaming ? "Traversing..." : `${nodes.length} nodes · ${edges.length} edges`}
          </div>

          {researchText && !isStreaming && (
            <Button
              variant="outline"
              size="sm"
              onClick={openSaveDialog}
              className="border-border-core/60 text-text-secondary hover:text-text-primary bg-panel-bg/50 text-[10px] h-7 px-2 font-mono"
            >
              <BookMarked className="w-3.5 h-3.5 mr-1" />
              Save to Notebook
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!researchText}
            className="border-border-core/60 text-text-secondary hover:text-text-primary bg-panel-bg/50 text-[10px] h-7 px-2 font-mono"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export
          </Button>

          {/* Attach */}
          <button
            type="button"
            onClick={openPicker}
            disabled={!activeProjectId}
            title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
            className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main content body with Resizable Panels */}
      <div className="flex-1 min-h-0 relative">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Panel: Graph Canvas */}
          <ResizablePanel defaultSize={50} minSize={30} className="relative flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <svg
                viewBox="0 0 760 460"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <radialGradient id="primary-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(168,85,247,0.25)" />
                    <stop offset="100%" stopColor="rgba(168,85,247,0)" />
                  </radialGradient>
                  <filter id="node-glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {edges.map((edge, i) => {
                  const a = nodeMap[edge.from];
                  const b = nodeMap[edge.to];
                  if (!a || !b) return null;
                  const active = hoveredNode === edge.from || hoveredNode === edge.to
                              || selectedNode === edge.from || selectedNode === edge.to;
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={active ? "rgba(168,85,247,0.6)" : "rgba(80,50,130,0.2)"}
                      strokeWidth={active ? 1.5 : 1}
                    />
                  );
                })}

                {nodes.map((node) => {
                  const active = hoveredNode === node.id || selectedNode === node.id;
                  const lines = node.label.split("\n");
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    >
                      {node.primary && <circle r={node.r + 20} fill="url(#primary-glow)" />}
                      {active && <circle r={node.r + 5} fill="none" stroke="rgba(168,85,247,0.4)" strokeWidth="1" />}
                      <circle
                        r={node.r}
                        fill={node.primary ? "rgba(76,29,149,0.45)" : active ? "rgba(76,29,149,0.25)" : "rgba(20,10,40,0.55)"}
                        stroke={node.primary ? "rgba(168,85,247,0.75)" : active ? "rgba(168,85,247,0.55)" : "rgba(90,50,150,0.3)"}
                        strokeWidth={node.primary ? 1.5 : 1}
                        filter={active || node.primary ? "url(#node-glow)" : undefined}
                      />
                      {lines.map((line, li) => (
                        <text
                          key={li}
                          y={(li - (lines.length - 1) / 2) * 11}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={node.primary ? 9 : 7.5}
                          fill={node.primary ? "rgba(216,180,254,0.9)" : active ? "rgba(196,156,234,0.85)" : "rgba(130,90,180,0.65)"}
                          fontFamily="monospace"
                          className="pointer-events-none select-none"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </svg>

              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-panel-bg border border-border-core/60 rounded font-mono text-xs text-text-primary z-10 animate-fade-in"
                >
                  {nodeMap[selectedNode]?.label.replace("\n", " ")}
                  <span className="text-text-secondary ml-2">· click to deselect</span>
                </motion.div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border-core/40" />

          {/* Right Panel: Research Report & Sources */}
          <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col bg-slate-950/40 border-l border-border-core/20">
            {/* Outline progress strip */}
            {isStreaming && researchOutline.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border-core/30 flex-wrap flex-shrink-0">
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">Outline</span>
                {researchOutline.map((section, i) => (
                  <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-accent-indigo/30 text-accent-indigo/70 bg-accent-indigo/5">
                    {section}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="space-y-6 pb-20">
                  {researchText ? (
                    <div className="prose prose-invert max-w-none text-xs leading-relaxed font-mono">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p>
                              {React.Children.map(children, child =>
                                typeof child === "string"
                                  ? <CitingText citations={citations}>{child}</CitingText>
                                  : child
                              )}
                            </p>
                          )
                        }}
                      >
                        {researchText}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-text-secondary text-xs font-mono text-center px-4">
                      No research report yet.
                      <p className="text-[10px] mt-1 text-text-secondary/70">
                        Use the research input in the right sidebar to start a query.
                      </p>
                    </div>
                  )}

                  {/* Sources collapsible panel */}
                  {citations.length > 0 && (
                    <div className="border-t border-border-core/30 mt-6">
                      <button
                        onClick={() => setSourcesOpen(o => !o)}
                        className="flex items-center gap-2 w-full px-0 py-3 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {sourcesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <Globe className="w-3 h-3 text-accent-indigo" />
                        Sources ({citations.length})
                      </button>
                      {sourcesOpen && (
                        <div className="space-y-2 pb-4">
                          {citations.map((src) => {
                            const domain = (() => { try { return new URL(src.url).hostname.replace('www.',''); } catch { return src.url; } })();
                            return (
                              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-start gap-2 p-2 rounded border border-border-core/30 hover:border-accent-indigo/40 transition-colors group">
                                <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} className="w-4 h-4 mt-0.5 flex-shrink-0" alt="" />
                                <div className="min-w-0">
                                  <div className="text-[10px] font-mono text-accent-indigo/80 mb-0.5">[{src.id}] {domain}</div>
                                  <div className="text-xs text-text-primary font-mono line-clamp-1 group-hover:text-accent-indigo transition-colors">{src.title}</div>
                                  <div className="text-[10px] text-text-secondary font-mono line-clamp-2 mt-0.5">{src.snippet}</div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Follow-up suggestion chips */}
                  {!isStreaming && researchSuggestions.length > 0 && (
                    <div className="border-t border-border-core/30 pt-4 mt-4">
                      <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest mb-2">Follow-up questions</p>
                      <div className="flex flex-wrap gap-2">
                        {researchSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleFollowUp(s)}
                            className="text-[10px] font-mono px-3 py-1.5 rounded-full border border-border-core/50 text-text-secondary hover:border-accent-indigo/50 hover:text-accent-indigo transition-colors text-left"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Save to Notebook Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-panel-bg border border-border-core text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">Save to Notebook</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            {notebooks.length > 0 ? (
              <select
                value={selectedNotebookId}
                onChange={e => setSelectedNotebookId(e.target.value)}
                className="w-full bg-app-bg border border-border-core rounded px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-indigo/50"
              >
                {notebooks.map(nb => (
                  <option key={nb.id} value={nb.id}>{nb.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-mono text-text-secondary">No notebooks found.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(false)}
              className="text-[10px] font-mono border-border-core/60"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!selectedNotebookId || saving}
              className="bg-accent-indigo hover:bg-accent-indigo text-white text-[10px] font-mono"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
