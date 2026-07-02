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
  try { const v = sessionStorage.getItem(key); return v ? Number(v) : fallback; }
  catch { return fallback; }
}
function set(key: string, val: number | boolean) {
  try { sessionStorage.setItem(key, String(val)); } catch { /* noop */ }
}

let _scheduling = false;

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
}

export function startBoot(onStep: (step: number, progress: number) => void, onOffline: () => void) {
  if (_scheduling) return; // already running this session
  _scheduling = true;

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
    onStep(currentStep, progress);

    if (currentStep < BOOT_STEPS.length - 1) {
      window.setTimeout(tick, 500);
    }
  }

  // Kick off immediately if not done
  if (currentStep < BOOT_STEPS.length - 1) {
    window.setTimeout(tick, currentStep < 0 ? 0 : 500);
  }

  // Offline fallback
  const remainingSteps = Math.max(0, BOOT_STEPS.length - 1 - currentStep);
  const delay = remainingSteps * 500 + 800;
  window.setTimeout(() => {
    set(SK_OFFLINE, 1);
    onOffline();
  }, delay);
}
