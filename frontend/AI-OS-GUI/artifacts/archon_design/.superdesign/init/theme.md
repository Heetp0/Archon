# Design System & Theme

## Framework Detection
- **Framework**: React (TypeScript)
- **Bundler / Dev Server**: Vite
- **CSS Stack**: Tailwind CSS v4 (using `@theme inline` in `index.css`)
- **Component Library**: shadcn/ui (Radix Primitives)

## package.json (Dependencies)
```json
{
  "name": "@workspace/archon",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --config vite.config.ts --host 0.0.0.0",
    "build": "vite build --config vite.config.ts",
    "serve": "vite preview --config vite.config.ts --host 0.0.0.0",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@replit/vite-plugin-cartographer": "catalog:",
    "@replit/vite-plugin-dev-banner": "catalog:",
    "@replit/vite-plugin-runtime-error-modal": "catalog:",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "catalog:",
    "@tanstack/react-query": "catalog:",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "catalog:",
    "@workspace/api-client-react": "workspace:*",
    "class-variance-authority": "catalog:",
    "clsx": "catalog:",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "catalog:",
    "jsdom": "^29.1.1",
    "lucide-react": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "react-hook-form": "^7.55.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "catalog:",
    "tailwindcss": "catalog:",
    "tw-animate-css": "^1.4.0",
    "typescript": "^6.0.3",
    "vite": "catalog:",
    "vitest": "^4.1.9",
    "wouter": "^3.3.5",
    "zod": "catalog:"
  },
  "dependencies": {
    "@phosphor-icons/react": "^2.1.10",
    "katex": "^0.17.0",
    "mermaid": "^11.16.0",
    "react-markdown": "^9.1.0",
    "rehype-katex": "^7.0.1",
    "remark-math": "^6.0.0"
  }
}


```

## Global Stylesheet (index.css)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Vercel True Dark Theme semantic palette */
  --color-app-bg: #000000; /* Pure black */
  --color-panel-bg: #0a0a0a; /* Dark gray */
  --color-border-core: #222222; /* Clean Vercel border #222222 */
  --color-text-primary: #ffffff; /* Crisp primary text */
  --color-text-secondary: #a0a0a0; /* Crisp secondary text */
  --color-text-muted: #666666; /* Muted text */
  
  --color-accent-indigo: #ffffff;
  --color-accent-emerald: #ffffff;
  --color-accent-rose: #ffffff;
  
  --color-accent-primary-text: #ffffff;
  --color-text-on-accent: #000000;
  --color-text-on-accent-dark: #000000;
  
  --color-border-premium: #222222;
  --color-border-accent: #222222;

  --animate-fade-in-gpu: fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;

  /* Legacy semantic tokens (kept for shadcn/ui compatibility) */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-card-border: hsl(var(--card-border));

  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-popover-border: hsl(var(--popover-border));

  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));

  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));

  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));

  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));

  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));

  --font-sans: "Satoshi", "Inter", sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", monospace;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;

  --border: 0 0% 13%;
  --input: 0 0% 13%;
  --ring: 0 0% 100%;

  --card: 0 0% 4%;
  --card-foreground: 0 0% 100%;
  --card-border: 0 0% 13%;

  --popover: 0 0% 4%;
  --popover-foreground: 0 0% 100%;
  --popover-border: 0 0% 13%;

  --primary: 0 0% 100%;
  --primary-foreground: 0 0% 0%;

  --secondary: 0 0% 6%;
  --secondary-foreground: 0 0% 100%;

  --muted: 0 0% 6%;
  --muted-foreground: 0 0% 63%;

  --accent: 0 0% 6%;
  --accent-foreground: 0 0% 100%;

  --destructive: 347 77% 50%;
  --destructive-foreground: 0 0% 100%;

  --app-font-sans: "Satoshi", "Inter", sans-serif;
  --app-font-mono: "Geist Mono", "JetBrains Mono", monospace;
  --radius: 0.5rem;
}

.dark {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;

  --border: 0 0% 13%;
  --input: 0 0% 13%;
  --ring: 0 0% 100%;

  --card: 0 0% 4%;
  --card-foreground: 0 0% 100%;
  --card-border: 0 0% 13%;

  --popover: 0 0% 4%;
  --popover-foreground: 0 0% 100%;
  --popover-border: 0 0% 13%;

  --primary: 0 0% 100%;
  --primary-foreground: 0 0% 0%;

  --secondary: 0 0% 6%;
  --secondary-foreground: 0 0% 100%;

  --muted: 0 0% 6%;
  --muted-foreground: 0 0% 63%;

  --accent: 0 0% 6%;
  --accent-foreground: 0 0% 100%;

  --destructive: 347 77% 50%;
  --destructive-foreground: 0 0% 100%;
}

@layer base {
  * {
    @apply border-border-core;
  }

  body {
    @apply font-sans antialiased bg-app-bg text-text-primary overflow-hidden;
  }
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #222222;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #333333;
}

/* Minimal glass panel - no blur, no glow */
.glass-panel {
  background: #0a0a0a;
  border: 1px solid var(--color-border-premium);
  box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.7);
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}

/* Eased Dark Gradient to avoid banding */
.dark-gradient-fade-bottom {
  background: linear-gradient(
    to top,
    #000000 0%,
    rgba(0, 0, 0, 0.95) 50%,
    rgba(0, 0, 0, 0) 100%
  );
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Vercel Card style with ultra-thin borders and subtle overlay tints */
.vercel-card {
  background: #0a0a0a;
  border: 1px solid #222222;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.vercel-card:hover {
  border-color: #444444;
  background: #111111;
}

/* Vercel Panel / Rail styles for monochrome look */
.vercel-rail {
  background: #000000;
  border-right: 1px solid #222222;
}

.vercel-panel {
  background: #0a0a0a;
  border: 1px solid #222222;
}

```