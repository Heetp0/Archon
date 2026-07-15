import os
import tempfile
import asyncio
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from ingestion_queue import IngestionQueue

@pytest.mark.asyncio
async def test_concurrency_limit_under_load():
    queue = IngestionQueue()
    queue.start_workers()
    
    active_jobs = 0
    max_active_jobs = 0
    lock = asyncio.Lock()
    
    async def mock_process(job_id, file_path):
        nonlocal active_jobs, max_active_jobs
        async with lock:
            active_jobs += 1
            if active_jobs > max_active_jobs:
                max_active_jobs = active_jobs
        
        await asyncio.sleep(0.1)
        
        async with lock:
            active_jobs -= 1
        return {"status": "success"}
        
    with patch.object(queue, "_process_pdf", mock_process):
        # Queue 5 jobs
        for i in range(5):
            await queue.add_job(
                notebook_id="test-nb",
                source_type="pdf",
                file_path=f"file_{i}.pdf"
            )
            
        # Wait for all jobs to complete
        await queue.queue.join()
        await queue.stop_workers()
        
        assert max_active_jobs == 2

@pytest.mark.asyncio
async def test_pdf_ingestion_pipeline():
    queue = IngestionQueue()
    
    # Create a simple PDF
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.add_blank_page(width=72, height=72)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = os.path.join(tmpdir, "test.pdf")
        with open(pdf_path, "wb") as f:
            writer.write(f)
            
        result = await queue._process_pdf("job-123", pdf_path)
        assert result["total_pages"] == 2
        assert len(result["pages"]) == 2
        assert result["pages"][0]["page_number"] == 1
        assert result["pages"][1]["page_number"] == 2

@pytest.mark.asyncio
async def test_codebase_ingestion_pipeline():
    queue = IngestionQueue()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a mock code file
        file_path = os.path.join(tmpdir, "main.py")
        with open(file_path, "w") as f:
            f.write("print('hello world')")
            
        result = await queue._process_codebase("job-456", tmpdir)
        assert result["total_files"] >= 1
        assert any(chunk["file_path"].endswith("main.py") for chunk in result["chunks"])
        # Find the chunk and verify its text
        for chunk in result["chunks"]:
            if chunk["file_path"].endswith("main.py"):
                assert "print('hello world')" in chunk["text"]

@pytest.mark.asyncio
async def test_audio_ingestion_pipeline():
    queue = IngestionQueue()
    
    # Mock denoise and duration to avoid subprocess shell requirement
    with patch.object(queue, "_denoise_audio_file", return_value=True), \
         patch.object(queue, "_get_audio_duration", return_value=12.5):
         
        result = await queue._process_audio("job-789", "dummy.wav")
        assert result["total_duration"] == 12.5
        assert len(result["segments"]) == 2
        assert result["segments"][0]["speaker"] == "Speaker 1"
        assert result["segments"][0]["start_time"] == 0.0
        assert result["segments"][0]["end_time"] == 5.0
        assert result["segments"][1]["speaker"] == "Speaker 2"
        assert result["segments"][1]["start_time"] == 5.0
        assert result["segments"][1]["end_time"] == 10.0

def test_api_endpoints():
    with TestClient(app) as tc:
        # Post a job
        payload = {
            "source_type": "pdf",
            "file_path": "dummy.pdf",
            "metadata": {"title": "Test PDF"}
        }
        response = tc.post("/notebooks/nb-123/sources", json=payload)
        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        job_id = data["job_id"]
        
        # Get status
        response = tc.get(f"/jobs/{job_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == job_id
        assert data["notebook_id"] == "nb-123"
        assert data["status"] in ("pending", "running", "completed", "failed")