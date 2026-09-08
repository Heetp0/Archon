# Duplicate / Copy File Audit (R3)

## Overview

This audit identifies duplicate files across the repository, with a primary focus on the parallel structures in rontend/artifacts/archon and rontend/artifacts/archon_design.


### Backend Duplicates

No significant backend duplicates were found. Excluded .lancedb internal vector database chunk and index files, metrics.db, and virtual environments.


### Frontend Duplicates


#### 1. Exact Matches

These files have identical contents in both rchon and rchon_design.

**Recommendation**: Extract these generic or identical components to a shared library, or completely remove one of the rtifacts subdirectories if one is deprecated.


- components.json
- index.html
- tsconfig.json
- vitest.config.ts
- .replit-artifact\artifact.toml
- public\favicon.svg
- public\robots.txt
- src\types.ts
- src\components\BrowsePCModal.tsx
- src\components\LoadingScreen.tsx
- src\components\ui\alert-dialog.tsx
- src\components\ui\badge.tsx
- src\components\ui\button.tsx
- src\components\ui\card.tsx
- src\components\ui\dialog.tsx
- src\components\ui\drawer.tsx
- src\components\ui\hover-card.tsx
- src\components\ui\input.tsx
- src\components\ui\label.tsx
- src\components\ui\progress.tsx
- src\components\ui\resizable.tsx
- src\components\ui\scroll-area.tsx
- src\components\ui\select.tsx
- src\components\ui\separator.tsx
- src\components\ui\sheet.tsx
- src\components\ui\skeleton.tsx
- src\components\ui\slider.tsx
- src\components\ui\spinner.tsx
- src\components\ui\tabs.tsx
- src\components\ui\textarea.tsx
- src\components\ui\toast.tsx
- src\components\ui\toaster.tsx
- src\components\ui\toggle.tsx
- src\components\ui\tooltip.tsx
- src\hooks\use-mobile.tsx
- src\hooks\useFileAttach.ts
- src\lib\bootState.ts
- src\lib\utils.ts
- src\pages\not-found.tsx
- src-tauri\.gitignore
- src-tauri\build.rs
- src-tauri\Cargo.lock
- src-tauri\Cargo.toml
- src-tauri\tauri.conf.json
- src-tauri\capabilities\default.json
- src-tauri\icons\icon.icns
- src-tauri\src\lib.rs
- src-tauri\src\main.rs


#### 2. Modified Duplicates

These files share the same relative path but have divergent content. The diffs show how they differ.


##### .tsbuildinfo

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1 +1 @@

