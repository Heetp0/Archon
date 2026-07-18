import os
import uuid
import json
import time
import logging
from typing import Dict, Any, List
import pyarrow as pa
import lancedb

from image_renderer import render_strokes_to_png
from metadata_extractor import extract_handwriting_metadata

logger = logging.getLogger("training_data_collector")

def get_db_connection():
    DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
    WORKSPACE_ROOT = os.path.dirname(DAEMON_DIR)
    db_path = os.path.join(WORKSPACE_ROOT, ".lancedb")
    return lancedb.connect(db_path)

def init_training_data_table(db):
    schema = pa.schema([
        pa.field("training_id", pa.string()),
        pa.field("source", pa.string()),
        pa.field("source_id", pa.string()),
        pa.field("handwriting_strokes", pa.binary()),
        pa.field("handwriting_image_png", pa.binary()),
        pa.field("ground_truth_text", pa.string()),
        pa.field("ground_truth_latex", pa.string()),
        pa.field("bounding_boxes", pa.string()),
        pa.field("metadata_json", pa.string())
    ])
    return db.create_table("training_data", schema=schema, exist_ok=True)

def collect_training_data() -> Dict[str, Any]:
    db = get_db_connection()
    training_table = init_training_data_table(db)
    
    # Read existing source_ids to avoid duplicates
    try:
        existing_rows = training_table.search().to_list()
        existing_source_ids = {r["source_id"] for r in existing_rows}
    except Exception:
        existing_source_ids = set()

    DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
    attempts_strokes_dir = os.path.join(DAEMON_DIR, 'data', 'strokes', 'attempts')
    os.makedirs(attempts_strokes_dir, exist_ok=True)
    
    collected_count = 0
    topic_distribution = {}
    difficulty_distribution = {}

    # 1. Collect from quiz_attempts
    try:
        attempts_table = db.open_table("quiz_attempts")
        attempts = attempts_table.search().to_list()
    except Exception:
        attempts = []

    try:
        questions_table = db.open_table("quiz_questions")
        questions = {q["question_id"]: q for q in questions_table.search().to_list()}
    except Exception:
        questions = {}

    for attempt in attempts:
        attempt_id = attempt["attempt_id"]
        question_id = attempt["question_id"]
        student_id = attempt["student_id"]
        q = questions.get(question_id, {})
        
        try:
            answers = json.loads(attempt["answers_json"])
        except Exception:
            answers = []

        for idx, ans in enumerate(answers):
            answer_id = ans.get("answer_id")
            if not answer_id or answer_id in existing_source_ids:
                continue

            # Check if archived strokes file exists
            strokes_file = os.path.join(attempts_strokes_dir, f"{attempt_id}_{answer_id}.bin")
            if os.path.exists(strokes_file):
                try:
                    with open(strokes_file, "rb") as f:
                        binary_strokes = f.read()
                except Exception as e:
                    logger.error(f"Error reading strokes file {strokes_file}: {e}")
                    continue

                ground_truth = ans.get("student_answer_latex", "")
                if not ground_truth or ground_truth.strip() in ["", "?", "empty"]:
                    continue

                # Run metadata extraction
                try:
                    meta = extract_handwriting_metadata(binary_strokes, ground_truth)
                except Exception as e:
                    logger.error(f"Error extracting metadata: {e}")
                    continue

                if meta.get("character_count", 0) < 3:
                    continue  # exclude too short

                # Decide source type
                source_type = "quiz_attempt"
                if attempt.get("hints_requested", 0) > 0 and ans.get("is_correct", False):
                    source_type = "hint_retry"

                # Generate image
                image_png = render_strokes_to_png(binary_strokes)

                # Populate metadata fields
                metadata = {
                    "student_id": student_id,
                    "quiz_question_id": question_id,
                    "attempt_number": attempt.get("attempt_number", 1),
                    "time_spent_seconds": attempt.get("time_spent_seconds", 0),
                    "user_confidence": 1.0,
                    "difficulty": q.get("difficulty", 2),
                    "topic": q.get("topic", "algebra"),
                    "handwriting_style": "mixed",
                    "character_count": meta["character_count"],
                    "word_count": meta["word_count"],
                    "ink_pressure_variation": meta["ink_pressure_variation"],
                    "stroke_count": meta["stroke_count"],
                    "timestamp_collected": time.time()
                }

                # Save record
                training_id = str(uuid.uuid4())
                training_table.add([{
                    "training_id": training_id,
                    "source": source_type,
                    "source_id": answer_id,
                    "handwriting_strokes": binary_strokes,
                    "handwriting_image_png": image_png,
                    "ground_truth_text": ground_truth,
                    "ground_truth_latex": ground_truth,
                    "bounding_boxes": json.dumps([]),
                    "metadata_json": json.dumps(metadata)
                }])

                collected_count += 1
                topic = metadata["topic"]
                topic_distribution[topic] = topic_distribution.get(topic, 0) + 1
                diff = str(metadata["difficulty"])
                difficulty_distribution[diff] = difficulty_distribution.get(diff, 0) + 1

    # 2. Collect from ocr_corrections
    try:
        corrections_table = db.open_table("ocr_corrections")
        corrections = corrections_table.search().to_list()
    except Exception:
        corrections = []

    for corr in corrections:
        corr_id = corr["correction_id"]
        if corr_id in existing_source_ids:
            continue

        confidence = corr.get("confidence", 1.0)
        if confidence < 0.8:
            continue

        page_id = corr["page_id"]
        strokes_file = os.path.join(DAEMON_DIR, 'data', 'strokes', f'{page_id}.bin')
        if os.path.exists(strokes_file):
            try:
                with open(strokes_file, "rb") as f:
                    binary_strokes = f.read()
            except Exception as e:
                logger.error(f"Error reading page strokes {strokes_file}: {e}")
                continue

            ground_truth = corr["corrected_token"]
            if not ground_truth or len(ground_truth) < 3:
                continue

            try:
                meta = extract_handwriting_metadata(binary_strokes, ground_truth)
            except Exception:
                continue

            image_png = render_strokes_to_png(binary_strokes)
            metadata = {
                "student_id": "default_student",
                "page_id": page_id,
                "user_confidence": confidence,
                "topic": "general",
                "difficulty": 1,
                "handwriting_style": "mixed",
                "character_count": meta["character_count"],
                "word_count": meta["word_count"],
                "ink_pressure_variation": meta["ink_pressure_variation"],
                "stroke_count": meta["stroke_count"],
                "timestamp_collected": time.time()
            }

            training_id = str(uuid.uuid4())
            training_table.add([{
                "training_id": training_id,
                "source": "ocr_correction",
                "source_id": corr_id,
                "handwriting_strokes": binary_strokes,
                "handwriting_image_png": image_png,
                "ground_truth_text": ground_truth,
                "ground_truth_latex": ground_truth,
                "bounding_boxes": json.dumps([]),
                "metadata_json": json.dumps(metadata)
            }])

            collected_count += 1
            topic_distribution["general"] = topic_distribution.get("general", 0) + 1

    report = {
        "status": "success",
        "timestamp": time.time(),
        "collected_samples": collected_count,
        "topic_distribution": topic_distribution,
        "difficulty_distribution": difficulty_distribution
    }
    
    print(json.dumps(report, indent=2))
    return report

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    collect_training_data()
