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
    }, 420);
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
          setTimeout(onDismiss, 500);
        }, 700);
      }
    }
  }, [connected, phase, onDismiss]);

  // Offline timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!connected) setPhase("offline");
    }, 5000);
    return () => clearTimeout(timer);
  }, [connected]);

  const handleSkip = () => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#010510]"
        >
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_0%,transparent_70%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-[480px] bg-[#020817] border border-slate-800/80 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(59,130,246,0.08)]"
          >
            {/* Top accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            <div className="p-10">
              {/* Branding */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-mono font-bold tracking-[0.2em] text-slate-100 mb-1">THE CORE</h1>
                <p className="text-[11px] font-mono text-slate-600 uppercase tracking-widest">AI Operating System v2.4.1</p>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ boxShadow: "0 0 12px rgba(59,130,246,0.8)" }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-slate-600">{Math.round(progress)}%</span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {phase === "ready" ? "READY" : phase === "offline" ? "DAEMON OFFLINE" : "BOOTING"}
                  </span>
                </div>
              </div>

              {/* Status lines */}
              <div className="space-y-1.5 min-h-[100px]">
                {BOOT_STEPS.slice(0, stepIndex + 1).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-[11px] font-mono"
                  >
                    <span className={i < stepIndex ? "text-emerald-500" : "text-blue-400"}>
                      {i < stepIndex ? "âœ”" : "â€º"}
                    </span>
                    <span className={i < stepIndex ? "text-slate-600" : "text-slate-400"}>{step}</span>
                  </motion.div>
                ))}

                {phase === "ready" && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-[11px] font-mono"
                  >
                    <span className="text-emerald-400">âœ”</span>
                    <span className="text-emerald-400">Daemon connected. Interface ready.</span>
                  </motion.div>
                )}

                {phase === "offline" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono text-yellow-500">
                      <span>âš </span>
                      <span>Daemon offline</span>
                    </div>
                    <button
                      onClick={handleSkip}
                      data-testid="button-enter-interface"
                      className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 font-mono text-xs tracking-widest hover:border-blue-500/50 hover:text-blue-400 transition-all"
                    >
                      ENTER INTERFACE ANYWAY
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Bottom accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

