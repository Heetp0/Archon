import os
import sqlite3
import time
from datetime import datetime, timedelta
import config

DB_PATH = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), "backend", "metrics.db")
if not os.path.exists(os.path.dirname(DB_PATH)):
    DB_PATH = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), "metrics.db")

def db_path():
    return DB_PATH

def init_db():
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS request_metrics (
            timestamp REAL,
            endpoint TEXT,
            latency_ms REAL,
            tokens_used INTEGER,
            cache_hit INTEGER,
            provider_used TEXT,
            status_code INTEGER
        )
    ''')
    conn.commit()
    conn.close()

def record_metric(endpoint: str, latency_ms: float, tokens_used: int, cache_hit: bool, provider_used: str, status_code: int):
    try:
        init_db()
        conn = sqlite3.connect(db_path())
        c = conn.cursor()
        c.execute('''
            INSERT INTO request_metrics (timestamp, endpoint, latency_ms, tokens_used, cache_hit, provider_used, status_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            time.time(),
            endpoint,
            latency_ms,
            tokens_used,
            1 if cache_hit else 0,
            provider_used or "unknown",
            status_code
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to record metric: {e}")

def get_metrics_summary(period: str = "1h") -> dict:
    try:
        init_db()
        
        now = datetime.utcnow()
        if period == "1d" or period == "24h":
            start_dt = now - timedelta(days=1)
        elif period == "7d":
            start_dt = now - timedelta(days=7)
        elif period == "30d":
            start_dt = now - timedelta(days=30)
        else: # default 1h
            start_dt = now - timedelta(hours=1)
            
        start_time = start_dt.timestamp()
        
        conn = sqlite3.connect(db_path())
        c = conn.cursor()
        
        # Aggregates
        c.execute('''
            SELECT AVG(latency_ms), SUM(tokens_used), SUM(cache_hit), COUNT(*), SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)
            FROM request_metrics
            WHERE timestamp >= ?
        ''', (start_time,))
        row = c.fetchone()
        
        # Provider breakdown
        c.execute('''
            SELECT provider_used, COUNT(*) 
            FROM request_metrics 
            WHERE timestamp >= ? 
            GROUP BY provider_used
        ''', (start_time,))
        provider_rows = c.fetchall()
        
        # Time-series sample (last 10 points)
        c.execute('''
            SELECT timestamp, latency_ms, tokens_used, cache_hit, status_code
            FROM request_metrics
            WHERE timestamp >= ?
            ORDER BY timestamp DESC LIMIT 20
        ''', (start_time,))
        ts_rows = c.fetchall()
        
        conn.close()
        
        providers = {r[0] or "groq": r[1] for r in provider_rows} if provider_rows else {"groq": 0, "gemini": 0, "ollama": 0}
        
        time_series = []
        for r in reversed(ts_rows):
            time_series.append({
                "timestamp": datetime.fromtimestamp(r[0]).strftime("%H:%M:%S"),
                "latency": round(r[1], 1),
                "tokens": r[2],
                "cache_hit": bool(r[3]),
                "status_code": r[4]
            })

        if not row or row[3] == 0:
            return {
                "period": period,
                "avg_latency_ms": 0.0,
                "total_tokens": 0,
                "cache_hit_rate": 0.0,
                "total_requests": 0,
                "error_rate": 0.0,
                "uptime_percent": 100.0,
                "estimated_cost": 0.0,
                "provider_usage": providers,
                "time_series": time_series
            }
            
        avg_latency = float(row[0]) if row[0] is not None else 0.0
        total_tokens = int(row[1]) if row[1] is not None else 0
        cache_hits = int(row[2]) if row[2] is not None else 0
        total_requests = int(row[3]) if row[3] is not None else 0
        errors = int(row[4]) if row[4] is not None else 0
        
        error_rate = round(errors / total_requests, 3)
        uptime = round((1.0 - error_rate) * 100.0, 1)
        est_cost = round(total_tokens * 0.0000005, 4)
        
        return {
            "period": period,
            "avg_latency_ms": round(avg_latency, 2),
            "total_tokens": total_tokens,
            "cache_hit_rate": round(cache_hits / total_requests, 3),
            "total_requests": total_requests,
            "error_rate": error_rate,
            "uptime_percent": uptime,
            "estimated_cost": est_cost,
            "provider_usage": providers,
            "time_series": time_series
        }
    except Exception as e:
        print(f"Failed to get metrics summary: {e}")
        return {
            "period": period,
            "avg_latency_ms": 0.0,
            "total_tokens": 0,
            "cache_hit_rate": 0.0,
            "total_requests": 0,
            "error_rate": 0.0,
            "uptime_percent": 100.0,
            "estimated_cost": 0.0,
            "provider_usage": {"groq": 0},
            "time_series": []
        }
