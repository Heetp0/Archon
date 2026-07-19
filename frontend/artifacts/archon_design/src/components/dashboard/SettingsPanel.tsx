import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Shield, Sliders, Trash2, Eye, EyeOff, Check } from "lucide-react";

interface SettingsPanelProps {
  onClose: () => void;
}

type Tab = "general" | "preferences" | "security" | "advanced";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: User },
  { id: "preferences", label: "Preferences", icon: Sliders },
  { id: "security", label: "Security", icon: Shield },
  { id: "advanced", label: "Advanced", icon: Sliders },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-2">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({ placeholder, defaultValue, type = "text" }: { placeholder?: string; defaultValue?: string; type?: string }) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm text-white font-mono placeholder:text-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
    />
  );
}

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#a0a0a0] font-mono">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${on ? "bg-white" : "bg-[#222222]"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${on ? "translate-x-4 bg-black" : "translate-x-0 bg-[#555555]"}`}
        />
      </button>
    </div>
  );
}

function Select({ options, defaultValue }: { options: string[]; defaultValue?: string }) {
  return (
    <select
      defaultValue={defaultValue}
      className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#444444] transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function DangerButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 border border-red-900 text-red-500 text-[11px] font-mono rounded hover:bg-red-950 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [showPw, setShowPw] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl mx-4 bg-[#0a0a0a] border border-[#222222] rounded-lg overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Settings</h2>
            <p className="text-[10px] font-mono text-[#555555] mt-0.5">Archon configuration</p>
          </div>
          <button onClick={onClose} className="text-[#555555] hover:text-[#999999] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-40 border-r border-[#1a1a1a] py-4 px-2 flex-shrink-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left mb-0.5 transition-colors text-[12px] font-mono ${
                  activeTab === id
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#555555] hover:text-[#999999] hover:bg-[#111111]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === "general" && (
                  <div>
                    <Field label="Display Name">
                      <Input placeholder="e.g. Heet Patel" defaultValue="Student" />
                    </Field>
                    <Field label="Email">
                      <Input placeholder="your@email.com" type="email" />
                    </Field>
                    <Field label="Timezone">
                      <Select options={["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Tokyo"]} defaultValue="Asia/Kolkata" />
                    </Field>
                    <Field label="Language">
                      <Select options={["English", "Hindi", "Spanish", "French"]} defaultValue="English" />
                    </Field>
                  </div>
                )}

                {activeTab === "preferences" && (
                  <div>
                    <Label>Display</Label>
                    <div className="border border-[#1a1a1a] rounded px-4 py-1 mb-5">
                      <Toggle label="Compact density mode" defaultChecked={false} />
                      <Toggle label="Show latency badges on responses" defaultChecked={true} />
                      <Toggle label="Animate transitions" defaultChecked={true} />
                    </div>
                    <Field label="Default OCR Engine">
                      <Select options={["MyScript (cloud, accurate)", "Tesseract (local, private)", "Auto (MyScript with Tesseract fallback)"]} defaultValue="Auto (MyScript with Tesseract fallback)" />
                    </Field>
                    <Field label="Default LLM Tier">
                      <Select options={["Fast (Groq / Cerebras)", "Standard (OpenAI / Anthropic)", "Local (Ollama / Qwen)"]} defaultValue="Fast (Groq / Cerebras)" />
                    </Field>
                  </div>
                )}

                {activeTab === "security" && (
                  <div>
                    <Field label="New Password">
                      <div className="relative">
                        <Input type={showPw ? "text" : "password"} placeholder="Enter new password" />
                        <button
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#777777]"
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Confirm Password">
                      <Input type="password" placeholder="Confirm new password" />
                    </Field>
                    <div className="mt-4 p-4 border border-[#1a1a1a] rounded bg-[#050505]">
                      <Label>Active Session</Label>
                      <p className="text-[11px] font-mono text-[#555555]">JWT token — expires in 24 hours. Re-login to refresh.</p>
                    </div>
                  </div>
                )}

                {activeTab === "advanced" && (
                  <div>
                    <Label>Data & Privacy</Label>
                    <div className="border border-[#1a1a1a] rounded px-4 py-1 mb-6">
                      <Toggle label="Share anonymous usage analytics" defaultChecked={false} />
                      <Toggle label="Enable Tesseract monthly fine-tuning" defaultChecked={true} />
                    </div>

                    <Label>Danger Zone</Label>
                    <div className="border border-red-950 rounded p-4 space-y-3">
                      <p className="text-[11px] font-mono text-[#666666]">These actions are irreversible. Proceed with caution.</p>
                      <DangerButton label="Delete all my notebooks" />
                      <DangerButton label="Delete account & all data" />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1a1a1a] flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded text-[12px] font-mono font-semibold transition-all duration-200 ${
              saved ? "bg-[#1a2a1a] border border-green-800 text-green-400" : "bg-white text-black hover:bg-[#e0e0e0]"
            }`}
          >
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
