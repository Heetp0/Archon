import sys
import os
import tempfile
import base64
import logging
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch('chat_agent.ChatAgent.run')
def test_corrupted_base64(mock_chat_run, caplog):
    # 'a' is length 1 which causes binascii.Error: number of data characters cannot be 1 more than a multiple of 4
    attachments_payload = [
        {"name": "corrupt.txt", "content": "a"}
    ]
    with caplog.at_level(logging.ERROR):
        with client.websocket_connect("/ws") as websocket:
            websocket.send_json({
                "id": "req-corrupt",
                "mode": "chat",
                "type": "chat",
                "payload": {
                    "text": "hello",
                    "context": {
                        "attachments": attachments_payload
                    }
                }
            })
            data = websocket.receive_json()
            # The request succeeds overall because exception in decode is caught
            assert data["id"] == "req-corrupt"
            
    # Verify error was logged cleanly
    assert any("Failed to decode base64 for file corrupt.txt" in record.message for record in caplog.records)
    
    # Check that mock chat run was called, and file was written as empty
    mock_chat_run.assert_called_once()
    called_payload = mock_chat_run.call_args[0][0]
    local_paths = called_payload["context"]["attachments"]
    assert len(local_paths) == 1
    file_path = local_paths[0]
    assert os.path.exists(file_path)
    assert os.path.getsize(file_path) == 0
    # Cleanup
    if os.path.exists(file_path):
        os.remove(file_path)


@patch('chat_agent.ChatAgent.run')
def test_special_characters_path_traversal(mock_chat_run):
    attachments_payload = [
        {"name": "../../traversal_attack.txt", "content": "SGVsbG8="}
    ]
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({
            "id": "req-traversal",
            "mode": "chat",
            "type": "chat",
            "payload": {
                "text": "hello",
                "context": {
                    "attachments": attachments_payload
                }
            }
        })
        data = websocket.receive_json()
        assert data["id"] == "req-traversal"
        
    mock_chat_run.assert_called_once()
    called_payload = mock_chat_run.call_args[0][0]
    local_paths = called_payload["context"]["attachments"]
    assert len(local_paths) == 1
    file_path = local_paths[0]
    
    # Verify that the file exists
    assert os.path.exists(file_path)
    
    # Resolve the path to check if it's outside the unique temp directory
    real_file_path = os.path.realpath(file_path)
    parent_dir = os.path.dirname(real_file_path)
    
    # The parent of the file should NOT contain the unique prefix archon_attach_
    # because it has traversed up to the system Temp directory or similar parent.
    assert "archon_attach_" not in os.path.basename(parent_dir)
    
    # Clean up the traversal file
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass


@patch('chat_agent.ChatAgent.run')
def test_special_characters_invalid_filename(mock_chat_run):
    attachments_payload = [
        {"name": "invalid|char<dir>/file.txt", "content": "SGVsbG8="}
    ]
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({
            "id": "req-invalid-char",
            "mode": "chat",
            "type": "chat",
            "payload": {
                "text": "hello",
                "context": {
                    "attachments": attachments_payload
                }
            }
        })
        # The daemon encounters OSError/WinError when trying to create/write the file
        # and returns an error response with id 'unknown'
        data = websocket.receive_json()
        assert data["id"] == "unknown"
        assert data["event"] == "error"
        assert "error" in data["payload"]
        assert "syntax is incorrect" in data["payload"]["error"] or "WinError" in data["payload"]["error"] or "invalid" in data["payload"]["error"].lower()


@patch('chat_agent.ChatAgent.run')
def test_empty_filename(mock_chat_run):
    attachments_payload = [
        {"name": "", "content": "SGVsbG8="}
    ]
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({
            "id": "req-empty-name",
            "mode": "chat",
            "type": "chat",
            "payload": {
                "text": "hello",
                "context": {
                    "attachments": attachments_payload
                }
            }
        })
        data = websocket.receive_json()
        assert data["id"] == "unknown"
        assert data["event"] == "error"
        assert "error" in data["payload"]
        # On Windows, attempting to write to the temp directory path as a file will raise PermissionError or FileNotFoundError
        assert any(x in data["payload"]["error"] for x in ["PermissionError", "Permission denied", "No such file or directory", "Errno 2"])


@patch('chat_agent.ChatAgent.run')
def test_huge_file_attachment(mock_chat_run):
    # 12MB of valid base64 (repeating "A" is valid base64)
    large_content = "A" * (12 * 1024 * 1024)
    attachments_payload = [
        {"name": "huge.txt", "content": large_content}
    ]
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({
            "id": "req-huge",
            "mode": "chat",
            "type": "chat",
            "payload": {
                "text": "hello",
                "context": {
                    "attachments": attachments_payload
                }
            }
        })
        data = websocket.receive_json()
        assert data["id"] == "req-huge"
        
    mock_chat_run.assert_called_once()
    called_payload = mock_chat_run.call_args[0][0]
    local_paths = called_payload["context"]["attachments"]
    assert len(local_paths) == 1
    file_path = local_paths[0]
    assert os.path.exists(file_path)
    
    # 12MB base64 decodes to 9MB bytes
    expected_size = 9 * 1024 * 1024
    assert os.path.getsize(file_path) == expected_size
    
    # Clean up the huge file and its parent temp dir
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            os.rmdir(os.path.dirname(file_path))
        except Exception:
            pass
