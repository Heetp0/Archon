import { useRef } from "react";
import { useProjectsContext, ContextFile } from "@/context/ProjectsContext";

function detectKind(file: File): ContextFile["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type.startsWith("text/") ||
    /\.(md|py|js|ts|json|csv)$/.test(file.name)
  )
    return "text";
  return "other";
}

export function useFileAttach(activeProjectId: string | null) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addContextFile } = useProjectsContext();

  const openPicker = () => inputRef.current?.click();

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || !activeProjectId) return;
    Array.from(fileList).forEach((file) => {
      const contextFile: ContextFile = {
        id: `file-${Date.now()}-${file.name}`,
        name: file.name,
        kind: detectKind(file),
        localBlobUrl: URL.createObjectURL(file),
      };
      addContextFile(activeProjectId, contextFile);
    });
  };

  return { inputRef, openPicker, handleFilesSelected };
}
