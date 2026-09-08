import React from "react";
import { FileCode, Database, FileJson, FileText, FileClock, Search } from "lucide-react";

export interface FileTabDef {
  id: string;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  content: React.ReactNode;
}

export const ALL_FILE_TABS: FileTabDef[] = [
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
