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
