import { toast } from "sonner";
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
    const FILE_SIZE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB
    Array.from(fileList).forEach((file) => {
      if (file.size > FILE_SIZE_LIMIT_BYTES) {
        toast.warning(
          `Large file attached (${(file.size / 1024 / 1024).toFixed(1)} MB) — this may increase response latency.`
        );
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result ? result.split(",")[1] || "" : "";
        const contextFile: ContextFile = {
          id: `file-${Date.now()}-${file.name}`,
          name: file.name,
          kind: detectKind(file),
          localBlobUrl: URL.createObjectURL(file),
          content: base64,
        };
        addContextFile(activeProjectId, contextFile);
      };
      reader.readAsDataURL(file);
    });
  };

  return { inputRef, openPicker, handleFilesSelected };
}
