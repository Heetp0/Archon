import os
import json
import shutil
import pytest
import numpy as np
import pyarrow as pa
import lancedb

from training_data_collector import collect_training_data, get_db_connection, init_training_data_table
from data_augmenter import augment_training_data
from tesstrain_pipeline import run_tesseract_training, prepare_tesstrain_dataset
from model_evaluator import compare_models, evaluate_predictions
from monthly_finetuning_cron import run_monthly_finetuning_pipeline, get_status_json_path
from quiz_manager import QuizManager

def test_phase8_full_pipeline():
    # Correct pathing: test file is inside daemon/tests
    TESTS_DIR = os.path.dirname(os.path.abspath(__file__)) # daemon/tests
    DAEMON_DIR = os.path.dirname(TESTS_DIR) # daemon
    WORKSPACE_ROOT = os.path.dirname(DAEMON_DIR) # workspace root
    
    db_path = os.path.join(WORKSPACE_ROOT, ".lancedb")
    db = lancedb.connect(db_path)
    
    # Initialize QuizManager to create quiz tables if they don't exist
    qm = QuizManager(db_connection=db)
    # Seed questions
    qm.seed_sample_questions()
    
    # Initialize ocr_corrections table if it doesn't exist
    try:
        db.open_table("ocr_corrections")
    except Exception:
        schema = pa.schema([
            pa.field("correction_id", pa.string()),
            pa.field("page_id", pa.string()),
            pa.field("original_token", pa.string()),
            pa.field("corrected_token", pa.string()),
            pa.field("confidence", pa.float64()),
            pa.field("timestamp", pa.float64())
        ])
        db.create_table("ocr_corrections", schema=schema)

    attempts_table = db.open_table("quiz_attempts")
    questions_table = db.open_table("quiz_questions")
    questions = questions_table.search().to_list()
    assert len(questions) > 0
    q_id = questions[0]["question_id"]
    
    attempt_id = "test_finetune_attempt"
    answer_id = "test_finetune_answer"
    
    # Delete existing training data entries for the test answer_id to ensure idempotency
    try:
        training_table = db.open_table("training_data")
        training_table.delete(f"source_id = '{answer_id}'")
    except Exception:
        pass
    
    # Create attempts strokes dir and a dummy strokes file
    attempts_strokes_dir = os.path.join(DAEMON_DIR, 'data', 'strokes', 'attempts')
    os.makedirs(attempts_strokes_dir, exist_ok=True)
    strokes_file = os.path.join(attempts_strokes_dir, f"{attempt_id}_{answer_id}.bin")
    
    # Write a dummy strokes binary (simple struct compatible with deserialize_strokes)
    # numStrokes = 1, inputsLen = 2, n = 2
    # points: x1=10,y1=10; x2=50,y2=50
    import struct
    binary_data = struct.pack('<I', 1) # numStrokes
    binary_data += struct.pack('<I', 2) # inputsLen
    binary_data += struct.pack('<I', 2) # n points
    # Point 1
    binary_data += struct.pack('<ffffff', 10.0, 10.0, 0.0, 0.5, 0.0, 0.0)
    # Point 2
    binary_data += struct.pack('<ffffff', 50.0, 50.0, 0.1, 0.5, 0.0, 0.0)
    # Brush: size, color, epsilon, stock_val, family_len
    binary_data += struct.pack('<fqfII', 4.0, 0xFFFFFF, 0.1, 1, 0)
    
    with open(strokes_file, "wb") as f:
        f.write(binary_data)
        
    # Inject into quiz_attempts
    answers_json = json.dumps([{
        "answer_id": answer_id,
        "student_answer_latex": "x = 4",
        "timestamp": 1234567.0,
        "is_correct": True,
        "error_type": None,
        "score": 1.0
    }])
    
    # Clear existing attempt with same ID if any
    try:
        attempts_table.delete(f"attempt_id = '{attempt_id}'")
    except Exception:
        pass
        
    attempts_table.add([{
        "attempt_id": attempt_id,
        "notebook_id": "default_notebook",
        "question_id": q_id,
        "student_id": "default_student",
        "attempt_number": 1,
        "status": "graded",
        "is_correct": True,
        "score": 1.0,
        "timestamp_started": 1234567.0,
        "timestamp_submitted": 1234567.0,
        "time_spent_seconds": 10,
        "hints_requested": 0,
        "max_hint_level_viewed": 0,
        "answers_json": answers_json,
        "final_answer_json": json.dumps({"latex": "x = 4", "is_correct": True}),
        "feedback_json": json.dumps({"message": "Correct"}),
        "metadata_json": json.dumps({})
    }])
    
    # 2. Run Training Data Collection (AC-1)
    report = collect_training_data()
    assert report["status"] == "success"
    assert report["collected_samples"] >= 1
    
    training_table = db.open_table("training_data")
    samples = training_table.search().where(f"source_id = '{answer_id}'").to_list()
    assert len(samples) == 1
    sample = samples[0]
    assert sample["ground_truth_text"] == "x = 4"
    assert len(sample["handwriting_image_png"]) > 0
    
    # 3. Data Augmentation (AC-2)
    train_set, val_set = augment_training_data([sample], multiplier=2)
    assert len(train_set) == 3 # original + 2 augmented
    
    # 4. Tesstrain preparation and execution (AC-3)
    temp_train_input = os.path.join(DAEMON_DIR, "data", "test_training_input")
    prepare_tesstrain_dataset(train_set, temp_train_input)
    assert os.path.exists(os.path.join(temp_train_input, "eng.handwriting.exp0.tif"))
    assert os.path.exists(os.path.join(temp_train_input, "eng.handwriting.exp0.box"))
    
    model_output_path = os.path.join(DAEMON_DIR, "data", "models", "eng_test_fine_tuned.traineddata")
    res = run_tesseract_training(temp_train_input, model_output_path, epochs=10, is_mini=True)
    assert res["status"] == "success"
    assert os.path.exists(model_output_path)
    
    # 5. Evaluate and deploy (AC-4, AC-5)
    comp = compare_models(["x = l"], ["x = 4"], ["x = 4"])
    assert comp["baseline"]["wer_percent"] > 0
    assert comp["fine_tuned"]["wer_percent"] == 0
    assert comp["improvement"]["wer_reduction_percent"] == 100.0
    
    # Run full monthly pipeline in mini mode
    pipeline_res = run_monthly_finetuning_pipeline(is_mini=True)
    assert pipeline_res["status"] == "completed"
    
    status_path = get_status_json_path()
    assert os.path.exists(status_path)
    with open(status_path, "r") as f:
        status_data = json.load(f)
    assert "current_model" in status_data
    assert len(status_data["history"]) > 0
    
    # Cleanup test files
    if os.path.exists(strokes_file):
        os.remove(strokes_file)
    if os.path.exists(temp_train_input):
        shutil.rmtree(temp_train_input)
