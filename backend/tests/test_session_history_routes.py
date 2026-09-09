import os
import sys
import uuid
import tempfile
import shutil
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, runtime_agent
from auth_service import encode_jwt

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = encode_jwt({"user_id": "test_agent_user", "email": "agent@archon.local", "role": "student"})
    return {"Authorization": f"Bearer {token}"}

class TestSessionHistoryRoutes:
    def test_list_agent_sessions_empty_or_populated(self, auth_headers):
        response = client.get("/agents/sessions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)

    def test_session_history_lifecycle(self, auth_headers):
        task_id = f"test_task_history_{uuid.uuid4().hex[:8]}"
        
        # 1. Nonexistent task history returns 404
        response = client.get(f"/agents/sessions/{task_id}/history", headers=auth_headers)
        assert response.status_code == 404
        assert "No session found" in response.json()["detail"]

        # 2. Populate journal steps
        runtime_agent.journal.start_run(task_id)
        runtime_agent.journal.log_step(
            task_id=task_id,
            step_index=1,
            agent_name="Reader",
            node_name="reader_node",
            input_payload={"task": "Design architecture"},
            output_payload={"plan": "Step 1, Step 2"},
            status="completed"
        )
        runtime_agent.journal.log_step(
            task_id=task_id,
            step_index=2,
            agent_name="Coder",
            node_name="coder_node",
            input_payload={"plan": "Step 1"},
            output_payload={"code": "def run(): pass"},
            status="completed"
        )
        runtime_agent.journal.complete_run(task_id, "completed")

        # 3. Verify session history endpoint returns steps & checkpoint status
        response = client.get(f"/agents/sessions/{task_id}/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["step_count"] == 2
        assert len(data["steps"]) == 2
        assert data["steps"][0]["agent_name"] == "Reader"
        assert data["steps"][1]["agent_name"] == "Coder"
        assert data["steps"][0]["step_index"] == 1
        assert data["steps"][1]["step_index"] == 2

        # 4. Verify session appears in /agents/sessions list
        response_list = client.get("/agents/sessions?limit=50", headers=auth_headers)
        assert response_list.status_code == 200
        sessions = response_list.json()["sessions"]
        task_ids = [s["task_id"] for s in sessions]
        assert task_id in task_ids

    def test_get_agent_workspace_files(self, tmp_path, monkeypatch):
        # Create mock target files in a temp folder
        plan_dir = tmp_path / "Plan"
        codes_dir = tmp_path / "Codes"
        plan_dir.mkdir(parents=True, exist_ok=True)
        codes_dir.mkdir(parents=True, exist_ok=True)

        plan_md = plan_dir / "current_plan.md"
        plan_md.write_text("# Test Plan Content Custom", encoding="utf-8")

        solution_py = codes_dir / "solution.py"
        solution_py.write_text("print('test custom solution')", encoding="utf-8")

        # Patch WORKSPACE_ROOT in main to empty temp directory so fallback doesn't hit existing project files
        empty_root = tmp_path / "empty_workspace"
        empty_root.mkdir()
        monkeypatch.setattr("main.WORKSPACE_ROOT", str(empty_root))

        response = client.get(f"/agents/files?folder={tmp_path}")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        files_by_path = {f["path"]: f for f in data["files"]}

        # Created files should exist and take folder precedence
        assert "Plan/current_plan.md" in files_by_path
        assert files_by_path["Plan/current_plan.md"]["exists"] is True
        assert "Test Plan Content Custom" in files_by_path["Plan/current_plan.md"]["content"]

        assert "Codes/solution.py" in files_by_path
        assert files_by_path["Codes/solution.py"]["exists"] is True
        assert "test custom solution" in files_by_path["Codes/solution.py"]["content"]

        # Missing files should report exists: False
        assert "Plan/current_plan.json" in files_by_path
        assert files_by_path["Plan/current_plan.json"]["exists"] is False
        assert "Logs/dev_log.md" in files_by_path
        assert files_by_path["Logs/dev_log.md"]["exists"] is False

