import React, { useState } from "react";
import { BarChart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { ContextFilesSection } from "./ContextFilesSection";

export function CouncilPanel({ activeProjectId, telemetry }: { activeProjectId: string | null; telemetry: { tokens: number; cost: number; latency: number }; }) {
  const [gpt4oTemp, setGpt4oTemp] = useState(70);
  const [claudeTemp, setClaudeTemp] = useState(40);
  const [geminiTemp, setGeminiTemp] = useState(55);

  return (
    <>
      <div className="p-4 border-b border-border-core/60 flex-shrink-0">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-2">
          <BarChart className="w-3.5 h-3.5 text-accent-rose" />
          Consensus Tracker
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-mono">Model Parameters</h4>
            <div className="space-y-4">
              {[
                { label: "GPT-4o", color: "text-accent-indigo", val: gpt4oTemp, set: setGpt4oTemp, sliderClass: "[&_[role=slider]]:bg-accent-indigo" },
                { label: "Claude 3.5", color: "text-accent-rose", val: claudeTemp, set: setClaudeTemp, sliderClass: "[&_[role=slider]]:bg-accent-rose" },
                { label: "Gemini 1.5", color: "text-accent-indigo", val: geminiTemp, set: setGeminiTemp, sliderClass: "[&_[role=slider]]:bg-accent-indigo" },
              ].map(({ label, color, val, set, sliderClass }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={color}>{label}</span>
                    <span className="text-accent-rose">{(val / 100).toFixed(2)}</span>
                  </div>
                  <Slider value={[val]} onValueChange={([v]) => set(v)} max={100} step={1} className={sliderClass} />
                </div>
              ))}
            </div>
          </div>
          <ContextFilesSection projectId={activeProjectId} />
        </div>
      </ScrollArea>
    </>
  );
}
