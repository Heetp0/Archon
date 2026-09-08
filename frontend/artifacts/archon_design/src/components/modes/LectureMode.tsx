import React, { useState, useEffect, useRef } from "react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { Upload, BookOpen, FileText, CheckCircle, Warning, Sparkle, Download, Link } from "@phosphor-icons/react";

/** Destinations the user can export notes to */
type ExportDestination = "obsidian" | "notion";

export default function LectureMode() {
  const [subject, setSubject] = useState("");
  const [lectureNum, setLectureNum] = useState("1");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [profNotes, setProfNotes] = useState("");
  const [exportTo, setExportTo] = useState<ExportDestination[]>(["obsidian"]);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "queued" | "processing" | "done" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [finalNotes, setFinalNotes] = useState("");
  const [obsidianPath, setObsidianPath] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeader = () => {
    try {
      const stored = localStorage.getItem("archon_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token) return `Bearer ${parsed.token}`;
      }
    } catch (e) {
      console.error("Failed to read auth token:", e);
    }
    return "";
  };

  useEffect(() => {
    if (!jobId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/lectures/jobs/${jobId}/ws`;
    console.log("Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.current_step) setCurrentStep(data.current_step);
        if (data.error) { setErrorMsg(data.error); setStatus("failed"); }
        if (data.status === "done" || data.status === "failed") { ws.close(); fetchNotes(); }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket closed");
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [jobId]);

  const fetchNotes = async () => {
    if (!jobId) return;
    try {
      const response = await fetch(`/api/lectures/${jobId}/notes`, {
        headers: { "Authorization": getAuthHeader() }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "done") {
          setFinalNotes(data.content);
          setObsidianPath(data.obsidian_path || "");
          setNotionUrl(data.notion_url || "");
          setStatus("done");
        }
      }
    } catch (err) {
      console.error("Failed to fetch generated notes:", err);
    }
  };

  const toggleDestination = (dest: ExportDestination) => {
    setExportTo((prev) =>
      prev.includes(dest) ? prev.filter((d) => d !== dest) : [...prev, dest]
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { alert("Please enter a subject."); return; }
    if (!audioFile) { alert("Please select a lecture audio file."); return; }
    if (exportTo.length === 0) { alert("Please select at least one export destination."); return; }

    setLoading(true);
    setErrorMsg("");
    setFinalNotes("");
    setObsidianPath("");
    setNotionUrl("");
    setStatus("queued");
    setProgress(0);
    setCurrentStep("uploading");

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("lecture_num", lectureNum);
    formData.append("audio_file", audioFile);
    formData.append("export_to", exportTo.join(","));
    if (profNotes.trim()) formData.append("prof_notes", profNotes);

    try {
      const response = await fetch("/api/lectures/upload", {
        method: "POST",
        headers: { "Authorization": getAuthHeader() },
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text() || "Failed to upload lecture");
      const data = await response.json();
      setJobId(data.job_id);
      setStatus("queued");
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Failed to upload audio.");
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!finalNotes) return;
    const blob = new Blob([finalNotes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subject.replace(/\s+/g, "_")}_Lecture_${lectureNum}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      uploading: "Uploading lecture file...",
      denoise: "Denoising audio (removing background hums)...",
      transcribe: "Transcribing speech using Groq Whisper...",
      audio_done: "Audio processing completed.",
      extract_concepts: "Agent 1: Extracting concepts and structure...",
      searching_textbooks: "Vector Search: Retrieving reference textbook details...",
      explaining_concepts: "Agent 2: Writing details, analogies and examples...",
      finding_derivations: "Agent 3: Finding derivations and mathematical proofs...",
      generating_diagrams: "Agent 4: Drawing Mermaid.js maps and LaTeX cheat sheets...",
      formatting_notes: "Agent 5: Formatting final Obsidian-ready markdown note...",
      exporting_obsidian: "Saving to Obsidian vault...",
      exporting_notion: "Uploading to Notion database...",
      completed: "All tasks completed successfully!",
    };
    return labels[step] || step;
  };

  const isProcessing = status === "processing" || status === "queued";

  return (
    <div className="flex flex-col h-full w-full bg-[#020617] text-slate-100 overflow-y-auto p-6 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <BookOpen className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Lecture Audio to Study Notes</h1>
            <p className="text-xs text-slate-400">Convert university lecture recordings, notes, and textbooks into structured study notes.</p>
          </div>
        </div>

        {/* Progress / Status Card */}
        {status !== "idle" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            {(isProcessing) && (
              <div className="space-y-2">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>{getStepLabel(currentStep)}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}

            {/* Success */}
            {status === "done" && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3 text-sm text-emerald-400">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
                  <div className="space-y-1.5 w-full">
                    <p className="font-semibold">Generation complete!</p>
                    {obsidianPath && (
                      <div>
                        <p className="text-xs text-slate-400">Saved to Obsidian vault:</p>
                        <code className="text-xs bg-slate-950/60 text-slate-300 px-2 py-1 rounded block mt-1 break-all select-all font-mono border border-slate-800">
                          {obsidianPath}
                        </code>
                      </div>
                    )}
                    {notionUrl && (
                      <div>
                        <p className="text-xs text-slate-400">Notion page created:</p>
                        <a
                          href={notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-1 font-mono underline underline-offset-2 break-all"
                        >
                          <Link className="w-3.5 h-3.5 flex-shrink-0" />
                          {notionUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {status === "failed" && (
              <div className="flex items-start gap-3 bg-rose-950/25 border border-rose-900/30 rounded-lg p-3 text-sm text-rose-400">
                <Warning className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <p className="font-semibold">Task failed</p>
                  <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Split UI: form and notes preview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Upload Form */}
          <div className="md:col-span-2 space-y-4">
            <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-slate-800 pb-2 text-slate-300">Upload & Configure</h2>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Subject Name</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Thermodynamics, Linear Algebra"
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Lecture Number</label>
                <input
                  type="number"
                  value={lectureNum}
                  onChange={(e) => setLectureNum(e.target.value)}
                  placeholder="e.g. 1, 2"
                  min="1"
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Lecture Audio File (MP3/WAV)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    audioFile ? "border-indigo-500/50 bg-indigo-950/5" : "border-slate-800 hover:border-slate-700 bg-slate-950"
                  } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-300 font-medium">
                    {audioFile ? audioFile.name : "Choose audio file..."}
                  </span>
                  <span className="text-[10px] text-slate-500">Max size 25MB for Groq Whisper</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    accept=".mp3,.wav,.m4a"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Professor's Notes / Outline (Optional)</label>
                <textarea
                  value={profNotes}
                  onChange={(e) => setProfNotes(e.target.value)}
                  placeholder="Paste syllabus key points, formulas, or outline terms..."
                  rows={4}
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-colors font-mono resize-none"
                />
              </div>

              {/* Export Destinations */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Export Destinations</label>
                <div className="flex flex-col gap-2">
                  {(["obsidian", "notion"] as ExportDestination[]).map((dest) => (
                    <label
                      key={dest}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer select-none text-sm transition-colors ${
                        exportTo.includes(dest)
                          ? "border-indigo-500/50 bg-indigo-950/10 text-indigo-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                      } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={exportTo.includes(dest)}
                        onChange={() => toggleDestination(dest)}
                        className="accent-indigo-500 w-3.5 h-3.5"
                        disabled={isProcessing}
                      />
                      <span className="capitalize font-medium">{dest}</span>
                      {dest === "notion" && (
                        <span className="text-[10px] text-slate-500 ml-auto">Requires NOTION_API_KEY</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 disabled:opacity-50 disabled:hover:bg-indigo-600 font-semibold text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/10"
              >
                <Sparkle className="w-4 h-4" />
                {loading ? "Uploading..." : "Generate Study Notes"}
              </button>
            </form>
          </div>

          {/* Notes Preview Area */}
          <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[550px] relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-300">Generated Note Preview</span>
              </div>
              {finalNotes && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download MD
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {finalNotes ? (
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap select-text selection:bg-indigo-950 leading-relaxed">
                  {finalNotes}
                </pre>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <FileText className="w-8 h-8 opacity-30" />
                  <span className="text-xs">No notes generated yet. Submit the form to run the pipeline.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
