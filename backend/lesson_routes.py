import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from lesson_service import LessonManager
from auth_middleware import get_current_user, UserContext

logger = logging.getLogger("lesson_routes")
router = APIRouter()

lesson_manager: Optional[LessonManager] = None

def init_lesson_service(app_router, app_retriever):
    global lesson_manager
    lesson_manager = LessonManager(db_connection=app_retriever.db, model_router=app_router)

class GenerateLessonRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"

class VerifyCheckpointRequest(BaseModel):
    student_answer: str

@router.post("/notebooks/{notebook_id}/lessons/generate")
async def generate_lesson(
    notebook_id: str,
    req: GenerateLessonRequest,
    # user: UserContext = Depends(get_current_user) # Optionally enforce auth
):
    if not lesson_manager:
        raise HTTPException(status_code=500, detail="Lesson service not initialized")
    
    try:
        result = await lesson_manager.generate_lesson(notebook_id, req.topic, req.difficulty)
        return result
    except Exception as e:
        logger.error(f"Generate lesson failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notebooks/{notebook_id}/lessons")
async def list_lessons(notebook_id: str):
    if not lesson_manager:
        raise HTTPException(status_code=500, detail="Lesson service not initialized")
    
    lessons = lesson_manager.get_lessons(notebook_id)
    return {"lessons": lessons}

@router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    if not lesson_manager:
        raise HTTPException(status_code=500, detail="Lesson service not initialized")
    
    lesson = lesson_manager.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson

@router.post("/lessons/{lesson_id}/checkpoints/{checkpoint_id}/verify")
async def verify_checkpoint(
    lesson_id: str,
    checkpoint_id: str,
    req: VerifyCheckpointRequest
):
    if not lesson_manager:
        raise HTTPException(status_code=500, detail="Lesson service not initialized")
    
    try:
        result = await lesson_manager.verify_checkpoint(lesson_id, checkpoint_id, req.student_answer)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Verify checkpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
