import sys
import os
import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
import main
import notebook_routes

client = TestClient(app)

# Pre-populate active_notebooks for tests that use hardcoded IDs
notebook_routes.active_notebooks["nb-123"] = {
    "notebook_id": "nb-123",
    "name": "Test Notebook",
    "created_at": 12345.0,
    "sources": []
}
notebook_routes.active_notebooks["notebook-123"] = {
    "notebook_id": "notebook-123",
    "name": "Test Notebook",
    "created_at": 12345.0,
    "sources": []
}

def test_create_notebook():
    response = client.post("/notebooks")
    assert response.status_code == 200
    data = response.json()
    assert "notebook_id" in data
    assert isinstance(data["notebook_id"], str)

def test_add_source():
    with patch.object(main.ingestion_queue, "add_job", new_callable=AsyncMock) as mock_add_job:
        mock_add_job.return_value = "mocked-job-id"
        payload = {
            "source_type": "pdf",
            "file_path": "test_path.pdf",
            "metadata": {"title": "Test PDF"}
        }
        response = client.post("/notebooks/notebook-123/sources", json=payload)
        assert response.status_code == 202
        data = response.json()
        assert data["job_id"] == "mocked-job-id"
        assert data["status"] == "pending"
        mock_add_job.assert_called_once_with(
            notebook_id="notebook-123",
            source_type="pdf",
            file_path="test_path.pdf",
            metadata={"title": "Test PDF"}
        )

def test_get_job_status():
    with patch.object(main.ingestion_queue, "get_status") as mock_get_status:
        mock_get_status.return_value = {
            "job_id": "job-123",
            "notebook_id": "nb-123",
            "status": "completed",
            "progress": 100,
            "result": {"pages": []},
            "error": None
        }
        response = client.get("/jobs/job-123")
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "job-123"
        assert data["status"] == "completed"

def test_list_sources():
    mock_chunks = MagicMock()
    mock_search = MagicMock()
    mock_where = MagicMock()
    
    mock_chunks.search.return_value = mock_search
    mock_search.where.return_value = mock_where
    mock_where.to_list.return_value = [
        {"source_id": "source_1.pdf"},
        {"source_id": "source_2.pdf"},
        {"source_id": "source_1.pdf"}
    ]
    
    with patch.object(notebook_routes, "retriever") as mock_retriever:
        mock_retriever.chunks_table = mock_chunks
        response = client.get("/notebooks/nb-123/sources")
        assert response.status_code == 200
        data = response.json()
        assert data["notebook_id"] == "nb-123"
        assert set(data["sources"]) == {"source_1.pdf", "source_2.pdf"}

