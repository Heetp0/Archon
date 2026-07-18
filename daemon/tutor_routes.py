import time
import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from pydantic import BaseModel

from sympy_validator import validate_math_answer, ValidationResult
from socratic_agent import SocraticAgent
from sm2_scheduler import calculate_sm2, map_score_to_quality
from quiz_manager import QuizManager

# Multi-user imports
from auth_middleware import get_current_user, UserContext
from quota_enforcer import check_questions_quota
from notebook_routes import verify_notebook_access

logger = logging.getLogger("tutor_routes")
router = APIRouter()

# Globals initialized from main.py
model_router = None
retriever = None
quiz_manager: Optional[QuizManager] = None
socratic_agent: Optional[SocraticAgent] = None

def init_tutor_services(app_router, app_retriever):
    global model_router, retriever, quiz_manager, socratic_agent
    model_router = app_router
    retriever = app_retriever
    quiz_manager = QuizManager(db_connection=app_retriever.db)
    socratic_agent = SocraticAgent(model_router)
    
    # Auto-seed questions
    try:
        quiz_manager.seed_sample_questions()
    except Exception as e:
        logger.error(f"Error seeding sample questions: {e}")

class CreateQuestionRequest(BaseModel):
    topic: str
    difficulty: int
    question_text: str
    question_latex: str
    expected_answer_latex: str
    answer_numeric: Optional[float] = None
    answer_units: Optional[str] = None
    hints: List[Dict[str, Any]]
    common_mistakes: List[Dict[str, Any]]
    explanation: str
    source: str = "user-created"
    metadata: Dict[str, Any] = {}

class SubmitAnswerRequest(BaseModel):
    question_id: str
    student_answer_latex: str
    time_spent_seconds: int

class RequestHintRequest(BaseModel):
    question_id: str
    student_answer_latex: str
    current_hint_level: int
    error_type: Optional[str] = None

# Helper to verify attempt ownership
def verify_attempt_access(attempt_id: str, user_id: str):
    if quiz_manager is None or quiz_manager.quiz_attempts_table is None:
        raise HTTPException(status_code=500, detail="Tutor DB not initialized")
    attempts = quiz_manager.quiz_attempts_table.search().where(f"attempt_id = '{attempt_id}' AND user_id = '{user_id}'").to_list()
    if not attempts:
        raise HTTPException(status_code=404, detail="Attempt not found or access denied")
    return attempts[0]

# --- Endpoints ---

@router.get("/notebooks/{notebook_id}/quiz-questions")
async def list_questions(
    notebook_id: str,
    topic: Optional[str] = None,
    difficulty: Optional[int] = None,
    due_only: bool = False,
    current_user: UserContext = Depends(get_current_user)
):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_questions_table is None:
        raise HTTPException(status_code=500, detail="Tutor DB not initialized")
    
    try:
        rows = quiz_manager.quiz_questions_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
        if not rows:
            return []
        
        questions = []
        now = time.time()
        
        for row in rows:
            if row["notebook_id"] != notebook_id:
                continue
            if topic and row["topic"] != topic:
                continue
            if difficulty and int(row["difficulty"]) != difficulty:
                continue
                
            sr = json.loads(row["spaced_repetition_json"])
            
            # Filter by due only
            if due_only:
                next_review = sr.get("next_review_date")
                if next_review is not None and next_review > now:
                    continue # Not due yet
            
            questions.append({
                "question_id": row["question_id"],
                "notebook_id": row["notebook_id"],
                "topic": row["topic"],
                "difficulty": int(row["difficulty"]),
                "question_text": row["question_text"],
                "question_latex": row["question_latex"],
                "expected_answer_latex": row["expected_answer_latex"],
                "answer_numeric": row["answer_numeric"],
                "answer_units": row["answer_units"],
                "hints": json.loads(row["hints_json"]),
                "common_mistakes": json.loads(row["common_mistakes_json"]),
                "explanation": row["explanation"],
                "source": row["source"],
                "created_at": row["created_at"],
                "metadata": json.loads(row["metadata_json"]),
                "spaced_repetition": sr
            })
        return questions
    except Exception as e:
        logger.error(f"Error listing questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notebooks/{notebook_id}/quiz-questions")
