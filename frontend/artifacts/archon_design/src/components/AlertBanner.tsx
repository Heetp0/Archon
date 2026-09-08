import React, { useState, useEffect } from "react";
import { Warning, ShieldWarning, CheckCircle, X } from "@phosphor-icons/react";

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

export function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState(false);

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

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts/recent?limit=5", {
        headers: { Authorization: getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        const unacked = (data || []).filter((a: Alert) => !a.acknowledged);
        setAlerts(unacked);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || alerts.length === 0) return null;

  const topAlert = alerts[0];
  const isCritical = topAlert.severity === "critical";

  return (
    <div
      className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium border-b ${
        isCritical
          ? "bg-rose-950/80 border-rose-800 text-rose-200"
          : "bg-amber-950/80 border-amber-800 text-amber-200"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isCritical ? (
          <ShieldWarning className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
        ) : (
          <Warning className="w-4 h-4 text-amber-400 flex-shrink-0" />
        )}
        <span>
          <strong className="uppercase tracking-wider font-semibold mr-1.5">
            {topAlert.severity} ALERT:
          </strong>
          {topAlert.message} (Value: {topAlert.current_value} / Threshold: {topAlert.threshold})
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] opacity-75 font-mono">
          {new Date(topAlert.timestamp * 1000).toLocaleTimeString()}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
