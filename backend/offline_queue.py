import os
import sqlite3
from datetime import datetime
import json
import config

DB_PATH = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), "offline_queue.db")

def db_path():
    return DB_PATH

def initialize_db(path):
    conn = sqlite3.connect(path)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS offline_requests
                 (id TEXT PRIMARY KEY,
                  endpoint TEXT,
                  method TEXT,
                  payload TEXT,
                  user_id TEXT,
                  timestamp REAL,
                  status TEXT,
                  retry_count INTEGER DEFAULT 0,
                  created_at TEXT,
                  synced_at TEXT NULL)''')
    conn.commit()
    conn.close()

def add_to_queue(req_id: str, endpoint: str, method: str, payload: dict, user_id: str):
    initialize_db(db_path())
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    timestamp = datetime.utcnow().timestamp()
    c.execute('''INSERT OR REPLACE INTO offline_requests
                 (id, endpoint, method, payload, user_id, timestamp, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)''',
               (req_id, endpoint, method, json.dumps(payload), user_id, timestamp, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {'status': 'success', 'id': req_id}

def get_user_queue(user_id: str):
    initialize_db(db_path())
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    c.execute('''SELECT id, endpoint, method, payload, user_id, timestamp, status, retry_count, created_at, synced_at
                 FROM offline_requests
                 WHERE user_id = ? ORDER BY timestamp ASC''', (user_id,))
    rows = c.fetchall()
    conn.close()
    
    queue = []
    for row in rows:
        try:
            p = json.loads(row[3])
        except Exception:
            p = {}
        queue.append({
            'id': row[0],
            'endpoint': row[1],
            'method': row[2],
            'payload': p,
            'user_id': row[4],
            'timestamp': row[5],
            'status': row[6],
            'retry_count': row[7],
            'created_at': row[8],
            'synced_at': row[9]
        })
    return queue

def delete_from_queue(req_id: str):
    initialize_db(db_path())
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    c.execute('DELETE FROM offline_requests WHERE id = ?', (req_id,))
    conn.commit()
    conn.close()

def mark_as_failed(req_id: str):
    initialize_db(db_path())
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    c.execute('''UPDATE offline_requests
                 SET status = 'failed', synced_at = NULL
                 WHERE id = ?''', (req_id,))
    conn.commit()
    conn.close()

def increment_retry(req_id: str) -> int:
    initialize_db(db_path())
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    c.execute('''UPDATE offline_requests
                 SET retry_count = retry_count + 1
                 WHERE id = ?''', (req_id,))
    conn.commit()
    c.execute('SELECT retry_count FROM offline_requests WHERE id = ?', (req_id,))
    result = c.fetchone()
    conn.close()
    return result[0] if result else 0

async def process_sync(req_id: str, app_client) -> bool:
    initialize_db(db_path())
    conn = sqlite3.connect(db_path())
    c = conn.cursor()
    c.execute('SELECT id, endpoint, method, payload, retry_count FROM offline_requests WHERE id = ?', (req_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return False
    
    req_id = row[0]
    endpoint = row[1]
    method = row[2]
    payload = json.loads(row[3])
    retry_count = row[4]
    
    try:
        kwargs = {}
        if method.upper() in ("POST", "PUT"):
            kwargs["json"] = payload
        
        response = await app_client.request(method, endpoint, **kwargs)
        if response.status_code in (200, 201, 202):
            c.execute('''UPDATE offline_requests
                         SET status = 'synced', synced_at = ?
                         WHERE id = ?''', (datetime.utcnow().isoformat(), req_id))
            conn.commit()
            conn.close()
            return True
        else:
            raise Exception(f"HTTP status code {response.status_code}")
    except Exception as e:
        new_retries = retry_count + 1
        new_status = 'failed' if new_retries >= 3 else 'queued'
        c.execute('''UPDATE offline_requests
                     SET retry_count = ?, status = ?
                     WHERE id = ?''', (new_retries, new_status, req_id))
        conn.commit()
    finally:
        conn.close()
    return False
