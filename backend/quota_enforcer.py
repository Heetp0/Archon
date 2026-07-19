import logging
import lancedb
from fastapi import HTTPException, status
from typing import Dict, Any

logger = logging.getLogger("quota_enforcer")

class QuotaExceededException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Quota exceeded: {detail}"
        )

# Quota configurations per user role
ROLE_QUOTAS = {
    "student": {
        "max_notebooks": 10,
        "max_questions": 100,
        "max_ocr_jobs_per_month": 500
    },
    "teacher": {
        "max_notebooks": 50,
        "max_questions": 1000,
        "max_ocr_jobs_per_month": 5000
    },
    "admin": {
        "max_notebooks": 999999,
        "max_questions": 999999,
        "max_ocr_jobs_per_month": 999999
    }
}

def check_notebook_quota(db_conn: lancedb.db.LanceDBConnection, user_id: str, user_role: str) -> None:
    try:
        quota = ROLE_QUOTAS.get(user_role, ROLE_QUOTAS["student"])
        table = db_conn.open_table("notebooks")
        current_count = len(table.search().where(f"user_id = '{user_id}'").to_list())
        
        if current_count >= quota["max_notebooks"]:
            logger.warning(f"User {user_id} notebook quota reached: {current_count}/{quota['max_notebooks']}")
            raise QuotaExceededException(f"Maximum of {quota['max_notebooks']} notebooks reached.")
    except QuotaExceededException as qe:
        raise qe
    except Exception as e:
        # If notebooks table doesn't exist, we haven't reached limits yet
        logger.debug(f"Quota check skipped or failed: {e}")

def check_questions_quota(db_conn: lancedb.db.LanceDBConnection, user_id: str, user_role: str) -> None:
    try:
        quota = ROLE_QUOTAS.get(user_role, ROLE_QUOTAS["student"])
        table = db_conn.open_table("quiz_questions")
        current_count = len(table.search().where(f"user_id = '{user_id}'").to_list())
        
        if current_count >= quota["max_questions"]:
            logger.warning(f"User {user_id} questions quota reached: {current_count}/{quota['max_questions']}")
            raise QuotaExceededException(f"Maximum of {quota['max_questions']} quiz questions reached.")
    except QuotaExceededException as qe:
        raise qe
    except Exception as e:
        logger.debug(f"Quota check skipped or failed: {e}")

def check_ocr_quota(db_conn: lancedb.db.LanceDBConnection, user_id: str, user_role: str) -> None:
    # OCR limits per month: checks count in ocr_jobs for current month
    try:
        import time
        quota = ROLE_QUOTAS.get(user_role, ROLE_QUOTAS["student"])
        table = db_conn.open_table("ocr_jobs")
        
        # Beginning of current month
        from datetime import datetime
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1).timestamp()
        
        current_count = len(table.search().where(
            f"user_id = '{user_id}' AND timestamp_created >= {start_of_month}"
        ).to_list())
        
        if current_count >= quota["max_ocr_jobs_per_month"]:
            logger.warning(f"User {user_id} OCR jobs monthly quota reached: {current_count}/{quota['max_ocr_jobs_per_month']}")
            raise QuotaExceededException(f"Monthly limit of {quota['max_ocr_jobs_per_month']} OCR jobs reached.")
    except QuotaExceededException as qe:
        raise qe
    except Exception as e:
        logger.debug(f"Quota check skipped or failed: {e}")
