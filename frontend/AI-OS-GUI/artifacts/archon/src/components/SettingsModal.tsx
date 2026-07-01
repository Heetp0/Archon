import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { KeyRound, Network, Cpu, Save, Eye, EyeOff, BrainCircuit, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type SettingsTab = "api" | "models" | "parameters" | "network";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "api",        label: "Providers",   icon: KeyRound },
  { id: "models",     label: "Models",      icon: BrainCircuit },
  { id: "parameters", label: "Parameters",  icon: Cpu },
  { id: "network",    label: "Network",     icon: Network },
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

// ── Connected provider row (top section) ──────────────────────────────────────
function ConnectedRow({
  provider,
  onDisconnect,
}: {
  provider: Provider;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 px-1 border-b border-slate-800/50 last:border-b-0">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0", provider.color)}>
        {provider.letter}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-mono text-slate-200">{provider.label}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
          API key
        </span>
      </div>
      <button
        onClick={onDisconnect}
        className="text-xs font-mono text-slate-400 hover:text-red-400 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

// ── Available provider row (bottom section) ───────────────────────────────────
function AvailableRow({
  provider,
  onConnect,
}: {
  provider: Provider;
  onConnect: (key: string) => void;
}) {
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
    <div className="border-b border-slate-800/50 last:border-b-0">
      <div className="flex items-center gap-4 py-3 px-1">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0", provider.color)}>
          {provider.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-200">{provider.label}</span>
            {provider.tag && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-600 border border-slate-700/50">
                {provider.tag}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-slate-600 mt-0.5">{provider.desc}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all flex-shrink-0",
            expanded
              ? "border-slate-600 text-slate-300 bg-slate-800"
              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
          )}
        >
          {expanded ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {expanded ? "Cancel" : "Connect"}
        </button>
      </div>

      {/* Inline key input */}
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
                  className="w-full bg-black border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-slate-500 pr-10"
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
                className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 font-mono text-xs h-9 px-4 flex-shrink-0"
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

// ── Main Providers tab ────────────────────────────────────────────────────────
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
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
            Connected providers
          </h3>
          <div className="rounded-lg border border-slate-800 bg-slate-900/20 px-3">
            {connected.map((p) => (
              <ConnectedRow key={p.value} provider={p} onDisconnect={() => disconnect(p.value)} />
            ))}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
            {connected.length > 0 ? "Available providers" : "Providers"}
          </h3>
          <div className="rounded-lg border border-slate-800 bg-slate-900/20 px-3">
            {available.map((p) => (
              <AvailableRow key={p.value} provider={p} onConnect={(key) => connect(p.value, key)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Network tab ───────────────────────────────────────────────────────────────
function NetworkTab() {
  const [host, setHost] = useState(() => localStorage.getItem("archon_daemon_host") || "localhost");
  const [port, setPort] = useState(() => localStorage.getItem("archon_daemon_port") || "8765");

  useEffect(() => { localStorage.setItem("archon_daemon_host", host); }, [host]);
  useEffect(() => { localStorage.setItem("archon_daemon_port", port); }, [port]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="font-mono text-xs text-slate-400">Daemon Host</Label>
        <input value={host} onChange={(e) => setHost(e.target.value)}
          className="w-48 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-600" />
      </div>
      <div className="space-y-2">
        <Label className="font-mono text-xs text-slate-400">Daemon WebSocket Port</Label>
        <input type="number" value={port} onChange={(e) => setPort(e.target.value)}
          className="w-48 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-600" />
        <p className="text-[10px] font-mono text-slate-700">Default: 8765. Must match FastAPI --port flag.</p>
      </div>
      <p className="text-[10px] font-mono text-amber-700">Changes take effect after reconnecting.</p>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs font-mono text-slate-400">ws://{host}:{port} — Offline</span>
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
      <DialogContent className="max-w-[760px] w-full p-0 bg-[#0a0a0f] border-slate-800 text-slate-200 overflow-hidden">
        <div className="flex h-[580px]">
          {/* Left tab rail */}
          <div className="w-44 flex-shrink-0 bg-[#060609] border-r border-slate-800/60 flex flex-col py-4">
            <div className="px-4 mb-4">
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600">System Config</h2>
            </div>
            <nav className="flex-1 px-2 space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} data-testid={`settings-tab-${id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all border",
                    tab === id ? "bg-slate-800 border-slate-700 text-slate-200" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                  )}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </nav>
            <div className="px-3 mt-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono" size="sm" data-testid="button-settings-save">
                <Save className="w-3.5 h-3.5 mr-2" />Save & Push
              </Button>
              <p className="text-[9px] font-mono text-slate-700 text-center mt-2">Push keys to daemon .env</p>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
              <DialogTitle className="font-mono text-sm text-slate-200">
                {tab === "api" ? "Providers" : TABS.find(t => t.id === tab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === "api"        && <ProvidersTab />}
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
                      <Label className="font-mono text-xs text-slate-400">{label}</Label>
                      <Select defaultValue={def}>
                        <SelectTrigger className="w-56 bg-slate-900 border-slate-800 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
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
                      <Label className="font-mono text-xs text-slate-400">Default Temperature</Label>
                      <span className="font-mono text-xs text-slate-300">{(temp / 100).toFixed(2)}</span>
                    </div>
                    <Slider value={[temp]} onValueChange={([v]) => setTemp(v)} max={100} step={1} className="[&_[role=slider]]:bg-slate-300" />
                    <div className="flex justify-between text-[10px] font-mono text-slate-700">
                      <span>Deterministic (0.0)</span><span>Creative (1.0)</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="font-mono text-xs text-slate-400">Max Output Tokens</Label>
                      <span className="font-mono text-xs text-slate-300">{maxTok.toLocaleString()}</span>
                    </div>
                    <Slider value={[maxTok]} onValueChange={([v]) => setMaxTok(v)} min={512} max={32768} step={512} className="[&_[role=slider]]:bg-slate-300" />
                    <div className="flex justify-between text-[10px] font-mono text-slate-700">
                      <span>512</span><span>32,768</span>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <Label className="font-mono text-xs text-slate-400 block">Autopilot Behavior</Label>
                    <Select defaultValue="confirm">
                      <SelectTrigger className="bg-slate-900 border-slate-800 font-mono text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="confirm">Always confirm dangerous commands</SelectItem>
                        <SelectItem value="auto">Fully autonomous (no confirmation)</SelectItem>
                        <SelectItem value="readonly">Read-only (no execution)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {tab === "network" && <NetworkTab />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
