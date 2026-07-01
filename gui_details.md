# Archon GUI Details

## Visual Identity & Theme
This is the complete, granular specification of the visual identity and theme for **The Core**. This design language is strictly engineered for a premium, high-density, low-fatigue developer experience, utilizing an ultra-dark palette rather than harsh, high-contrast pure blacks and whites.

### 1. Core Philosophy: The "Obsidian & Zinc" Aesthetic

The overarching goal of this design system is to minimize visual clutter and reduce eye strain during prolonged use, a crucial practice in modern dark mode UI design. We achieve this by avoiding pure black backgrounds and overly saturated colors, opting instead for a layered "low-light" environment using deeply muted zincs and strategic accent glows.

### 2. The Color Palette (Hex Specifics)

The interface relies on a strict, mathematically precise color hierarchy.

**The Base Environment:**

- **Deep Obsidian (`#050505`):** The absolute background canvas. Used exclusively for the Main Workspace (Chat stream, Synthesizer canvas, Terminal background, Knowledge Graph canvas). It provides infinite depth.
    
- **Muted Zinc (`#121214`):** The primary surface color. Used for all elevated elements—the Left Pane, the Right Pane, the Settings Modal, and individual chat bubbles. It creates a subtle visual separation from the background without requiring heavy drop shadows.
    
- **Ultra-Thin Borders (`#27272A`):** Used universally for all panel dividers and card outlines. It is barely perceptible, serving only to separate zones without drawing the eye.
    

**Typography Colors:**

- **Primary Text (`#E4E4E7`):** A soft, slightly muted silver/white for standard reading text. It provides high legibility without the jarring glare of pure `#FFFFFF`.
    
- **Secondary Text (`#A1A1AA`):** A darker charcoal/grey used for timestamps, file paths, inactive tabs, and the raw "thinking" streams of the AI models.
    

**The Functional Accents:**

Colors are never used for decoration; they strictly communicate system states.

- **Electric Emerald (`#10B981`):** The color of action and automation. Used for the Autopilot toggle (when ON), terminal success outputs, active agent status dots, and the glowing outline of the Omnibar when running code.
    
- **Soft Violet (`#8B5CF6`):** The color of intelligence and context. Used for Deep Research nodes, active file tags (`@main.py`), primary action buttons, and active interactive citations.
    
- **Warm Amber (`#F59E0B`):** The color of cognitive processing. Used in Council Mode to outline the border of the specific AI model that is currently "thinking" or streaming text.
    

### 3. The Typography System

To maintain a premium, IDE-like feel, the application uses two distinct font families to separate standard UI from raw data.

- **UI & Reading Text (Sans-Serif):** Uses **Inter** or **SF Pro**. This is applied to all navigation menus, standard chat responses, the Synthesizer summary, and Settings text. It is clean, modern, and highly legible at small sizes.
    
- **Code & Raw Data (Monospace):** Uses **JetBrains Mono**. This is strictly enforced for the OpenCode Terminal, code blocks generated in chat, JSON outputs, and the raw thought-streams of the AI models in Council Mode. It immediately signals to the user that they are looking at raw, actionable data.
    

### 4. Geometry and Spatial Layout

The physical structure of the UI components relies on negative space rather than heavy bounding boxes.

- **The Grid:** All padding and margins adhere to a strict 4px/8px mathematical grid (e.g., 16px padding inside cards, 24px margins between panes).
    
- **Corner Radii:** Mild and professional.
    
    - `4px` (very slight rounding) for small tags, file items, and terminal blocks.
        
    - `8px` for larger elements like chat bubbles, the Thinker Cards, and the Omnibar.
        
    - `12px` for global overlays like the Settings Modal.
        
- **Shadows:** Almost entirely eliminated. Because true dark mode absorbs shadows, elevation is communicated through color lightness (the `#121214` zinc panels floating above the `#050505` background) and the ultra-thin `#27272A` borders.
    

### 5. Interaction States and Motion

Interactive elements do not jump or aggressively change size. They rely on subtle lighting effects.

