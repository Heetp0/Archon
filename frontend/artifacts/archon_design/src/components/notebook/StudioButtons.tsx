import React from "react";
import { useNotebookContext } from "@/context/NotebookContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Question, Clock, Article, Calendar, SpeakerHigh } from "@phosphor-icons/react";
import type { ArtifactType } from "@/types/notebook";

export default function StudioButtons() {
  const { currentNotebookId, generateArtifact, isArtifactLoading } = useNotebookContext();

  if (!currentNotebookId) return null;

  const buttons: { type: ArtifactType; label: string; icon: React.ElementType; color: string }[] = [
    { type: "study_guide", label: "Study Guide", icon: BookOpen, color: "text-accent-emerald hover:bg-accent-emerald/10 border-accent-emerald/20" },
    { type: "faq", label: "FAQ", icon: Question, color: "text-accent-emerald hover:bg-accent-emerald/10 border-accent-emerald/20" },
    { type: "timeline", label: "Timeline", icon: Clock, color: "text-accent-rose hover:bg-accent-rose/10 border-accent-rose/20" },
    { type: "quiz", label: "Quiz / Flashcards", icon: Article, color: "text-text-primary hover:bg-border-core/40 border-border-core/60" },
    { type: "mind_map", label: "Mind Map", icon: Calendar, color: "text-accent-emerald hover:bg-accent-emerald/10 border-accent-emerald/20" },
    { type: "audio", label: "Audio Overview", icon: SpeakerHigh, color: "text-accent-emerald hover:bg-accent-emerald/10 border-accent-emerald/20" },
  ];

  return (
    <div className="border-t border-border-core bg-panel-bg p-3 flex-shrink-0">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">Studio generation</span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {buttons.map((btn) => (
            <Button
              key={btn.type}
              variant="outline"
              disabled={isArtifactLoading}
              onClick={() => generateArtifact(btn.type)}
              className={`h-9 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] bg-app-bg border transition-all ${btn.color}`}
            >
              <btn.icon className="w-3.5 h-3.5" />
              <span>{btn.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
