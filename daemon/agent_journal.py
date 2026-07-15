import sqlite3
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any, List

class AgentJournal:
    def __init__(self, db_dir: str):
        self.db_path = os.path.join(db_dir, "agent_journal.db")
        os.makedirs(db_dir, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.execute('PRAGMA journal_mode=WAL')
        self._conn.execute('PRAGMA foreign_keys = ON')
        self._init_db()

    def _get_conn(self):
        return self._conn

    def _init_db(self):
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_runs (
                task_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_steps (
                task_id TEXT,
                step_index INTEGER,
                agent_name TEXT NOT NULL,
                node_name TEXT NOT NULL,
                input_payload TEXT,
                output_payload TEXT,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                PRIMARY KEY (task_id, step_index),
                FOREIGN KEY (task_id) REFERENCES agent_runs(task_id) ON DELETE CASCADE
            )
        """)
        conn.commit()

    def start_run(self, task_id: str):
        now = datetime.utcnow().isoformat()
        conn = self._get_conn()
        conn.execute("""
            INSERT OR REPLACE INTO agent_runs (task_id, status, started_at, updated_at)
            VALUES (?, 'running', ?, ?)
        """, (task_id, now, now))
        conn.commit()

    def log_step(self, task_id: str, step_index: int, agent_name: str, node_name: str, 
                 input_payload: Any, output_payload: Any, status: str = "completed"):
        now = datetime.utcnow().isoformat()
        input_str = json.dumps(input_payload) if input_payload is not None else None
        output_str = json.dumps(output_payload) if output_payload is not None else None
        
        conn = self._get_conn()
        conn.execute("""
            INSERT OR REPLACE INTO agent_steps 
            (task_id, step_index, agent_name, node_name, input_payload, output_payload, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (task_id, step_index, agent_name, node_name, input_str, output_str, status, now))
        conn.execute("""
            UPDATE agent_runs SET updated_at = ? WHERE task_id = ?
        """, (now, task_id))
        conn.commit()

    def complete_run(self, task_id: str, status: str = "completed"):
        now = datetime.utcnow().isoformat()
        conn = self._get_conn()
        conn.execute("""
            UPDATE agent_runs SET status = ?, updated_at = ? WHERE task_id = ?
        """, (status, now, task_id))
        conn.commit()

    def get_last_checkpoint(self, task_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT step_index, agent_name, node_name, input_payload, output_payload, status, timestamp
            FROM agent_steps
            WHERE task_id = ?
            ORDER BY step_index DESC
            LIMIT 1
        """, (task_id,))
        row = cursor.fetchone()
        if row:
            return {
                "step_index": row[0],
                "agent_name": row[1],
                "node_name": row[2],
                "input_payload": json.loads(row[3]) if row[3] else None,
                "output_payload": json.loads(row[4]) if row[4] else None,
                "status": row[5],
                "timestamp": row[6]
            }
        return None

    def get_all_steps(self, task_id: str) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT step_index, agent_name, node_name, input_payload, output_payload, status, timestamp
            FROM agent_steps
            WHERE task_id = ?
            ORDER BY step_index ASC
        """, (task_id,))
        rows = cursor.fetchall()
        return [
            {
                "step_index": row[0],
                "agent_name": row[1],
                "node_name": row[2],
                "input_payload": json.loads(row[3]) if row[3] else None,
                "output_payload": json.loads(row[4]) if row[4] else None,
                "status": row[5],
                "timestamp": row[6]
            }
            for row in rows
        ]

    def close(self):
        if hasattr(self, "_conn"):
            self._conn.close()
