import os
import time
import sqlite3
import uuid
from typing import List, Dict, Any

import config

DB_PATH = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), "backend", "metrics.db")
if not os.path.exists(os.path.dirname(DB_PATH)):
    DB_PATH = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), "metrics.db")

THRESHOLDS = {
    "cpu_percent": float(os.getenv("ALERT_CPU_THRESHOLD", 80.0)),
    "memory_percent": float(os.getenv("ALERT_MEM_THRESHOLD", 85.0)),
    "daily_cost_usd": float(os.getenv("ALERT_COST_THRESHOLD", 5.0)),
    "daily_tokens": int(os.getenv("ALERT_TOKENS_THRESHOLD", 500000)),
}

def init_alerts_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS scaling_alerts (
            alert_id TEXT PRIMARY KEY,
            alert_type TEXT,
            severity TEXT,
            current_value REAL,
            threshold REAL,
            message TEXT,
            timestamp REAL,
            acknowledged INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def check_resources() -> List[Dict[str, Any]]:
    init_alerts_db()
    alerts = []
    
    # 1. CPU & Memory Check
    cpu_percent = 0.0
    mem_percent = 0.0
    try:
        import psutil
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem_percent = psutil.virtual_memory().percent
    except Exception:
        # Fallback simulation/check if psutil missing
        cpu_percent = 15.0
        mem_percent = 40.0
        
    now = time.time()
    
    if cpu_percent > THRESHOLDS["cpu_percent"]:
        alerts.append({
            "alert_id": str(uuid.uuid4()),
            "alert_type": "cpu_high",
            "severity": "critical" if cpu_percent > 90 else "warning",
            "current_value": round(cpu_percent, 1),
            "threshold": THRESHOLDS["cpu_percent"],
            "message": f"High CPU utilization detected: {round(cpu_percent, 1)}%",
            "timestamp": now,
            "acknowledged": 0
        })

    if mem_percent > THRESHOLDS["memory_percent"]:
        alerts.append({
            "alert_id": str(uuid.uuid4()),
            "alert_type": "memory_high",
            "severity": "critical" if mem_percent > 92 else "warning",
            "current_value": round(mem_percent, 1),
            "threshold": THRESHOLDS["memory_percent"],
            "message": f"High RAM usage detected: {round(mem_percent, 1)}%",
            "timestamp": now,
            "acknowledged": 0
        })

    # Save alerts to database if any
    if alerts:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        for a in alerts:
            c.execute('''
                INSERT INTO scaling_alerts 
                (alert_id, alert_type, severity, current_value, threshold, message, timestamp, acknowledged)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                a["alert_id"], a["alert_type"], a["severity"],
                a["current_value"], a["threshold"], a["message"],
                a["timestamp"], a["acknowledged"]
            ))
        conn.commit()
        conn.close()

    return alerts

def get_recent_alerts(limit: int = 10) -> List[Dict[str, Any]]:
    init_alerts_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('''
        SELECT * FROM scaling_alerts ORDER BY timestamp DESC LIMIT ?
    ''', (limit,))
    rows = c.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        d = dict(r)
        d["acknowledged"] = bool(d["acknowledged"])
        result.append(d)
    return result

def acknowledge_alert(alert_id: str) -> bool:
    init_alerts_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE scaling_alerts SET acknowledged = 1 WHERE alert_id = ?", (alert_id,))
    affected = c.rowcount
    conn.commit()
    conn.close()
    return affected > 0
