import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  KeyRound, Network, Cpu, Save, Eye, EyeOff, BrainCircuit,
  Plus, X, Database, Trash2, CheckCircle2, Circle, Settings2,
  FolderKanban, ArrowLeft, Folder, FolderOpen, Image, FileType, FileText, File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Project, ContextFile } from "@/context/ProjectsContext";

type SettingsTab = "api" | "models" | "parameters" | "network" | "mcp" | "projects";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "api",        label: "Providers",  icon: KeyRound },
  { id: "models",     label: "Models",     icon: BrainCircuit },
  { id: "parameters", label: "Parameters", icon: Cpu },
  { id: "network",    label: "Network",    icon: Network },
  { id: "mcp",        label: "MCP",        icon: Database },
  { id: "projects",   label: "Projects",   icon: FolderKanban },
];

// ─── Provider types ────────────────────────────────────────────────────────────

interface Provider {
  value: string; label: string; desc: string; tag?: string; color: string; letter: string;
}

interface CustomProvider {
  id: string; name: string; baseUrl: string; apiKey: string;
}

const PROVIDERS: Provider[] = [
  { value: "gemini",     label: "Gemini",        desc: "Google Gemini 2.0 & 2.5 Flash — free tier",       tag: "Free",        color: "bg-accent-indigo",    letter: "G"  },
  { value: "groq",       label: "Groq",          desc: "Llama 3.1/3.3, Gemma — ultra-fast inference",     tag: "Free",        color: "bg-accent-rose",  letter: "Q"  },
  { value: "openrouter", label: "OpenRouter",    desc: "DeepSeek R1, Llama and other free-tier models",   tag: "Multi-model", color: "bg-accent-indigo",  letter: "OR" },
  { value: "cerebras",   label: "Cerebras",      desc: "Llama 3.3 70B on custom AI silicon — free tier",  tag: "Free",        color: "bg-accent-emerald", letter: "CB" },
  { value: "mistral",    label: "Mistral",       desc: "Mistral Nemo and open-weight models — free tier", tag: "Free",        color: "bg-pink-500",    letter: "M"  },
  { value: "cloudflare", label: "Cloudflare AI", desc: "Workers AI — serverless inference at the edge",   tag: "Edge",        color: "bg-accent-rose",   letter: "CF" },
];

// ─── Provider components ───────────────────────────────────────────────────────

function ConnectedRow({ provider, onDisconnect }: { provider: Provider; onDisconnect: () => void }) {
  return (
    <div className="flex items-center gap-4 py-3 px-1 border-b border-border-core/15 last:border-b-0">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-text-primary font-bold text-[10px] flex-shrink-0", provider.color)}>
        {provider.letter}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-mono text-text-primary">{provider.label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">Connected</span>
      </div>
      <button onClick={onDisconnect} className="text-xs font-mono text-text-secondary hover:text-accent-rose transition-colors">
        Disconnect
      </button>
    </div>
  );
}

