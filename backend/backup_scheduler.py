import os
import shutil
import time
import tarfile
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("backup_scheduler")

def backup_lancedb(db_path: str, backup_dir: str, s3_bucket: Optional[str] = None) -> Optional[str]:
    """
    Creates a compressed snapshot of the LanceDB folder.
    Retains last 7 local backups. Optionally uploads to AWS S3.
    """
    try:
        if not os.path.exists(db_path):
            logger.error(f"LanceDB database directory {db_path} does not exist. Skipping backup.")
            return None

        os.makedirs(backup_dir, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y_%m_%d_%H%M%S")
        backup_filename = f"lancedb_snapshot_{timestamp}.tar.gz"
        backup_path = os.path.join(backup_dir, backup_filename)

        logger.info(f"Creating local backup tarball at {backup_path}...")
        with tarfile.open(backup_path, "w:gz") as tar:
            tar.add(db_path, arcname=os.path.basename(db_path))
        
        logger.info(f"Local backup created successfully: {os.path.getsize(backup_path)} bytes.")

        # Cleanup local backups keeping only the last 7
        cleanup_old_backups(backup_dir, keep_count=7)

        # Optional cloud upload to S3 if bucket is configured
        if s3_bucket:
            upload_to_s3(backup_path, backup_filename, s3_bucket)

        return backup_path
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return None

def cleanup_old_backups(backup_dir: str, keep_count: int = 7) -> None:
    try:
        files = [os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.endswith(".tar.gz")]
        # Sort by modification time (oldest first)
        files.sort(key=os.path.getmtime)
        if len(files) > keep_count:
            files_to_delete = files[:-keep_count]
            for f in files_to_delete:
                os.remove(f)
                logger.info(f"Removed old backup: {os.path.basename(f)}")
    except Exception as e:
        logger.warning(f"Failed to cleanup old backups: {e}")

def upload_to_s3(file_path: str, s3_key: str, bucket_name: str) -> bool:
    try:
        import boto3
        from botocore.exceptions import NoCredentialsError
        
        # Verify credentials exist in environment
        if not os.environ.get("AWS_ACCESS_KEY_ID") or not os.environ.get("AWS_SECRET_ACCESS_KEY"):
            logger.warning("AWS credentials not set in environment. Skipping S3 upload.")
            return False

        logger.info(f"Uploading {file_path} to S3 bucket '{bucket_name}' key '{s3_key}'...")
        s3 = boto3.client('s3')
        s3.upload_file(file_path, bucket_name, s3_key)
        logger.info("S3 upload completed successfully.")
        return True
    except ImportError:
        logger.warning("boto3 library not installed. Skipping S3 upload.")
    except NoCredentialsError:
        logger.warning("No AWS credentials found. Skipping S3 upload.")
    except Exception as e:
        logger.error(f"S3 upload failed: {e}")
    return False

if __name__ == "__main__":
    # Setup simple logging to test run
    logging.basicConfig(level=logging.INFO)
    DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
    WORKSPACE_ROOT = os.path.dirname(DAEMON_DIR)
    db_path = os.path.join(WORKSPACE_ROOT, ".lancedb")
    backup_dir = os.path.join(DAEMON_DIR, "data", "backups")
    s3_bucket = os.environ.get("AWS_S3_BUCKET")
    backup_lancedb(db_path, backup_dir, s3_bucket)