- **Hover States:** When hovering over a Vault file or a source in the Ledger, the background shifts slightly lighter (e.g., to `#18181B`) with a snappy, 100ms fade.
    
- **Focus States:** When typing in the Omnibar, the 1px border transitions from `#27272A` to a glowing Soft Violet (`#8B5CF6`).
    
- **Collapsing Panes:** When toggling the Left or Right panes, they slide horizontally with a smooth, ease-in-out curve (approx. 250ms), ensuring the UI feels fluid and responsive rather than rigid.

## Global Controls & Anchors Specification

The global controls and anchors of **The Core** form the structural framework of the entire operating system. They remain persistent across all screen transitions, enforcing state logic, controlling panel visibility, and providing universal access to system settings.

### 1. The Far-Left Navigation Rail (The Command Axis)

This is a fixed, ultra-narrow vertical strip anchored to the absolute left edge of the screen. It governs application-wide mode switching.

- **Dimensions:** Fixed width of 64px. Height spans 100vh.
    
- **Aesthetics:** Finished in dark muted zinc (`#121214`) with a sharp, vertical 1px border (`#27272A`) on its right edge to separate it from the Left Pane.
    
- **Top Stack (Mode Triggers):** Houses vertically stacked, minimalist SVG icons for the four core operational states:
    
    1. **Normal Chat** (Speech bubble icon)
        
    2. **The Council of AI** (Shield or interlocking rings icon)
        
    3. **System Agents** (Terminal prompt or gear-network icon)
        
    4. **Deep Research** (Network node or magnifying glass icon)
        
- **Bottom Stack (Utility):** Houses a persistent Gear icon for the global Settings/Security Sandbox overlay.
    
- **Micro-Interactions:** * **Inactive State:** Icons rest at a muted grey color (`#A1A1AA`). Hovering over an icon initiates a rapid 100ms fade to a lighter silver (`#E4E4E7`).
    
    - **Active State:** The selected mode icon locks into a bright white color and is highlighted by a subtle Soft Violet (`#8B5CF6`) vertical indicator strip on the far-left edge.
        

### 2. The Persistent Top Header (The System Bar)

Spans the absolute top of the window, sitting to the right of the navigation rail. It serves as the primary system status center.

- **Dimensions:** Fixed height of 48px. Spans full remaining horizontal width.
    
- **Aesthetics:** True Obsidian background (`#050505`) with a 1px bottom border (`#27272A`).
    
- **Left Section:** Displays the application branding ("The Core") in bold sans-serif typography (`#E4E4E7`).
    
- **Center Section (The Autopilot Toggle):** Houses the dominant system state control.
    
    - **Design:** A pill-shaped slider switch labeled "AUTOPILOT".
        
    - **Autopilot ON:** The switch slider shifts right, and the background glows Electric Emerald (`#10B981`). This gives background agents permission to execute local scripts and manipulate local sandbox files without prompting for confirmation.
        
    - **Autopilot OFF:** The switch slider shifts left, and the background drops to a dead charcoal (`#27272A`). Agents are strictly blocked at execution boundaries until manual confirmation is received.
        
- **Right Section (System Telemetry):** Displays ultra-small, clean monospace metrics (`#A1A1AA`) indicating local system health: `CPU: 14% | GPU: 42% | RAM: 8.2GB | LOCAL_HOST: ACTIVE`.
    

### 3. The Lateral Collapse Switches (Pane Toggles)

These are hidden interactive triggers that allow you to dynamically alter screen real estate on the fly.

- **Positioning:** Positioned directly on the vertical 1px border lines separating the Left Pane from the Center Workspace, and the Center Workspace from the Right Pane.
    
- **Visual Design:** Minimalist, transparent vertical tabs containing a single chevron (`<` or `>`). They remain completely invisible until the cursor hovers near the border, fading in smoothly to prevent permanent visual noise.
    
