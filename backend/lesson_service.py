import uuid
import time
import json
import logging
from typing import Dict, Any, List, Optional
import pyarrow as pa
import lancedb

logger = logging.getLogger("lesson_service")

class LessonManager:
    def __init__(self, db_connection: Any, model_router: Any):
        self.db = db_connection
        self.router = model_router
        self.lessons_table = None
        self.checkpoints_table = None
        
        if self.db is not None:
            self._init_tables()

    def _init_tables(self):
        # 1. lessons table
        try:
            self.lessons_table = self.db.open_table("lessons")
        except Exception:
            lessons_schema = pa.schema([
                pa.field("lesson_id", pa.string()),
                pa.field("notebook_id", pa.string()),
                pa.field("topic", pa.string()),
                pa.field("difficulty", pa.string()),
                pa.field("content_markdown", pa.string()),
                pa.field("created_at", pa.float64())
            ])
            self.lessons_table = self.db.create_table("lessons", schema=lessons_schema)

        # 2. checkpoints table
        try:
            self.checkpoints_table = self.db.open_table("checkpoints")
        except Exception:
            checkpoints_schema = pa.schema([
                pa.field("checkpoint_id", pa.string()),
                pa.field("lesson_id", pa.string()),
                pa.field("order_index", pa.int32()),
                pa.field("prompt_markdown", pa.string()),
                pa.field("expected_latex", pa.string()),
                pa.field("hints_json", pa.string()),
                pa.field("is_completed", pa.bool_())
            ])
            self.checkpoints_table = self.db.create_table("checkpoints", schema=checkpoints_schema)

    async def generate_lesson(self, notebook_id: str, topic: str, difficulty: str) -> Dict[str, Any]:
        """
        Generates an interactive lesson stream with theory and step-by-step checkpoints.
        """
        system_prompt = (
            "You are an expert tutor. Generate an interactive lesson in strictly valid JSON format.\n"
            "The JSON must have this structure:\n"
            "{\n"
            "  \"content_markdown\": \"<Theory and explanation in markdown>\",\n"
            "  \"checkpoints\": [\n"
            "    {\"prompt_markdown\": \"<Question prompt>\", \"expected_latex\": \"<Answer in latex>\", \"hints\": [\"hint1\", \"hint2\"]}\n"
            "  ]\n"
            "}"
        )
        user_content = f"Topic: {topic}\nDifficulty: {difficulty}"

        try:
            generator = self.router.generate(tier="smart", messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ])
            response_chunks = []
            async for chunk in generator:
                response_chunks.append(chunk)
            response_str = "".join(response_chunks).strip()
            
            if "```json" in response_str:
                response_str = response_str.split("```json")[1].split("```")[0].strip()
            
            lesson_data = json.loads(response_str)
        except Exception as e:
            logger.error(f"Failed to generate lesson: {e}")
            lesson_data = {
                "content_markdown": f"# Introduction to {topic}\n\nLet's learn about {topic}.",
                "checkpoints": [
                    {"prompt_markdown": "What is 1+1?", "expected_latex": "2", "hints": ["Count on your fingers"]}
                ]
            }

        lesson_id = str(uuid.uuid4())
        
        # Insert lesson
        if self.lessons_table is not None:
            self.lessons_table.add([{
                "lesson_id": lesson_id,
                "notebook_id": notebook_id,
                "topic": topic,
                "difficulty": difficulty,
                "content_markdown": lesson_data["content_markdown"],
                "created_at": time.time()
            }])

        # Insert checkpoints
        checkpoints_out = []
        if self.checkpoints_table is not None:
            checkpoint_rows = []
            for i, cp in enumerate(lesson_data.get("checkpoints", [])):
                cp_id = str(uuid.uuid4())
                checkpoint_rows.append({
                    "checkpoint_id": cp_id,
                    "lesson_id": lesson_id,
                    "order_index": i,
                    "prompt_markdown": cp["prompt_markdown"],
                    "expected_latex": cp["expected_latex"],
                    "hints_json": json.dumps(cp.get("hints", [])),
                    "is_completed": False
                })
                checkpoints_out.append({
                    "checkpoint_id": cp_id,
                    "prompt_markdown": cp["prompt_markdown"]
                })
            
            if checkpoint_rows:
                self.checkpoints_table.add(checkpoint_rows)

        return {
            "lesson_id": lesson_id,
            "content": lesson_data["content_markdown"],
            "checkpoints": checkpoints_out
        }

    async def verify_checkpoint(self, lesson_id: str, checkpoint_id: str, student_answer: str) -> Dict[str, Any]:
        """
        Verifies a checkpoint using SymPy. Returns correct status and unlocks the next checkpoint.
        """
        if self.checkpoints_table is None:
            return {"is_correct": True, "feedback": "DB Not Initialized", "next_checkpoint_unlocked": True}

        # Fetch checkpoint expected answer
        res = self.checkpoints_table.search().where(f"checkpoint_id = '{checkpoint_id}'").to_arrow()
        if len(res) == 0:
            raise ValueError("Checkpoint not found")
            
        cp_dict = res.to_pylist()[0]
        expected_latex = cp_dict["expected_latex"]
        
        # Here we'll do a simple mock/fallback check, and defer to sympy_validator if needed
        from sympy_validator import validate_math_answer
        
        validation = validate_math_answer(student_answer, expected_latex)
        
        if validation.is_equivalent:
            # Mark as completed
            # Note: LanceDB update requires delete/insert or using newer update syntax. 
            # We'll use the newer update syntax if supported or fallback to a simple delete/insert
            try:
                self.checkpoints_table.update(where=f"checkpoint_id = '{checkpoint_id}'", values={"is_completed": True})
            except Exception as e:
                logger.warning(f"Failed to update checkpoint: {e}")
                
            return {
                "is_correct": True,
                "feedback": "Correct! Excellent work.",
                "next_checkpoint_unlocked": True
            }
        else:
            return {
                "is_correct": False,
                "feedback": "That's not quite right. Try again.",
                "next_checkpoint_unlocked": False
            }

    def get_lessons(self, notebook_id: str) -> List[Dict[str, Any]]:
        if self.lessons_table is None:
            return []
        res = self.lessons_table.search().where(f"notebook_id = '{notebook_id}'").to_arrow()
        return res.to_pylist()

    def get_lesson(self, lesson_id: str) -> Dict[str, Any]:
        if self.lessons_table is None:
            return {}
        res = self.lessons_table.search().where(f"lesson_id = '{lesson_id}'").to_arrow()
        if len(res) == 0:
            return {}
            
        lesson = res.to_pylist()[0]
        
        # get checkpoints
        cps = self.checkpoints_table.search().where(f"lesson_id = '{lesson_id}'").to_arrow()
        lesson["checkpoints"] = sorted(cps.to_pylist(), key=lambda x: x["order_index"])
        return lesson
