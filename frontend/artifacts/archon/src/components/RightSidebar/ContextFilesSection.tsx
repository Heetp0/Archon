import React from "react";
import { Image, FileType, FileText, File, X } from "lucide-react";
import { useProjectsContext, type ContextFile } from "@/context/ProjectsContext";

const KIND_ICON: Record<ContextFile["kind"], React.ElementType> = {
  image: Image, pdf: FileType, text: FileText, other: File,
};

export function ContextFilesSection({ projectId }: { projectId: string | null }) {
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
