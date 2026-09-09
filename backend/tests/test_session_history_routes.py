import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app, runtime_agent

client = TestClient(app)

def test_get_agent_workspace_files_empty_or_default():
    response = client.get('/agents/files')
    assert response.status_code == 200
    data = response.json()
    assert 'files' in data
    assert isinstance(data['files'], list)
    assert len(data['files']) == 4
    paths = [f['path'] for f in data['files']]
    assert 'Plan/current_plan.md' in paths
    assert 'Codes/solution.py' in paths

def test_get_agent_session_history_not_found():
    response = client.get('/agents/sessions/nonexistent-task-id-12345/history')
    assert response.status_code == 404

def test_list_agent_sessions():
    response = client.get('/agents/sessions')
    assert response.status_code == 200
    data = response.json()
    assert 'sessions' in data
    assert isinstance(data['sessions'], list)

def test_agent_session_history_roundtrip():
    task_id = 'test-session-history-uuid-999'
    runtime_agent.journal.start_run(task_id)
    runtime_agent.journal.log_step(task_id, 1, 'Planner', 'planner_node', {'goal': 'test'}, {'status': 'planned'})
    
    response = client.get(f'/agents/sessions/{task_id}/history')
    assert response.status_code == 200
    data = response.json()
    assert data['task_id'] == task_id
    assert data['step_count'] >= 1
    assert data['steps'][0]['node_name'] == 'planner_node'
