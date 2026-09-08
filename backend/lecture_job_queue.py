import sqlite3
import os
import time
import uuid
import logging
from typing import Dict, Any, Optional
import config

logger = logging.getLogger("lecture_job_queue")

class LectureJobQueue:
    def __init__(self):
        self.db_path = os.path.join(config.WORKSPACE_ROOT, "lecture_jobs.db")
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lecture_jobs (
                job_id TEXT PRIMARY KEY,
                subject TEXT,
                lecture_num INTEGER,
                status TEXT,
                progress INTEGER,
                current_step TEXT,
                result TEXT,
                obsidian_path TEXT,
                notion_url TEXT,
                error TEXT,
                created_at REAL,
                updated_at REAL
            )
        """)
        # Add notion_url column to existing databases (idempotent migration)
        try:
            cursor.execute("ALTER TABLE lecture_jobs ADD COLUMN notion_url TEXT")
            logger.info("Migrated lecture_jobs: added notion_url column")
        except sqlite3.OperationalError:
            pass  # Column already exists
        conn.commit()
        conn.close()

    def add_job(self, subject: str, lecture_num: int) -> str:
        job_id = str(uuid.uuid4())
        now = time.time()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO lecture_jobs
            (job_id, subject, lecture_num, status, progress, current_step, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (job_id, subject, lecture_num, "queued", 0, "uploading", now, now))
        conn.commit()
        conn.close()
        return job_id

    def update_job(
        self,
        job_id: str,
        status: str,
        progress: int,
        current_step: str,
        result: Optional[str] = None,
        obsidian_path: Optional[str] = None,
        notion_url: Optional[str] = None,
        error: Optional[str] = None,
    ):
        now = time.time()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        update_fields = ["status = ?", "progress = ?", "current_step = ?", "updated_at = ?"]
        params = [status, progress, current_step, now]

        if result is not None:
            update_fields.append("result = ?")
            params.append(result)
        if obsidian_path is not None:
            update_fields.append("obsidian_path = ?")
            params.append(obsidian_path)
        if notion_url is not None:
            update_fields.append("notion_url = ?")
            params.append(notion_url)
        if error is not None:
            update_fields.append("error = ?")
            params.append(error)

        params.append(job_id)
        query = f"UPDATE lecture_jobs SET {', '.join(update_fields)} WHERE job_id = ?"
        cursor.execute(query, tuple(params))
        conn.commit()
        conn.close()

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lecture_jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
