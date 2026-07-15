// Shared Layout Geometry Rules
export const LAYOUT = {
  NAV_RAIL_WIDTH: 56, // px
  MIN_SIDEBAR_WIDTH: 200, // px
  MAX_SIDEBAR_WIDTH: 480, // px
  GRID_GAP_STANDARD: "1rem",
};

// Timing, Animation and Streaming Speeds
export const TIMING = {
  STREAM_BUFFER_DELAY_MS: 80, // MS interval to batch and flush streaming tokens
  DEBOUNCE_DELAY_MS: 150,
  CODE_HIGHLIGHT_DEBOUNCE_MS: 250,
  TRANSITION_DURATION_MS: 200,
};

// Sidebar Layout Modes set
export const SIDEBAR_MODES = new Set(["chat", "council", "research", "agents", "obsidian", "directory"]);
