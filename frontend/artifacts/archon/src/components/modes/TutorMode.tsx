import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, GraduationCap, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface TutorSession {
  id: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  reference_answer: string;
}

interface GradingResult {
  score: number;
  concept_score: number;
  reasoning_score: number;
  form_score: number;
  feedback: string;
  needs_work: boolean;
  follow_up_question?: string;
}

interface TopicMastery {
  topic: string;
  mastery_percentage: number;
  next_review_date: string;
}

interface ScheduleItem {
  topic: string;
  due_date: string;
}

interface Schedule {
  due_today: ScheduleItem[];
  due_this_week: ScheduleItem[];
}

export default function TutorMode() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [session, setSession] = useState<TutorSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [showReference, setShowReference] = useState(true);
  const [masteryData, setMasteryData] = useState<TopicMastery[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({ due_today: [], due_this_week: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableTopics = ["Calculus", "Physics", "Chemistry", "Fluids", "Thermodynamics"];

  useEffect(() => {
    fetchMastery();
    fetchSchedule();
  }, []);

  const fetchMastery = async () => {
    try {
      const res = await fetch('http://localhost:8000/tutor/mastery');
      if (res.ok) {
        const data = await res.json();
        setMasteryData(data);
      }
    } catch (e) {
      console.error("fetchMastery failed:", e);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch('http://localhost:8000/tutor/spaced_repetition_schedule');
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      }
    } catch (e) {
      console.error("fetchSchedule failed:", e);
    }
  };

  const startSession = async () => {
    if (!topic) return;
    try {
      const res = await fetch('http://localhost:8000/tutor/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty })
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        setGradingResult(null);
        setInputText('');
      }
    } catch (e) {
      console.error("startSession failed:", e);
    }
  };

  const submitAnswer = async () => {
    if (!session || !inputText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/tutor/session/${session.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: inputText })
      });
      if (res.ok) {
        const data = await res.json();
        setGradingResult(data);
      }
    } catch (e) {
      console.error("submitAnswer failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-app-bg relative text-text-primary overflow-hidden font-sans"
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-border-core bg-panel-bg flex-shrink-0">
        <div className="flex items-center gap-4">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="bg-app-bg border border-border-core rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500/50"
          >
            <option value="" disabled>Select a topic</option>
            {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex bg-app-bg rounded border border-border-core p-0.5">
            {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(level => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-3 py-1 text-xs capitalize rounded-sm transition-colors ${
                  difficulty === level
                    ? 'bg-panel-bg text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-accent-emerald font-mono text-xs flex items-center gap-4">
            <span>Score: 7.5/10</span>
            <span>Streak: 3</span>
            <span>Next review: Fluids in 1d</span>
          </div>
          <Button
            onClick={startSession}
            disabled={!topic}
            className="bg-accent-indigo hover:bg-accent-indigo/90 text-white h-8"
          >
            Start Session
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Mastery (20%) */}
        <div className="w-[20%] border-r border-border-core bg-panel-bg flex flex-col">
          <div className="px-4 py-3 border-b border-border-core">
            <h2 className="text-[10px] text-accent-emerald font-mono tracking-widest">MASTERY</h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {masteryData.map((m, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-white">{m.topic}</span>
                    {isOverdue(m.next_review_date) && <div className="w-1.5 h-1.5 rounded-full bg-accent-rose" />}
                  </div>
                  <div className="h-1.5 w-full bg-border-core rounded-full overflow-hidden">
                    <div className="h-full bg-accent-emerald transition-all" style={{ width: `${m.mastery_percentage}%` }} />
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono">
                    Next: {new Date(m.next_review_date).toLocaleDateString()}
                  </div>
                </div>
              ))}

              <div className="pt-4 mt-4 border-t border-border-core">
                <h3 className="text-[10px] text-text-secondary font-mono mb-2 uppercase">Due Today</h3>
                {schedule.due_today.map((s, i) => (
                  <div key={i} className="text-xs text-text-primary py-1">{s.topic}</div>
                ))}
              </div>
              <div className="pt-2">
                <h3 className="text-[10px] text-text-secondary font-mono mb-2 uppercase">Due This Week</h3>
                {schedule.due_this_week.map((s, i) => (
                  <div key={i} className="text-xs text-text-primary py-1">{s.topic}</div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Center - Question Display (55%) */}
        <div className="w-[55%] border-r border-border-core bg-app-bg flex flex-col relative">
          {!session ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-panel-bg flex items-center justify-center border border-border-core">
                <GraduationCap className="w-8 h-8 text-accent-indigo" />
              </div>
              <h3 className="text-lg text-text-primary">Select a topic to start your Tutor session</h3>
              <Button onClick={startSession} disabled={!topic} className="bg-accent-indigo text-white mt-4">
                Start Session
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-6 pb-20">
                <div className="p-5 rounded-lg border border-accent-indigo/50 bg-blue-950/10">
                  <ReactMarkdown className="prose prose-invert max-w-none text-white text-base font-sans prose-p:leading-relaxed">
                    {session.question}
                  </ReactMarkdown>
                </div>

                {!gradingResult && (
                  <div className="space-y-4">
                    <div className="w-full h-40 border border-dashed border-border-core bg-panel-bg rounded-lg flex items-center justify-center relative">
                      <div className="text-sm text-text-secondary">Handwriting canvas active on Android</div>
                      <Textarea
                        value={inputText}
                        onChange={(e) => {
                          setInputText(e.target.value);
                          setIsRecognizing(e.target.value.length % 5 === 0);
                        }}
                        placeholder="Type your answer here as fallback..."
                        className="absolute inset-0 w-full h-full bg-transparent border-0 focus-visible:ring-0 p-4 resize-none text-white"
                      />
                    </div>
                    {isRecognizing && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-bounce" />
                        </div>
                        <span className="text-xs text-text-secondary font-mono">Recognizing handwriting...</span>
                      </div>
                    )}
                    {inputText && !isRecognizing && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-text-secondary">Recognized:</span>
                        <span className="text-white bg-panel-bg px-2 py-1 rounded border border-border-core truncate max-w-sm">
                          {inputText}
                        </span>
                        <span className="text-[10px] font-mono text-accent-indigo bg-blue-950/30 px-2 py-0.5 rounded-full border border-blue-900/50">
                          [92%]
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4">
                      <Button onClick={submitAnswer} disabled={!inputText || isSubmitting} className="bg-accent-emerald hover:bg-accent-emerald/90 text-app-bg">
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Done
                      </Button>
                      <Button variant="outline" onClick={() => setInputText('')} className="border-border-core text-text-secondary hover:text-white bg-transparent">
                        Clear
                      </Button>
                      <Button variant="outline" className="border-amber-500/50 text-amber-500 hover:text-amber-400 bg-amber-950/10">
                        Show Hint
                      </Button>
                    </div>
                  </div>
                )}

                {gradingResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="p-6 rounded-lg border border-border-core bg-panel-bg">
                      <div className="flex items-center gap-6 mb-6">
                        <div className={`text-6xl font-mono ${
                          gradingResult.score >= 8.5 ? 'text-accent-emerald' : gradingResult.score >= 6 ? 'text-amber-500' : 'text-accent-rose'
                        }`}>
                          {gradingResult.score.toFixed(1)}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-mono text-text-secondary uppercase">
                              <span>Concept</span><span>{gradingResult.concept_score}/10</span>
                            </div>
                            <div className="h-1.5 w-full bg-border-core rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${gradingResult.concept_score * 10}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-mono text-text-secondary uppercase">
                              <span>Reasoning</span><span>{gradingResult.reasoning_score}/10</span>
                            </div>
                            <div className="h-1.5 w-full bg-border-core rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${gradingResult.reasoning_score * 10}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-mono text-text-secondary uppercase">
                              <span>Form</span><span>{gradingResult.form_score}/10</span>
                            </div>
                            <div className="h-1.5 w-full bg-border-core rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${gradingResult.form_score * 10}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <ReactMarkdown className="prose prose-invert text-sm text-text-primary">
                        {gradingResult.feedback}
                      </ReactMarkdown>
                    </div>

                    {gradingResult.needs_work && gradingResult.follow_up_question && (
                      <div className="p-5 rounded-lg border border-accent-rose/50 bg-rose-950/10">
                        <h4 className="text-[10px] font-mono text-accent-rose tracking-widest uppercase mb-3 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Follow-up Question
                        </h4>
                        <ReactMarkdown className="prose prose-invert text-white text-sm mb-4">
                          {gradingResult.follow_up_question}
                        </ReactMarkdown>
                        <Textarea 
                          placeholder="Your answer..."
                          className="w-full bg-panel-bg border-border-core text-white placeholder:text-text-secondary resize-none"
                        />
                        <Button className="mt-3 bg-accent-indigo text-white h-8" size="sm">
                          Submit Correction
                        </Button>
                      </div>
                    )}

                    <Button onClick={startSession} className="bg-accent-indigo hover:bg-accent-indigo/90 text-white w-full">
                      Next Question
                    </Button>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Right Panel - Reference (25%) */}
        <div className="w-[25%] bg-panel-bg flex flex-col">
          <div className="px-4 py-3 border-b border-border-core flex items-center justify-between">
            <h2 className="text-[10px] text-accent-emerald font-mono tracking-widest">REFERENCE</h2>
            <button 
              onClick={() => setShowReference(!showReference)}
              className="text-text-secondary hover:text-white transition-colors p-1"
            >
              {showReference ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {session ? (
              <div className={`transition-all duration-300 ${!showReference ? 'blur-sm opacity-30 select-none' : 'opacity-70'}`}>
                <div className="text-[14px] text-white leading-loose whitespace-pre-wrap font-sans">
                  {session.reference_answer}
                </div>
                <div className="mt-8 pt-4 border-t border-border-core/50 text-[11px] text-text-secondary italic font-serif">
                  Source: Standard Curriculum
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-secondary font-mono text-center mt-10">
                Start a session to see reference material
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </motion.div>
  );
}
