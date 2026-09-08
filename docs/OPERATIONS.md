# Archon Operations & Runbook Manual

Operational guidelines for monitoring, database backups, log rotation, and recovery.

---

## 1. System Monitoring & Metrics

- Access visual telemetry in the UI at the **Monitoring & Telemetry** tab (`/monitoring`).
- Metrics Summary API:
  ```http
  GET /api/metrics/summary?period=24h
  ```
- Recent Alerts API:
  ```http
  GET /api/alerts/recent
  POST /api/alerts/acknowledge/{alert_id}
  ```

---

## 2. Database Maintenance & Backups

LanceDB backups are automated via `scripts/backup_database.py`:
```bash
python scripts/backup_database.py
```
- Daily backups stored in `./backups/archon_db_YYYYMMDD_HHMMSS.tar.gz`
- Automatically keeps the 30 most recent backups.

---

## 3. Automated Maintenance Jobs (Crontab)

Install cron jobs on Linux/macOS server:
```bash
crontab crontab.txt
```

Schedule:
- **1:00 AM Daily**: Log archival (`archive_old_logs.py`)
- **2:00 AM Daily**: Cache cleanup (`cleanup_expired_cache.py`)
- **3:00 AM Daily**: Database backup (`backup_database.py`)
- **4:00 AM Sunday**: Prune 90-day metrics (`cleanup_old_metrics.py`)
- **5:00 AM Daily**: Clean failed offline queue (`cleanup_offline_queue.py`)
