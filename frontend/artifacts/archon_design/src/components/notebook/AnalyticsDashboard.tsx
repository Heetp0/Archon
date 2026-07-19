import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { Trophy, Clock, Lightbulb, BookOpen } from "@phosphor-icons/react";
import { getDaemonConnectionDetails } from "@/lib/storage";

interface AnalyticsDashboardProps {
  notebookId: string;
}

export default function AnalyticsDashboard({ notebookId }: AnalyticsDashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [byTopic, setByTopic] = useState<any[]>([]);
  const [learningCurve, setLearningCurve] = useState<any[]>([]);
  const [srStatus, setSrStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!notebookId) return;

    const fetchData = async () => {
      setLoading(true);
      const host = getDaemonConnectionDetails().httpUrl;
      try {
        const [sumRes, topicRes, curveRes, srRes] = await Promise.all([
          fetch(`${host}/notebooks/${notebookId}/analytics/summary`).then(r => r.json()),
          fetch(`${host}/notebooks/${notebookId}/analytics/by-topic`).then(r => r.json()),
          fetch(`${host}/notebooks/${notebookId}/analytics/learning-curve`).then(r => r.json()),
          fetch(`${host}/notebooks/${notebookId}/analytics/spaced-repetition-status`).then(r => r.json())
        ]);
        setSummary(sumRes);
        setByTopic(topicRes);
        setLearningCurve(curveRes);
        setSrStatus(srRes);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [notebookId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg text-text-secondary">
        <span className="text-sm font-mono uppercase tracking-widest animate-pulse">Loading Analytics...</span>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg p-6 space-y-6 text-text-primary">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Tutor Mode Analytics</h1>
        <p className="text-xs text-text-secondary font-mono uppercase tracking-wider mt-1">
          Handwritten Math Quiz Performance & Spaced Repetition Scheduling
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-panel-bg border border-border-core rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center border border-border-core">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Total Attempts</p>
            <p className="text-lg font-bold mt-0.5">{summary?.total_attempts ?? 0}</p>
          </div>
        </div>

        <div className="bg-panel-bg border border-border-core rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center border border-border-core">
            <Trophy className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Accuracy Rate</p>
            <p className="text-lg font-bold mt-0.5">
              {summary?.overall_accuracy ? `${(summary.overall_accuracy * 100).toFixed(1)}%` : "0.0%"}
            </p>
          </div>
        </div>

        <div className="bg-panel-bg border border-border-core rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center border border-border-core">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Avg Solve Time</p>
            <p className="text-lg font-bold mt-0.5">{formatTime(summary?.avg_time_seconds ?? 0)}</p>
          </div>
        </div>

        <div className="bg-panel-bg border border-border-core rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center border border-border-core">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">Avg Socratic Hints</p>
            <p className="text-lg font-bold mt-0.5">
              {summary?.avg_hints ? `${summary.avg_hints.toFixed(1)}` : "0.0"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-panel-bg border border-border-core rounded-lg p-4 space-y-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-text-secondary">Learning Curve</h2>
            <p className="text-[10px] text-text-secondary">Chronological math attempts vs score</p>
          </div>
          <div className="h-64">
            {learningCurve.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-text-secondary font-mono">
                No attempt history yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={learningCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="attempt_index" stroke="#666" fontSize={10} />
                  <YAxis domain={[0, 1]} stroke="#666" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111111", borderColor: "#222" }}
                    labelStyle={{ color: "#aaa" }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#fff" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-panel-bg border border-border-core rounded-lg p-4 space-y-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-text-secondary">Accuracy by Topic</h2>
            <p className="text-[10px] text-text-secondary">Comparison between algebra, calculus, and integrations</p>
          </div>
          <div className="h-64">
            {byTopic.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-text-secondary font-mono">
                No topic data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTopic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="topic" stroke="#666" fontSize={10} />
                  <YAxis domain={[0, 1]} stroke="#666" fontSize={10} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111111", borderColor: "#222" }}
                    labelFormatter={(label) => `Topic: ${label}`}
                  />
                  <Bar dataKey="accuracy" fill="#fff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-panel-bg border border-border-core rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-secondary">Spaced Repetition Status (SM-2)</h2>
          <p className="text-[10px] text-text-secondary">Review queue metrics based on ease factor decay</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-app-bg/50 border border-border-core/50 rounded p-4 text-center">
            <p className="text-xs text-text-secondary">Due Reviews</p>
            <p className="text-2xl font-bold text-accent-rose mt-1">{srStatus?.due_today ?? 0}</p>
          </div>
          <div className="bg-app-bg/50 border border-border-core/50 rounded p-4 text-center">
            <p className="text-xs text-text-secondary">Struggling Equations</p>
            <p className="text-2xl font-bold text-white mt-1">{srStatus?.struggling_count ?? 0}</p>
          </div>
          <div className="bg-app-bg/50 border border-border-core/50 rounded p-4 text-center">
            <p className="text-xs text-text-secondary">Mastered Equations</p>
            <p className="text-2xl font-bold text-accent-green mt-1">{srStatus?.mastered_count ?? 0}</p>
          </div>
        </div>

        {srStatus?.struggling_questions && srStatus.struggling_questions.length > 0 && (
          <div className="border border-border-core rounded overflow-hidden mt-4">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111] text-[10px] font-mono uppercase tracking-wider text-text-secondary border-b border-border-core">
                <tr>
                  <th className="p-3">Struggling Equation</th>
                  <th className="p-3 text-center">Ease Factor</th>
                  <th className="p-3 text-center">Repetitions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-core">
                {srStatus.struggling_questions.map((q: any) => (
                  <tr key={q.question_id} className="hover:bg-[#111111]/30">
                    <td className="p-3 font-mono">{q.question_text}</td>
                    <td className="p-3 text-center font-bold text-accent-rose">{q.ease.toFixed(2)}</td>
                    <td className="p-3 text-center">{q.repetitions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