def test_grounded_chat_endpoint_non_stream():
    mock_chat = AsyncMock()
    mock_chat.run.return_value = {"response": "This is a grounded response with LaTeX $E=mc^2$.", "citations": []}
    
    with patch.object(notebook_routes, "grounded_chat_agent", new=mock_chat):
        payload = {
            "query": "What is the relation between energy and mass?",
            "command": "derive",
            "stream": False
        }
        response = client.post("/notebooks/nb-123/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "$E=mc^2$" in data["response"]

def test_grounded_chat_endpoint_stream():
    mock_chat = AsyncMock()
    
    async def mock_run(payload, callback):
        await callback("status", {"status": "Searching..."})
        await callback("token", {"text": "Mass "})
        await callback("token", {"text": "energy "})
        await callback("token", {"text": "equivalence."})
        return {"response": "Mass energy equivalence.", "citations": []}
       
    mock_chat.run.side_effect = mock_run
    
    with patch.object(notebook_routes, "grounded_chat_agent", new=mock_chat):
        payload = {
            "query": "Explain mass-energy relationship.",
            "stream": True
        }
        response = client.post("/notebooks/nb-123/chat", json=payload)
        assert response.status_code == 200
        
        lines = response.text.strip().split("\n\n")
        assert len(lines) >= 4
        
        event_0 = json.loads(lines[0].replace("data: ", ""))
        assert event_0["event"] == "status"
        assert event_0["data"]["status"] == "Searching..."
        
        event_1 = json.loads(lines[1].replace("data: ", ""))
        assert event_1["event"] == "token"
        assert event_1["data"]["text"] == "Mass "

def test_generate_studio_artifact_study_guide():
    mock_studio = AsyncMock()
    mock_studio.run.return_value = {"artifact": "# Study Guide\n## Section 1\nQuantum computing is..."}
    
    with patch.object(notebook_routes, "studio_agent", new=mock_studio):
        payload = {
            "query": "quantum computing",
            "stream": False
        }
        response = client.post("/notebooks/nb-123/studio/study_guide", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "artifact" in data
        assert "Section 1" in data["artifact"]

def test_generate_studio_artifact_invalid_type():
    payload = {
        "query": "quantum computing",
        "stream": False
    }
    response = client.post("/notebooks/nb-123/studio/invalid_type", json=payload)
    assert response.status_code == 400
    assert "Invalid 'artifact_type'" in response.json()["detail"]

@pytest.mark.asyncio
async def test_websocket_jobs_ws():
    mock_conn = AsyncMock()
    notebook_routes.job_websocket_manager.active_connections = [mock_conn]
    
    payload = {
        "job_id": "job-123",
        "notebook_id": "nb-123",
        "status": "running",
        "progress": 50,
        "result": None,
        "error": None
    }
    
    await notebook_routes.job_websocket_manager.broadcast_job_update("job_progress", payload)
    mock_conn.send_json.assert_called_once()

@pytest.mark.asyncio
async def test_websocket_notebook_jobs_ws():
    mock_conn = AsyncMock()
    notebook_routes.notebook_job_websocket_manager.active_connections = {"nb-123": [mock_conn]}
    
    payload = {
        "job_id": "job-123",
        "notebook_id": "nb-123",
        "status": "running",
        "progress": 70,
        "result": None,
        "error": None
    }
    
    await notebook_routes.notebook_job_websocket_manager.broadcast_job_update("job_progress", payload)
    mock_conn.send_json.assert_called_once()


def test_strokes_post_and_get_success():
    page_id = 'test_page_123'
    binary_data = bytes([0, 1, 2, 3, 4, 5])
    
    # 1. POST the data
    post_response = client.post(f'/notebook/pages/{page_id}/strokes', content=binary_data)
    assert post_response.status_code == 200
    data = post_response.json()
    assert data['status'] == 'success'
    assert data['page_id'] == page_id
    assert data['bytes_written'] == len(binary_data)
    
    # 2. GET the data
    get_response = client.get(f'/notebook/pages/{page_id}/strokes')
    assert get_response.status_code == 200
    assert get_response.content == binary_data
    
    # Cleanup
    file_path = os.path.join(notebook_routes.STROKES_DIR, f'{page_id}.bin')
    if os.path.exists(file_path):
        os.remove(file_path)

def test_strokes_get_not_found():
    page_id = 'non_existent_page_999'
    
    # Check that file does not exist
    file_path = os.path.join(notebook_routes.STROKES_DIR, f'{page_id}.bin')
    if os.path.exists(file_path):
        os.remove(file_path)
        
    get_response = client.get(f'/notebook/pages/{page_id}/strokes')
    assert get_response.status_code == 404
    assert 'detail' in get_response.json()

def test_strokes_invalid_page_id():
    invalid_page_ids = [
        'page..id',
        'page%2Fid',
        'page%5Cid',
        'page\\id',
        'page id',
        'page%3Fid'
    ]
    for page_id in invalid_page_ids:
        # POST returns 400
        post_response = client.post(f'/notebook/pages/{page_id}/strokes', content=b'data')
        assert post_response.status_code == 400
        
        # GET returns 400
        get_response = client.get(f'/notebook/pages/{page_id}/strokes')
        assert get_response.status_code == 400
