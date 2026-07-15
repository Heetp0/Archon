import React from "react";
import { useNotebookContext } from "@/context/NotebookContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Question, Clock, Article, Calendar, SpeakerHigh, Waveform, CircleNotch } from "@phosphor-icons/react";
import { getDaemonConnectionDetails } from "@/lib/storage";

export default function StudioPanel() {
  const {
    currentNotebookId,
    generateArtifact,
    isArtifactLoading,
    currentArtifact,
  } = useNotebookContext();

  if (!currentNotebookId) return null;

  const handleStudyAidClick = (type: string) => {
    if (type === "briefing_document") {
      generateArtifact("study_guide");
    } else {
      generateArtifact(type as any);
    }
  };

  const getAudioUrl = () => {
    if (!currentArtifact || currentArtifact.artifact_type !== "audio") return "";
    const filePath = (currentArtifact as any).audio_path || currentArtifact.content.trim();
    if (filePath.startsWith("http")) return filePath;
    const { httpUrl } = getDaemonConnectionDetails();
    return `${httpUrl}/static/audio/${filePath}`;
  };

  const studyAids = [
    { type: "study_guide", label: "Study Guide", icon: BookOpen, desc: "A structured study guide with key concepts and questions." },
    { type: "faq", label: "FAQ", icon: Question, desc: "A list of frequently asked questions and answers from sources." },
    { type: "briefing_document", label: "Briefing Document", icon: Article, desc: "A high-level executive briefing document summarizing findings." },
    { type: "timeline", label: "Timeline", icon: Clock, desc: "A chronological timeline of milestones, dates, and steps." },
    { type: "mind_map", label: "Mind Map", icon: Calendar, desc: "A visual mind map representing key concepts." },
  ];

  const hasAudioOverview = currentArtifact && currentArtifact.artifact_type === "audio" && !isArtifactLoading;

  return (
    <div className="flex flex-col h-full w-[320px] flex-shrink-0 border-l border-border-core bg-panel-bg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-core bg-panel-bg flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">Notebook Guide / Studio</span>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {/* Audio Overview Card */}
          <Card className="bg-app-bg/50 border-border-core p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent-emerald/10 rounded-xl border border-accent-emerald/20 flex-shrink-0 text-accent-emerald">
                <SpeakerHigh className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-semibold text-text-primary">Audio Overview</h4>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Generate a conversational podcast format summarizing your sources.
                </p>
              </div>
            </div>

            {/* Status / Player / Trigger Button */}
            {isArtifactLoading && currentArtifact?.artifact_type === "audio" ? (
              <div className="flex items-center justify-center py-2 gap-2 text-[10px] text-text-secondary font-mono">
                <CircleNotch className="w-3.5 h-3.5 animate-spin text-accent-emerald" />
                Generating audio overview...
              </div>
            ) : hasAudioOverview ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 py-1.5 px-2 bg-accent-emerald/5 rounded-lg border border-accent-emerald/20">
                  <Waveform className="w-4 h-4 text-accent-emerald animate-pulse" />
                  <span className="text-[9px] font-mono text-accent-emerald">Audio Overview Generated</span>
                </div>
                <audio controls className="w-full bg-app-bg rounded-lg border border-border-core h-9 text-xs" src={getAudioUrl()}>
                  Your browser does not support the audio element.
                </audio>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateArtifact("audio")}
                  className="w-full text-[10px] h-7 border-border-core hover:bg-border-core"
                >
                  Regenerate Audio
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => generateArtifact("audio")}
                disabled={isArtifactLoading}
                className="w-full text-[10px] h-8 bg-accent-emerald hover:bg-accent-emerald/80 text-white font-medium"
              >
                Generate Audio Overview
              </Button>
            )}
          </Card>

          {/* Study Aids Section */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Study Aids</span>
            <div className="grid grid-cols-1 gap-2">
              {studyAids.map((aid) => (
                <Card
                  key={aid.type}
                  className="bg-app-bg/30 border-border-core hover:border-accent-emerald/40 transition-all cursor-pointer p-3 flex flex-col gap-1.5 group"
                  onClick={() => handleStudyAidClick(aid.type)}
                >
                  <div className="flex items-center gap-2 text-text-secondary group-hover:text-text-primary transition-colors">
                    <aid.icon className="w-4 h-4 text-accent-emerald" />
                    <span className="text-xs font-semibold">{aid.label}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed">{aid.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
