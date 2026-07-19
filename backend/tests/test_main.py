import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

async def mock_generator(*args, **kwargs):
    yield "Hello "
    yield "from "
    yield "Daemon! "

@patch('model_router.ModelRouter.generate', side_effect=mock_generator)
def test_websocket_handshake(mock_gen):
    with client.websocket_connect("/ws") as websocket:
        # Send a valid message with 'text' in payload
        websocket.send_json({
            "id": "req-123",
            "mode": "chat",
            "type": "chat",
            "payload": {"text": "hello"}
        })
        
        # We expect a 'status' event first: Searching vault context
        data = websocket.receive_json()
        assert data["id"] == "req-123"
        assert data["event"] == "status"
        assert "Searching vault" in data["payload"]["status"]
        
        # Then we expect the next 'status' event: Generating response
        data = websocket.receive_json()
        assert data["id"] == "req-123"
        assert data["event"] == "status"
        assert "Generating response" in data["payload"]["status"]
        
        # Then we expect token events for "Hello from Daemon!"
        expected_tokens = ["Hello ", "from ", "Daemon! "]
        for expected in expected_tokens:
            data = websocket.receive_json()
            assert data["id"] == "req-123"
            assert data["event"] == "token"
            assert data["payload"]["text"] == expected
            
        # Finally a 'done' event
        data = websocket.receive_json()
        assert data["id"] == "req-123"
        assert data["event"] == "done"
        assert data["payload"]["status"] == "success"

def test_websocket_missing_fields():
    with client.websocket_connect("/ws") as websocket:
        # Missing mode
        websocket.send_json({
            "id": "req-124",
            "type": "chat",
            "payload": {}
        })
        
        data = websocket.receive_json()
        assert data["event"] == "error"
        assert "Missing" in data["payload"]["error"]


@patch('chat_agent.ChatAgent.run')
def test_websocket_attachments(mock_chat_run):
    # SGVsbG8gV29ybGQ= is base64 for "Hello World"
    attachments_payload = [
        {"name": "test.txt", "content": "SGVsbG8gV29ybGQ="}
    ]
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({
            "id": "req-999",
            "mode": "chat",
            "type": "chat",
            "payload": {
                "text": "hello",
                "context": {
                    "attachments": attachments_payload
                }
            }
        })
        
        # Expect the 'done' event since the mock runs successfully
        data = websocket.receive_json()
        assert data["id"] == "req-999"
        
        # Verify chat_agent.run was called
        mock_chat_run.assert_called_once()
        called_payload = mock_chat_run.call_args[0][0]
        
        # Check that context.attachments has been converted to local file paths
        assert "context" in called_payload
        assert "attachments" in called_payload["context"]
        local_paths = called_payload["context"]["attachments"]
        assert len(local_paths) == 1
        
        file_path = local_paths[0]
        assert os.path.exists(file_path)
        assert os.path.basename(file_path) == "test.txt"
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert content == "Hello World"
