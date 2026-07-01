import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  KeyRound, Network, Cpu, Save, Eye, EyeOff, BrainCircuit,
  Plus, X, Database, Trash2, CheckCircle2, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type SettingsTab = "api" | "models" | "parameters" | "network" | "mcp";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "api",        label: "Providers",   icon: KeyRound },
  { id: "models",     label: "Models",      icon: BrainCircuit },
  { id: "parameters", label: "Parameters",  icon: Cpu },
  { id: "network",    label: "Network",     icon: Network },
  { id: "mcp",        label: "MCP",         icon: Database },
];

interface Provider {
  value: string;
  label: string;
  desc: string;
  tag?: string;
  color: string;
  letter: string;
}

const PROVIDERS: Provider[] = [
  { value: "gemini",     label: "Gemini",       desc: "Google Gemini 2.0 & 2.5 Flash — free tier",        tag: "Free",        color: "bg-blue-500",    letter: "G"  },
  { value: "groq",       label: "Groq",         desc: "Llama 3.1/3.3, Gemma — ultra-fast inference",      tag: "Free",        color: "bg-orange-500",  letter: "Q"  },
  { value: "openrouter", label: "OpenRouter",   desc: "DeepSeek R1, Llama and other free-tier models",    tag: "Multi-model", color: "bg-violet-500",  letter: "OR" },
  { value: "cerebras",   label: "Cerebras",     desc: "Llama 3.3 70B on custom AI silicon — free tier",   tag: "Free",        color: "bg-emerald-500", letter: "CB" },
  { value: "mistral",    label: "Mistral",      desc: "Mistral Nemo and open-weight models — free tier",  tag: "Free",        color: "bg-pink-500",    letter: "M"  },
  { value: "cloudflare", label: "Cloudflare AI",desc: "Workers AI — serverless inference at the edge",    tag: "Edge",        color: "bg-amber-500",   letter: "CF" },
];

// ── Connected provider row ─────────────────────────────────────────────────────
function ConnectedRow({ provider, onDisconnect }: { provider: Provider; onDisconnect: () => void }) {
  return (
    <div className="flex items-center gap-4 py-3 px-1 border-b border-white/[0.04] last:border-b-0">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0", provider.color)}>
        {provider.letter}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-mono text-slate-200">{provider.label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Connected
        </span>
      </div>
      <button onClick={onDisconnect} className="text-xs font-mono text-slate-500 hover:text-red-400 transition-colors">
        Disconnect
      </button>
    </div>
  );
}

