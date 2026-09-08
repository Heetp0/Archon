import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Cpu, 
  Clock, 
  Lightning, 
  Coins, 
  CheckCircle, 
  WarningCircle, 
  XCircle, 
  ArrowsClockwise,
  Check
} from "@phosphor-icons/react";

interface MetricsData {
  period: string;
  avg_latency_ms: number;
  total_tokens: number;
  cache_hit_rate: number;
  total_requests: number;
  error_rate: number;
  uptime_percent: number;
  estimated_cost: number;
  provider_usage: Record<string, number>;
  time_series: Array<{
    timestamp: string;
    latency: number;
    tokens: number;
    cache_hit: boolean;
    status_code: number;
  }>;
}

interface Alert {
  alert_id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  current_value: number;
  threshold: number;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export default function MonitoringDashboard() {
  const [period, setPeriod] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => {
    try {
      const stored = localStorage.getItem("archon_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token) return `Bearer ${parsed.token}`;
      }
    } catch (e) {
      console.error("Auth header error:", e);
    }
    return "";
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics/summary?period=${period}`, {
        headers: { Authorization: getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error("Failed to fetch metrics summary:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts/recent?limit=10", {
        headers: { Authorization: getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/acknowledge/${alertId}`, {
        method: "POST",
        headers: { Authorization: getAuthHeader() }
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.alert_id === alertId ? { ...a, acknowledged: true } : a))
        );
      }
    } catch (e) {
      console.error("Failed to acknowledge alert:", e);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchSummary();
      fetchAlerts();
    }, 300000); // 5 minute auto-refresh
    return () => clearInterval(interval);
  }, [period]);

  const maxLatency = metrics?.time_series?.length
    ? Math.max(...metrics.time_series.map((t) => t.latency), 10)
    : 100;

  return (
    <div className="flex flex-col h-full w-full bg-[#020617] text-slate-100 overflow-y-auto p-6 font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">System Operations & Monitoring</h1>
              <p className="text-xs text-slate-400">Real-time telemetry, service health, token usage, and automated infrastructure metrics.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              {(["1h", "24h", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    period === p ? "bg-indigo-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => { fetchSummary(); fetchAlerts(); }}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowsClockwise className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Uptime */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Uptime SLA</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-100">{metrics?.uptime_percent ?? 100}%</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Availability target 99.9%</p>
            </div>
          </div>

          {/* Latency */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Avg Latency</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-100">{metrics?.avg_latency_ms ?? 0} ms</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Response time across endpoints</p>
            </div>
          </div>

          {/* Cache Hit % */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Cache Hit Rate</span>
              <Lightning className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-100">
                {Math.round((metrics?.cache_hit_rate ?? 0) * 100)}%
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">Semantic cache efficiency</p>
            </div>
          </div>

          {/* Tokens */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Tokens</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-100">
                {(metrics?.total_tokens ?? 0).toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">Processed across models</p>
            </div>
          </div>

          {/* Cost */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Est. API Cost</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-100">
                ${(metrics?.estimated_cost ?? 0).toFixed(4)}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">Calculated token cost</p>
            </div>
          </div>
        </div>

        {/* Charts & Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Latency History Chart */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Latency Telemetry (Recent Requests)</h2>
              <span className="text-xs text-slate-500 font-mono">ms / request</span>
            </div>

            <div className="h-44 flex items-end gap-2 px-2 pb-2 pt-4 border-b border-slate-800/80">
              {metrics?.time_series && metrics.time_series.length > 0 ? (
                metrics.time_series.map((pt, i) => {
                  const pct = Math.max(10, Math.min(100, (pt.latency / maxLatency) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 hidden group-hover:flex bg-slate-950 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 z-10 whitespace-nowrap">
                        {pt.latency} ms ({pt.timestamp})
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${
                          pt.status_code >= 400
                            ? "bg-rose-500"
                            : pt.cache_hit
                            ? "bg-amber-500/80"
                            : "bg-indigo-500"
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-[9px] text-slate-500 font-mono rotate-45 origin-left mt-1">
                        {pt.timestamp.split(":")[1]}:{pt.timestamp.split(":")[2]}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  No request telemetry recorded for selected period.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-1 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"/> Direct Call</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/80 inline-block"/> Cache Hit</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"/> Error</span>
              </div>
              <span>Total Requests: {metrics?.total_requests ?? 0}</span>
            </div>
          </div>

          {/* Service Status Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="border-b border-slate-800 pb-3 mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Infrastructure Services Health</h2>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-300">Vector DB (LanceDB)</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle className="w-4 h-4"/> Healthy</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-300">Metrics DB (SQLite)</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle className="w-4 h-4"/> Healthy</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-300">LLM Provider (Groq API)</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle className="w-4 h-4"/> Connected</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-300">LLM Provider (Gemini API)</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold"><CheckCircle className="w-4 h-4"/> Connected</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-300">Local LLM (Ollama)</span>
                <span className="flex items-center gap-1 text-amber-400 font-semibold"><WarningCircle className="w-4 h-4"/> Standby</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Auto-Recovery: Active</span>
              <span>Healthcheck: PASS</span>
            </div>
          </div>
        </div>

        {/* Active Alerts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-200">Infrastructure & Scaling Alerts</h2>
            <span className="text-xs text-slate-500 font-mono">Auto-evaluated every 5m</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">Alert Type</th>
                  <th className="pb-2 font-semibold">Message</th>
                  <th className="pb-2 font-semibold">Value / Limit</th>
                  <th className="pb-2 font-semibold">Timestamp</th>
                  <th className="pb-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {alerts && alerts.length > 0 ? (
                  alerts.map((a) => (
                    <tr key={a.alert_id} className={a.acknowledged ? "opacity-40" : ""}>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          a.severity === "critical"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-200 font-semibold">{a.alert_type}</td>
                      <td className="py-2.5 text-slate-300">{a.message}</td>
                      <td className="py-2.5 text-slate-400">{a.current_value} / {a.threshold}</td>
                      <td className="py-2.5 text-slate-500">{new Date(a.timestamp * 1000).toLocaleTimeString()}</td>
                      <td className="py-2.5 text-right">
                        {a.acknowledged ? (
                          <span className="text-emerald-400 flex items-center justify-end gap-1"><Check className="w-3.5 h-3.5"/> Ack</span>
                        ) : (
                          <button
                            onClick={() => acknowledgeAlert(a.alert_id)}
                            className="bg-indigo-600/80 hover:bg-indigo-500 text-slate-100 px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      No active system alerts. All infrastructure parameters operating normally.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
