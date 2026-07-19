import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Paperclip, Download, Globe } from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function ResearchMode() {
  const { isStreaming, researchText, citations } = useWebSocketContext();
  const { activeProjectId } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { nodes, edges, nodeMap } = useMemo(() => {
    return getDynamicGraph(researchText);
  }, [researchText]);

  // Preprocess text to replace standard [1] style citations with custom markdown links for bubble styling
  const processedText = useMemo(() => {
    if (!researchText) return "";
    return researchText.replace(/\[([0-9]+)\]/g, "[citation-$1](#citation-$1)");
  }, [researchText]);

  const handleExport = () => {
    if (!researchText) return;
    
    let markdown = `# Research Report\n\n`;
    markdown += researchText;
    
    if (citations && citations.length > 0) {
      markdown += `\n\n## References\n`;
      citations.forEach((url, idx) => {
        markdown += `[${idx + 1}] ${url}\n`;
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
      <div className="px-5 py-3 border-b border-border-core flex items-center gap-3 flex-shrink-0 bg-[#0a0a0a]">
        <span className="text-xs font-mono text-text-secondary">Knowledge Graph</span>
        <span className="text-[#222222]">/</span>
        <span className="text-xs font-mono text-white">Research Feed</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary">
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            {isStreaming ? "Traversing..." : `${nodes.length} nodes | ${edges.length} edges`}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!researchText}
            className="border-border-core text-text-secondary hover:text-text-primary bg-[#0a0a0a] text-[10px] h-7 px-2 font-mono"
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>

          {/* Attach */}
          <button
            type="button"
            onClick={openPicker}
            disabled={!activeProjectId}
            title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
            className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main content body with Resizable Panels */}
      <div className="flex-1 min-h-0 relative">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Panel: Graph Canvas */}
          <ResizablePanel defaultSize={50} minSize={30} className="relative flex flex-col bg-app-bg">
            <div className="flex-1 relative overflow-hidden">
              <svg
                viewBox="0 0 760 460"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <radialGradient id="primary-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>

                {edges.map((edge, i) => {
                  const a = nodeMap[edge.from];
                  const b = nodeMap[edge.to];
                  const active = hoveredNode === edge.from || hoveredNode === edge.to
                              || selectedNode === edge.from || selectedNode === edge.to;
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={active ? "white" : "#222222"}
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
                      {active && <circle r={node.r + 5} fill="none" stroke="white" strokeWidth="1" />}
                      <circle
                        r={node.r}
                        fill={node.primary ? "#222222" : active ? "#111111" : "#0a0a0a"}
                        stroke={node.primary ? "white" : active ? "#aaaaaa" : "#222222"}
                        strokeWidth={node.primary ? 1.5 : 1}
                      />
                      {lines.map((line, li) => (
                        <text
                          key={li}
                          y={(li - (lines.length - 1) / 2) * 11}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={node.primary ? 9 : 7.5}
                          fill={node.primary ? "white" : active ? "#e0e0e0" : "#a0a0a0"}
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
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#0a0a0a] border border-border-core rounded font-mono text-xs text-white z-10"
                >
                  {nodeMap[selectedNode]?.label.replace("\n", " ")}
                  <span className="text-text-secondary ml-2">Click to deselect</span>
                </motion.div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-[#222222]" />

          {/* Right Panel: Research Report & Sources */}
          <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col bg-[#0a0a0a] border-l border-border-core">
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="space-y-6 pb-20">
                  {researchText ? (
                    <div className="prose prose-invert max-w-none text-xs leading-relaxed font-mono">
                      <ReactMarkdown
                        components={{
                          a({ href, children }) {
                            if (href && href.startsWith("#citation-")) {
                              const num = href.replace("#citation-", "");
                              return (
                                <span 
                                  className="inline-flex items-center justify-center w-4 h-4 mx-0.5 rounded-full bg-[#222222] border border-[#444444] text-[9px] font-bold text-white align-middle hover:bg-[#333333] hover:border-white transition-all cursor-pointer select-none"
                                  title={`Citation [${num}]`}
                                >
                                  {num}
                                </span>
                              );
                            }
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#a0a0a0]">
                                {children}
                              </a>
                            );
                          }
                        }}
                      >
                        {processedText}
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
                  
                  {/* Sources / Citations list using Vercel Card styling */}
                  {citations && citations.length > 0 && (
                    <div className="border-t border-border-core pt-5 mt-8">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-white" />
                        Crawled Sources
                      </h4>
                      <ul className="grid grid-cols-1 gap-2">
                        {citations.map((url: string, index: number) => (
                          <li key={index} className="text-[10px] font-mono">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="vercel-card flex items-center gap-2.5 p-3 text-[#a0a0a0] hover:text-white truncate"
                            >
                              <span className="text-white font-bold flex-shrink-0">[{index + 1}]</span>
                              <span className="truncate">{url}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </motion.div>
  );
}
