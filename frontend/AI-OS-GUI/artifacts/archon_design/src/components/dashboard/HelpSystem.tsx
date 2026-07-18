import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Zap, HelpCircle, Terminal, Search, ChevronDown, ChevronRight } from "lucide-react";

interface HelpSystemProps {
  onClose: () => void;
}

type Section = "quickstart" | "glossary" | "troubleshoot";

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "RAG", definition: "Retrieval-Augmented Generation — the technique that grounds Archon's answers in your actual source documents instead of hallucinating." },
  { term: "LanceDB", definition: "The embedded vector database Archon uses to store and retrieve semantic embeddings of your notebook contents." },
  { term: "Embedding", definition: "A numerical vector representation of text. Semantically similar texts have embeddings that are close in high-dimensional space." },
  { term: "SM-2", definition: "SuperMemo 2 — the spaced repetition algorithm that schedules quiz reviews based on your past performance and forgetting curves." },
  { term: "OCR", definition: "Optical Character Recognition — converts handwritten or printed images into machine-readable text. Archon uses MyScript + Tesseract." },
  { term: "MyScript", definition: "A cloud OCR API specialized for handwriting, especially mathematical notation. Archon uses it for quiz answer recognition." },
  { term: "Tesseract", definition: "Google's open-source OCR engine that runs locally on the Oracle VM as a fallback when MyScript is unavailable." },
  { term: "JWT", definition: "JSON Web Token — a compact, self-contained token used by Archon for stateless user authentication." },
  { term: "OCPU", definition: "Oracle Compute Processing Unit — Oracle's measure of CPU capacity. The free-tier ARM VM provides 4 OCPUs = ~2 physical cores." },
  { term: "LLM Tier", definition: "Archon routes queries to different LLM tiers: Fast (Groq), Standard (OpenAI/Anthropic), Local (Ollama/Qwen)." },
];

const QUICKSTART = [
  { n: 1, title: "Create a Notebook", desc: 'Click "Notebooks" → "New Notebook". Name it after your subject (e.g. "Aerodynamics").' },
  { n: 2, title: "Upload Sources", desc: "Drag-drop PDFs, paste a GitHub URL, or type text directly. Archon indexes everything." },
  { n: 3, title: "Chat with Context", desc: "Open the notebook and type a question. Archon retrieves the most relevant passages and answers with citations." },
  { n: 4, title: "Take a Quiz", desc: "Go to Tutor Mode, select your notebook, and start a quiz. Write answers with your stylus; Archon grades them." },
  { n: 5, title: "Review Schedule", desc: "The SM-2 scheduler surfaces cards you're weak on right before you forget them. Check the Dashboard for today's queue." },
];

const TROUBLESHOOT: { issue: string; fix: string }[] = [
  { issue: "Backend not responding", fix: 'Run `systemctl status archon-daemon` on your Oracle VM. Check that port 8000 is open in the VCN security list. Try `curl http://your-vm-ip:8000/models`.' },
  { issue: "OCR returns empty or garbled text", fix: "Check that MyScript API keys are set in `.env`. If quota is exceeded, Archon falls back to Tesseract — accuracy drops for math symbols. Re-try after clearing the ink and writing more clearly." },
  { issue: "Slow RAG responses (>30s)", fix: "Your LanceDB index may need optimization. Run `python query_optimizer.py` on the VM. Also check Oracle VM CPU steal — the free tier throttles under sustained load." },
  { issue: "Notebook not syncing to Android", fix: "Verify the Android app points to your VM's public IP. Check that port 8000 is reachable from your phone. Restart the daemon with `systemctl restart archon-daemon`." },
  { issue: "Login fails / 401 errors", fix: "JWT tokens expire after 24 hours. Log out and log back in. If it persists, check `JWT_SECRET_KEY` in `.env` — it must be the same across restarts." },
  { issue: "Out of disk space on Oracle VM", fix: "Run `python backup_scheduler.py --prune` to remove old snapshots. LanceDB grows with every indexed document — monitor with `du -sh ~/archon/data/`." },
];

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1a1a1a] rounded mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-mono text-[#c0c0c0]">{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-[#555555]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555555]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TABS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "quickstart", label: "Quick Start", icon: Zap },
  { id: "glossary", label: "Glossary", icon: BookOpen },
  { id: "troubleshoot", label: "Troubleshoot", icon: Terminal },
];

export default function HelpSystem({ onClose }: HelpSystemProps) {
  const [section, setSection] = useState<Section>("quickstart");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGlossary = GLOSSARY.filter(
    (g) =>
      g.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#555555]" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Help & Reference</h2>
          </div>
          <button onClick={onClose} className="text-[#555555] hover:text-[#999999] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1a1a] px-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-mono border-b-2 transition-colors ${
                section === id
                  ? "border-white text-white"
                  : "border-transparent text-[#555555] hover:text-[#999999]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {section === "quickstart" && (
                <div className="space-y-3">
                  {QUICKSTART.map(({ n, title, desc }) => (
                    <div key={n} className="flex gap-4 p-4 border border-[#1a1a1a] rounded">
                      <div className="w-6 h-6 rounded bg-[#1a1a1a] border border-[#333] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-mono text-white">{n}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">{title}</div>
                        <div className="text-[12px] font-mono text-[#666666] leading-relaxed">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section === "glossary" && (
                <div>
                  <div className="relative mb-4">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search terms..."
                      className="w-full bg-[#050505] border border-[#222222] rounded pl-9 pr-3 py-2 text-sm text-white font-mono placeholder:text-[#444444] focus:outline-none focus:border-[#444444]"
                    />
                  </div>
                  {filteredGlossary.map(({ term, definition }) => (
                    <Accordion key={term} title={term}>
                      <p className="text-[12px] font-mono text-[#666666] leading-relaxed">{definition}</p>
                    </Accordion>
                  ))}
                  {filteredGlossary.length === 0 && (
                    <p className="text-[12px] font-mono text-[#444444] text-center py-8">No terms match "{searchQuery}"</p>
                  )}
                </div>
              )}

              {section === "troubleshoot" && (
                <div>
                  {TROUBLESHOOT.map(({ issue, fix }) => (
                    <Accordion key={issue} title={issue}>
                      <p className="text-[12px] font-mono text-[#666666] leading-relaxed whitespace-pre-wrap">{fix}</p>
                    </Accordion>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
