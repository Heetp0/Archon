---
name: Recharts + React 19 conflict
description: recharts 2.x causes "Invalid hook call / Cannot read useRef" crash with React 19 — use pure SVG charts instead
---

## Rule
Do NOT use recharts in this project. It crashes with React 19.2 due to a duplicate React instance ("Invalid hook call / Cannot read properties of null (reading 'useRef')").

**Why:** recharts 2.x (installed as `^2.15.2`) internally bundles or resolves a different React copy than `react@19.2.7`. This breaks hook resolution at runtime even though TypeScript sees no errors.

**How to apply:** Any chart need in this project must be satisfied with:
- Pure SVG rendered in React (see `SvgBarChart` in `DashboardMode.tsx` as the established pattern)
- CSS-only progress/bar visuals (already used for project progress bars)

If recharts 3.x ever lands with verified React 19 support, test in isolation before using it.
