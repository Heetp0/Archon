import React, { useState, useEffect } from "react";
import { RefreshCw, Activity, Zap, ShieldAlert } from "lucide-react";

interface MetricsData {
  avg_latency_ms: number;
  total_tokens: number;
  cache_hit_rate: number;
  total_requests: number;
  error_rate: number;
}

export default function MetricsPanel() {
  const [period, setPeriod] = useState<"1h" | "1d" | "7d">("1h");
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.fetch(`/api/metrics/summary?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to load metrics`);
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(period);
  }, [period]);

  const handleRefresh = () => {
    fetchMetrics(period);
  };

  const cachePercent = metrics ? Math.round(metrics.cache_hit_rate * 100) : 0;
  const errorPercent = metrics ? Math.round(metrics.error_rate * 100) : 0;

  return (
    <div className="w-full bg-panel-bg/40 border border-border-core rounded-xl p-4 flex flex-col h-full shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-border-core pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-white" />
          <h3 className="text-sm font-mono font-medium text-text-primary tracking-tight">System Performance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg border border-border-core bg-panel-bg text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          title="Refresh Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Period Selection */}
      <div className="flex gap-1.5 mb-4 flex-shrink-0">
        {(["1h", "1d", "7d"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
              period === p
                ? "bg-text-primary text-panel-bg border-text-primary font-medium"
                : "border-border-core text-text-secondary hover:text-text-primary hover:bg-panel-bg"
            }`}
          >
            {p === "1h" ? "Last Hour" : p === "1d" ? "Last 24h" : "Last 7 Days"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-secondary">
            <RefreshCw className="w-6 h-6 animate-spin text-text-primary" />
            <span className="text-xs font-mono">Aggregating telemetry...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-xs font-mono text-red-400">
            {error}
          </div>
        ) : !metrics ? (
          <div className="text-center py-12 text-xs font-mono text-text-secondary">
            No telemetry available.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Avg Latency */}
            <div className="border border-border-core bg-panel-bg/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-text-secondary uppercase">Avg Latency</span>
              <span className="text-base font-mono font-bold text-white mt-1.5">{metrics.avg_latency_ms} ms</span>
            </div>

            {/* Total Requests */}
            <div className="border border-border-core bg-panel-bg/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-text-secondary uppercase">Requests</span>
              <span className="text-base font-mono font-bold text-white mt-1.5">{metrics.total_requests}</span>
            </div>

            {/* Cache Hit Rate */}
            <div className="col-span-2 border border-border-core bg-panel-bg/20 p-3 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-secondary uppercase">Cache Hit Rate</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{cachePercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-border-core/50">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${cachePercent}%` }}
                />
              </div>
            </div>

            {/* Token Count */}
            <div className="border border-border-core bg-panel-bg/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-text-secondary uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" /> Tokens
              </span>
              <span className="text-sm font-mono font-bold text-white mt-1.5">
                {new Intl.NumberFormat().format(metrics.total_tokens)}
              </span>
            </div>

            {/* Error Rate */}
            <div className="border border-border-core bg-panel-bg/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-text-secondary uppercase flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-red-400" /> Error Rate
              </span>
              <span className={`text-sm font-mono font-bold mt-1.5 ${errorPercent > 5 ? "text-red-400 animate-pulse" : "text-white"}`}>
                {errorPercent}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
