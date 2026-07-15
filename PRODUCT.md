# Product

## Register

product

## Users

Developers and AI agents working within the Archon AI-OS ecosystem. They interact with this surface during the UI component design and review loop — building, previewing, and iterating on UI components that will be embedded into the Archon workspace canvas.

## Product Purpose

Archon is an AI-native operating system that orchestrates agents, manages knowledge vaults, routes models, and runs autonomous workflows. This frontend is its design system sandbox: a Vite-powered preview server that renders individual UI components in isolation for the workspace canvas iframe.

Success looks like: components render with full brand fidelity, load instantly, and can be iterated on by AI agents without visual regressions.

## Brand Personality

Precise. Capable. Uncluttered.

Think Linear meets a research terminal — authoritative violet-indigo that signals intelligence, not decoration. The interface should feel like a tool that knows what it''s doing.

## Anti-references

- Generic shadcn defaults shipped as-is (no identity)
- Purple-to-blue gradients used decoratively without purpose
- Cream/sand/warm-beige backgrounds as a warmth substitute
- Cards nested inside cards nested inside cards
- Bouncy or elastic animations
- Gray text on colored backgrounds

## Design Principles

1. **Identity through restraint** — the violet primary carries the brand; surfaces stay pure white/near-black. No decorative color.
2. **Tool confidence** — every element communicates precision. No unnecessary chrome, no modal-heavy flows.
3. **Motion with intention** — transitions serve orientation, not entertainment. Ease-out-quart, never bounce.
4. **Systematic over bespoke** — always reach for the design token or shared component before inventing a one-off.
5. **Contrast as baseline** — WCAG AA is the floor, not the ceiling.

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Reduced motion must be respected — all animations have an instant-transition fallback. Focus indicators must be visible at all times. No color-only communication.