// ── Available provider row ────────────────────────────────────────────────────
function AvailableRow({ provider, onConnect }: { provider: Provider; onConnect: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState("");

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onConnect(trimmed);
    setDraft("");
    setExpanded(false);
  };

  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <div className="flex items-center gap-4 py-3 px-1">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0", provider.color)}>
          {provider.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-200">{provider.label}</span>
            {provider.tag && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-600 border border-white/[0.05]">
                {provider.tag}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-slate-600 mt-0.5">{provider.desc}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex-shrink-0",
            expanded
              ? "border-white/[0.10] text-slate-300 bg-slate-800/60"
              : "border-white/[0.06] text-slate-500 hover:border-white/[0.10] hover:text-slate-300"
          )}
        >
          {expanded ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {expanded ? "Cancel" : "Connect"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={show ? "text" : "password"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setExpanded(false); }}
                  placeholder="Paste API key..."
                  autoFocus
                  className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-white/[0.15] pr-10"
                />
                <button
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!draft.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 font-mono text-xs h-9 px-4 flex-shrink-0 rounded-xl"
              >
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Providers Tab ──────────────────────────────────────────────────────────────
function ProvidersTab() {
  const getKey = (v: string) => localStorage.getItem(`archon_apikey_${v}`) || "";
  const [keys, setKeys] = useState<Record<string, string>>(() =>
    Object.fromEntries(PROVIDERS.map((p) => [p.value, getKey(p.value)]))
  );

  const connect = useCallback((providerValue: string, key: string) => {
    localStorage.setItem(`archon_apikey_${providerValue}`, key);
    setKeys((prev) => ({ ...prev, [providerValue]: key }));
  }, []);

  const disconnect = useCallback((providerValue: string) => {
    localStorage.removeItem(`archon_apikey_${providerValue}`);
    setKeys((prev) => ({ ...prev, [providerValue]: "" }));
  }, []);

  const connected = PROVIDERS.filter((p) => (keys[p.value] || "").length > 10);
  const available = PROVIDERS.filter((p) => (keys[p.value] || "").length <= 10);

  return (
    <div className="space-y-6">
      {connected.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Connected</h3>
          <div className="rounded-xl border border-white/[0.05] bg-[#0b0c13] px-3">
            {connected.map((p) => (
              <ConnectedRow key={p.value} provider={p} onDisconnect={() => disconnect(p.value)} />
            ))}
          </div>
        </div>
      )}
      {available.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
            {connected.length > 0 ? "Available" : "Providers"}
          </h3>
          <div className="rounded-xl border border-white/[0.05] bg-[#0b0c13] px-3">
            {available.map((p) => (
              <AvailableRow key={p.value} provider={p} onConnect={(key) => connect(p.value, key)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Network Tab ───────────────────────────────────────────────────────────────
function NetworkTab() {
  const [host, setHost] = useState(() => localStorage.getItem("archon_daemon_host") || "localhost");
  const [port, setPort] = useState(() => localStorage.getItem("archon_daemon_port") || "8765");

  useEffect(() => { localStorage.setItem("archon_daemon_host", host); }, [host]);
  useEffect(() => { localStorage.setItem("archon_daemon_port", port); }, [port]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-slate-500">Daemon Host</Label>
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-white/[0.15]"
        />
      </div>
      <div className="space-y-2">
        <Label className="font-mono text-xs text-slate-500">WebSocket Port</Label>
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="w-48 bg-[#0b0c13] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-white/[0.15]"
        />
        <p className="text-[10px] font-mono text-slate-700">Default: 8765. Must match daemon --port flag.</p>
      </div>
      <p className="text-[10px] font-mono text-amber-700/80">Changes take effect after page reload.</p>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0b0c13] border border-white/[0.05]">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs font-mono text-slate-500">ws://{host}:{port} — Offline</span>
      </div>
    </div>
  );
}

// ── MCP Tab ───────────────────────────────────────────────────────────────────
interface McpServer {
  id: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  connected: boolean;
}

function McpTab() {
  const [servers, setServers] = useState<McpServer[]>(() => {
    try {
      const stored = localStorage.getItem("archon_mcp_servers");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const save = (updated: McpServer[]) => {
    setServers(updated);
    localStorage.setItem("archon_mcp_servers", JSON.stringify(updated));
  };

  const addServer = () => {
    if (!newName || !newUrl) return;
    save([
      ...servers,
      {
        id: Math.random().toString(),
        name: newName,
        url: newUrl,
        description: newDesc,
        enabled: true,
        connected: false,
      },
    ]);
    setNewName("");
    setNewUrl("");
    setNewDesc("");
    setShowAdd(false);
  };

  const toggle = (id: string) =>
    save(servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const remove = (id: string) => save(servers.filter((s) => s.id !== id));

  const PRESETS = [
    { name: "Gmail MCP", url: "http://localhost:3100/mcp", description: "Gmail read/write via MCP server" },
    { name: "Google Keep MCP", url: "http://localhost:3101/mcp", description: "Keep notes & checklists" },
    { name: "Obsidian MCP", url: "http://localhost:3102/mcp", description: "Vault file read/write operations" },
    { name: "Calendar MCP", url: "http://localhost:3103/mcp", description: "Google Calendar events" },
    { name: "File System MCP", url: "http://localhost:3104/mcp", description: "Local file system access" },
  ];

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="px-4 py-3 rounded-xl bg-blue-500/[0.05] border border-blue-500/10">
        <p className="text-xs font-mono text-blue-400/80">
          Model Context Protocol (MCP) servers extend the AI with tools like Gmail, Obsidian, Calendar, and more.
          Add your MCP server URL and enable it to make it available to agents.
        </p>
      </div>

      {/* Connected servers */}
      {servers.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Connected Servers</h3>
          <div className="space-y-2">
            {servers.map((server) => (
              <div
                key={server.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                  server.enabled
                    ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                    : "border-white/[0.05] bg-[#0b0c13] opacity-60"
                )}
              >
                <button
                  onClick={() => toggle(server.id)}
                  className="flex-shrink-0"
                >
                  {server.enabled
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <Circle className="w-4 h-4 text-slate-600" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-slate-300 font-medium">{server.name}</div>
                  <div className="text-[10px] font-mono text-slate-600 truncate">{server.url}</div>
                  {server.description && (
                    <div className="text-[10px] font-mono text-slate-700 mt-0.5">{server.description}</div>
                  )}
                </div>
                <button
                  onClick={() => remove(server.id)}
                  className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Add MCP Server</h3>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-slate-300 border border-white/[0.06] px-2.5 py-1 rounded-lg transition-all"
          >
            {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAdd ? "Cancel" : "Custom"}
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pb-4">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Server name..."
                  className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-3 py-2 text-sm font-mono text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-white/[0.15]"
                />
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="ws://localhost:3100/mcp or http://..."
                  className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-3 py-2 text-sm font-mono text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-white/[0.15]"
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)..."
                  className="w-full bg-[#0b0c13] border border-white/[0.06] rounded-xl px-3 py-2 text-sm font-mono text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-white/[0.15]"
                />
                <Button
                  onClick={addServer}
                  disabled={!newName || !newUrl}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono disabled:opacity-30 rounded-xl"
                  size="sm"
                >
                  Add Server
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Presets */}
        <div>
          <p className="text-[10px] font-mono text-slate-700 mb-2">Common presets:</p>
          <div className="space-y-1.5">
            {PRESETS.filter((p) => !servers.find((s) => s.url === p.url)).map((preset) => (
              <button
                key={preset.url}
                onClick={() => {
                  save([
                    ...servers,
                    {
                      id: Math.random().toString(),
                      ...preset,
                      enabled: true,
                      connected: false,
                    },
                  ]);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-white/[0.04] bg-[#0b0c13] hover:border-white/[0.08] text-left transition-all"
              >
                <Plus className="w-3 h-3 text-slate-600 flex-shrink-0" />
                <div>
                  <div className="text-xs font-mono text-slate-400">{preset.name}</div>
                  <div className="text-[10px] font-mono text-slate-700">{preset.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen } = useAppContext();
  const [tab, setTab] = useState<SettingsTab>("api");
  const [temp, setTemp] = useState(70);
  const [maxTok, setMaxTok] = useState(4096);

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-[780px] w-full p-0 bg-[#08090f] border border-white/[0.08] text-slate-200 overflow-hidden rounded-2xl">
        <div className="flex h-[600px]">
          {/* Left tab rail */}
          <div className="w-44 flex-shrink-0 bg-[#08090f] border-r border-white/[0.05] flex flex-col py-4">
            <div className="px-4 mb-4">
              <h2 className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-700">System Config</h2>
            </div>
            <nav className="flex-1 px-2 space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  data-testid={`settings-tab-${id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all border",
                    tab === id
                      ? "bg-white/[0.05] border-white/[0.08] text-slate-200"
                      : "border-transparent text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="px-3 mt-4">
              <Button
                className="w-full bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-mono rounded-xl"
                size="sm"
                data-testid="button-settings-save"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                Save & Push
              </Button>
              <p className="text-[9px] font-mono text-slate-700 text-center mt-2">Push keys to daemon .env</p>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-white/[0.05] flex-shrink-0">
              <DialogTitle className="font-mono text-sm text-slate-200">
                {TABS.find((t) => t.id === tab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === "api"        && <ProvidersTab />}
              {tab === "network"    && <NetworkTab />}
              {tab === "mcp"        && <McpTab />}
              {tab === "models"     && (
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
                      <Label className="font-mono text-xs text-slate-500">{label}</Label>
                      <Select defaultValue={def}>
                        <SelectTrigger className="w-56 bg-[#0b0c13] border-white/[0.06] font-mono text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d0e18] border-white/[0.08] rounded-xl">
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
                      <Label className="font-mono text-xs text-slate-500">Default Temperature</Label>
                      <span className="font-mono text-xs text-slate-300">{(temp / 100).toFixed(2)}</span>
                    </div>
                    <Slider value={[temp]} onValueChange={([v]) => setTemp(v)} max={100} step={1}
                      className="[&_[role=slider]]:bg-slate-300 [&_[role=slider]]:rounded-lg" />
                    <div className="flex justify-between text-[10px] font-mono text-slate-700">
                      <span>Deterministic (0.0)</span><span>Creative (1.0)</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="font-mono text-xs text-slate-500">Max Output Tokens</Label>
                      <span className="font-mono text-xs text-slate-300">{maxTok.toLocaleString()}</span>
                    </div>
                    <Slider value={[maxTok]} onValueChange={([v]) => setMaxTok(v)} min={512} max={32768} step={512}
                      className="[&_[role=slider]]:bg-slate-300 [&_[role=slider]]:rounded-lg" />
                    <div className="flex justify-between text-[10px] font-mono text-slate-700">
                      <span>512</span><span>32,768</span>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                    <Label className="font-mono text-xs text-slate-500 block">Autopilot Behavior</Label>
                    <Select defaultValue="confirm">
                      <SelectTrigger className="bg-[#0b0c13] border-white/[0.06] font-mono text-xs rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0d0e18] border-white/[0.08] rounded-xl">
                        <SelectItem value="confirm">Always confirm dangerous commands</SelectItem>
                        <SelectItem value="auto">Fully autonomous (no confirmation)</SelectItem>
                        <SelectItem value="readonly">Read-only (no execution)</SelectItem>
                      </SelectContent>
                    </Select>
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