async def create_question(notebook_id: str, req: CreateQuestionRequest, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_questions_table is None:
        raise HTTPException(status_code=500, detail="Tutor DB not initialized")
    
    # Quota check
    check_questions_quota(retriever.db, current_user.user_id, current_user.role)
    
    q_id = str(uuid.uuid4())
    sr = {
        "ease": 2.5,
        "interval": 0,
        "repetitions": 0,
        "next_review_date": None,
        "last_reviewed": None,
        "review_history": []
    }
    
    row = {
        "question_id": q_id,
        "user_id": current_user.user_id,
        "notebook_id": notebook_id,
        "topic": req.topic,
        "difficulty": req.difficulty,
        "question_text": req.question_text,
        "question_latex": req.question_latex,
        "expected_answer_latex": req.expected_answer_latex,
        "answer_numeric": req.answer_numeric,
        "answer_units": req.answer_units,
        "hints_json": json.dumps(req.hints),
        "common_mistakes_json": json.dumps(req.common_mistakes),
        "explanation": req.explanation,
        "source": req.source,
        "created_at": time.time(),
        "updated_at": time.time(),
        "metadata_json": json.dumps(req.metadata),
        "spaced_repetition_json": json.dumps(sr)
    }
    
    try:
        quiz_manager.quiz_questions_table.add([row])
        return {"question_id": q_id, "status": "created"}
    except Exception as e:
        logger.error(f"Error creating question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notebooks/{notebook_id}/quiz-attempts")
async def start_attempt(notebook_id: str, question_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_attempts_table is None:
        raise HTTPException(status_code=500, detail="Tutor DB not initialized")
    
    attempt_id = str(uuid.uuid4())
    student_id = current_user.user_id
    
    # Check attempt number
    try:
        rows = quiz_manager.quiz_attempts_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
        user_attempts = [r for r in rows if r["question_id"] == question_id and r["student_id"] == student_id]
        attempt_number = len(user_attempts) + 1
    except Exception:
        attempt_number = 1

    row = {
        "attempt_id": attempt_id,
        "user_id": current_user.user_id,
        "notebook_id": notebook_id,
        "question_id": question_id,
        "student_id": student_id,
        "attempt_number": attempt_number,
        "status": "in_progress",
        "is_correct": None,
        "score": 0.0,
        "timestamp_started": time.time(),
        "timestamp_submitted": None,
        "time_spent_seconds": 0,
        "hints_requested": 0,
        "max_hint_level_viewed": 0,
        "answers_json": json.dumps([]),
        "final_answer_json": None,
        "feedback_json": None,
        "metadata_json": json.dumps({})
    }
    
    try:
        quiz_manager.quiz_attempts_table.add([row])
        quiz_manager.log_event(attempt_id, "started", {"question_id": question_id})
        return {"attempt_id": attempt_id, "status": "started", "attempt_number": attempt_number}
    except Exception as e:
        logger.error(f"Error starting attempt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz-attempts/{attempt_id}/answers")
async def submit_answer(attempt_id: str, req: SubmitAnswerRequest, current_user: UserContext = Depends(get_current_user)):
    attempt = verify_attempt_access(attempt_id, current_user.user_id)

    # Get question details
    try:
        rows_q = quiz_manager.quiz_questions_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
        q_rows = [r for r in rows_q if r["question_id"] == req.question_id]
        if not q_rows:
            raise HTTPException(status_code=404, detail="Question not found")
        question = q_rows[0]
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

    q_metadata = json.loads(question["metadata_json"])
    integrand = q_metadata.get("integrand")

    # Run sympy validation
    val_res = validate_math_answer(
        student_latex=req.student_answer_latex,
        expected_latex=question["expected_answer_latex"],
        q_type=question["topic"],
        integrand=integrand
    )

    # Log answer
    answers = json.loads(attempt["answers_json"])
    answer_id = str(uuid.uuid4())
    
    # Archive temporary strokes to unique file for fine-tuning
    try:
        import os
        import shutil
        DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
        temp_strokes_path = os.path.join(DAEMON_DIR, 'data', 'strokes', 'tutor_temp_page.bin')
        if os.path.exists(temp_strokes_path):
            attempts_strokes_dir = os.path.join(DAEMON_DIR, 'data', 'strokes', 'attempts')
            os.makedirs(attempts_strokes_dir, exist_ok=True)
            shutil.copy(temp_strokes_path, os.path.join(attempts_strokes_dir, f"{attempt_id}_{answer_id}.bin"))
    except Exception as e:
        logger.error(f"Failed to archive temp strokes: {e}")
        
    answers.append({
        "answer_id": answer_id,
        "student_answer_latex": req.student_answer_latex,
        "timestamp": time.time(),
        "is_correct": val_res.is_correct,
        "error_type": val_res.error_type,
        "score": val_res.score
    })

    # Update attempt table
    try:
        quiz_manager.quiz_attempts_table.update(
            where=f"attempt_id = '{attempt_id}'",
            values={
                "is_correct": val_res.is_correct,
                "score": val_res.score,
                "time_spent_seconds": int(attempt["time_spent_seconds"] + req.time_spent_seconds),
                "answers_json": json.dumps(answers),
                "final_answer_json": json.dumps({
                    "latex": req.student_answer_latex,
                    "is_correct": val_res.is_correct
                }),
                "feedback_json": json.dumps({
                    "message": val_res.suggestion or "",
                    "error_type": val_res.error_type,
                    "is_partial": val_res.is_partial
                })
            }
        )
        quiz_manager.log_event(attempt_id, "answer_submitted", {
            "answer_id": answer_id,
            "student_answer_latex": req.student_answer_latex,
            "is_correct": val_res.is_correct,
            "error_type": val_res.error_type
        })
    except Exception as e:
        logger.error(f"Error updating attempt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "is_correct": val_res.is_correct,
        "is_partial": val_res.is_partial,
        "score": val_res.score,
        "error_type": val_res.error_type,
        "student_simplified": val_res.student_simplified,
        "expected_simplified": val_res.expected_simplified,
        "feedback": {
            "type": "correct" if val_res.is_correct else "incorrect",
            "message": val_res.suggestion or "Incorrect answer. Try again."
        }
    }

@router.post("/quiz-attempts/{attempt_id}/hints")
async def get_hint(attempt_id: str, req: RequestHintRequest, current_user: UserContext = Depends(get_current_user)):
    attempt = verify_attempt_access(attempt_id, current_user.user_id)

    # Get question
    rows_q = quiz_manager.quiz_questions_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    q_rows = [r for r in rows_q if r["question_id"] == req.question_id]
    if not q_rows:
        raise HTTPException(status_code=404, detail="Question not found")
    question = q_rows[0]

    # Call Socratic agent to generate hint
    try:
        hint_text = await socratic_agent.generate_socratic_hint(
            question_text=question["question_text"],
            expected_answer_latex=question["expected_answer_latex"],
            student_answer_latex=req.student_answer_latex,
            error_type=req.error_type,
            level=req.current_hint_level
        )
    except Exception as e:
        logger.error(f"Error generating Socratic hint: {e}")
        hint_text = "Take a close look at your steps. Can you verify your last calculation?"

    # Update attempt counts
    new_hints_requested = int(attempt["hints_requested"] + 1)
    new_max_level = max(int(attempt["max_hint_level_viewed"]), req.current_hint_level)
    
    quiz_manager.quiz_attempts_table.update(
        where=f"attempt_id = '{attempt_id}'",
        values={
            "hints_requested": new_hints_requested,
            "max_hint_level_viewed": new_max_level
        }
    )
    quiz_manager.log_event(attempt_id, "hint_requested", {
        "level": req.current_hint_level,
        "hint_text": hint_text
    })

    return {
        "hint_level": req.current_hint_level,
        "hint_text": hint_text,
        "can_request_stronger_hint": req.current_hint_level < 3
    }

@router.post("/quiz-attempts/{attempt_id}/finalize")
async def finalize_attempt(attempt_id: str, current_user: UserContext = Depends(get_current_user)):
    attempt = verify_attempt_access(attempt_id, current_user.user_id)

    # Get question
    rows_q = quiz_manager.quiz_questions_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    q_rows = [r for r in rows_q if r["question_id"] == attempt["question_id"]]
    if not q_rows:
        raise HTTPException(status_code=404, detail="Question not found")
    question = q_rows[0]

    is_correct = bool(attempt["is_correct"]) if attempt["is_correct"] is not None else False
    hints = int(attempt["hints_requested"])
    score = float(attempt["score"])

    # Calculate quality (0-5)
    quality = map_score_to_quality(is_correct, hints, score)

    # Get existing SR data
    sr = json.loads(question["spaced_repetition_json"])
    
    # Calculate SM-2
    new_sr = calculate_sm2(
        quality=quality,
        ease=float(sr.get("ease", 2.5)),
        repetitions=int(sr.get("repetitions", 0)),
        interval=int(sr.get("interval", 0))
    )

    # Update history log
    history = sr.get("review_history", [])
    history.append({
        "attempt_id": attempt_id,
        "quality": quality,
        "ease_after": new_sr["ease"],
        "interval_after": new_sr["interval"],
        "timestamp": time.time()
    })
    new_sr["review_history"] = history

    # Update question spaced rep metrics
    quiz_manager.quiz_questions_table.update(
        where=f"question_id = '{attempt['question_id']}'",
        values={
            "spaced_repetition_json": json.dumps(new_sr)
        }
    )

    # Update attempt status
    quiz_manager.quiz_attempts_table.update(
        where=f"attempt_id = '{attempt_id}'",
        values={
            "status": "graded",
            "timestamp_submitted": time.time()
        }
    )
    quiz_manager.log_event(attempt_id, "graded", {
        "quality": quality,
        "interval": new_sr["interval"],
        "ease": new_sr["ease"]
    })

    return {
        "status": "graded",
        "quality_score": quality,
        "next_review_interval_days": new_sr["interval"],
        "next_review_date": new_sr["next_review_date"]
    }

# --- Analytics endpoints ---

@router.get("/notebooks/{notebook_id}/analytics/summary")
async def get_analytics_summary(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_attempts_table is None:
        return {"total_attempts": 0, "overall_accuracy": 0.0, "avg_time_seconds": 0, "avg_hints": 0.0}
        
    rows = quiz_manager.quiz_attempts_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    nb_attempts = [r for r in rows if r["notebook_id"] == notebook_id]
    if not nb_attempts:
        return {"total_attempts": 0, "overall_accuracy": 0.0, "avg_time_seconds": 0, "avg_hints": 0.0}

    total_attempts = len(nb_attempts)
    correct_attempts = len([r for r in nb_attempts if r["is_correct"] is True])
    overall_accuracy = correct_attempts / total_attempts if total_attempts > 0 else 0.0
    
    times = [r["time_spent_seconds"] for r in nb_attempts if r["time_spent_seconds"] is not None]
    avg_time = sum(times) / len(times) if times else 0
    
    hints = [r["hints_requested"] for r in nb_attempts if r["hints_requested"] is not None]
    avg_hints = sum(hints) / len(hints) if hints else 0.0

    return {
        "total_attempts": int(total_attempts),
        "overall_accuracy": float(overall_accuracy),
        "avg_time_seconds": int(avg_time),
        "avg_hints": float(avg_hints)
    }

@router.get("/notebooks/{notebook_id}/analytics/by-topic")
async def get_analytics_by_topic(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_attempts_table is None:
        return []
    
    rows_a = quiz_manager.quiz_attempts_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    rows_q = quiz_manager.quiz_questions_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    
    nb_attempts = [r for r in rows_a if r["notebook_id"] == notebook_id]
    if not nb_attempts:
        return []

    q_map = {q["question_id"]: q for q in rows_q}
    
    topic_data = {}
    for att in nb_attempts:
        q = q_map.get(att["question_id"])
        if q:
            topic = q["topic"]
            if topic not in topic_data:
                topic_data[topic] = {"total": 0, "correct": 0, "times": []}
            topic_data[topic]["total"] += 1
            if att["is_correct"] is True:
                topic_data[topic]["correct"] += 1
            if att["time_spent_seconds"] is not None:
                topic_data[topic]["times"].append(att["time_spent_seconds"])
                
    topic_stats = []
    for topic, stats in topic_data.items():
        total = stats["total"]
        correct = stats["correct"]
        times = stats["times"]
        topic_stats.append({
            "topic": topic,
            "accuracy": float(correct / total if total > 0 else 0.0),
            "questions_count": int(total),
            "avg_time_seconds": int(sum(times) / len(times) if times else 0)
        })
        
    return topic_stats

@router.get("/notebooks/{notebook_id}/analytics/learning-curve")
async def get_analytics_learning_curve(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_attempts_table is None:
        return []
    
    rows = quiz_manager.quiz_attempts_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    nb_attempts = [r for r in rows if r["notebook_id"] == notebook_id]
    if not nb_attempts:
        return []
        
    # Sort chronologically
    nb_attempts.sort(key=lambda x: x["timestamp_started"])
    
    learning_curve = []
    for i, row in enumerate(nb_attempts):
        learning_curve.append({
            "attempt_index": i + 1,
            "score": float(row["score"]),
            "timestamp": row["timestamp_started"]
        })
    return learning_curve

@router.get("/notebooks/{notebook_id}/analytics/spaced-repetition-status")
async def get_sr_status(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if quiz_manager is None or quiz_manager.quiz_questions_table is None:
        return {"due_today": 0, "struggling": 0, "mastered": 0}
        
    rows = quiz_manager.quiz_questions_table.search().where(f"user_id = '{current_user.user_id}'").to_list()
    nb_qs = [r for r in rows if r["notebook_id"] == notebook_id]
    if not nb_qs:
        return {"due_today": 0, "struggling": 0, "mastered": 0}

    due_today = 0
    struggling = 0
    mastered = 0
    now = time.time()

    struggling_list = []
    
    for row in nb_qs:
        sr = json.loads(row["spaced_repetition_json"])
        ease = sr.get("ease", 2.5)
        reps = sr.get("repetitions", 0)
        next_review = sr.get("next_review_date")
        
        if next_review is not None and next_review <= now:
            due_today += 1
            
        if ease < 2.0:
            struggling += 1
            struggling_list.append({
                "question_id": row["question_id"],
                "question_text": row["question_text"],
                "ease": ease,
                "repetitions": reps
            })
        elif ease > 3.0 and reps >= 3:
            mastered += 1

    return {
        "due_today": int(due_today),
        "struggling_count": int(struggling),
        "mastered_count": int(mastered),
        "struggling_questions": struggling_list
    }

@router.get("/notebooks/{notebook_id}/analytics/tesseract-model-status")
async def get_tesseract_model_status(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    try:
        from monthly_finetuning_cron import get_status_json_path, initialize_status_file
        initialize_status_file()
        path = get_status_json_path()
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading Tesseract model status: {e}")
        return {
            "current_model": "baseline-eng",
            "word_accuracy": 71.5,
            "baseline_accuracy": 71.5,
            "total_samples": 0,
            "next_training_date": time.time() + 30 * 86400,
            "history": []
        }
