import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocketContext } from "@/context/WebSocketContext";

const BOOT_STEPS = [
  "Initializing kernel interface...",
  "Loading LanceDB vector store...",
  "Mounting context vault...",
  "Connecting to FastAPI daemon...",
  "Establishing WebSocket channel...",
];

interface LoadingScreenProps {
  onDismiss: () => void;
}

export default function LoadingScreen({ onDismiss }: LoadingScreenProps) {
  const { connected, connecting } = useWebSocketContext();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"booting" | "waiting" | "ready" | "offline">("booting");
  const [visible, setVisible] = useState(true);

  // Animate boot steps
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1;
        setProgress(Math.min((next / BOOT_STEPS.length) * 85, 85));
        if (next >= BOOT_STEPS.length) {
          clearInterval(interval);
          setPhase("waiting");
        }
        return Math.min(next, BOOT_STEPS.length - 1);
      });
    }, 380);
    return () => clearInterval(interval);
  }, []);

  // Watch connection
  useEffect(() => {
    if (phase === "waiting" || phase === "booting") {
      if (connected) {
        setProgress(100);
        setPhase("ready");
        setTimeout(() => {
          setVisible(false);
          setTimeout(onDismiss, 400);
        }, 600);
      }
    }
  }, [connected, phase, onDismiss]);

  // Offline timeout — short so users can get in quickly
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!connected) setPhase("offline");
    }, 3000);
    return () => clearTimeout(timer);
  }, [connected]);

  const handleSkip = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04050d]"
        >
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.04)_0%,transparent_65%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-[460px] bg-[#08090f] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.06)]"
          >
            {/* Top accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <div className="p-10">
              {/* Branding */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <div className="w-4 h-4 rounded bg-cyan-400/80" />
                </div>
                <h1 className="text-2xl font-mono font-bold tracking-[0.22em] text-slate-100 mb-1">THE CORE</h1>
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">AI Operating System v2.4.1</p>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    style={{
                      background: "linear-gradient(90deg, rgba(34,211,238,0.6), rgba(59,130,246,0.9))",
                      boxShadow: "0 0 10px rgba(34,211,238,0.5)"
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-slate-700">{Math.round(progress)}%</span>
                  <span className="text-[10px] font-mono text-slate-700">
                    {phase === "ready" ? "READY" : phase === "offline" ? "DAEMON OFFLINE" : "BOOTING"}
                  </span>
                </div>
              </div>

              {/* Status lines */}
              <div className="space-y-2 min-h-[110px]">
                {BOOT_STEPS.slice(0, stepIndex + 1).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2.5 text-[11px] font-mono"
                  >
                    <span className={i < stepIndex ? "text-emerald-500" : "text-cyan-400/80"}>
                      {i < stepIndex ? "✓" : "›"}
                    </span>
                    <span className={i < stepIndex ? "text-slate-700" : "text-slate-400"}>{step}</span>
                  </motion.div>
                ))}

                {phase === "ready" && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2.5 text-[11px] font-mono"
                  >
                    <span className="text-emerald-400">✓</span>
                    <span className="text-emerald-400">Daemon connected. Interface ready.</span>
                  </motion.div>
                )}

                {phase === "offline" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-1"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono text-amber-500/80">
                      <span>⚠</span>
                      <span>Daemon not reachable — start it locally to connect.</span>
                    </div>
                    <button
                      onClick={handleSkip}
                      data-testid="button-enter-interface"
                      className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 font-mono text-xs tracking-widest hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                    >
                      ENTER INTERFACE
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Bottom accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
