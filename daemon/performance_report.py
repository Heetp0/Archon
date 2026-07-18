import os
import time
from typing import Dict, Any

def generate_html_report(results: Dict[str, Any]) -> str:
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(results["timestamp"]))
    
    # Latency targets table
    targets = {
        "semantic_search": {"name": "Semantic search (LanceDB)", "target": 0.1},
        "chat_latency": {"name": "Chat Response Start (RAG + LLM)", "target": 2.0},
        "dashboard_load": {"name": "Dashboard Load (Analytics Summary)", "target": 2.0},
        "quiz_validation": {"name": "SymPy Math Validation & Grading", "target": 1.0},
        "analytics_aggregation": {"name": "Analytics Aggregation (10k+ attempts)", "target": 2.0}
    }
    
    table_rows = ""
    regression_detected = False
    
    for key, info in targets.items():
        data = results.get(key, {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0})
        p95_sec = data["p95"]
        target_sec = info["target"]
        
        status = "PASSED"
        status_color = "#34d399" # Emerald
        if p95_sec > target_sec:
            status = "FAILED"
            status_color = "#f87171" # Rose
            regression_detected = True
        elif p95_sec > target_sec * 0.9:
            status = "WARNING"
            status_color = "#fbbf24" # Amber
            
        table_rows += f"""
        <tr style="border-bottom: 1px solid #222222;">
            <td style="padding: 12px 16px; color: #ffffff; text-align: left;">{info["name"]}</td>
            <td style="padding: 12px 16px; font-weight: bold; text-align: right;">{target_sec * 1000:.0f} ms</td>
            <td style="padding: 12px 16px; text-align: right;">{data["p50"] * 1000:.1f} ms</td>
            <td style="padding: 12px 16px; font-weight: bold; text-align: right; color: {status_color};">{p95_sec * 1000:.1f} ms</td>
            <td style="padding: 12px 16px; text-align: right;">{data["p99"] * 1000:.1f} ms</td>
            <td style="padding: 12px 16px; text-align: right;">{data["mean"] * 1000:.1f} ms</td>
            <td style="padding: 12px 16px; text-align: right; color: {status_color}; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">{status}</td>
        </tr>
        """
        
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Archon Performance Benchmark Report</title>
    <style>
        body {{
            background-color: #050505;
            color: #a0a0a0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 12px;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        .header {{
            border-bottom: 1px solid #222222;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        h1 {{
            color: #ffffff;
            font-size: 18px;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }}
        .meta {{
            color: #666666;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }}
        th {{
            background-color: #0a0a0a;
            border-bottom: 2px solid #222222;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            padding: 12px 16px;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        th:first-child {{
            text-align: left;
        }}
        .summary {{
            background-color: #0a0a0a;
            border: 1px solid #222222;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .summary-title {{
            font-size: 14px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 4px;
        }}
        .badge {{
            display: inline-block;
            padding: 6px 12px;
            border-radius: 3px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.1em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Archon Latency Benchmark Report</h1>
            <div class="meta">Benchmark Executed: {timestamp_str} | Platform: Oracle VM 2 OCPU ARM</div>
        </div>
        
        <div class="summary">
            <div>
                <div class="summary-title">System status: {"REGRESSION DETECTED" if regression_detected else "ALL LATENCY TARGETS MET"}</div>
                <div style="color: #666666; font-size: 10px;">P95 limits evaluated against baseline requirements</div>
            </div>
            <div class="badge" style="background-color: {'rgba(244,63,94,0.1)' if regression_detected else 'rgba(16,185,129,0.1)'}; color: {'#f43f5e' if regression_detected else '#10b981'}; border: 1px solid {'#f43f5e' if regression_detected else '#10b981'};">
                {"REGRESSION" if regression_detected else "STABLE"}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="text-align: left;">Operation Name</th>
                    <th>Target (P95)</th>
                    <th>P50</th>
                    <th>P95</th>
                    <th>P99</th>
                    <th>Mean</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>
    </div>
</body>
</html>
"""
    
    # Save the report
    DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
    report_path = os.path.join(DAEMON_DIR, "data", "performance_report.html")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    return report_path
