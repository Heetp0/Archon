import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Upload, MessageSquare, BarChart2, ArrowRight, Check, X } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    id: 1,
    icon: BookOpen,
    title: "Welcome to Archon",
    description: "Your self-hosted AI OS for focused learning. Archon combines notebooks, RAG-powered chat, and intelligent tutoring — all running privately on your own server.",
    hint: "Built for aerospace engineering students who think in systems.",
    color: "#a0a0a0",
  },
  {
    id: 2,
    icon: BookOpen,
    title: "Create Your First Notebook",
    description: "Notebooks are your knowledge workspaces. Create one for each subject — Aerodynamics, Control Theory, Fluid Mechanics — and Archon will index everything you add to it.",
    hint: 'Click "Notebooks" in the sidebar and hit "New Notebook" to begin.',
    color: "#ffffff",
  },
  {
    id: 3,
    icon: Upload,
    title: "Upload Sources",
    description: "Drop in PDFs, textbooks, research papers, or paste a GitHub repo URL. Archon will chunk, embed, and index everything for instant semantic retrieval.",
    hint: "Your textbooks become queryable in under 60 seconds.",
    color: "#a0a0a0",
  },
  {
    id: 4,
    icon: MessageSquare,
    title: "Ask Anything",
    description: "Open a Notebook and start chatting. Archon grounds every answer in your actual sources - complete with page-level citations so you can verify everything.",
    hint: "Try: 'Derive the Euler-Lagrange equation from Hamilton\'s principle.'",
    color: "#ffffff",
  },
  {
    id: 5,
    icon: BarChart2,
    title: "Practice with Tutor Mode",
    description: "Switch to Tutor Mode to solve handwritten math quizzes, get Socratic hints, and let the spaced repetition scheduler bring back hard topics before exams.",
    hint: "The system gets smarter about your weak spots over time.",
    color: "#a0a0a0",
  },
];

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg mx-4 bg-[#0a0a0a] border border-[#222222] rounded-lg overflow-hidden"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-0.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 8,
                    backgroundColor: i <= step ? "#ffffff" : "#333333",
                  }}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-[#555555] hover:text-[#999999] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="w-10 h-10 rounded flex items-center justify-center bg-[#111111] border border-[#222222] mb-6">
              <current.icon className="w-5 h-5 text-white" />
            </div>

            <div className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-2">
              Step {step + 1} of {STEPS.length}
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight mb-3">
              {current.title}
            </h2>
            <p className="text-sm text-[#a0a0a0] leading-relaxed mb-4">
              {current.description}
            </p>

            <div className="border border-[#1e1e1e] bg-[#050505] rounded px-4 py-3">
              <p className="text-[11px] font-mono text-[#666666]">
                💡 {current.hint}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className="text-[11px] font-mono text-[#555555] hover:text-[#999999] transition-colors disabled:opacity-0"
              disabled={step === 0}
            >
              ← Back
            </button>

            <button
              onClick={isLast ? onComplete : () => setStep(step + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[12px] font-semibold rounded hover:bg-[#e0e0e0] transition-colors font-mono"
            >
              {isLast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
