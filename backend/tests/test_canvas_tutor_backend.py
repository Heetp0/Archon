import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

# Import app to test endpoints
from main import app
from socratic_agent import SocraticAgent

client = TestClient(app)

@pytest.fixture
def mock_router():
    router = MagicMock()
    # Mock the fast tier generation yielding text chunks
    async def mock_generate(*args, **kwargs):
        yield '{"is_correct": true, "socratic_hint": "Good job!", "can_advance": true}'
    router.generate = mock_generate
    return router

@pytest.mark.asyncio
async def test_socratic_agent_tiers(mock_router):
    agent = SocraticAgent(mock_router)
    
    with patch.object(agent, '_call_llm', new_callable=AsyncMock) as mock_call:
        mock_call.return_value = '{"hint": "Try factoring out x", "tier": 2, "is_spoiler": false}'
        response = await agent.generate_scaffold(
            student_error="I got x^2 + 2x, what next?",
            expected_answer="x(x + 2)",
            tier=2
        )
        assert "hint" in response
        assert response["tier"] == 2

def test_canvas_evaluate_strokes():
    # Use sync context for test client
    with patch('myscript_client.MyScriptClient') as mock_myscript_class, \
         patch('sympy_validator.validate_math_answer') as mock_sympy, \
         patch('tutor_routes.socratic_agent', MagicMock()) as mock_socratic:
        
        # Mock myscript and sympy functions
        mock_myscript_instance = MagicMock()
        mock_myscript_instance.recognize_strokes.return_value = {"math_latex": "x^2 + 2x"}
        mock_myscript_class.return_value = mock_myscript_instance
        mock_validation = MagicMock()
        mock_validation.is_equivalent = True
        mock_sympy.return_value = mock_validation
        
        mock_socratic.generate_scaffold = AsyncMock(return_value={"hint": "hint text", "tier": 1, "is_spoiler": False})
        
        response = client.post(
            "/canvas/evaluate-strokes",
            json={
                "stroke_data": [{"x": [1,2], "y": [1,2]}],
                "question_id": "q1"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "is_correct" in data
        assert "socratic_hint" in data
        assert "can_advance" in data

def test_generate_lesson_stream():
    with patch('lesson_routes.lesson_manager') as mock_manager:
        mock_manager.generate_lesson = AsyncMock(return_value={
            "lesson_id": "l1",
            "content": "Markdown theory...",
            "checkpoints": [{"checkpoint_id": "c1", "prompt_markdown": "Solve for x"}]
        })
        
        response = client.post(
            "/tutor/notebooks/nb1/lessons/generate",
            json={"topic": "Algebra Basics", "difficulty": "beginner"}
        )
        assert response.status_code == 200
        assert "lesson_id" in response.json()
        assert "checkpoints" in response.json()

def test_verify_checkpoint():
    with patch('lesson_routes.lesson_manager') as mock_manager:
        mock_manager.verify_checkpoint = AsyncMock(return_value={
            "is_correct": True,
            "feedback": "Correct!",
            "next_checkpoint_unlocked": True
        })
        
        response = client.post(
            "/tutor/lessons/l1/checkpoints/c1/verify",
            json={"student_answer": "x=2"}
        )
        assert response.status_code == 200
        assert response.json()["is_correct"] == True

def test_tutor_chat():
    with patch('tutor_routes.socratic_agent', MagicMock()) as mock_socratic:
        mock_socratic.chat_with_tutor = AsyncMock(return_value={"reply": "Let's review the notes..."})
        
        response = client.post(
            "/chat",
            json={
                "message": "I don't understand this.",
                "lesson_id": "l1",
                "checkpoint_id": "c1",
                "notebook_id": "nb1"
            }
        )
        assert response.status_code == 200
        assert "reply" in response.json()