- **Mechanics:** * Clicking the Left toggle triggers a 250ms cubic-bezier transition that collapses the Left Pane from 280px to 0px width (`overflow: hidden`). The center workspace automatically stretches to fill the void. Clicking it again snaps the pane back to 280px.
    
    - The Right toggle performs the exact same operation for the Right Pane (320px to 0px).
        

### 4. Left Pane Global Selector (Context Switcher)

When the Left Pane is expanded, this element sits permanently anchored at the absolute top of the column to control what data is being browsed.

- **Design:** A segmented, dual-button pill container embedded natively into the header of the left panel.
    
- **Labels:** Two mutually exclusive text options: **[The Vault]** and **[History]**.
    
- **Behavior:** * Clicking a segment slides a dark zinc highlight plate under the active selection.
    
    - Switching to **The Vault** instantly renders your local markdown file tree structure. Switching to **History** instantly overwrites the pane with your past chronological chat logs.
        
    - _System Override:_ The system automatically forces this toggle based on your active mode (e.g., entering _Council Mode_ automatically forces it to **History** and locks it, while entering _System Agents_ automatically forces it to **The Vault**).
      
## The 4 modes
Here is the complete, isolated breakdown of the **Normal Chat** mode. This specification details the exact layout, visual constraints, and interactive mechanics of the standard conversational interface.

### 1. The Layout Grid

In Normal Chat mode, the Tri-Pane architecture is optimized entirely for reading and writing by hiding unnecessary panels.

- **Left Pane (Context):** Fixed at a 280px width and locked to the **History** view. It displays a vertically scrolling, chronological list of past chat sessions for quick retrieval.
    
- **Center Pane (Workspace):** Expands to consume 100% of the remaining horizontal screen space. This houses the active chat stream and the input command bar.
    
- **Right Pane (Agent Tracker):** Fully collapsed and hidden to eliminate visual distraction.
    

### 2. The Chat Stream Architecture

The center display area is engineered for maximum readability, avoiding the common issue of text stretching too far across widescreen monitors.

- **Background Canvas:** Solid Obsidian (`#050505`) to minimize eye fatigue during long sessions.
    
- **Message Containers:** Text blocks do not span the entire width of the pane. They are constrained to a maximum width of 800px to 1000px and center-aligned on the screen.
    
- **User Prompts:** Displayed as clean, borderless text blocks aligned to the right side of the reading column.
    
- **AI Responses:** Displayed with a distinct, muted zinc background (`#121214`) and a sharp, ultra-thin 1px border (`#27272A`) to separate them visually from the background. Aligned to the left side of the reading column.
    
- **Data & Code Rendering:** Any generated scripts, JSON, or terminal commands are rendered inside dedicated dark-mode blocks using the `JetBrains Mono` typeface. A dedicated "Copy" button sits in the top-right corner of every code block.
    

### 3. The Omnibar (Input Mechanics)

The text input area acts as a universal command palette rather than a simple text box.

- **Positioning:** It is permanently anchored to the absolute bottom of the Center Pane. As the conversation grows, the chat stream scrolls dynamically _behind_ and _above_ the Omnibar, ensuring the input is always instantly accessible.
    
- **Visual Design:** A deep zinc, pill-shaped container (`#121214`) featuring a soft inner shadow. When clicked (focused), a subtle 1px border glow activates (using the Soft Violet or Electric Emerald accent color).
    
- **The `@` Operator:** Pressing the `@` key triggers an immediate pop-up menu of the local file tree. Selecting a file (e.g., `@main.py`) transforms it into a visual tag within the input box, injecting that specific file's contents directly into the AI's context.
    
- **The `/` Operator:** Pressing the `/` key opens a slash-command menu for rapid system actions, such as `/clear` (to wipe the chat), `/export` (to save the chat as a markdown file), or `/web` (to force a web search).
    
- **Standard Controls:** The right side of the Omnibar contains a minimalist paperclip icon for dragging and dropping attachments, alongside a subtle "Send" arrow for execution.

# Mode 2: The Council of AI — Complete GUI Specification