function AvailableRow({ provider, onConnect }: { provider: Provider; onConnect: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState("");

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onConnect(trimmed);
    setDraft(""); setExpanded(false);
  };

  return (
    <div className="border-b border-border-core/15 last:border-b-0">
      <div className="flex items-center gap-4 py-3 px-1">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-text-primary font-bold text-[10px] flex-shrink-0", provider.color)}>
          {provider.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-text-primary">{provider.label}</span>
            {provider.tag && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-panel-bg/80 text-text-secondary border border-border-core/20">
                {provider.tag}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-secondary mt-0.5">{provider.desc}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex-shrink-0",
            expanded ? "border-border-core/30 text-text-primary bg-panel-bg/60" : "border-border-core/25 text-text-secondary hover:border-border-core/30 hover:text-text-primary"
          )}
        >
          {expanded ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {expanded ? "Cancel" : "Connect"}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="pb-3 px-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={show ? "text" : "password"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setExpanded(false); }}
                  placeholder="Paste API key..."
                  autoFocus
                  className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40 pr-10"
                />
                <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary">
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <Button size="sm" onClick={handleSave} disabled={!draft.trim()} className="bg-accent-indigo hover:bg-accent-indigo text-text-primary disabled:opacity-30 font-mono text-xs h-9 px-4 flex-shrink-0 rounded-xl">
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomProviderRow({ provider, onRemove }: { provider: CustomProvider; onRemove: () => void }) {
  const masked = provider.apiKey.length > 8 ? provider.apiKey.slice(0, 4) + "••••" + provider.apiKey.slice(-4) : "••••••••";
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-border-core/15 last:border-b-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-panel-bg text-text-primary font-bold text-[10px] flex-shrink-0">
        <Settings2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-text-primary">{provider.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">Custom</span>
        </div>
        <p className="text-[10px] font-mono text-text-secondary truncate mt-0.5">{provider.baseUrl}</p>
        {provider.apiKey && <p className="text-[10px] font-mono text-text-secondary mt-0.5 tracking-wider">{masked}</p>}
      </div>
      <button onClick={onRemove} className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AddCustomProviderForm({ onAdd }: { onAdd: (p: CustomProvider) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [baseUrl, setBaseUrl] = useState(""); const [apiKey, setApiKey] = useState(""); const [showKey, setShowKey] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !baseUrl.trim()) return;
    onAdd({ id: Math.random().toString(36).slice(2), name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    setName(""); setBaseUrl(""); setApiKey(""); setOpen(false);
  };

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className={cn("flex items-center gap-1.5 text-[10px] font-mono border px-2.5 py-1 rounded-lg transition-all", open ? "border-border-core/30 text-text-primary bg-panel-bg/60" : "border-border-core/25 text-text-secondary hover:border-border-core/30 hover:text-text-primary")}>
        {open ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}{open ? "Cancel" : "Add Custom"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="mt-3 space-y-2.5 pb-1">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Provider name</Label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setOpen(false); }} placeholder="e.g. My OpenAI Proxy" className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Base URL</Label>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">API key (optional)</Label>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40 pr-10" />
                  <button onClick={() => setShowKey((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary">{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={!name.trim() || !baseUrl.trim()} className="w-full bg-accent-indigo hover:bg-accent-indigo text-text-primary text-xs font-mono disabled:opacity-30 rounded-xl" size="sm">Add Provider</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProvidersTab() {
  const getKey = (v: string) => localStorage.getItem(`archon_apikey_${v}`) || "";
  const [keys, setKeys] = useState<Record<string, string>>(() => Object.fromEntries(PROVIDERS.map((p) => [p.value, getKey(p.value)])));
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>(() => { try { const s = localStorage.getItem("archon_custom_providers"); return s ? JSON.parse(s) : []; } catch { return []; } });

  const connect = useCallback((providerValue: string, key: string) => { localStorage.setItem(`archon_apikey_${providerValue}`, key); setKeys((prev) => ({ ...prev, [providerValue]: key })); }, []);
  const disconnect = useCallback((providerValue: string) => { localStorage.removeItem(`archon_apikey_${providerValue}`); setKeys((prev) => ({ ...prev, [providerValue]: "" })); }, []);

  const addCustom = useCallback((p: CustomProvider) => {
    const next = [...customProviders, p];
    setCustomProviders(next);
    localStorage.setItem("archon_custom_providers", JSON.stringify(next));
    if (p.apiKey) localStorage.setItem(`archon_apikey_custom_${p.id}`, p.apiKey);
  }, [customProviders]);

  const removeCustom = useCallback((id: string) => {
    const next = customProviders.filter((p) => p.id !== id);
    setCustomProviders(next);
    localStorage.setItem("archon_custom_providers", JSON.stringify(next));
    localStorage.removeItem(`archon_apikey_custom_${id}`);
  }, [customProviders]);

  const connectedBuiltin = PROVIDERS.filter((p) => (keys[p.value] || "").length > 10);
  const availableBuiltin = PROVIDERS.filter((p) => (keys[p.value] || "").length <= 10);

  return (
    <div className="space-y-6">
      {connectedBuiltin.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3">Connected</h3>
          <div className="rounded-xl border border-border-core/20 bg-panel-bg px-3">
            {connectedBuiltin.map((p) => <ConnectedRow key={p.value} provider={p} onDisconnect={() => disconnect(p.value)} />)}
          </div>
        </div>
      )}
      {availableBuiltin.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3">{connectedBuiltin.length > 0 ? "Available" : "Providers"}</h3>
          <div className="rounded-xl border border-border-core/20 bg-panel-bg px-3">
            {availableBuiltin.map((p) => <AvailableRow key={p.value} provider={p} onConnect={(key) => connect(p.value, key)} />)}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Custom Providers</h3>
          <AddCustomProviderForm onAdd={addCustom} />
        </div>
        {customProviders.length > 0 ? (
          <div className="rounded-xl border border-border-core/20 bg-panel-bg px-3">
            {customProviders.map((p) => <CustomProviderRow key={p.id} provider={p} onRemove={() => removeCustom(p.id)} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-core/25 bg-panel-bg/50 px-4 py-5 text-center">
            <p className="text-[11px] font-mono text-text-secondary">Add any OpenAI-compatible endpoint — local models, proxies, or private deployments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Network Tab ───────────────────────────────────────────────────────────────

function NetworkTab() {
  const [host, setHost] = useState(() => localStorage.getItem("archon_daemon_host") || "localhost");
  const [port, setPort] = useState(() => localStorage.getItem("archon_daemon_port") || "8765");
  useEffect(() => { localStorage.setItem("archon_daemon_host", host); }, [host]);
  useEffect(() => { localStorage.setItem("archon_daemon_port", port); }, [port]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-text-secondary">Daemon Host</Label>
        <input value={host} onChange={(e) => setHost(e.target.value)} className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40" />
      </div>
      <div className="space-y-2">
        <Label className="font-mono text-xs text-text-secondary">WebSocket Port</Label>
        <input type="number" value={port} onChange={(e) => setPort(e.target.value)} className="w-48 bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40" />
        <p className="text-[10px] font-mono text-text-secondary">Default: 8765. Must match daemon --port flag.</p>
      </div>
      <p className="text-[10px] font-mono text-accent-rose/80">Changes take effect after page reload.</p>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-panel-bg border border-border-core/20">
        <div className="w-2 h-2 rounded-full bg-accent-rose" />
        <span className="text-xs font-mono text-text-secondary">{window.location.protocol === "https:" ? "wss" : "ws"}://{host}:{port} — Offline</span>
      </div>
    </div>
  );
}

// ─── MCP Tab ───────────────────────────────────────────────────────────────────

interface McpServer { id: string; name: string; url: string; description: string; enabled: boolean; connected: boolean; }

function McpTab() {
  const [servers, setServers] = useState<McpServer[]>(() => { try { const s = localStorage.getItem("archon_mcp_servers"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState(""); const [newUrl, setNewUrl] = useState(""); const [newDesc, setNewDesc] = useState("");

  const save = (updated: McpServer[]) => { setServers(updated); localStorage.setItem("archon_mcp_servers", JSON.stringify(updated)); };
  const addServer = () => { if (!newName || !newUrl) return; save([...servers, { id: Math.random().toString(), name: newName, url: newUrl, description: newDesc, enabled: true, connected: false }]); setNewName(""); setNewUrl(""); setNewDesc(""); setShowAdd(false); };
  const toggle = (id: string) => save(servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const remove = (id: string) => save(servers.filter((s) => s.id !== id));

  const PRESETS = [
    { name: "Gmail MCP",       url: "http://localhost:3100/mcp", description: "Gmail read/write via MCP server" },
    { name: "Google Keep MCP", url: "http://localhost:3101/mcp", description: "Keep notes & checklists" },
    { name: "Obsidian MCP",    url: "http://localhost:3102/mcp", description: "Vault file read/write operations" },
    { name: "Calendar MCP",    url: "http://localhost:3103/mcp", description: "Google Calendar events" },
    { name: "File System MCP", url: "http://localhost:3104/mcp", description: "Local file system access" },
  ];

  return (
    <div className="space-y-6">
      <div className="px-4 py-3 rounded-xl bg-accent-indigo/[0.05] border border-blue-500/10">
        <p className="text-xs font-mono text-accent-indigo/80">MCP servers extend the AI with tools like Gmail, Obsidian, Calendar, and more. Add a URL and enable it to make it available to agents.</p>
      </div>
      {servers.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3">Connected Servers</h3>
          <div className="space-y-2">
            {servers.map((server) => (
              <div key={server.id} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border transition-all", server.enabled ? "border-emerald-500/15 bg-accent-emerald/[0.03]" : "border-border-core/20 bg-panel-bg opacity-60")}>
                <button onClick={() => toggle(server.id)} className="flex-shrink-0">
                  {server.enabled ? <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> : <Circle className="w-4 h-4 text-text-secondary" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-text-primary font-medium">{server.name}</div>
                  <div className="text-[10px] font-mono text-text-secondary truncate">{server.url}</div>
                  {server.description && <div className="text-[10px] font-mono text-text-secondary mt-0.5">{server.description}</div>}
                </div>
                <button onClick={() => remove(server.id)} className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Add MCP Server</h3>
          <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary hover:text-text-primary border border-border-core/25 px-2.5 py-1 rounded-lg transition-all">
            {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}{showAdd ? "Cancel" : "Custom"}
          </button>
        </div>
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 pb-4">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Server name..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="ws://localhost:3100/mcp or http://..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-core/40" />
                <Button onClick={addServer} disabled={!newName || !newUrl} className="w-full bg-accent-indigo hover:bg-accent-indigo text-text-primary text-xs font-mono disabled:opacity-30 rounded-xl" size="sm">Add Server</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div>
          <p className="text-[10px] font-mono text-text-secondary mb-2">Common presets:</p>
          <div className="space-y-1.5">
            {PRESETS.filter((p) => !servers.find((s) => s.url === p.url)).map((preset) => (
              <button key={preset.url} onClick={() => save([...servers, { id: Math.random().toString(), ...preset, enabled: true, connected: false }])} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-border-core/15 bg-panel-bg hover:border-border-core/30 text-left transition-all">
                <Plus className="w-3 h-3 text-text-secondary flex-shrink-0" />
                <div><div className="text-xs font-mono text-text-secondary">{preset.name}</div><div className="text-[10px] font-mono text-text-secondary">{preset.description}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Projects Tab ──────────────────────────────────────────────────────────────

const KIND_ICON: Record<ContextFile["kind"], React.ElementType> = {
  image: Image, pdf: FileType, text: FileText, other: File,
};

const MODE_COLORS: Record<string, string> = {
  chat: "text-accent-indigo", council: "text-accent-rose", research: "text-accent-indigo", agents: "text-accent-emerald",
};
const KIND_COLORS: Record<string, string> = {
  light: "bg-accent-indigo/10 text-accent-indigo border-blue-500/20",
  agent: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
};

function ProjectDetailView({ project, onBack }: { project: Project; onBack: () => void }) {
  const { addContextFile, removeContextFile, updateAgentSettings } = useProjectsContext();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    // Just shows in the UI — in a real setup, addContextFile is called from the project
  };

  const settings = project.agentSettings;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors mb-3">
          <ArrowLeft className="w-3 h-3" /> Back to projects
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-mono text-text-primary font-semibold">{project.name}</h3>
            <p className="text-[10px] font-mono text-text-secondary mt-0.5">Manage project folder, agent settings, and context files.</p>
          </div>
          <span className={cn("text-[9px] font-mono px-2 py-1 rounded-lg border", KIND_COLORS[project.kind])}>
            {project.kind === "agent" ? "Agent Project" : "Light Project"}
          </span>
        </div>
      </div>

      {/* Folders */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Folders</h4>
        <div className="rounded-xl border border-border-core/20 bg-panel-bg p-3 flex items-center gap-3">
          <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" />
          <span className="text-xs font-mono text-text-secondary flex-1 truncate">
            {project.folderPath || "No folder (Light Project)"}
          </span>
          {project.folderPath && (
            <button className="text-text-secondary hover:text-accent-rose transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {project.kind === "agent" && (
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-core/25 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/30 transition-all">
            <Plus className="w-3 h-3" /> Add Folder
          </button>
        )}
      </div>

      {/* Context Files */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Context Files</h4>
        {project.contextFiles.length > 0 ? (
          <div className="space-y-1.5">
            {project.contextFiles.map((f) => {
              const Icon = KIND_ICON[f.kind];
              return (
                <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-core/20 bg-panel-bg group">
                  <Icon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                  <span className="flex-1 text-xs font-mono text-text-secondary truncate min-w-0">{f.name}</span>
                  <span className="text-[9px] font-mono text-text-secondary">{f.kind}</span>
                  <button onClick={() => removeContextFile(project.id, f.id)} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent-rose transition-all flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] font-mono text-text-secondary text-center py-3 rounded-xl border border-dashed border-border-core/20">
            No context files attached
          </div>
        )}
        <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,.txt,.md,.py,.js,.ts,.json,.csv" className="hidden" onChange={handleAddFile} />
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-core/25 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-border-core/30 transition-all">
          <Plus className="w-3 h-3" /> Add File
        </button>
      </div>

      {/* Agent Settings (only for agent projects) */}
      {project.kind === "agent" && settings && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Agent Settings</h4>
          {[
            { label: "Security Preset",              key: "securityPreset",       options: ["strict", "standard", "custom"] },
            { label: "Outside-folder file access",   key: "outsideFolderAccess",  options: ["always-ask", "allow", "deny"] },
            { label: "Terminal Command Execution",   key: "terminalExecution",    options: ["always-ask", "allow", "deny"] },
          ].map(({ label, key, options }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="font-mono text-xs text-text-secondary">{label}</Label>
              <Select
                value={(settings as any)[key]}
                onValueChange={(v) => updateAgentSettings(project.id, { [key]: v } as any)}
              >
                <SelectTrigger className="w-36 bg-panel-bg border-border-core/25 font-mono text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-panel-bg border-border-core/30 rounded-xl">
                  {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ initialProjectId, onConsumeInitialId }: { initialProjectId: string | null; onConsumeInitialId: () => void }) {
  const { projects } = useProjectsContext();
  const [detailId, setDetailId] = useState<string | null>(null);

  // Consume the initial project ID from AppContext (opened via gear icon)
  useEffect(() => {
    if (initialProjectId) {
      setDetailId(initialProjectId);
      onConsumeInitialId();
    }
  }, [initialProjectId, onConsumeInitialId]);

  const detailProject = projects.find((p) => p.id === detailId);

  if (detailProject) {
    return <ProjectDetailView project={detailProject} onBack={() => setDetailId(null)} />;
  }

  // List view — grouped by mode
  const modes = ["chat", "council", "research", "agents"] as const;
  const modeLabels: Record<string, string> = { chat: "Chat", council: "Council", research: "Research", agents: "Agent Runtime" };

  return (
    <div className="space-y-6">
      {projects.length === 0 ? (
        <div className="text-center py-10">
          <FolderKanban className="w-8 h-8 text-text-secondary mx-auto mb-3" />
          <p className="text-xs font-mono text-text-secondary">No projects yet.</p>
          <p className="text-[10px] font-mono text-text-secondary mt-1">Create a project from the sidebar to get started.</p>
        </div>
      ) : (
        modes.map((mode) => {
          const modeProjects = projects.filter((p) => p.mode === mode);
          if (modeProjects.length === 0) return null;
          return (
            <div key={mode}>
              <h3 className={cn("text-[10px] font-mono uppercase tracking-widest mb-2", MODE_COLORS[mode])}>{modeLabels[mode]}</h3>
              <div className="space-y-1.5">
                {modeProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetailId(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-core/20 bg-panel-bg hover:border-border-core/30 text-left transition-all group"
                  >
                    <Folder className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                    <span className="flex-1 text-xs font-mono text-text-primary truncate">{p.name}</span>
                    <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0", KIND_COLORS[p.kind])}>
                      {p.kind === "agent" ? "Agent" : "Light"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Modal shell ───────────────────────────────────────────────────────────────

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, settingsProjectId, setSettingsProjectId } = useAppContext();
  const [tab, setTab] = useState<SettingsTab>("api");
  const [temp, setTemp] = useState(() => {
    try { return Number(localStorage.getItem("archon_temperature") || "70"); } catch { return 70; }
  });
  const [maxTok, setMaxTok] = useState(() => {
    try { return Number(localStorage.getItem("archon_max_tokens") || "4096"); } catch { return 4096; }
  });
  const [autopilotBehavior, setAutopilotBehavior] = useState(() => {
    try { return localStorage.getItem("archon_autopilot_behavior") || "confirm"; } catch { return "confirm"; }
  });
  const [maxSteps, setMaxSteps] = useState(() => {
    try { return Number(localStorage.getItem("archon_max_steps") || "30"); } catch { return 30; }
  });
  const [tokenBudget, setTokenBudget] = useState(() => {
    try { return Number(localStorage.getItem("archon_token_budget") || "500000"); } catch { return 500000; }
  });

  const [chatModel, setChatModel] = useState(() => localStorage.getItem("archon_chat_model") || "groq/llama-3.1-8b-instant");
  const [proposerModel, setProposerModel] = useState(() => localStorage.getItem("archon_proposer_model") || "groq/llama-3.3-70b-versatile");
  const [criticModel, setCriticModel] = useState(() => localStorage.getItem("archon_critic_model") || "gemini/gemini-2.5-flash");
  const [expertModel, setExpertModel] = useState(() => localStorage.getItem("archon_expert_model") || "openrouter/deepseek/deepseek-r1:free");
  const [researchModel, setResearchModel] = useState(() => localStorage.getItem("archon_research_model") || "gemini/gemini-2.0-flash");
  const [agentModel, setAgentModel] = useState(() => localStorage.getItem("archon_agent_model") || "groq/llama-3.3-70b-versatile");

  const handleSaveAndPush = async () => {
    try {
      const host = localStorage.getItem("archon_daemon_host") || window.location.hostname;
      const port = localStorage.getItem("archon_daemon_port") || "8765";
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      
      const keys = {
        OPENAI_API_KEY: localStorage.getItem("archon_apikey_openai") || "",
        ANTHROPIC_API_KEY: localStorage.getItem("archon_apikey_anthropic") || "",
        GEMINI_API_KEY: localStorage.getItem("archon_apikey_gemini") || "",
        GROQ_API_KEY: localStorage.getItem("archon_apikey_groq") || "",
        MISTRAL_API_KEY: localStorage.getItem("archon_apikey_mistral") || "",
        OPENROUTER_API_KEY: localStorage.getItem("archon_apikey_openrouter") || "",
        CEREBRAS_API_KEY: localStorage.getItem("archon_apikey_cerebras") || "",
      };

      const response = await fetch(`${protocol}://${host}:${port}/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });

      if (response.ok) {
        alert("Settings saved and pushed to daemon successfully!");
        setSettingsOpen(false);
      } else {
        alert("Failed to push settings to daemon.");
      }
    } catch (err) {
      alert("Error connecting to daemon: " + (err as Error).message);
    }
  };

  // When a project ID arrives, switch to the projects tab
  useEffect(() => {
    if (settingsProjectId) setTab("projects");
  }, [settingsProjectId]);

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="w-[95vw] max-w-[820px] w-full p-0 bg-app-bg border border-border-core/30 text-text-primary overflow-hidden rounded-2xl">
        <div className="flex h-[620px]">
          {/* Left tab rail */}
          <div className="w-44 flex-shrink-0 bg-app-bg border-r border-border-core/20 flex flex-col py-4">
            <div className="px-4 mb-4">
              <h2 className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary">System Config</h2>
            </div>
            <nav className="flex-1 px-2 space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  data-testid={`settings-tab-${id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all border",
                    tab === id ? "bg-panel-bg/20 border-border-core/30 text-text-primary" : "border-transparent text-text-secondary hover:text-text-secondary hover:bg-panel-bg/30"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="px-3 mt-4">
              <Button className="w-full bg-accent-indigo/80 hover:bg-accent-indigo text-text-primary text-xs font-mono rounded-xl" size="sm" onClick={handleSaveAndPush} data-testid="button-settings-save">
                <Save className="w-3.5 h-3.5 mr-2" />
                Save & Push
              </Button>
              <p className="text-[9px] font-mono text-text-secondary text-center mt-2">Push keys to daemon .env</p>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border-core/20 flex-shrink-0">
              <DialogTitle className="font-mono text-sm text-text-primary">
                {TABS.find((t) => t.id === tab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1b26 transparent" }}>
              {tab === "api"        && <ProvidersTab />}
              {tab === "network"    && <NetworkTab />}
              {tab === "mcp"        && <McpTab />}
              {tab === "projects"   && (
                <ProjectsTab
                  initialProjectId={settingsProjectId}
                  onConsumeInitialId={() => setSettingsProjectId(null)}
                />
              )}
              {tab === "models" && (
                <div className="space-y-5">
                  {[
                    { label: "Chat Mode default",  def: "groq/llama-3.1-8b-instant" },
                    { label: "Council (Proposer)", def: "groq/llama-3.3-70b-versatile" },
                    { label: "Council (Critic)",   def: "gemini/gemini-2.5-flash" },
                    { label: "Council (Expert)",   def: "openrouter/deepseek/deepseek-r1:free" },
                    { label: "Research mode",      def: "gemini/gemini-2.0-flash" },
                    { label: "Agent executor",     def: "groq/llama-3.3-70b-versatile" },
                  ].map(({ label, def }) => (
                    <div key={label} className="flex items-center justify-between">
                      <Label className="font-mono text-xs text-text-secondary">{label}</Label>
                      <Select defaultValue={def}>
                        <SelectTrigger className="w-56 bg-panel-bg border-border-core/25 font-mono text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-panel-bg border-border-core/30 rounded-xl">
                          <SelectItem value="groq/llama-3.1-8b-instant">Groq · Llama 3.1 8B</SelectItem>
                          <SelectItem value="groq/llama-3.3-70b-versatile">Groq · Llama 3.3 70B</SelectItem>
                          <SelectItem value="gemini/gemini-2.0-flash">Gemini · 2.0 Flash</SelectItem>
                          <SelectItem value="gemini/gemini-2.5-flash">Gemini · 2.5 Flash</SelectItem>
                          <SelectItem value="mistral/open-mistral-nemo">Mistral · Nemo</SelectItem>
                          <SelectItem value="openrouter/deepseek/deepseek-r1:free">OpenRouter · DeepSeek R1</SelectItem>
                          <SelectItem value="cerebras/llama-3.3-70b">Cerebras · Llama 3.3 70B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
              {tab === "parameters" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="font-mono text-xs text-text-secondary">Default Temperature</Label>
                      <span className="font-mono text-xs text-text-primary">{(temp / 100).toFixed(2)}</span>
                    </div>
                    <Slider value={[temp]} onValueChange={([v]) => { setTemp(v); localStorage.setItem("archon_temperature", v.toString()); }} max={100} step={1} className="[&_[role=slider]]:bg-text-secondary [&_[role=slider]]:rounded-lg" />
                    <div className="flex justify-between text-[10px] font-mono text-text-secondary"><span>Deterministic (0.0)</span><span>Creative (1.0)</span></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="font-mono text-xs text-text-secondary">Max Output Tokens</Label>
                      <span className="font-mono text-xs text-text-primary">{maxTok.toLocaleString()}</span>
                    </div>
                    <Slider value={[maxTok]} onValueChange={([v]) => { setMaxTok(v); localStorage.setItem("archon_max_tokens", v.toString()); }} min={512} max={32768} step={512} className="[&_[role=slider]]:bg-text-secondary [&_[role=slider]]:rounded-lg" />
                    <div className="flex justify-between text-[10px] font-mono text-text-secondary"><span>512</span><span>32,768</span></div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border-core/15">
                    <Label className="font-mono text-xs text-text-secondary block">Autopilot Behavior</Label>
                    <Select value={autopilotBehavior} onValueChange={(v) => { setAutopilotBehavior(v); localStorage.setItem("archon_autopilot_behavior", v); }}>
                      <SelectTrigger className="bg-panel-bg border-border-core/25 font-mono text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-panel-bg border-border-core/30 rounded-xl">
                        <SelectItem value="confirm">Always confirm dangerous commands</SelectItem>
                        <SelectItem value="auto">Fully autonomous (no confirmation)</SelectItem>
                        <SelectItem value="readonly">Read-only (no execution)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border-core/15">
                    <Label className="font-mono text-xs text-text-secondary block">Max Steps (Autopilot)</Label>
                    <input
                      type="number"
                      value={maxSteps}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setMaxSteps(val);
                        localStorage.setItem("archon_max_steps", val.toString());
                      }}
                      className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40"
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <Label className="font-mono text-xs text-text-secondary block">Token Budget (Autopilot)</Label>
                    <input
                      type="number"
                      value={tokenBudget}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTokenBudget(val);
                        localStorage.setItem("archon_token_budget", val.toString());
                      }}
                      className="w-full bg-panel-bg border border-border-core/25 rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-border-core/40"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
