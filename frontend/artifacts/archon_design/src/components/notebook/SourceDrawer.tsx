import React, { useState, useEffect, useRef } from "react";
import { useNotebookContext } from "@/context/NotebookContext";
import { notebookApi } from "@/lib/notebookApi";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FilePdf, GithubLogo, Waveform, X, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { IngestionJob } from "@/types/notebook";
import { cn } from "@/lib/utils";

export default function SourceDrawer() {
  const {
    currentNotebookId,
    isSourceDrawerOpen,
    setSourceDrawerOpen,
    ingestionJobs,
    addIngestionJob,
    updateIngestionJob,
    loadNotebooks
  } = useNotebookContext();

  const [activeTab, setActiveTab] = useState("pdf");
  const [gitUrl, setGitUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to the job status WebSocket when the drawer is open and there are active jobs
  useEffect(() => {
    if (!isSourceDrawerOpen || !currentNotebookId) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    const wsUrl = notebookApi.getWsUrl(currentNotebookId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        // Payload has shape: { event: "job_update", job_id: "...", status: "...", progress: 50, notebook_id: "..." }
        if (payload.event === "job_update" || payload.job_id) {
          updateIngestionJob(payload.job_id, {
            status: payload.status,
            progress: payload.progress ?? 0,
            error: payload.error,
          });
          // If a job completes, reload notebook sources
          if (payload.status === "indexed") {
            loadNotebooks();
            toast.success(`Source "${payload.source_name || "File"}" successfully ingested`);
          } else if (payload.status === "failed") {
            toast.error(`Ingestion failed: ${payload.error || "Unknown error"}`);
          }
        }
      } catch (e) {
        console.error("Failed to parse WebSocket job progress message:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [isSourceDrawerOpen, currentNotebookId, updateIngestionJob, loadNotebooks]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, type: "pdf" | "audio") => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentNotebookId) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await notebookApi.addSourceFile(currentNotebookId, file, type);
      addIngestionJob({
        job_id: res.job_id,
        notebook_id: currentNotebookId,
        source_name: file.name,
        source_type: type,
        status: res.status,
        progress: 0,
      });
      toast.info(`Ingestion started for "${file.name}"`);
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "audio") => {
    if (!currentNotebookId || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const res = await notebookApi.addSourceFile(currentNotebookId, file, type);
      addIngestionJob({
        job_id: res.job_id,
        notebook_id: currentNotebookId,
        source_name: file.name,
        source_type: type,
        status: res.status,
        progress: 0,
      });
      toast.info(`Ingestion started for "${file.name}"`);
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const handleGitSubmit = async () => {
    if (!currentNotebookId || !gitUrl.trim()) return;
    setIsUploading(true);

    try {
      const res = await notebookApi.addSource(currentNotebookId, {
        source_type: "codebase",
        github_url: gitUrl.trim(),
      });
      addIngestionJob({
        job_id: res.job_id,
        notebook_id: currentNotebookId,
        source_name: gitUrl.trim(),
        source_type: "codebase",
        status: res.status,
        progress: 0,
      });
      toast.info("GitHub ingestion queued");
      setGitUrl("");
    } catch (err) {
      toast.error(`GitHub source request failed: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Drawer open={isSourceDrawerOpen} onOpenChange={setSourceDrawerOpen} direction="right">
      <DrawerContent className="h-full w-96 ml-auto bg-panel-bg border-l border-border-core rounded-l-2xl outline-none p-4 flex flex-col">
        <DrawerHeader className="flex items-center justify-between border-b border-border-core pb-2">
          <DrawerTitle className="text-text-primary text-sm font-medium">Add Sources</DrawerTitle>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSourceDrawerOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </DrawerHeader>

        {/* Tab Selection */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 flex-shrink-0">
          <TabsList className="grid grid-cols-3 bg-app-bg border border-border-core p-1 h-9 rounded-lg">
            <TabsTrigger value="pdf" className="text-[10px] gap-1 px-1"><FilePdf className="w-3.5 h-3.5" /> PDF</TabsTrigger>
            <TabsTrigger value="codebase" className="text-[10px] gap-1 px-1"><GithubLogo className="w-3.5 h-3.5" /> GitHub</TabsTrigger>
            <TabsTrigger value="audio" className="text-[10px] gap-1 px-1"><Waveform className="w-3.5 h-3.5" /> Audio</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="mt-4">
            <div
              onClick={() => pdfInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 bg-app-bg border border-dashed border-border-core hover:border-accent-emerald/60 rounded-xl cursor-pointer transition-all gap-2"
            >
              <UploadSimple className="w-6 h-6 text-text-secondary" />
              <span className="text-xs text-text-primary font-medium">Choose a PDF file</span>
              <span className="text-[10px] text-text-muted">Drag & Drop or Click to browse</span>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "pdf")}
                disabled={isUploading}
              />
            </div>
          </TabsContent>

          <TabsContent value="codebase" className="mt-4 space-y-3">
            <Input
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="bg-app-bg border-border-core text-text-primary text-xs h-9"
              disabled={isUploading}
            />
            <Button
              className="w-full bg-accent-emerald hover:bg-accent-emerald/80 text-text-on-accent text-xs h-9 font-medium"
              onClick={handleGitSubmit}
              disabled={isUploading || !gitUrl.trim()}
            >
              Ingest Repo
            </Button>
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            <div
              onClick={() => audioInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "audio")}
              className="flex flex-col items-center justify-center p-8 bg-app-bg border border-dashed border-border-core hover:border-accent-emerald/60 rounded-xl cursor-pointer transition-all gap-2"
            >
              <Waveform className="w-6 h-6 text-accent-emerald" />
              <span className="text-xs text-text-primary font-medium">Upload audio lecture</span>
              <span className="text-[10px] text-text-muted">MP3, WAV or M4A format</span>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "audio")}
                disabled={isUploading}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Live progress queue */}
        <div className="flex-1 mt-6 overflow-hidden flex flex-col border-t border-border-core pt-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-3">Ingestion Queue</span>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {ingestionJobs.map((job) => (
              <div key={job.job_id} className="p-3 bg-app-bg border border-border-core rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary font-medium truncate max-w-[70%]">{job.source_name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] uppercase font-mono py-0.5",
                      job.status === "indexed" ? "border-accent-emerald text-accent-emerald" :
                      job.status === "failed" ? "border-accent-rose text-accent-rose" : "border-accent-emerald text-accent-emerald"
                    )}
                  >
                    {job.status}
                  </Badge>
                </div>
                <Progress value={job.progress ?? 0} className="h-1 bg-border-core" />
              </div>
            ))}
            {ingestionJobs.length === 0 && (
              <p className="text-xs text-text-muted py-6 text-center">No active jobs in progress.</p>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