This is the exact structural and visual blueprint for **The Council of AI** mode. This interface is engineered for high-density cognitive tasks, allowing you to monitor multiple LLMs debating simultaneously while outputting a finalized, cross-referenced consensus.

### 1. The Layout Grid (Macro Architecture)

To accommodate four distinct text streams (three models + one summary) without horizontal squishing, the Tri-Pane architecture is heavily modified.

- **Left Pane (Context):** Fixed at 280px wide and locked to the **History** view. This allows you to pull up previous Council debates.
    
- **Center Pane (The Debate Workspace):** Expands to consume 100% of the remaining horizontal width. This pane is further divided horizontally into a 40/60 split (Top/Bottom).
    
- **Right Pane:** Fully collapsed (0px width) and completely hidden.
    

### 2. The Thinker Deck (Top 40% of Center Pane)

The upper portion of the workspace is dedicated to raw, unfiltered model reasoning. It contains three side-by-side vertical cards.

- **Card Layout:** Three equal-width columns (e.g., Model A, Model B, Model C) spaced evenly with a 16px gap.
    
- **Card Aesthetics:**
    
    - Background: Dark muted zinc (`#121214`).
        
    - Borders: 1px ultra-thin border (`#27272A`). When a model is actively generating text, its border emits a subtle, warm Amber glow (`#F59E0B`) to indicate processing status.
        
- **Card Headers:** A sleek top bar on each card displaying the model's assigned role and name (e.g., `[Critic] Claude 3.5 Sonnet` or `[Analyst] GPT-4o`). Includes an "Enlarge" (expand arrows) icon in the top right corner.
    
- **Card Body (The Stream):** The text inside these cards utilizes a monospace font (`JetBrains Mono`) colored in muted silver (`#A1A1AA`). This visually distinguishes the "raw thinking process" from final, polished output. Each card has its own independent, slim vertical scrollbar.
    
- **Enlarge Mechanism:** Clicking the "Enlarge" icon on any card temporarily overlays it across the entire Top 40% section, allowing you to read that specific model's logic in full width before minimizing it back into the 3-column grid.
    

### 3. The Synthesizer (Bottom 60% of Center Pane)

The lower, dominant portion of the workspace is where the final answer is constructed.

- **Purpose:** While the top three models debate, a background "Director" agent monitors their outputs and writes a finalized, highly accurate consensus report here.
    
- **Visual Design:** A borderless, solid Obsidian (`#050505`) canvas. It sits entirely separate from the three thinker cards above it.
    
- **Typography:** Uses a clean, highly legible sans-serif font (Inter or SF Pro) in bright white/silver (`#E4E4E7`).
    
- **Content Structure:** The Synthesizer automatically formats the consensus into highly structured markdown (headers, bullet points, and code blocks) for immediate readability. It includes inline citations (e.g., `[Model A]` or `[Model C]`) to show which model contributed which fact.
    

### 4. The Multicast Omnibar (Input Mechanics)

Because you are talking to a council rather than a single agent, the input mechanics change slightly from Normal Chat.

- **Positioning:** Anchored to the absolute bottom of the Synthesizer (Bottom 60%) window.
    
- **Visuals:** The standard deep zinc pill-shape (`#121214`), but the focus outline glows Amber to indicate you are in Council Mode.
    
- **Execution Logic (The Multicast):** When you type a prompt here and hit Enter, the query is sent to **all three models in the Thinker Deck simultaneously**.
    
- **Context Control (`@` tag):** Functions exactly like Normal Chat. If you type `@System_Design.md "Find the flaws in this architecture"`, that specific Vault file is pushed into the context windows of Model A, B, and C at the exact same time.
  
  
  # Mode 3: System Agents — Complete GUI Specification

This is the exact structural and visual blueprint for **System Agents** mode. This interface is the engine room of "The Core." It is designed to solve the critical issue of horizontal squishing by utilizing a strict **View-Toggle mechanism** rather than forcing a terminal and a dashboard to share the same screen space.

### 1. The Layout Grid (Macro Architecture)

