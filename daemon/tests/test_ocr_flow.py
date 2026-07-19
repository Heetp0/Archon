import os
import struct
import json
import time
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient
import pytest

from main import app
from tesseract_client import deserialize_strokes
from myscript_client import RateLimitException
from ocr_fallback_manager import OcrFallbackManager
from ocr_job_manager import OcrJobManager

def test_deserialize_strokes_empty():
    res = deserialize_strokes(b"")
    assert res == []

def test_deserialize_strokes_valid():
    pt1 = struct.pack('<ffffff', 10.0, 20.0, 0.0, 1.0, 0.0, 0.0)
    pt2 = struct.pack('<ffffff', 11.0, 21.0, 5.0, 1.0, 0.0, 0.0)
    brush = struct.pack('<fqfII', 5.0, 0xFF000000, 0.1, 0, 0)
    
    stroke1 = struct.pack('<II', 52, 2) + pt1 + pt2 + brush
    binary_data = struct.pack('<I', 1) + stroke1
    
    res = deserialize_strokes(binary_data)
    assert len(res) == 1
    stroke = res[0]
    assert len(stroke["points"]) == 2
    assert stroke["points"][0]["x"] == 10.0
    assert stroke["points"][1]["y"] == 21.0
    assert stroke["brush"]["size"] == 5.0
    assert stroke["brush"]["color"] == 0xFF000000

@patch("ocr_fallback_manager.MyScriptClient")
@patch("ocr_fallback_manager.TesseractClient")
def test_ocr_fallback_manager(MockTesseract, MockMyScript):
    myscript_mock = MockMyScript.return_value
    tesseract_mock = MockTesseract.return_value
    
    myscript_mock.app_id = "test_app"
    myscript_mock.hmac_key = "test_key"
    myscript_mock.recognize_strokes.return_value = {
        "text": "E=mc^2",
        "latex": "E=mc^2",
        "confidence": 0.95,
        "tokens": []
    }
    
    pt = struct.pack('<ffffff', 10.0, 20.0, 0.0, 1.0, 0.0, 0.0)
    brush = struct.pack('<fqfII', 5.0, 0xFF000000, 0.1, 0, 0)
    stroke = struct.pack('<II', 28, 1) + pt + brush
    binary_data = struct.pack('<I', 1) + stroke

    manager = OcrFallbackManager()
    res = manager.recognize(binary_data)
    assert res["provider"] == "myscript"
    assert res["text"] == "E=mc^2"
    
    myscript_mock.recognize_strokes.side_effect = RateLimitException("Quota exceeded")
    tesseract_mock.recognize_strokes.return_value = "Tesseract output"
    
    res = manager.recognize(binary_data)
    assert res["provider"] == "tesseract"
    assert res["text"] == "Tesseract output"

@pytest.mark.asyncio
async def test_ocr_job_manager():
    mock_retriever = MagicMock()
    mock_retriever.db = MagicMock()
    
    mock_jobs_table = MagicMock()
    mock_metadata_table = MagicMock()
    mock_corrections_table = MagicMock()
    
    mock_retriever.db.create_table.side_effect = lambda name, **kwargs: {
        "ocr_jobs": mock_jobs_table,
        "ocr_metadata": mock_metadata_table,
        "ocr_corrections": mock_corrections_table
    }[name]

    broadcasts = []
    def mock_broadcast(event, payload):
        broadcasts.append((event, payload))

    manager = OcrJobManager(broadcast_callback=mock_broadcast, retriever=mock_retriever)
    
    manager.fallback_manager.recognize = MagicMock(return_value={
        "text": "recognized formula",
        "latex": "",
        "confidence": 0.8,
        "tokens": [],
        "provider": "myscript"
    })
    
    with patch("ocr_job_manager.ObsidianExporter") as MockExporter:
        DAEMON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.makedirs(os.path.join(DAEMON_DIR, 'data', 'strokes'), exist_ok=True)
        strokes_file = os.path.join(DAEMON_DIR, 'data', 'strokes', 'test_page.bin')
        with open(strokes_file, 'wb') as f:
            f.write(b"\x00\x00\x00\x00")
            
        try:
            job_id = await manager.add_job("test_notebook", "test_page")
            assert job_id is not None
            assert mock_jobs_table.add.called
            
            await manager._process_job(job_id)
            
            assert mock_jobs_table.update.called
            assert mock_metadata_table.add.called
            assert mock_retriever.index_source.called
            assert len(broadcasts) > 0
            
            status = manager.get_status(job_id)
            assert status["status"] == "completed"
            assert status["result"]["text"] == "recognized formula"
        finally:
            if os.path.exists(strokes_file):
                os.remove(strokes_file)

def test_api_endpoints():
    client = TestClient(app)
    
    with patch("notebook_routes.ocr_job_manager") as mock_job_manager:
        mock_job_manager.add_job = AsyncMock(return_value="mock_job_id")
        
        response = client.post(
            "/notebooks/test_notebook/pages/test_page/strokes?ocr_requested=true",
            content=b"\x00\x00\x00\x00",
            headers={"Content-Type": "application/octet-stream"}
        )
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "success"
        assert res["ocr_job_id"] == "mock_job_id"
        
        response = client.post("/notebooks/test_notebook/pages/test_page/ocr")
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "queued"
        assert res["job_id"] == "mock_job_id"
        
        response = client.post(
            "/notebooks/test_notebook/pages/test_page/corrections",
            json={
                "original_token": "original",
                "corrected_token": "corrected",
                "confidence": 0.85
            }
        )
        assert response.status_code == 200
        assert response.json()["status"] == "logged"
        assert mock_job_manager.log_correction.called
