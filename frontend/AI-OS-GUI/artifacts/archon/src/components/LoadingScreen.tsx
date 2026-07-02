import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startBoot, markBootDone, isBootDone, getBootState, getBootSteps } from "@/lib/bootState";

interface LoadingScreenProps {
  onDismiss: () => void;
}

export default function LoadingScreen({ onDismiss }: LoadingScreenProps) {
  const [visible, setVisible] = useState(() => !isBootDone());
  const [{ stepIdx, progress, offline }, setState] = useState(() => getBootState());

  useEffect(() => {
    if (!visible) return;
    startBoot(
      (s, p) => setState({ stepIdx: s, progress: p, offline }),
      () => setState((prev) => ({ ...prev, offline: true }))
    );
  }, [visible, offline]);

  const handleSkip = () => {
    markBootDone();
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  if (!visible) return null;

  const steps = getBootSteps();

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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.04)_0%,transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-[460px] bg-[#08090f] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.06)]"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <div className="w-4 h-4 rounded bg-cyan-400/80" />
                </div>
                <h1 className="text-2xl font-mono font-bold tracking-[0.18em] text-slate-100 mb-1">ARCHON</h1>
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">AI Operating System v2.4.1</p>
              </div>

              <div className="mb-6">
                <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      background: "linear-gradient(90deg, rgba(34,211,238,0.6), rgba(59,130,246,0.9))",
                      boxShadow: "0 0 10px rgba(34,211,238,0.5)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-slate-700">{progress}%</span>
                  <span className="text-[10px] font-mono text-slate-700">
                    {offline ? "DAEMON OFFLINE" : "BOOTING"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 min-h-[110px]">
                {steps.slice(0, stepIdx + 1).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2.5 text-[11px] font-mono"
                  >
                    <span className={i < stepIdx ? "text-emerald-500" : "text-cyan-400/80"}>
                      {i < stepIdx ? "✓" : "›"}
                    </span>
                    <span className={i < stepIdx ? "text-slate-700" : "text-slate-400"}>{step}</span>
                  </motion.div>
                ))}

                {offline && (
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
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