In this mode, the layout optimizes for deep, uninterrupted focus on local file execution and automation.

- **Left Pane (Context):** Fixed at 280px wide and mapped exclusively to **The Vault**. It displays a clean, minimalist directory tree (e.g., `SecondBrain/`, `AI_Notes/`, `Project_Scripts/`). You use this to visually drag or select the files you want the agents to modify.
    
- **Center Pane (The Main Workspace):** Expands to consume 100% of the remaining horizontal width.
    
- **Right Pane:** Fully collapsed (0px width) and completely hidden to prevent visual clutter.
    

### 2. The Master View-Toggle (Workspace Control)

At the absolute top of the Main Workspace sits a premium, segmented toggle switch: **[Agentic Dashboard | OpenCode Terminal]**.

This is not a tab that opens a new window; it instantly swaps the entire workspace canvas below it between two distinct states.

#### State A: The Agentic Dashboard (High-Level Orchestration)

When the toggle is set to **Agentic Dashboard**, the workspace functions as a visual control tower for your LangGraph workflows.

- **Background:** True Obsidian (`#050505`).
    
- **Agent Cards:** The screen is populated by wide, horizontal tracking cards (dark muted zinc, `#121214`) representing active agents (e.g., _Agent Alpha: Compiler_, _Agent Beta: Researcher_).
    
- **Status Indicators:** Next to each agent's name is a pulsing dot. Electric Emerald (`#10B981`) means the agent is actively executing; muted grey means it is idle or waiting.
    
- **The Artifact Checklist:** Inside each agent's card is a real-time, step-by-step checklist of its thought loop (e.g., `[✓] Analyze requirements` -> `[✓] Draft Python script` -> `[⟳] Execute local test`).
    
- **Progress Metrics:** Ultra-thin, minimalist progress bars track the completion percentage of multi-step routines.
    

#### State B: OpenCode Terminal (Raw Execution)

When you flip the toggle to **OpenCode Terminal**, the dashboard instantly vanishes. The workspace transforms into a 100% full-width command-line interface.

- **Background:** Deep Obsidian/Black.
    
- **Typography:** Strictly restricted to a crisp monospace font (`JetBrains Mono`).
    
- **The Prompt:** Features an authentic, custom shell prompt (e.g., `core@local:~$`) styled in Electric Emerald.
    
- **Data Stream:** This view streams the raw `stdout` and `stderr` logs of the agents. When an agent in the dashboard reaches the `[⟳] Execute local test` step, this terminal is where you actually watch the Python script compile, run, and output its data in real time, with zero horizontal text wrapping or clipping.
    

### 3. Interaction with the Global "Autopilot" Switch

The **Autopilot Toggle** located in the global top header of the application dictates exactly how these two views behave.

- **Autopilot OFF (Human-in-the-Loop):** The agent generates its plan in the _Agentic Dashboard_. When it is time to write code or execute a file, it stops. The terminal prompt blinks, waiting for you to type `Y` (Approve) or `N` (Reject) before it is allowed to touch your local sandbox.
    
- **Autopilot ON (Fully Autonomous):** The top switch glows Electric Emerald. The agent loops entirely on its own. It generates the plan in the dashboard, instantly switches itself to the OpenCode Terminal, executes the commands, reads its own errors, and rewrites the code until the task is complete.
  
  # Mode 4: Deep Research — Complete GUI Specification

This is the exact structural and visual blueprint for **Deep Research** mode. This interface solves the "hallucination problem" of standard AI by visually mapping the agent's knowledge base and strictly grounding its answers to the sources it has ingested.

### 1. The Layout Grid (Macro Architecture)

Unlike the other modes where panels collapse to give the center more room, Deep Research is designed to utilize all three columns simultaneously to map, visualize, and query data.

- **Left Pane (Context):** Fixed at 280px wide and overwritten to function as the **Source Ledger**.
    
- **Center Pane (Visualization):** Expands to consume the maximum remaining width, operating as an interactive **2D Knowledge Graph**.
    
