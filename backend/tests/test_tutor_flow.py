import pytest
import time
import json
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

from main import app
from sympy_validator import validate_math_answer, clean_latex, parse_latex_to_sympy
from sm2_scheduler import calculate_sm2, map_score_to_quality
from socratic_agent import SocraticAgent

client = TestClient(app)

# ----------------- Unit Tests -----------------

def test_clean_latex():
    assert clean_latex("$2x + 5 = 13$") == "2x + 5 = 13"
    assert clean_latex("\\left( x \\right)") == "( x )"

def test_sympy_validator_algebra():
    # Correct answer Eq
    res = validate_math_answer("x = 4", "x = 4", "algebra")
    assert res.is_correct == True
    
    # Correct answer expression (student gives LHS too)
    res2 = validate_math_answer("x = 4", "4", "algebra")
    assert res2.is_correct == True

    # Incorrect answer
    res3 = validate_math_answer("x = 5", "x = 4", "algebra")
    assert res3.is_correct == False
    assert res3.error_type == "SIGN_ERROR" or res3.error_type == "OTHER_ERROR"

def test_sympy_validator_integration():
    # Correct integration with constant C
    res = validate_math_answer("x^2 + C", "x^2 + C", "integration", integrand="2*x")
    assert res.is_correct == True

    # Correct integration but missing C
    res2 = validate_math_answer("x^2", "x^2 + C", "integration", integrand="2*x")
    assert res2.is_correct == False
    assert res2.is_partial == True
    assert res2.error_type == "MISSING_CONSTANT"

def test_sm2_scheduler():
    # quality < 3: reset repetitions, interval = 1
    res = calculate_sm2(quality=2, ease=2.5, repetitions=2, interval=6)
    assert res["repetitions"] == 0
    assert res["interval"] == 1
    
    # quality >= 3: repetitions incremented
    res2 = calculate_sm2(quality=5, ease=2.5, repetitions=0, interval=0)
    assert res2["repetitions"] == 1
    assert res2["interval"] == 1

    res3 = calculate_sm2(quality=5, ease=2.5, repetitions=1, interval=1)
    assert res3["repetitions"] == 2
    assert res3["interval"] == 3

    res4 = calculate_sm2(quality=5, ease=2.5, repetitions=2, interval=3)
    assert res4["repetitions"] == 3
    assert res4["interval"] == 8  # 3 * 2.5 = 7.5 -> round to 8

def test_map_score_to_quality():
    assert map_score_to_quality(is_correct=True, hints_requested=0) == 5
    assert map_score_to_quality(is_correct=True, hints_requested=1) == 4
    assert map_score_to_quality(is_correct=True, hints_requested=2) == 3
    assert map_score_to_quality(is_correct=False, hints_requested=0, score=0.5) == 2
    assert map_score_to_quality(is_correct=False, hints_requested=1, score=0.0) == 0

@pytest.mark.asyncio
async def test_socratic_agent():
    mock_router = MagicMock()
    
    # Mock LLM completions
    async def mock_gen(tier, messages, **kwargs):
        # We look at messages to determine which agent is calling
        system = messages[0]["content"]
        if "Error Analyzer" in system:
            yield '{"error_type": "SIGN_ERROR"}'
        elif "Hint Generator" in system:
            yield "Check your negative sign on 4."
        elif "Validator" in system:
            yield "SAFE"
        elif "Tutor" in system:
            yield "Check your negative sign on 4. Did you make a typo?"

    mock_router.generate.side_effect = mock_gen
    
    agent = SocraticAgent(mock_router)
    hint = await agent.generate_socratic_hint(
        question_text="Solve for x: x + 4 = 0",
        expected_answer_latex="x = -4",
        student_answer_latex="x = 4",
        error_type="SIGN_ERROR",
        level=2
    )
    assert "sign" in hint.lower()

# ----------------- Integration / API Tests -----------------

def test_api_tutor_mode_workflow():
    notebook_id = "default_notebook"
    
    # 1. Get Questions
    response = client.get(f"/notebooks/{notebook_id}/quiz-questions")
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) > 0
    question = questions[0]
    q_id = question["question_id"]
    
    # 2. Start Attempt
    response = client.post(f"/notebooks/{notebook_id}/quiz-attempts?question_id={q_id}")
    assert response.status_code == 200
    attempt = response.json()
    attempt_id = attempt["attempt_id"]
    assert attempt["status"] == "started"
    
    # 3. Submit Incorrect Answer
    response = client.post(
        f"/quiz-attempts/{attempt_id}/answers",
        json={
            "question_id": q_id,
            "student_answer_latex": "x = 99",
            "time_spent_seconds": 15
        }
    )
    assert response.status_code == 200
    answer_res = response.json()
    assert answer_res["is_correct"] == False
    
    # 4. Request Hint
    with patch("tutor_routes.socratic_agent") as mock_socratic:
        mock_socratic.generate_socratic_hint = AsyncMock(return_value="Check your signs!")
        
        response = client.post(
            f"/quiz-attempts/{attempt_id}/hints",
            json={
                "question_id": q_id,
                "student_answer_latex": "x = 99",
                "current_hint_level": 1,
                "error_type": "OTHER_ERROR"
            }
        )
        assert response.status_code == 200
        hint_res = response.json()
        assert hint_res["hint_text"] == "Check your signs!"
        assert hint_res["can_request_stronger_hint"] == True

    # 5. Submit Correct Answer
    response = client.post(
        f"/quiz-attempts/{attempt_id}/answers",
        json={
            "question_id": q_id,
            "student_answer_latex": question["expected_answer_latex"],
            "time_spent_seconds": 10
        }
    )
    assert response.status_code == 200
    answer_res = response.json()
    assert answer_res["is_correct"] == True

    # 6. Finalize Attempt (SM-2 applied)
    response = client.post(f"/quiz-attempts/{attempt_id}/finalize")
    assert response.status_code == 200
    finalize_res = response.json()
    assert finalize_res["status"] == "graded"
    assert "quality_score" in finalize_res
    
    # 7. Check Analytics
    response = client.get(f"/notebooks/{notebook_id}/analytics/summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["total_attempts"] >= 1
    assert summary["overall_accuracy"] > 0.0

    response = client.get(f"/notebooks/{notebook_id}/analytics/by-topic")
    assert response.status_code == 200
    by_topic = response.json()
    assert len(by_topic) > 0

    response = client.get(f"/notebooks/{notebook_id}/analytics/learning-curve")
    assert response.status_code == 200
    curve = response.json()
    assert len(curve) > 0

    response = client.get(f"/notebooks/{notebook_id}/analytics/spaced-repetition-status")
    assert response.status_code == 200
    sr_status = response.json()
    assert "due_today" in sr_status
