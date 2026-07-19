import os
import uuid
import time
import json
import logging
from typing import Dict, Any, List, Optional
import pyarrow as pa
import lancedb

logger = logging.getLogger("quiz_manager")

class QuizManager:
    def __init__(self, db_path: str = None, db_connection: Any = None):
        self.db = db_connection
        if self.db is None and db_path is not None:
            self.db = lancedb.connect(db_path)
            
        self.quiz_questions_table = None
        self.quiz_attempts_table = None
        self.quiz_attempt_log_table = None
        
        if self.db is not None:
            self._init_tables()

    def _init_tables(self):
        # 1. quiz_questions table schema
        questions_schema = pa.schema([
            pa.field("question_id", pa.string()),
            pa.field("user_id", pa.string()),
            pa.field("notebook_id", pa.string()),
            pa.field("topic", pa.string()),
            pa.field("difficulty", pa.int32()),
            pa.field("question_text", pa.string()),
            pa.field("question_latex", pa.string()),
            pa.field("expected_answer_latex", pa.string()),
            pa.field("answer_numeric", pa.float64(), nullable=True),
            pa.field("answer_units", pa.string(), nullable=True),
            pa.field("hints_json", pa.string()),
            pa.field("common_mistakes_json", pa.string()),
            pa.field("explanation", pa.string()),
            pa.field("source", pa.string()),
            pa.field("created_at", pa.float64()),
            pa.field("updated_at", pa.float64()),
            pa.field("metadata_json", pa.string()),
            pa.field("spaced_repetition_json", pa.string())
        ])
        self.quiz_questions_table = self.db.create_table("quiz_questions", schema=questions_schema, exist_ok=True)

        # 2. quiz_attempts table schema
        attempts_schema = pa.schema([
            pa.field("attempt_id", pa.string()),
            pa.field("user_id", pa.string()),
            pa.field("notebook_id", pa.string()),
            pa.field("question_id", pa.string()),
            pa.field("student_id", pa.string()),
            pa.field("attempt_number", pa.int32()),
            pa.field("status", pa.string()),
            pa.field("is_correct", pa.bool_(), nullable=True),
            pa.field("score", pa.float32()),
            pa.field("timestamp_started", pa.float64()),
            pa.field("timestamp_submitted", pa.float64(), nullable=True),
            pa.field("time_spent_seconds", pa.int32()),
            pa.field("hints_requested", pa.int32()),
            pa.field("max_hint_level_viewed", pa.int32()),
            pa.field("answers_json", pa.string()),
            pa.field("final_answer_json", pa.string(), nullable=True),
            pa.field("feedback_json", pa.string(), nullable=True),
            pa.field("metadata_json", pa.string())
        ])
        self.quiz_attempts_table = self.db.create_table("quiz_attempts", schema=attempts_schema, exist_ok=True)

        # 3. quiz_attempt_log table schema
        log_schema = pa.schema([
            pa.field("log_id", pa.string()),
            pa.field("attempt_id", pa.string()),
            pa.field("event", pa.string()),
            pa.field("timestamp", pa.float64()),
            pa.field("data_json", pa.string())
        ])
        self.quiz_attempt_log_table = self.db.create_table("quiz_attempt_log", schema=log_schema, exist_ok=True)

    def log_event(self, attempt_id: str, event: str, data: Dict[str, Any]):
        if self.quiz_attempt_log_table is None:
            return
        log_id = str(uuid.uuid4())
        self.quiz_attempt_log_table.add([{
            "log_id": log_id,
            "attempt_id": attempt_id,
            "event": event,
            "timestamp": time.time(),
            "data_json": json.dumps(data)
        }])

    def seed_sample_questions(self, notebook_id: str = "default_notebook"):
        if self.quiz_questions_table is None:
            return
        
        # Check if already seeded
        try:
            existing = self.quiz_questions_table.to_pandas()
            if len(existing) > 0:
                logger.info("quiz_questions table already seeded.")
                return
        except Exception:
            pass

        logger.info(f"Seeding sample math quiz questions for notebook: {notebook_id}")
        sample_questions = []

        # 20 questions mapping: algebra, calculus, integration
        topics = ["algebra", "calculus", "calculus", "calculus", "algebra"]
        q_texts = [
            ("Solve for x: 2*x + 5 = 13", "2x + 5 = 13", "x = 4", 4.0, None),
            ("Simplify the expression: (x^2 + 2*x + 1) / (x + 1)", "\\frac{x^2 + 2x + 1}{x + 1}", "x + 1", None, None),
            ("Find the derivative with respect to x: d/dx [x^3 + 2*x]", "\\frac{d}{dx}[x^3 + 2x]", "3*x^2 + 2", None, None),
            ("Integrate with respect to x: \\int 2*x dx", "\\int 2x \\, dx", "x^2 + C", None, None),
            ("Solve the equation: 3*x - 7 = 8", "3x - 7 = 8", "x = 5", 5.0, None),
            ("Find the derivative: d/dx [cos(x) + x^2]", "\\frac{d}{dx}[\\cos(x) + x^2]", "-sin(x) + 2*x", None, None),
            ("Integrate: \\int 3*x^2 dx", "\\int 3x^2 \\, dx", "x^3 + C", None, None),
            ("Solve for x: x^2 - 9 = 0", "x^2 - 9 = 0", "x = 3", 3.0, None), # standard is 3 or -3, let's say 3
            ("Simplify: (2*x^2 - 8) / (x - 2)", "\\frac{2x^2 - 8}{x - 2}", "2*x + 4", None, None),
            ("Find the derivative: d/dx [ln(x) + e^x]", "\\frac{d}{dx}[\\ln(x) + e^x]", "1/x + e^x", None, None),
            ("Integrate: \\int 1/x dx", "\\int \\frac{1}{x} \\, dx", "ln(x) + C", None, None),
            ("Solve: 5*x + 4 = 2*x + 13", "5x + 4 = 2x + 13", "x = 3", 3.0, None),
            ("Simplify: (x^3 - x) / x", "\\frac{x^3 - x}{x}", "x^2 - 1", None, None),
            ("Find the derivative: d/dx [5*x^4]", "\\frac{d}{dx}[5x^4]", "20*x^3", None, None),
            ("Integrate: \\int sin(x) dx", "\\int \\sin(x) \\, dx", "-cos(x) + C", None, None),
            ("Solve: x^2 - 5*x + 6 = 0", "x^2 - 5x + 6 = 0", "x = 2", 2.0, None),
            ("Simplify: (x^2 - 2*x + 1) / (x - 1)", "\\frac{x^2 - 2x + 1}{x - 1}", "x - 1", None, None),
            ("Find derivative: d/dx [3*e^x]", "\\frac{d}{dx}[3e^x]", "3*e^x", None, None),
            ("Integrate: \\int cos(x) dx", "\\int \\cos(x) \\, dx", "sin(x) + C", None, None),
            ("A projectile's height is h(t) = -5*t^2 + 20*t. Find time t when it reaches max height.", "h(t) = -5t^2 + 20t", "t = 2", 2.0, "seconds")
        ]

        for i, (q_text, q_latex, ans_latex, ans_num, units) in enumerate(q_texts):
            q_id = str(uuid.uuid4())
            
            # Formulate levels hints
            hints = [
                {"hint_id": str(uuid.uuid4()), "level": 1, "text": "Read the problem carefully and identify the variable to isolate or operation to apply."},
                {"hint_id": str(uuid.uuid4()), "level": 2, "text": f"Use basic algebraic principles to simplify both sides of {q_latex}."},
                {"hint_id": str(uuid.uuid4()), "level": 3, "text": f"To solve this, try focusing on matching the expected solution form: {ans_latex}."}
            ]
            
            # Integrand specification for integration questions
            integrand = None
            if "Integrate" in q_text:
                if "2*x" in q_text: integrand = "2*x"
                elif "3*x^2" in q_text: integrand = "3*x^2"
                elif "1/x" in q_text: integrand = "1/x"
                elif "sin(x)" in q_text: integrand = "sin(x)"
                elif "cos(x)" in q_text: integrand = "cos(x)"

            common_mistakes = []
            if ans_num is not None:
                common_mistakes.append({
                    "mistake_id": str(uuid.uuid4()),
                    "text": "Sign error on final number",
                    "latex": f"x = {-ans_num}"
                })

            sr = {
                "ease": 2.5,
                "interval": 0,
                "repetitions": 0,
                "next_review_date": None,
                "last_reviewed": None,
                "review_history": []
            }

            sample_questions.append({
                "question_id": q_id,
                "notebook_id": notebook_id,
                "topic": "calculus" if "derivative" in q_text.lower() or "integrate" in q_text.lower() or "integral" in q_text.lower() else "algebra",
                "difficulty": 2 if i % 2 == 0 else 3,
                "question_text": q_text,
                "question_latex": f"$",
                "expected_answer_latex": ans_latex,
                "answer_numeric": ans_num,
                "answer_units": units,
                "hints_json": json.dumps(hints),
                "common_mistakes_json": json.dumps(common_mistakes),
                "explanation": f"To solve this, apply standard rules to isolate variables or integrate terms. Evaluating the derivative of {ans_latex} gives the integrand, showing algebraic equivalence.",
                "source": "generated",
                "created_at": time.time(),
                "updated_at": time.time(),
                "metadata_json": json.dumps({"integrand": integrand} if integrand else {}),
                "spaced_repetition_json": json.dumps(sr)
            })

        self.quiz_questions_table.add(sample_questions)
        logger.info(f"quiz_questions table populated with {len(sample_questions)} sample questions.")