- **Right Pane (Interaction):** Expanded to a fixed 320px width, operating as the **Grounded Research Chat**.
    

### 2. The Source Ledger (Left Pane)

This panel replaces your standard file tree with a live, updating list of the raw materials the Research Agent is currently reading.

- **Background:** Dark muted zinc (`#121214`).
    
- **List Items:** Displays a structured, vertically scrolling list of ingested entities.
    
    - Icons indicate the data type: Web URL (globe), Local PDF (document), or ArXiv/Academic Paper (graduation cap).
        
    - Status rings next to the source indicate ingestion: pulsing Soft Violet (`#8B5CF6`) means the agent is currently reading/parsing it; solid gray means it is fully vectorized.
        
- **Interaction (The Modal Extraction):** Clicking on any source in this list does _not_ open it in the center pane (which would cover your graph). Instead, it triggers a centered, frosted-glass Modal overlay. This modal displays the brutally clean, parsed Markdown text of that source—exactly what the AI "sees"—allowing you to verify its reading accuracy.
    

### 3. The 2D Knowledge Graph (Center Pane)

This is the visual core of the research mode. Instead of trusting a text summary, you physically see how the AI is connecting concepts.

- **Background Canvas:** Solid Obsidian (`#050505`) layered with a very faint, subtle dot-grid pattern (`#18181B`) to establish a sense of spatial depth.
    
- **The Nodes (Data Points):**
    
    - **Local Nodes:** Files pulled from your Vault (e.g., `Ethical_Guidelines.txt`) are rendered as muted blue/zinc circles.
        
    - **External Nodes:** Crawled web sources or ingested papers are rendered with a Soft Violet glow (`#8B5CF6`).
        
- **The Edges (Connections):** Ultra-thin vector lines (`#27272A`) connect the nodes.
    
- **Interaction Mechanics:** The canvas is fully interactive. You can click and drag to pan, and scroll to zoom. Clicking on any specific node highlights it, turns its connecting lines bright violet, and instantly dims all unrelated nodes on the board, showing you the exact conceptual lineage of a specific topic.
    

### 4. The Grounded Chat (Right Pane)

Since the center pane is entirely consumed by the visual graph, the actual conversational interface is shifted to the right sidebar.

- **Background:** Dark muted zinc (`#121214`), matching the Left Pane to frame the dark center graph perfectly.
    
- **The Constraint (RAG-Locked):** The AI operating in this chat lane is strictly sandboxed. It is explicitly programmed _not_ to use its general training data. It will only answer your prompts based on the nodes currently mapped in the Center Pane graph.
    
- **The Omnibar:** A compact version of the command input sits at the bottom of this pane. You type your queries here (e.g., _"Summarize the conflicting arguments regarding solid-state batteries."_).
    
- **Interactive Citations:** When the AI responds in the chat stream above the input, it does not just write text. It injects clickable citation pills (e.g., `[Source 3, Page 12]`).
    
    - _The Magic Element:_ When you hover over or click a citation pill in the chat, the exact corresponding node in the Center Pane Knowledge Graph lights up and pulses, visually proving exactly where the AI pulled that specific sentence from.
      
      
# Global Settings & Security Sandbox — Complete GUI Specification

This is the definitive blueprint for the **Settings and Security Sandbox** overlay. Because "The Core" gives AI agents the ability to write and execute code on your local machine, this interface acts as the critical fail-safe. It is designed to be a rigid, zero-ambiguity control panel for managing API keys and hardcoded directory boundaries.

### 1. The Invocation & Overlay Mechanics (The Blur Layer)

The Settings menu is a global, application-wide interrupt. It completely pauses the active workspace to ensure absolute focus on system configuration.

- **Trigger:** Activated by clicking the persistent gear icon at the absolute bottom of the far-left Navigation Rail.
    
- **The Background Shift:** Upon clicking, the active application behind the modal instantly dims by 60% (using a black overlay) and applies a heavy optical blur (`backdrop-blur-md`).
    
