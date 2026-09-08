import os
import time
import shutil
import logging
import asyncio
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel

from lecture_job_queue import LectureJobQueue
from audio_processor import AudioProcessor
from note_generator import NoteGenerator
from obsidian_exporter import LectureExporter
from auth_middleware import get_current_user, UserContext

logger = logging.getLogger("lecture_routes")
router = APIRouter()

# Global instances initialized via main.py
global_router = None
global_retriever = None

job_queue = LectureJobQueue()
exporter = LectureExporter()

def init_lecture_services(router_instance, retriever_instance):
    global global_router, global_retriever
    global_router = router_instance
    global_retriever = retriever_instance
    logger.info("Lecture routes initialized with ModelRouter and Retriever.")


async def process_lecture_job(
    job_id: str,
    audio_path: str,
    subject: str,
    lecture_num: int,
    prof_notes: Optional[str] = None,
    export_to: Optional[List[str]] = None,
):
    """Background task: audio processing -> note generation -> multi-destination export."""
    if export_to is None:
        export_to = ["obsidian"]

    try:
        job_queue.update_job(job_id, "processing", 5, "audio_processing")

        processor = AudioProcessor()
        generator = NoteGenerator(global_router)

        async def progress_cb(step_name: str, step_progress: int):
            job_queue.update_job(job_id, "processing", step_progress, step_name)

        # 1. Audio processing
        logger.info(f"Running audio processor for job {job_id}...")
        audio_result = await processor.process_lecture_audio(audio_path, progress_callback=progress_cb)
        transcript = audio_result["transcript"]

        # 2. Note generation (5-agent pipeline)
        logger.info(f"Generating study notes for job {job_id}...")
        notes_content = await generator.generate_lecture_notes(
            transcript=transcript,
            prof_notes=prof_notes,
            subject=subject,
            lecture_num=lecture_num,
            retriever=global_retriever,
            notebook_id="default_notebook",
            progress_callback=progress_cb,
        )

        # 3. Obsidian export
        obsidian_path = None
        if "obsidian" in export_to:
            logger.info(f"Exporting to Obsidian for job {job_id}...")
            job_queue.update_job(job_id, "processing", 96, "exporting_obsidian")
            obsidian_path = exporter.save_lecture_note(
                notes_content=notes_content,
                subject=subject,
                lecture_num=lecture_num,
            )

        # 4. Notion export
        notion_url = None
        if "notion" in export_to:
            logger.info(f"Exporting to Notion for job {job_id}...")
            job_queue.update_job(job_id, "processing", 97, "exporting_notion")
            try:
                from notion_exporter import save_to_notion
                notion_url = save_to_notion(
                    notes_content=notes_content,
                    subject=subject,
                    lecture_num=lecture_num,
                )
                logger.info(f"Notion page created: {notion_url}")
            except Exception as notion_err:
                logger.warning(f"Notion export failed (non-fatal): {notion_err}")
                # Non-fatal: log and continue so Obsidian notes still save

        # 5. Mark complete
        job_queue.update_job(
            job_id=job_id,
            status="done",
            progress=100,
            current_step="completed",
            result=notes_content,
            obsidian_path=obsidian_path,
            notion_url=notion_url,
        )
        logger.info(f"Job {job_id} done. Obsidian={obsidian_path} | Notion={notion_url}")

    except Exception as e:
        logger.exception(f"Failed to process lecture job {job_id}: {e}")
        job_queue.update_job(
            job_id=job_id,
            status="failed",
            progress=100,
            current_step="failed",
            error=str(e),
        )
    finally:
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass


@router.post("/lectures/upload")
async def upload_lecture(
    subject: str = Form(...),
    lecture_num: int = Form(...),
    audio_file: UploadFile = File(...),
    prof_notes: Optional[str] = Form(None),
    export_to: Optional[str] = Form("obsidian"),  # comma-separated: "obsidian,notion"
    current_user: UserContext = Depends(get_current_user),
):
    """Upload lecture audio and optional prof notes, queue processing in background."""
    import config
    uploads_dir = os.path.join(config.WORKSPACE_ROOT, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    temp_filename = f"upload_{int(time.time())}_{audio_file.filename}"
    temp_path = os.path.join(uploads_dir, temp_filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    # Parse export_to list
    destinations = [d.strip().lower() for d in (export_to or "obsidian").split(",") if d.strip()]
    if not destinations:
        destinations = ["obsidian"]

    job_id = job_queue.add_job(subject, lecture_num)

    asyncio.create_task(process_lecture_job(
        job_id=job_id,
        audio_path=temp_path,
        subject=subject,
        lecture_num=lecture_num,
        prof_notes=prof_notes,
        export_to=destinations,
    ))

    return {"job_id": job_id, "status": "queued", "export_to": destinations}


@router.get("/lectures/jobs/{job_id}")
async def get_job_status(job_id: str, current_user: UserContext = Depends(get_current_user)):
    """Retrieve status of a queued notes generation task."""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/lectures/{job_id}/notes")
async def get_generated_notes(job_id: str, current_user: UserContext = Depends(get_current_user)):
    """Fetch final generated markdown note contents."""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("status") != "done":
        return {
            "status": job.get("status"),
            "current_step": job.get("current_step"),
            "progress": job.get("progress"),
            "error": job.get("error"),
        }

    return {
        "job_id": job_id,
        "subject": job.get("subject"),
        "lecture_num": job.get("lecture_num"),
        "obsidian_path": job.get("obsidian_path"),
        "notion_url": job.get("notion_url"),
        "content": job.get("result"),
        "status": "done",
    }


@router.websocket("/lectures/jobs/{job_id}/ws")
async def job_progress_ws(websocket: WebSocket, job_id: str):
    """Stream note generation job progress updates to the client in real-time."""
    await websocket.accept()
    logger.info(f"WebSocket connected for job {job_id}")

    try:
        while True:
            job = job_queue.get_job(job_id)
            if not job:
                await websocket.send_json({"error": "Job not found"})
                await websocket.close()
                break

            await websocket.send_json({
                "job_id": job_id,
                "status": job.get("status"),
                "progress": job.get("progress"),
                "current_step": job.get("current_step"),
                "error": job.get("error"),
            })

            if job.get("status") in ("done", "failed"):
                await asyncio.sleep(0.5)
                await websocket.close()
                break

            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
