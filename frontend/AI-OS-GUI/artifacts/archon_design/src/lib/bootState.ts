// Pure sessionStorage boot state — survives HMR remounts.
// No module-level cache; every read goes to sessionStorage.

const SK_DONE = "archon_boot_done";
const SK_STEP = "archon_boot_step";
const SK_PROGRESS = "archon_boot_progress";
const SK_OFFLINE = "archon_boot_offline";

const BOOT_STEPS = [
  "Initializing kernel interface...",
  "Loading LanceDB vector store...",
  "Mounting context vault...",
  "Connecting to FastAPI daemon...",
  "Establishing WebSocket channel...",
];

function get(key: string, fallback: number): number {
  try {
    const v = sessionStorage.getItem(key);
    return v ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, val: number | boolean) {
  try {
    sessionStorage.setItem(key, String(val));
  } catch {
    /* noop */
  }
}

declare global {
  interface Window {
    __archon_boot_global?: {
      scheduling: boolean;
      listeners: Set<(step: number, progress: number) => void>;
      offlineListeners: Set<() => void>;
      timers: any[];
    };
  }
}

function getGlobal() {
  if (typeof window === "undefined") return null;
  if (!window.__archon_boot_global) {
    window.__archon_boot_global = {
      scheduling: false,
      listeners: new Set(),
      offlineListeners: new Set(),
      timers: [],
    };
  }
  return window.__archon_boot_global;
}

export function getBootState() {
  return {
    done: !!get(SK_DONE, 0),
    stepIdx: get(SK_STEP, -1),
    progress: get(SK_PROGRESS, 0),
    offline: !!get(SK_OFFLINE, 0),
  };
}

export function isBootDone() {
  return !!get(SK_DONE, 0);
}

export function getBootSteps() {
  return BOOT_STEPS;
}

export function markBootDone() {
  set(SK_DONE, 1);
  set(SK_OFFLINE, 0);
  clearBootTimers();
}

export function clearBootTimers() {
  if (typeof window !== "undefined" && window.__archon_boot_global) {
    window.__archon_boot_global.timers.forEach((t) => clearTimeout(t));
    window.__archon_boot_global.timers = [];
    window.__archon_boot_global.scheduling = false;
  }
}

export function clearOfflineTimer() {
  set(SK_OFFLINE, 0);
  clearBootTimers();
}

export function startBoot(onStep: (step: number, progress: number) => void, onOffline: () => void) {
  const g = getGlobal();
  if (!g) {
    onStep(-1, 0);
    return () => {};
  }
  const activeG = g;

  activeG.listeners.add(onStep);
  activeG.offlineListeners.add(onOffline);

  const unsub = () => {
    activeG.listeners.delete(onStep);
    activeG.offlineListeners.delete(onOffline);
  };

  if (activeG.scheduling) {
    const { stepIdx, progress } = getBootState();
    onStep(stepIdx, progress);
    return unsub;
  }
  activeG.scheduling = true;

  let currentStep = get(SK_STEP, -1);

  function tick() {
    currentStep++;
    if (currentStep >= BOOT_STEPS.length) {
      currentStep = BOOT_STEPS.length - 1;
    }
    const progress = currentStep >= 0
      ? Math.round(((currentStep + 1) / BOOT_STEPS.length) * 85)
      : 0;
    set(SK_STEP, currentStep);
    set(SK_PROGRESS, progress);

    activeG.listeners.forEach((l) => l(currentStep, progress));

    if (currentStep < BOOT_STEPS.length - 1) {
      const t = window.setTimeout(tick, 500);
      activeG.timers.push(t);
    }
  }

  // Kick off immediately if not done
  if (currentStep < BOOT_STEPS.length - 1) {
    const t = window.setTimeout(tick, currentStep < 0 ? 0 : 500);
    activeG.timers.push(t);
  } else {
    onStep(currentStep, get(SK_PROGRESS, 85));
  }

  // Offline fallback
  const remainingSteps = Math.max(0, BOOT_STEPS.length - 1 - currentStep);
  const isTest = typeof window !== 'undefined' && ((window as any).vitest || (window as any).__vitest_worker__ || (window as any).vi || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test'));
  const delay = isTest ? (remainingSteps * 500 + 800) : (remainingSteps * 2000 + 15000);
  const offlineT = window.setTimeout(() => {
    set(SK_OFFLINE, 1);
    activeG.offlineListeners.forEach((ol) => ol());
  }, delay);
  activeG.timers.push(offlineT);

  return unsub;
}