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
    const unsub = startBoot(
      (s, p) => setState((prev) => ({ ...prev, stepIdx: s, progress: p })),
      () => setState((prev) => ({ ...prev, offline: true }))
    );
    return unsub;
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-app-bg"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.04)_0%,transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-[460px] bg-app-bg border border-border-core/30 rounded-2xl overflow-hidden"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-indigo/50 to-transparent" />
            <div className="p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent-indigo/15 border border-accent-indigo/30 mb-4 overflow-hidden">
                  <img src="/archon-logo.png" alt="Archon" className="w-7 h-7 object-contain" />
                </div>
                <h1 className="text-2xl font-mono font-bold tracking-[0.18em] text-text-primary mb-1">ARCHON</h1>
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">AI Operating System v2.4.1</p>
              </div>

              <div className="mb-6">
                <div className="h-0.5 w-full bg-panel-bg/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      background: "linear-gradient(90deg, rgba(79,70,229,0.6), rgba(79,70,229,0.9))",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-text-secondary">{progress}%</span>
                  <span className="text-[10px] font-mono text-text-secondary">
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
                    <span className={i < stepIdx ? "text-accent-emerald" : "text-accent-indigo/80"}>
                      {i < stepIdx ? "✓" : "›"}
                    </span>
                    <span className={i < stepIdx ? "text-text-secondary" : "text-text-secondary"}>{step}</span>
                  </motion.div>
                ))}

                {offline && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-1"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono text-accent-rose/80">
                      <span>⚠</span>
                      <span>Daemon not reachable — start it locally to connect.</span>
                    </div>
                    <button
                      onClick={handleSkip}
                      data-testid="button-enter-interface"
                      className="w-full py-2.5 rounded-xl border border-border-core/30 bg-panel-bg/30 text-text-secondary font-mono text-xs tracking-widest hover:border-accent-indigo/30 hover:text-accent-indigo transition-all"
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