- **Interaction Block:** This overlay operates at the highest Z-index, preventing any accidental clicks, typing, or scrolling in the background workspace while settings are being altered.
    

### 2. The Modal Container (Macro Structure)

The settings interface is housed within a strict, centralized container.

- **Dimensions:** Fixed at 800px wide by 600px high, locked to the absolute center of the screen.
    
- **Aesthetics:**
    
    - Background: Dark muted zinc (`#121214`).
        
    - Corners: 12px radius for a slightly softer, premium feel compared to the rigid application panes.
        
    - Borders: Framed by a 1px ultra-thin boundary (`#27272A`).
        
    - Shadow: Employs a deep, wide, drop shadow to lift the modal cleanly off the blurred background.
        
- **Internal Layout:** Divided into a dual-column flex container: a **Left Menu** (200px wide) and a **Right Workspace** (600px wide).
    

### 3. The Left Navigation Menu

This column acts as the index for all system-level configurations.

- **Design:** A vertical list of text-based categories aligned to the left.
    
- **State Highlighting:** The active category is highlighted with a subtle, lighter zinc backing plate (`#18181B`) and a 2px vertical Soft Violet (`#8B5CF6`) indicator line on its left edge.
    
- **The Categories:**
    
    1. **API Vault:** For inputting OpenAI, Anthropic, or local LLM keys.
        
    2. **Security Sandbox:** The default active tab (detailed below).
        
    3. **Council Allocation:** For assigning specific models (e.g., Claude, GPT-4o, Llama 3) to Model A, B, and C in Council Mode.
        
    4. **Appearance:** For typography scaling and accent color toggles.
        

### 4. The Right Workspace: Security Sandbox (Detailed Breakdown)

This is the mission-critical section of the modal. It explicitly defines where agents can read data and where they can execute code.

- **Header:** Displays the title "Security Sandbox & Execution Boundaries" in bright primary text (`#E4E4E7`).
    
- **Warning Banner:** Directly below the header sits a subtle, dark amber warning box: _“Warning: Paths defined here grant agents read/write permissions. Isolate execution paths from critical system drives.”_
    

**Constraint 1: The Vault Read Path**

This dictates the only folder on your hard drive the AI is allowed to "see" when you tag a file with `@`.

- **UI Element:** A dark, monospaced text input field displaying the absolute path (e.g., `C:/Users/Admin/Documents/SecondBrain/`).
    
- **Control:** A sleek, secondary "Browse" button (`#27272A` background, hover to `#3F3F46`) sits to the right of the input, opening the native Windows/macOS folder selector.
    

**Constraint 2: OpenCode Execution Sandbox**

This is the absolute boundary for the OpenCode Terminal. If an agent tries to run a python script or shell command outside of this folder, the system violently rejects it.

- **UI Element:** A second monospaced text input field (e.g., `C:/Users/Admin/Core_Sandbox/`).
    
- **Control:** Paired with its own native "Browse" button to lock in the directory.
    

**Constraint 3: Network & Dependency Rules**

Below the path selectors are binary toggle switches for local safety:

- `[Toggle]` **Allow Automated Package Installation:** (If ON, agents can run `pip install` without asking. If OFF, the terminal pauses and requires your 'Y' input).
    
- `[Toggle]` **Allow Outbound Network Requests in Scripts:** (Controls if generated scripts can ping external servers).
    

### 5. Commit Mechanics

Changes made in the Settings modal do not apply instantly to prevent accidental keystrokes from altering security paths.

- **Action Bar:** Anchored to the bottom right of the Right Workspace.
    
- **Buttons:**
    
    - **Cancel:** A simple, borderless text button (`#A1A1AA`). Discards changes and drops the modal.
        
    - **Save & Apply:** A primary action button. Background is Soft Violet (`#8B5CF6`) or Electric Emerald (`#10B981`), signaling a system update. Clicking this commits the hardcoded paths, restarts active agents to enforce the new boundaries, and smoothly dismisses the modal overlay.
  