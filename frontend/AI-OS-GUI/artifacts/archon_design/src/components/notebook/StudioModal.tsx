import React, { useEffect, useState, useRef } from "react";
import { useNotebookContext } from "@/context/NotebookContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Download, Copy, Play, Pause, Waveform } from "@phosphor-icons/react";
import { getDaemonConnectionDetails } from "@/lib/storage";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import { toast } from "sonner";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

function MermaidRenderer({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const containerId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (!chart) return;

    // Parse out potential leading/trailing markdown blocks from the raw content
    let cleanChart = chart.replace(/```mermaid/g, "").replace(/```/g, "").trim();

    try {
      mermaid.render(containerId.current, cleanChart).then(({ svg }) => {
        setSvg(svg);
      }).catch((e) => {
        console.error("Mermaid compile error:", e);
        setSvg(`<p class="text-xs text-accent-rose font-mono">Mermaid Syntax Error: ${e.message || "Failed to render"}</p>`);
      });
    } catch (e) {
      console.error(e);
    }
  }, [chart]);

  return (
    <div 
      className="flex justify-center p-4 bg-app-bg rounded-xl border border-border-core overflow-auto max-h-[60vh] select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Flashcard Quiz Subcomponent
function Flashcards({ content }: { content: string }) {
  const [cards, setCards] = useState<{ q: string; a: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    // Attempt to parse quiz content. Quizzes can be in markdown structure:
    // Q: Question text
    // A: Answer text
    // Or plain text block.
    const parsed: { q: string; a: string }[] = [];
    const lines = content.split("\n");
    let currentQ = "";
    let currentA = "";

    lines.forEach((line) => {
      const qMatch = line.match(/^(?:Q:|\d+\.\s+|Question:)(.*)/i);
      const aMatch = line.match(/^(?:A:|Answer:)(.*)/i);

      if (qMatch) {
        if (currentQ && currentA) {
          parsed.push({ q: currentQ.trim(), a: currentA.trim() });
          currentA = "";
        }
        currentQ = qMatch[1];
      } else if (aMatch) {
        currentA = aMatch[1];
      } else if (line.trim()) {
        if (currentA) {
          currentA += " " + line;
        } else if (currentQ) {
          currentQ += " " + line;
        }
      }
    });

    if (currentQ && currentA) {
      parsed.push({ q: currentQ.trim(), a: currentA.trim() });
    }

    if (parsed.length > 0) {
      setCards(parsed);
    }
  }, [content]);

  if (cards.length === 0) {
    return (
      <div className="text-xs text-text-primary space-y-4">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  const current = cards[index];

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-[10px] font-mono text-text-secondary">Flashcard {index + 1} of {cards.length}</div>

      {/* Flip card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="w-full max-w-md min-h-48 bg-app-bg border border-border-core hover:border-accent-emerald/40 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer select-none transition-all duration-300 transform"
      >
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-4">
          {flipped ? "Answer" : "Question"}
        </span>
        <p className="text-sm font-medium text-center text-text-primary leading-relaxed">
          {flipped ? current.a : current.q}
        </p>
        <span className="text-[9px] font-mono text-text-muted mt-6">Click card to flip</span>
      </div>

      {/* Nav */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => { setIndex(index - 1); setFlipped(false); }}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={index === cards.length - 1}
          onClick={() => { setIndex(index + 1); setFlipped(false); }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function StudioModal() {
  const { currentArtifact, isArtifactOpen, isArtifactLoading, closeArtifact } = useNotebookContext();

  const handleDownload = () => {
    if (!currentArtifact) return;
    const blob = new Blob([currentArtifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentArtifact.artifact_type}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  };

  const handleCopy = () => {
    if (!currentArtifact) return;
    navigator.clipboard.writeText(currentArtifact.content);
    toast.success("Copied to clipboard");
  };

  const getAudioUrl = () => {
    if (!currentArtifact || currentArtifact.artifact_type !== "audio") return "";
    const filePath = (currentArtifact as any).audio_path || currentArtifact.content.trim();
    if (filePath.startsWith("http")) return filePath;
    // Use the shared daemon connection details so port is always in sync
    const { httpUrl } = getDaemonConnectionDetails();
    return `${httpUrl}/static/audio/${filePath}`;
  };

  return (
    <Dialog open={isArtifactOpen} onOpenChange={(open) => { if (!open) closeArtifact(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-panel-bg border-border-core flex flex-col p-4 overflow-hidden rounded-2xl">
        <DialogHeader className="flex items-center justify-between border-b border-border-core pb-2">
          <DialogTitle className="text-sm font-medium text-text-primary uppercase tracking-wide font-mono">
            {isArtifactLoading ? "Generating..." : `${currentArtifact?.artifact_type?.replace("_", " ")} Overview`}
          </DialogTitle>
          <div className="flex items-center gap-1.5 absolute right-12 top-4">
            {!isArtifactLoading && currentArtifact && (
              <>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleCopy} title="Copy Content">
                  <Copy className="w-4 h-4" />
                </Button>
                {currentArtifact.artifact_type !== "audio" && (
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleDownload} title="Download File">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7">
                <X className="w-4 h-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {isArtifactLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-accent-emerald border-t-transparent animate-spin" />
            <span className="text-xs text-text-secondary font-mono animate-pulse">Running LLM pipeline to build studio artifact...</span>
          </div>
        ) : (
          <ScrollArea className="flex-1 mt-4">
            <div className="px-1 pb-4">
              {currentArtifact?.artifact_type === "mind_map" && (
                <MermaidRenderer chart={currentArtifact.content} />
              )}
              {currentArtifact?.artifact_type === "quiz" && (
                <Flashcards content={currentArtifact.content} />
              )}
              {currentArtifact?.artifact_type === "audio" && (
                <div className="flex flex-col items-center justify-center p-8 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center animate-pulse">
                    <Waveform className="w-8 h-8 text-accent-emerald" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <h3 className="text-xs font-mono text-text-primary">Conversational Audio Overview</h3>
                    <p className="text-[10px] text-text-secondary">Synthesized podcast format mapping all ingested sources.</p>
                  </div>
                  <audio controls className="w-full max-w-md bg-app-bg border border-border-core rounded-lg" src={getAudioUrl()}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              {currentArtifact && !["mind_map", "quiz", "audio"].includes(currentArtifact.artifact_type) && (
                <div className="text-xs text-text-secondary leading-relaxed space-y-2 select-text font-sans p-1">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-sm font-semibold text-text-primary mt-4 mb-2 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xs font-semibold text-text-primary mt-3 mb-1.5">{children}</h2>,
                      p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1.5 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1.5 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    }}
                  >
                    {currentArtifact.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