-{"fileNames":["../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2016.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2017.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2018.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2019.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2020.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2021.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2022.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2024.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2025.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.esnext.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.dom.iterable.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.collection.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.generator.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.iterable.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.promise.d.ts","../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.proxy.d.ts","../../node_modules/.pnpm/typescript@6.0.3/n
... [Diff truncated due to length]
`


##### package.json

**Why it differs**: 
Different package name, version, or specific dependency versions.

**Recommended Action**: Consolidate dependencies if merging, or keep separated if they are distinct packages.

`diff
--- archon

+++ archon_design

@@ -11,22 +11,13 @@

   },

   "devDependencies": {

     "@hookform/resolvers": "^3.10.0",

-    "@radix-ui/react-accordion": "^1.2.4",

-    "@radix-ui/react-alert-dialog": "^1.1.0",

-    "@radix-ui/react-aspect-ratio": "^1.1.3",

-    "@radix-ui/react-avatar": "^1.1.4",

-    "@radix-ui/react-checkbox": "^1.1.5",

-    "@radix-ui/react-collapsible": "^1.1.4",

-    "@radix-ui/react-context-menu": "^2.2.7",

+    "@radix-ui/react-alert-dialog": "1.1.0",

     "@radix-ui/react-dialog": "^1.1.7",

     "@radix-ui/react-dropdown-menu": "^2.1.7",

-    "@radix-ui/react-hover-card": "^1.1.0",

+    "@radix-ui/react-hover-card": "1.1.0",

     "@radix-ui/react-label": "^2.1.3",

-    "@radix-ui/react-menubar": "^1.1.7",

-    "@radix-ui/react-navigation-menu": "^1.2.6",

     "@radix-ui/react-popover": "^1.1.7",

-    "@radix-ui/react-progress": "^1.1.0",

-    "@radix-ui/react-radio-group": "^1.2.4",

+    "@radix-ui/react-progress": "1.1.0",

     "@radix-ui/react-scroll-area": "^1.2.4",

     "@radix-ui/react-select": "^2.1.7",

     "@radix-ui/react-separator": "^1.1.3",

@@ -36,7 +27,6 @@

     "@radix-ui/react-tabs": "^1.1.4",

     "@radix-ui/react-toast": "^1.2.7",

     "@radix-ui/react-toggle": "^1.1.3",

-    "@radix-ui/react-toggle-group": "^1.1.3",

     "@radix-ui/react-tooltip": "^1.2.0",

     "@replit/vite-plugin-cartographer": "catalog:",

     "@replit/vite-plugin-dev-banner": "catalog:",

@@ -54,19 +44,14 @@

     "@workspace/api-client-react": "workspace:*",

     "class-variance-authority": "catalog:",

     "clsx": "catalog:",

-    "cmdk": "^1.1.1",

     "date-fns": "^3.6.0",

     "embla-carousel-react": "^8.6.0",

     "framer-motion": "catalog:",

-    "input-otp": "^1.4.2",

     "jsdom": "^29.1.1",

     "lucide-react": "catalog:",

-    "next-themes": "^0.4.6",

     "react": "catalog:",

-    "react-day-picker": "^9.11.1",

     "react-dom": "catalog:",

     "react-hook-form": "^7.55.0",

-    "react-icons
... [Diff truncated due to length]
`


##### vite.config.ts

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,16 +1,9 @@

-import { defineConfig } from "vite";

+﻿import { defineConfig } from "vite";

 import react from "@vitejs/plugin-react";

 import tailwindcss from "@tailwindcss/vite";

 import path from "path";

-import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

 

-const rawPort = process.env.PORT;

-const port = rawPort ? Number(rawPort) : 25135;

-

-if (Number.isNaN(port) || port <= 0) {

-  throw new Error(`Invalid PORT value: "${rawPort}"`);

-}

-

+const port = Number(process.env.PORT) || 5173;

 const basePath = process.env.BASE_PATH || "/";

 

 export default defineConfig({

@@ -18,31 +11,17 @@

   plugins: [

     react(),

     tailwindcss(),

-    runtimeErrorOverlay(),

-    ...(process.env.NODE_ENV !== "production" &&

-    process.env.REPL_ID !== undefined

-      ? [

-          await import("@replit/vite-plugin-cartographer").then((m) =>

-            m.cartographer({

-              root: path.resolve(import.meta.dirname, ".."),

-            }),

-          ),

-          await import("@replit/vite-plugin-dev-banner").then((m) =>

-            m.devBanner(),

-          ),

-        ]

-      : []),

   ],

   resolve: {

     alias: {

       "@": path.resolve(import.meta.dirname, "src"),

-      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),

+      "@assets": path.resolve(import.meta.dirname, "src", "assets"),

     },

     dedupe: ["react", "react-dom"],

   },

   root: path.resolve(import.meta.dirname),

   build: {

-    outDir: path.resolve(import.meta.dirname, "../../../../daemon/static"),

+    outDir: path.resolve(import.meta.dirname, "../../../backend/static"),

     emptyOutDir: true,

     rollupOptions: {

       output: {

@@ -59,16 +38,18 @@

   },

   server: {

     port,

-    strictPort: true,

+    strictPort: false,

     host: "0.0.0.0",

-    allowedHosts: true,

-    fs: {

-      strict: true,

+    proxy: {

+      "/api": {

+ 
... [Diff truncated due to length]
`


##### src\App.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -33,7 +33,7 @@

   render() {

     if (this.state.hasError) {

       return (

-        <div className="error-fallback flex flex-col items-center justify-center h-screen bg-app-bg text-text-primary p-6 font-mono">

+        <div className="error-fallback flex flex-col items-center justify-center h-screen bg-[#020617] text-text-primary p-6 font-mono">

           <h2 className="text-sm font-bold text-accent-rose mb-2">Something went wrong</h2>

           <p className="text-xs text-text-secondary mb-4 max-w-md text-center">{this.state.error?.message}</p>

           <button
`


##### src\index.css

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,4 +1,4 @@

-@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

+@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

 

 @import "tailwindcss";

 @import "tw-animate-css";

@@ -7,15 +7,26 @@

 @custom-variant dark (&:is(.dark *));

 

 @theme inline {

-  /* Zinc Dark Mode semantic palette */

-  --color-app-bg: #050505;

-  --color-panel-bg: #121214;

-  --color-border-core: #27272A;

-  --color-text-primary: #E4E4E7;

-  --color-text-secondary: #A1A1AA;

-  --color-accent-indigo: #4F46E5;

-  --color-accent-emerald: #10B981;

-  --color-accent-rose: #E11D48;

+  /* Vercel True Dark Theme semantic palette */

+  --color-app-bg: #000000; /* Pure black */

+  --color-panel-bg: #0a0a0a; /* Dark gray */

+  --color-border-core: #222222; /* Clean Vercel border #222222 */

+  --color-text-primary: #ffffff; /* Crisp primary text */

+  --color-text-secondary: #a0a0a0; /* Crisp secondary text */

+  --color-text-muted: #666666; /* Muted text */

+  

+  --color-accent-indigo: #ffffff;

+  --color-accent-emerald: #ffffff;

+  --color-accent-rose: #ffffff;

+  

+  --color-accent-primary-text: #ffffff;

+  --color-text-on-accent: #000000;

+  --color-text-on-accent-dark: #000000;

+  

+  --color-border-premium: #222222;

+  --color-border-accent: #222222;

+

+  --animate-fade-in-gpu: fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;

 

   /* Legacy semantic tokens (kept for shadcn/ui compatibility) */

   --color-background: hsl(var(--background));

@@ -47,8 +58,8 @@

   --color-destructive: hsl(var(--destructive));

   --color-destructive-foreground: hsl(var(--destructive-foreground));

 

-  --font-sans: var(--app-font-sans);

-  --font-mono: var(--app-font-mono);

+  --font-sans: "Satoshi", "Inter", sans-serif;

+  --font-mono: "Geist Mono", "JetBrains Mono", monospa
... [Diff truncated due to length]
`


##### src\main.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -2,6 +2,26 @@

 import App from "./App";

 import "./index.css";

 

+// Intercept fetch to track server load

+if (typeof window !== "undefined") {

+  const originalFetch = window.fetch;

+  window.fetch = async (...args) => {

+    try {

+      const response = await originalFetch(...args);

+      const loadHeader = response.headers.get("X-Server-Load");

+      if (loadHeader) {

+        const load = parseFloat(loadHeader);

+        if (!isNaN(load)) {

+          window.dispatchEvent(new CustomEvent("server-load", { detail: load }));

+        }

+      }

+      return response;

+    } catch (error) {

+      throw error;

+    }

+  };

+}

+

 document.documentElement.classList.add("dark");

 

 createRoot(document.getElementById("root")!).render(<App />);
`


##### src\components\CalendarWidget.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -4,6 +4,7 @@

   Plus, X, MapPin

 } from "lucide-react";

 import { cn } from "@/lib/utils";

+import { isSameDay } from "date-fns";

 

 interface CalendarEvent {

   id: string;

@@ -31,11 +32,7 @@

   return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

 }

 

-function isSameDay(a: Date, b: Date): boolean {

-  return a.getFullYear() === b.getFullYear() &&

-         a.getMonth() === b.getMonth() &&

-         a.getDate() === b.getDate();

-}

+

 

 export default function CalendarWidget({ events = [], loading }: CalendarWidgetProps) {

   const [viewDate, setViewDate] = useState(new Date());

@@ -160,7 +157,7 @@

             {events.filter((e) => isSameDay(new Date(e.start.dateTime), today)).length === 0 ? (

               <div className="text-xs font-mono text-text-secondary italic">No events scheduled today</div>

             ) : (

-              <div className="space-y-1.5 max-h-28 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-border-core) transparent" }}>

+              <div className="space-y-1.5 max-h-28 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2030 transparent" }}>

                 {events

                   .filter((e) => isSameDay(new Date(e.start.dateTime), today))

                   .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
`


##### src\components\ContextSidebar.tsx

**Why it differs**: 
rchon_design likely includes newer UI/UX enhancements or different styling choices compared to rchon.

**Recommended Action**: Merge the UI improvements from rchon_design into rchon (or vice versa) and delete the duplicate.

`diff
--- archon

+++ archon_design

@@ -32,7 +32,6 @@

             )}

           </button>

           <button

-            aria-label="Collapse sidebar"

             onClick={() => setContextSidebarOpen(false)}

             className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"

             title="Collapse sidebar"
`


##### src\components\NavRail.tsx

**Why it differs**: 
rchon_design likely includes newer UI/UX enhancements or different styling choices compared to rchon.

**Recommended Action**: Merge the UI improvements from rchon_design into rchon (or vice versa) and delete the duplicate.

`diff
--- archon

+++ archon_design

@@ -1,7 +1,7 @@

 import React from "react";

-import { useAppContext, AppMode } from "@/context/AppContext";

-import { useWebSocketContext } from "@/context/WebSocketContext";

-import {

+import { Activity, useAppContext, AppMode } from "@/context/AppContext";

+import { Activity, useWebSocketContext } from "@/context/WebSocketContext";

+import { Activity,

   House,

   ChatCircle,

   Users,

@@ -9,73 +9,61 @@

   Cpu,

   Book,

   Robot,

-  Gear

+  Gear,

+  Notebook,

+  Microphone

 } from "@phosphor-icons/react";

-import { cn } from "@/lib/utils";

+import { Activity, cn } from "@/lib/utils";

 

 const NAV_ITEMS: {

   id: AppMode;

   icon: React.ElementType;

   label: string;

-  color: string;

-  activeClass: string;

-  dot: string;

 }[] = [

   {

     id: "dashboard",

     icon: House,

     label: "Dashboard",

-    color: "text-accent-indigo",

-    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",

-    dot: "bg-accent-indigo",

   },

   {

     id: "chat",

     icon: ChatCircle,

     label: "Chat",

-    color: "text-accent-indigo",

-    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",

-    dot: "bg-accent-indigo",

   },

   {

     id: "council",

     icon: Users,

     label: "Council",

-    color: "text-accent-rose",

-    activeClass: "bg-accent-rose/10 border-accent-rose/40",

-    dot: "bg-accent-rose",

   },

   {

     id: "research",

     icon: MagnifyingGlass,

     label: "Research",

-    color: "text-accent-indigo",

-    activeClass: "bg-accent-indigo/10 border-accent-indigo/40",

-    dot: "bg-accent-indigo",

   },

   {

     id: "agents",

     icon: Cpu,

     label: "Agent Runtime",

-    color: "text-accent-emerald",

-    activeClass: "bg-accent-emerald/10 border-accent-emerald/40",

-    dot: "bg-accent-emerald",

   },

   {

     id: "obsidian",

     icon: Book,

     label: "Obsidian",

-    color: "text-accent-indigo",

-    activeClass: "bg-accent-
... [Diff truncated due to length]
`


##### src\components\ProjectHistoryPanel.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -289,7 +289,7 @@

   }

 

   // chat | council | research — light projects

-  const mode = currentMode as Exclude<typeof currentMode, "agents" | "dashboard" | "obsidian" | "directory">;

+  const mode = currentMode as Exclude<typeof currentMode, "agents" | "dashboard" | "obsidian" | "directory" | "notebook" | "lecture">;

   const modeProjects = projects.filter((p) => p.mode === mode && p.kind === "light");

   const ungrouped = ungroupedChats[mode as "chat" | "council" | "research"] ?? [];
`


##### src\components\RightSidebar.tsx

**Why it differs**: 
rchon_design likely includes newer UI/UX enhancements or different styling choices compared to rchon.

**Recommended Action**: Merge the UI improvements from rchon_design into rchon (or vice versa) and delete the duplicate.

`diff
--- archon

+++ archon_design

@@ -1,36 +1,329 @@

 import React, { useState } from "react";

 import { useAppContext } from "@/context/AppContext";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import {

-  Activity, Zap, Server,

-  Link as LinkIcon, Wifi, WifiOff,

-  Loader2, Search, Send, Plus, X,

-  LayoutList

+  Activity, ShieldAlert, Zap, Server,

+  BarChart, FileText, Link as LinkIcon, Wifi, WifiOff,

+  Loader2, Search, Send, FileCode, Database, FileJson,

+  X, Plus, Image, FileType, File, FileClock, ChevronDown,

+  PanelLeft, PanelRightClose, LayoutList

 } from "lucide-react";

+// Phosphor icons for header controls

 import { CaretRight, List, FileText as PhFileText } from "@phosphor-icons/react";

 import { ScrollArea } from "@/components/ui/scroll-area";

+import { Slider } from "@/components/ui/slider";

 import { Button } from "@/components/ui/button";

 import { cn } from "@/lib/utils";

-

-import { ContextFilesSection } from "./RightSidebar/ContextFilesSection";

-import { CouncilPanel } from "./RightSidebar/CouncilPanel";

-import { FileViewerPanel } from "./RightSidebar/FileViewerPanel";

-import { ALL_FILE_TABS } from "./RightSidebar/FileViewerTabs";

-import { ChatInspectorPanel } from "./RightSidebar/ChatInspectorPanel";

-import { ResearchOutputPanel } from "./RightSidebar/ResearchOutputPanel";

-import { AgentFileInspectorPanel } from "./RightSidebar/AgentFileInspectorPanel";

-

+import type { ContextFile } from "@/context/ProjectsContext";

+

+// ── Context Files compact list ─────────────────────────────────────────────────

+const KIND_ICON: Record<ContextFile["kind"], React.ElementType> = {

+  image: Image, pdf: FileType, text: FileText, other: File,

+};

+

+function ContextFilesSection({ projectId }: { projectId: string | null }) {

+  const { projects, removeContextFile } = 
... [Diff truncated due to length]
`


##### src\components\SettingsModal.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,6 +1,7 @@

 import React, { useState, useEffect, useCallback } from "react";

 import { toast } from "sonner";

 import { useAppContext } from "@/context/AppContext";

+import { useFocusTrap } from "@/hooks/useFocusTrap";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

 import { Label } from "@/components/ui/label";

@@ -154,7 +155,7 @@

                   autoFocus

                   className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40 pr-10"

                 />

-                <button aria-label="Toggle visibility" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary">

+                <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary">

                   {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}

                 </button>

               </div>

@@ -192,7 +193,7 @@

         <p className="text-[10px] font-mono text-text-secondary truncate mt-0.5">{provider.baseUrl}</p>

         {provider.apiKey && <p className="text-[10px] font-mono text-text-secondary mt-0.5 tracking-wider">{masked}</p>}

       </div>

-      <button aria-label="Remove" onClick={onRemove} className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0">

+      <button onClick={onRemove} className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0">

         <Trash2 className="w-3.5 h-3.5" />

       </button>

     </div>

@@ -201,6 +202,7 @@

 

 function AddCustomProviderForm({ onAdd }: { onAdd: (p: CustomProvider) => void }) {

   const [open, s
... [Diff truncated due to length]
`


##### src\components\modes\AgentMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,62 +1,77 @@

 import React, { useState, useRef, useEffect, useCallback } from "react";

 import { ScrollArea } from "@/components/ui/scroll-area";

+import { Button } from "@/components/ui/button";

 import {

-  Cpu, Terminal, Loader2, CheckCircle2, Clock, XCircle,

-  ChevronDown, ChevronUp, AlertTriangle, X, Send, LayoutDashboard,

-  Paperclip, Plus,

+  Cpu, Terminal, Paperclip, Plus, Send, X,

+  LayoutDashboard, AlertTriangle, AlertCircle, CheckCircle2,

+  Play, RefreshCw, ChevronDown, ChevronUp, Pause, Trash2

 } from "lucide-react";

 import { motion, AnimatePresence } from "framer-motion";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import { useFileAttach } from "@/hooks/useFileAttach";

-import { Button } from "@/components/ui/button";

-import BrowsePCModal from "@/components/BrowsePCModal";

-import type { TerminalLine } from "@/types";

+import BrowsePCModal from "../BrowsePCModal";

+import { toast } from "sonner";

+import { cn } from "@/lib/utils";

+

+// Mock Diff for DiffViewer

+const MOCK_DIFF = `--- a/src/index.css

++++ b/src/index.css

+@@ -10,6 +10,12 @@

+-  --color-app-bg: oklch(0 0 0);

++  --color-app-bg: #000000;

+-  --color-panel-bg: oklch(0.12 0 0);

++  --color-panel-bg: #0a0a0a;

+-  --color-border-core: oklch(0.20 0 0);

++  --color-border-core: #222222;

+@@ -40,5 +46,10 @@

+-  --font-sans: "Plus Jakarta Sans", "Outfit", "Inter", sans-serif;

++  --font-sans: "Satoshi", "Inter", sans-serif;`;

 

 const STATUS_ICON = {

+  pending: Clock,

+  running: RefreshCw,

   complete: CheckCircle2,

-  running:  Loader2,

-  queued:   Clock,

-  failed:   XCircle,

-} as const;

-

-const STATUS_COLOR = {

-  complete: "text-accent-emerald",

-  running:  "text-accent-emerald",

-  queued:   "text-text-secondary",

-  failed:   "text-accent-rose",

... [Diff truncated due to length]
`


##### src\components\modes\AgentsDirectoryMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -6,7 +6,6 @@

   GitBranch, Activity, ChevronRight, Check

 } from "lucide-react";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { cn } from "@/lib/utils";

 

 // ── Types ─────────────────────────────────────────────────────────────────────

@@ -219,7 +218,7 @@

               }

             }}

             disabled={!name || !description}

-            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-mono text-text-primary transition-all"

+            className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:opacity-40 text-sm font-mono font-medium transition-all"

           >

             Register Agent

           </button>

@@ -233,7 +232,7 @@

 function AgentCard({ agent }: { agent: AgentDef }) {

   const [expanded, setExpanded] = useState(false);

   const Icon = agent.icon;

-  const agentStatuses = useWebSocketStore(s => s.agentStatuses);

+  const { agentStatuses } = useWebSocketContext();

   const liveStatus = agentStatuses.find(

     (a) => a.name.toLowerCase() === agent.name.toLowerCase()

   );

@@ -268,7 +267,7 @@

               </span>

             )}

             {agent.type === "custom" && (

-              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-accent-indigo/10 text-indigo-500 border border-indigo-500/20">

+              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white border border-white/10">

                 Custom

               </span>

             )}

@@ -378,7 +377,7 @@

           </div>

           <button

             onClick={() => setShowAdd(true)}

-            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 borde
... [Diff truncated due to length]
`


##### src\components\modes\ChatMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,67 +1,113 @@

-import React, { useState, useRef, useEffect } from "react";

+import React, { useState, useRef, useEffect, useCallback } from "react";

 import { ScrollArea } from "@/components/ui/scroll-area";

-import { Textarea } from "@/components/ui/textarea";

-import { Button } from "@/components/ui/button";

-import { Paperclip, Send, Bot, User, Loader2, Copy, X } from "lucide-react";

-import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

+import { Bot, User, Copy, X, Edit, RotateCcw, Volume2, ArrowDown } from "lucide-react";

 import { motion } from "framer-motion";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import { useFileAttach } from "@/hooks/useFileAttach";

 import ReactMarkdown from "react-markdown";

+import { CodeBlock } from "../CodeBlock";

 import { toast } from "sonner";

+import ChatInput from "../chat/ChatInput";

+

+function SkeletonMessage() {

+  return (

+    <div className="flex gap-4 animate-pulse py-4">

+      <div className="flex-shrink-0 w-8 h-8 rounded bg-[#222222]" />

+      <div className="flex-1 space-y-2 py-1">

+        <div className="h-4 bg-[#222222] rounded w-1/4" />

+        <div className="space-y-2">

+          <div className="h-4 bg-[#222222] rounded w-3/4" />

+          <div className="h-4 bg-[#222222] rounded w-1/2" />

+        </div>

+      </div>

+    </div>

+  );

+}

 

 export default function ChatMode() {

-  const { sendChat, connected, cancelStream } = useWebSocketContext();

-  const isStreaming = useWebSocketStore(s => s.isStreaming);

-  const availableModels = useWebSocketStore(s => s.availableModels);

-  const messagesMap = useWebSocketStore(s => s.messagesMap);

+  const { messages: chatMessages, isStreaming, sendChat, connected, availableModels, cancelSt
... [Diff truncated due to length]
`


##### src\components\modes\CouncilMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,48 +1,49 @@

-import React, { useState } from "react";

+import React, { useState, useCallback } from "react";

 import { ScrollArea } from "@/components/ui/scroll-area";

 import { Button } from "@/components/ui/button";

-import { Download, Loader2, Gavel, CheckCircle2, XCircle, MinusCircle, Paperclip } from "lucide-react";

+import { Download, Gavel, CheckCircle2, XCircle, Loader2, MinusCircle } from "lucide-react";

 import { motion } from "framer-motion";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import { useFileAttach } from "@/hooks/useFileAttach";

 import ReactMarkdown from "react-markdown";

-

-const ROLES = ["Proposer", "Critic", "Domain Expert", "Synthesizer"];

-const COLORS = ["text-accent-indigo", "text-accent-rose", "text-accent-indigo", "text-accent-emerald"];

-const BORDERS = ["border-blue-500/30", "border-orange-500/30", "border-purple-500/30", "border-emerald-500/30"];

-const BGS = ["bg-blue-950/10", "bg-orange-950/10", "bg-purple-950/10", "bg-emerald-950/10"];

-const HEADERS = ["bg-blue-900/30", "bg-orange-900/30", "bg-purple-900/30", "bg-emerald-900/30"];

+import ChatInput from "../chat/ChatInput";

+

+const ROLES = ["Skeptic", "Optimist", "Domain Expert", "Synthesizer"];

+const COLORS = ["text-[#a0a0a0]", "text-[#ffffff]", "text-[#a0a0a0]", "text-[#ffffff]"];

+const BORDERS = ["border-[#222222]", "border-[#222222]", "border-[#222222]", "border-[#222222]"];

+const BGS = ["bg-[#0a0a0a]", "bg-[#0a0a0a]", "bg-[#0a0a0a]", "bg-[#0a0a0a]"];

+const HEADERS = ["bg-[#111111]", "bg-[#111111]", "bg-[#111111]", "bg-[#111111]"];

 const GLOWS = ["", "", "", ""];

-const DOTS = ["bg-accent-indigo", "bg-accent-rose", "bg-accent-indigo", "bg-accent-emerald"];

+const DOTS = ["bg-[#666666]", "bg-white", "bg-[#666666]", "bg-white"];

 

 const VERDICT_ITEMS = [


... [Diff truncated due to length]
`


##### src\components\modes\DashboardMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,19 +1,24 @@

+﻿import { ScrollArea } from "@/components/ui/scroll-area";

 import React, { useState, useEffect, useMemo } from "react";

 import { motion, AnimatePresence } from "framer-motion";

 import {

   Activity, Cpu, Zap, Clock, MessageSquare, Users, Search,

   BookOpen, Bot, ArrowRight, Wifi, WifiOff, Database,

   Mail, CheckSquare, Square, X, ExternalLink,

-  RefreshCw, ChevronRight, CheckCircle2, InboxIcon, ListTodo

+  RefreshCw, ChevronRight, CheckCircle2, InboxIcon, ListTodo,

+  Play, HelpCircle, Settings

 } from "lucide-react";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { useAppContext } from "@/context/AppContext";

 import { cn } from "@/lib/utils";

 import type { AppMode } from "@/context/AppContext";

 import CalendarWidget from "@/components/CalendarWidget";

-

-// ── Types ──────────────────────────────────────────────────────────────────────

+import OnboardingFlow from "@/components/dashboard/OnboardingFlow";

+import SettingsPanel from "@/components/dashboard/SettingsPanel";

+import HelpSystem from "@/components/dashboard/HelpSystem";

+import NewsWidget from "@/components/dashboard/NewsWidget";

+import MetricsPanel from "@/components/dashboard/MetricsPanel";

+

 interface MailItem {

   id: string;

   sender: string;

@@ -31,21 +36,32 @@

   list: string;

 }

 

-// ── Subcomponents ──────────────────────────────────────────────────────────────

-

 function StatCard({ icon: Icon, label, value, sub, accent }: {

   icon: React.ElementType; label: string; value: string | number;

   sub?: string; accent: string;

 }) {

   return (

-    <div className="relative rounded-2xl border border-border-core/25 hover:border-border-core/30 bg-panel-bg p-5 overflow-hidden flex flex-col gap-3 transition-colors">

-      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent.replace("tex
... [Diff truncated due to length]
`


##### src\components\modes\ObsidianMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,15 +1,18 @@

 import React, { useState } from "react";

 import { motion, AnimatePresence } from "framer-motion";

 import {

-  BookOpen, Play, Clock, Plus, Trash2, Edit3, Check, X,

+  BookOpen, Play, Clock, Plus, Trash2, X,

   Calendar, FileText, Search, Lightbulb, Mail, ListTodo,

-  Star, Zap, RefreshCw, BookMarked, Brain, Target

+  Star, Zap, RefreshCw, BookMarked, Brain, Target, Folder, Trash

 } from "lucide-react";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { cn } from "@/lib/utils";

-

-// ── Types ─────────────────────────────────────────────────────────────────────

+import { ScrollArea } from "@/components/ui/scroll-area";

+import { Card } from "@/components/ui/card";

+import { Button } from "@/components/ui/button";

+import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

+import { Input } from "@/components/ui/input";

+

 interface Skill {

   id: string;

   icon: React.ElementType;

@@ -31,117 +34,50 @@

   enabled: boolean;

 }

 

-// ── Built-in skills ───────────────────────────────────────────────────────────

 const DEFAULT_SKILLS: Skill[] = [

   {

     id: "daily-briefing",

     icon: Star,

     name: "Daily Briefing",

-    description: "Summarize your active tasks, priorities, and key notes from today's vault entries.",

-    prompt: "Give me a concise daily briefing from my Obsidian vault. Summarize active projects, today's tasks, and any critical notes.",

+    description: "Summarize task documents in your active vault notes.",

+    prompt: "Give me a daily briefing. Summarize active projects, tasks, and critical notes.",

     category: "briefing",

-    color: "text-accent-rose",

-    bg: "bg-accent-rose/[0.06]",

-    border: "border-amber-500/20",

+    color: "text-white",

+    bg: "bg-[#111111]",

+    border: "border-[#222222]",

   },

... [Diff truncated due to length]
`


##### src\components\modes\ResearchMode.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -2,7 +2,6 @@

 import { motion } from "framer-motion";

 import { Paperclip, Download, Globe } from "lucide-react";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import { useFileAttach } from "@/hooks/useFileAttach";

 import { Button } from "@/components/ui/button";

@@ -37,7 +36,6 @@

 

 const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n]));

 

-

 function getDynamicGraph(text: string) {

   if (!text) {

     return { nodes: NODES, edges: EDGES, nodeMap: NODE_MAP };

@@ -101,9 +99,7 @@

 }

 

 export default function ResearchMode() {

-  const isStreaming = useWebSocketStore(s => s.isStreaming);

-  const researchText = useWebSocketStore(s => s.researchText);

-  const citations = useWebSocketStore(s => s.citations);

+  const { isStreaming, researchText, citations } = useWebSocketContext();

   const { activeProjectId } = useProjectsContext();

   const { inputRef: fileInputRef, openPicker, handleFilesSelected } = useFileAttach(activeProjectId);

 

@@ -112,6 +108,12 @@

 

   const { nodes, edges, nodeMap } = useMemo(() => {

     return getDynamicGraph(researchText);

+  }, [researchText]);

+

+  // Preprocess text to replace standard [1] style citations with custom markdown links for bubble styling

+  const processedText = useMemo(() => {

+    if (!researchText) return "";

+    return researchText.replace(/\[([0-9]+)\]/g, "[citation-$1](#citation-$1)");

   }, [researchText]);

 

   const handleExport = () => {

@@ -155,14 +157,14 @@

       />

 

       {/* Header */}

-      <div className="px-5 py-3 border-b border-border-core/60 flex items-center gap-3 flex-shrink-0">

+      <div className="px-5 py-3 border-b border-border-core flex items-center gap-3 flex-shrink-0 bg-[#0a0a0a]">

         <span className="text-xs font-mono text-text-secondary">Knowle
... [Diff truncated due to length]
`


##### src\context\AppContext.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,6 +1,6 @@

 import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

 

-export type AppMode = "dashboard" | "chat" | "council" | "research" | "agents" | "obsidian" | "directory";

+export type AppMode = "dashboard" | "chat" | "council" | "research" | "agents" | "obsidian" | "directory" | "notebook" | "lecture" | "monitoring";

 

 export interface HistoryItem {

   id: string;

@@ -33,7 +33,7 @@

   const [mode, setMode] = useState<AppMode>(() => {

     try {

       const saved = localStorage.getItem("archon_appMode");

-      if (saved && ["dashboard", "chat", "council", "research", "agents", "obsidian", "directory"].includes(saved)) {

+      if (saved && ["dashboard", "chat", "council", "research", "agents", "obsidian", "directory", "notebook", "lecture"].includes(saved)) {

         return saved as AppMode;

       }

       return "dashboard";
`


##### src\context\ProjectsContext.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,4 +1,6 @@

 import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

+import { persist } from "@/lib/storage";

+

 

 export type ProjectMode = "chat" | "council" | "research" | "agents";

 

@@ -118,13 +120,7 @@

 

   const revokedUrls = useRef<string[]>([]);

 

-  useEffect(() => {

-    try {

-      localStorage.setItem("archon_projects", JSON.stringify(projects));

-    } catch (e) {

-      console.error("Failed to save projects to localStorage:", e);

-    }

-  }, [projects]);

+  useEffect(() => { persist("archon_projects", projects); }, [projects]);

 

   useEffect(() => {

     try {

@@ -150,13 +146,7 @@

     }

   }, [activeChatId]);

 

-  useEffect(() => {

-    try {

-      localStorage.setItem("archon_ungroupedChats", JSON.stringify(ungroupedChats));

-    } catch (e) {

-      console.error("Failed to save ungroupedChats to localStorage:", e);

-    }

-  }, [ungroupedChats]);

+  useEffect(() => { persist("archon_ungroupedChats", ungroupedChats); }, [ungroupedChats]);

 

   useEffect(() => {

     const activeProject = projects.find((p) => p.id === activeProjectId);
`


##### src\context\WebSocketContext.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -1,52 +1,82 @@

-import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";

+﻿import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";

 import { useWebSocket } from "@/hooks/useWebSocket";

 import { subscribeActiveChat, subscribeActiveProjectFiles, ContextFile } from "@/context/ProjectsContext";

 import { clearOfflineTimer } from "@/lib/bootState";

 import { toast } from "sonner";

-import { useWebSocketStore } from "@/store/websocketStore";

+

+export type Message = {

+  id: string;

+  role: "user" | "assistant";

+  content: string;

+  model?: string;

+};

+

+type CouncilMessageMap = {

+  [modelKey: string]: Message[];

+};

+

+type Telemetry = {

+  tokens: number;

+  cost: number;

+  latency: number;

+};

 

 type WebSocketContextType = {

-  connected: boolean;

-  connecting: boolean;

+  agentStatuses: any[];

+  taskQueue: any[];

+  availableModels: any[];

+  terminalLines: any[];

+  dangerousCommand: any;

   sendAgentCommand: (cmd: string) => void;

   approveCommand: () => void;

   denyCommand: () => void;

+  connected: boolean;

+  connecting: boolean;

+  messages: Message[];

+  councilMessages: CouncilMessageMap;

+  isStreaming: boolean;

+  telemetry: Telemetry;

+  citations: any[];

+  researchText: string;

   sendChat: (message: string, model: string) => void;

   sendCouncil: (message: string, models: string[]) => void;

   sendResearch: (message: string) => void;

+  clearChat: () => void;

   cancelStream: () => void;

+  calendarEvents: any[];

   refreshCalendar: () => void;

 };

 

 const WebSocketContext = createContext<WebSocketContextType | null>(null);

 

 export function WebSocketProvider({ children }: { children: ReactNode }) {

-  const {

-    setActiveChatId,

-    setMessagesMap,

-    setCouncilMessages,

-    setIsStreaming,

-    setTelemetry,

-    setCitations,

- 
... [Diff truncated due to length]
`


##### src\hooks\use-toast.ts

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -6,7 +6,7 @@

 } from "@/components/ui/toast"

 

 const TOAST_LIMIT = 1

-const TOAST_REMOVE_DELAY = 1000000

+const TOAST_REMOVE_DELAY = 5000

 

 type ToasterToast = ToastProps & {

   id: string
`


##### src\hooks\useWebSocket.ts

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -12,6 +12,8 @@

   connecting: boolean;

   error: string | null;

   send: (msg: unknown) => boolean;

+  messages: DaemonEnvelope[];

+  flushMessages: () => void;

 }

 

 export function getDaemonUrl(): string {

@@ -22,14 +24,19 @@

 const RECONNECT_BASE_MS = 2000;

 const RECONNECT_MAX_MS = 30000;

 

-export function useWebSocket(onMessage?: (msg: DaemonEnvelope) => void): WSState {

+export function useWebSocket(): WSState {

   const wsRef = useRef<WebSocket | null>(null);

   const [connected, setConnected] = useState(false);

   const [connecting, setConnecting] = useState(false);

   const [error, setError] = useState<string | null>(null);

+  const [messages, setMessages] = useState<DaemonEnvelope[]>([]);

   const reconnectAttemptRef = useRef(0);

   const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   const mountedRef = useRef(true);

+

+  const flushMessages = useCallback(() => {

+    setMessages([]);

+  }, []);

 

   const scheduleReconnect = useCallback((attempt: number) => {

     const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), RECONNECT_MAX_MS);

@@ -85,7 +92,7 @@

             event: (parsed.event as string) || (parsed.type as string) || "unknown",

             payload: (parsed.payload as Record<string, unknown>) || parsed,

           };

-          onMessage?.(envelope);

+          setMessages((prev) => [...prev, envelope]);

         } catch {

           // ignore

         }

@@ -143,5 +150,5 @@

     };

   }, [connect]);

 

-  return { connected, connecting, error, send };

+  return { connected, connecting, error, send, messages, flushMessages };

 }
`


##### src\lib\storage.ts

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -56,7 +56,7 @@

 

 export function getDaemonConnectionDetails(): ConnectionDetails {

   const host = safeStorage.local.getItem("archon_daemon_host") || window.location.hostname || "localhost";

-  const port = safeStorage.local.getItem("archon_daemon_port") || "8765";

+  const port = safeStorage.local.getItem("archon_daemon_port") || "8000";

   const isSecure = window.location.protocol === "https:";

   

   // Check if host ends with .replit.dev, .replit.app, or .replit.co

@@ -79,3 +79,13 @@

     };

   }

 }

+

+

+export function persist<T>(key: string, value: T): void {

+  try {

+    localStorage.setItem(key, JSON.stringify(value));

+  } catch (e) {

+    console.error(`Failed to persist "${key}":`, e);

+  }

+}

+
`


##### src\pages\Home.tsx

**Why it differs**: 
General configuration or component drift.

**Recommended Action**: Review diff and merge changes.

`diff
--- archon

+++ archon_design

@@ -3,7 +3,6 @@

 import type { AppMode } from "@/context/AppContext";

 import { useProjectsContext } from "@/context/ProjectsContext";

 import { useWebSocketContext } from "@/context/WebSocketContext";

-import { useWebSocketStore } from "@/store/websocketStore";

 import { CaretRight, CaretLeft } from "@phosphor-icons/react";

 import NavRail from "@/components/NavRail";

 import ContextSidebar from "@/components/ContextSidebar";

@@ -15,70 +14,34 @@

 import DashboardMode from "@/components/modes/DashboardMode";

 import ObsidianMode from "@/components/modes/ObsidianMode";

 import AgentsDirectoryMode from "@/components/modes/AgentsDirectoryMode";

+import NotebookMode from "@/components/modes/NotebookMode";

+import LectureMode from "@/components/modes/LectureMode";

+import MonitoringDashboard from "@/components/modes/MonitoringDashboard";

+import { AlertBanner } from "@/components/AlertBanner";

 import SettingsModal from "@/components/SettingsModal";

 

 // Modes that can show the left context sidebar (user toggles)

 const LEFT_CAPABLE_MODES = new Set<AppMode>(["chat", "council", "research", "agents", "obsidian", "directory"]);

 

-const TopBar = React.memo(function TopBar({

-  mode,

-  canShowLeft,

-  showLeft,

-  setContextSidebarOpen,

-  rightSidebarOpen,

-  setRightSidebarOpen,

-  activeProjectId,

-  projects

-}: any) {

-  return (

-    <div className="h-9 flex items-center justify-between px-3 border-b border-border-core/60 flex-shrink-0 bg-app-bg">

-      <div className="flex items-center gap-2">

-        {canShowLeft && !showLeft && (

-          <button

-            onClick={() => setContextSidebarOpen(true)}

-            className="w-7 h-7 rounded-lg flex items-center justify-center border border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-bg/60 hover:border-border-core/60 transition-all"

-            title="Open left sidebar"

-          >

-            <CaretRight class
... [Diff truncated due to length]
`
