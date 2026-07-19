import os
import uuid
import time
import json
import asyncio
import logging
from typing import Dict, Any, Callable, List
import pyarrow as pa
import lancedb

from ocr_fallback_manager import OcrFallbackManager
from obsidian_exporter import ObsidianExporter

logger = logging.getLogger(__name__)

class OcrJobManager:
    def __init__(self, broadcast_callback: Callable[[str, Any], Any] = None, retriever: Any = None):
        self.queue = asyncio.Queue()
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.broadcast_callback = broadcast_callback
        self.retriever = retriever
        self.fallback_manager = OcrFallbackManager()
        self.workers: List[asyncio.Task] = []
        self._shutdown = False
        
        # Check that retriever tables for OCR exist
        self._init_db_tables()

    def _init_db_tables(self):
        if self.retriever is None or self.retriever.db is None:
            return
        
        # 1. ocr_jobs table
        ocr_jobs_schema = pa.schema([
            pa.field("job_id", pa.string()),
            pa.field("notebook_id", pa.string()),
            pa.field("page_id", pa.string()),
            pa.field("status", pa.string()),
            pa.field("progress", pa.int32()),
            pa.field("result_json", pa.string(), nullable=True),
            pa.field("created_at", pa.float64()),
            pa.field("started_at", pa.float64(), nullable=True),
            pa.field("completed_at", pa.float64(), nullable=True),
            pa.field("error_message", pa.string(), nullable=True)
        ])
        self.ocr_jobs_table = self.retriever.db.create_table("ocr_jobs", schema=ocr_jobs_schema, exist_ok=True)

        # 2. ocr_metadata table
        ocr_metadata_schema = pa.schema([
            pa.field("notebook_id", pa.string()),
            pa.field("page_id", pa.string()),
            pa.field("recognized_text", pa.string()),
            pa.field("ocr_metadata", pa.string())
        ])
        self.ocr_metadata_table = self.retriever.db.create_table("ocr_metadata", schema=ocr_metadata_schema, exist_ok=True)

        # 3. ocr_corrections table
        ocr_corrections_schema = pa.schema([
            pa.field("correction_id", pa.string()),
            pa.field("page_id", pa.string()),
            pa.field("original_token", pa.string()),
            pa.field("corrected_token", pa.string()),
            pa.field("confidence", pa.float32()),
            pa.field("timestamp", pa.float64())
        ])
        self.ocr_corrections_table = self.retriever.db.create_table("ocr_corrections", schema=ocr_corrections_schema, exist_ok=True)

    def start_workers(self):
        self._shutdown = False
        self.workers = [
            asyncio.create_task(self._worker_loop())
            for _ in range(2)
        ]
        logger.info("OcrJobManager workers started with concurrency limit of 2.")

    async def stop_workers(self):
        self._shutdown = True
        for _ in range(len(self.workers)):
            try:
                await self.queue.put(None)
            except Exception:
                pass
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers = []
        logger.info("OcrJobManager workers stopped.")

    async def add_job(self, notebook_id: str, page_id: str, mode: str = "text") -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "job_id": job_id,
            "notebook_id": notebook_id,
            "page_id": page_id,
            "mode": mode,
            "status": "queued",
            "progress": 0,
            "result": None,
            "error": None,
            "created_at": time.time(),
            "started_at": None,
            "completed_at": None
        }
        
        # Save to DB
        if self.retriever is not None:
            self.ocr_jobs_table.add([{
                "job_id": job_id,
                "notebook_id": notebook_id,
                "page_id": page_id,
                "status": "queued",
                "progress": 0,
                "result_json": None,
                "created_at": self.jobs[job_id]["created_at"],
                "started_at": None,
                "completed_at": None,
                "error_message": None
            }])

        await self.queue.put(job_id)
        await self._broadcast_status(job_id)
        return job_id

    def get_status(self, job_id: str) -> dict:
        # Check in memory first
        if job_id in self.jobs:
            return self.jobs[job_id]
            
        # Check in DB
        if self.retriever is not None:
            try:
                res = self.ocr_jobs_table.search().where(f"job_id = '{job_id}'").to_list()
                if res:
                    row = res[0]
                    return {
                        "job_id": row["job_id"],
                        "notebook_id": row["notebook_id"],
                        "page_id": row["page_id"],
                        "status": row["status"],
                        "progress": row["progress"],
                        "result": json.loads(row["result_json"]) if row["result_json"] else None,
                        "error": row["error_message"],
                        "created_at": row["created_at"],
                        "started_at": row["started_at"],
                        "completed_at": row["completed_at"]
                    }
            except Exception as e:
                logger.error(f"Error querying job status from DB: {e}")
        return None

    async def _broadcast_status(self, job_id: str):
        if self.broadcast_callback:
            job_data = self.get_status(job_id)
            if job_data:
                payload = {
                    "job_id": job_id,
                    "notebook_id": job_data["notebook_id"],
                    "page_id": job_data.get("page_id"),
                    "status": job_data["status"],
                    "progress": job_data["progress"],
                    "result": job_data["result"],
                    "error": job_data["error"]
                }
                try:
                    if asyncio.iscoroutinefunction(self.broadcast_callback):
                        await self.broadcast_callback("job_progress", payload)
                    else:
                        self.broadcast_callback("job_progress", payload)
                except Exception as e:
                    logger.error(f"Failed to broadcast OCR job progress: {e}")

    async def _worker_loop(self):
        while not self._shutdown:
            try:
                job_id = await self.queue.get()
                if job_id is None:
                    self.queue.task_done()
                    break
            except asyncio.CancelledError:
                break
            
            try:
                await self._process_job(job_id)
            except Exception as e:
                logger.exception(f"Error processing OCR job {job_id}: {e}")
            finally:
                self.queue.task_done()

    async def _process_job(self, job_id: str):
        job = self.jobs.get(job_id)
        if not job:
            return
            
        started_at = time.time()
        job["status"] = "processing"
        job["started_at"] = started_at
        job["progress"] = 10
        
        if self.retriever is not None:
            try:
                self.ocr_jobs_table.update(
                    where=f"job_id = '{job_id}'",
                    values={"status": "processing", "started_at": started_at, "progress": 10}
                )
            except Exception as e:
                logger.error(f"Failed to update job status in DB: {e}")
                
        await self._broadcast_status(job_id)

        notebook_id = job["notebook_id"]
        page_id = job["page_id"]
        mode = job["mode"]

        # 1. Read binary strokes file
        import glob
        DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
        strokes_dir = os.path.join(DAEMON_DIR, 'data', 'strokes')
        matched_files = glob.glob(os.path.join(strokes_dir, "**", f"{page_id}.bin"), recursive=True)
        strokes_file = matched_files[0] if matched_files else os.path.join(strokes_dir, f"{page_id}.bin")
        
        if not os.path.exists(strokes_file):
            err_msg = f"Strokes file not found for page {page_id} at {strokes_file}"
            logger.error(err_msg)
            await self._fail_job(job_id, err_msg)
            return

        try:
            with open(strokes_file, 'rb') as f:
                binary_data = f.read()
        except Exception as e:
            await self._fail_job(job_id, f"Failed to read binary file: {e}")
            return

        job["progress"] = 30
        await self._broadcast_status(job_id)

        # 2. Run OCR Fallback Manager
        try:
            ocr_result = await asyncio.to_thread(self.fallback_manager.recognize, binary_data, mode)
            recognized_text = ocr_result.get("text", "")
        except Exception as e:
            await self._fail_job(job_id, f"OCR recognition failed: {e}")
            return

        job["progress"] = 60
        await self._broadcast_status(job_id)

        # 3. Index text in LanceDB RAG (retriever)
        if self.retriever is not None and recognized_text.strip():
            try:
                parsed_content = {
                    "text": recognized_text,
                    "page_id": page_id
                }
                await self.retriever.index_source(
                    notebook_id=notebook_id,
                    source_id=f"page_{page_id}",
                    source_type="ocr",
                    parsed_content=parsed_content
                )
            except Exception as e:
                logger.error(f"Failed to index recognized text in RAG retriever: {e}")

        # 4. Save metadata to ocr_metadata table
        if self.retriever is not None:
            try:
                # Remove existing metadata for page_id to keep it incremental
                escaped_nb_id = notebook_id.replace("'", "''")
                escaped_page_id = page_id.replace("'", "''")
                try:
                    self.ocr_metadata_table.delete(
                        f"notebook_id = '{escaped_nb_id}' AND page_id = '{escaped_page_id}'"
                    )
                except Exception:
                    pass
                    
                self.ocr_metadata_table.add([{
                    "notebook_id": notebook_id,
                    "page_id": page_id,
                    "recognized_text": recognized_text,
                    "ocr_metadata": json.dumps(ocr_result)
                }])
            except Exception as e:
                logger.error(f"Failed to write OCR metadata to LanceDB: {e}")

        job["progress"] = 80
        await self._broadcast_status(job_id)

        # 5. Export to Obsidian Vault
        try:
            exporter = ObsidianExporter()
            await asyncio.to_thread(exporter.export_page, notebook_id, page_id, recognized_text, ocr_result, binary_data)
        except Exception as e:
            logger.error(f"Obsidian export failed: {e}")

        # 6. Finalize Job
        completed_at = time.time()
        job["status"] = "completed"
        job["progress"] = 100
        job["result"] = ocr_result
        job["completed_at"] = completed_at

        if self.retriever is not None:
            try:
                self.ocr_jobs_table.update(
                    where=f"job_id = '{job_id}'",
                    values={
                        "status": "completed",
                        "progress": 100,
                        "result_json": json.dumps(ocr_result),
                        "completed_at": completed_at
                    }
                )
            except Exception as e:
                logger.error(f"Failed to finalize job status in DB: {e}")

        await self._broadcast_status(job_id)

    async def _fail_job(self, job_id: str, error_message: str):
        job = self.jobs.get(job_id)
        if not job:
            return
            
        completed_at = time.time()
        job["status"] = "failed"
        job["progress"] = 100
        job["error"] = error_message
        job["completed_at"] = completed_at
        
        if self.retriever is not None:
            try:
                self.ocr_jobs_table.update(
                    where=f"job_id = '{job_id}'",
                    values={
                        "status": "failed",
                        "progress": 100,
                        "error_message": error_message,
                        "completed_at": completed_at
                    }
                )
            except Exception as e:
                logger.error(f"Failed to update failed job status in DB: {e}")
                
        await self._broadcast_status(job_id)

    def log_correction(self, page_id: str, original_token: str, corrected_token: str, confidence: float):
        if self.retriever is not None:
            try:
                correction_id = str(uuid.uuid4())
                self.ocr_corrections_table.add([{
                    "correction_id": correction_id,
                    "page_id": page_id,
                    "original_token": original_token,
                    "corrected_token": corrected_token,
                    "confidence": float(confidence),
                    "timestamp": time.time()
                }])
                logger.info(f"Logged correction: '{original_token}' -> '{corrected_token}' for page {page_id}")
            except Exception as e:
                logger.error(f"Failed to log correction to database: {e}")
