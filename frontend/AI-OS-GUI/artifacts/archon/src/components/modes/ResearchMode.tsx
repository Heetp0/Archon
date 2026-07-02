import React, { useState } from "react";
import { motion } from "framer-motion";
import { Paperclip } from "lucide-react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useFileAttach } from "@/hooks/useFileAttach";

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

export default function ResearchMode() {
  const { isStreaming } = useWebSocketContext();
  const { activeProjectId } = useProjectsContext();
  const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#05050A]"
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
      <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-mono text-slate-400">Knowledge Graph</span>
        <span className="text-slate-700">·</span>
        <span className="text-xs font-mono text-slate-600">Quantum Error Correction</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
            {isStreaming ? "Traversing..." : "10 nodes · 12 edges"}
          </div>
          {/* Attach */}
          <button
            type="button"
            onClick={openPicker}
            disabled={!activeProjectId}
            title={activeProjectId ? "Attach files to project" : "Select or create a project first"}
            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Graph canvas */}
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
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {EDGES.map((edge, i) => {
            const a = NODE_MAP[edge.from];
            const b = NODE_MAP[edge.to];
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

          {NODES.map((node) => {
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
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-slate-300"
          >
            {NODE_MAP[selectedNode]?.label.replace("\n", " ")}
            <span className="text-slate-600 ml-2">· click to deselect</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
