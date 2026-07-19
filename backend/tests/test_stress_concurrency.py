import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
import time
import pytest
import httpx
from unittest.mock import patch
from main import app, ingestion_queue
from ingestion_queue import IngestionQueue

@pytest.mark.asyncio
async def test_direct_queue_concurrency_stress():
    """
    Directly tests the IngestionQueue class concurrency limit.
    Enqueues 10 jobs.
    Checks that no more than 2 jobs are processed at any given instant.
    Checks that some jobs can fail gracefully, while others succeed.
    """
    queue = IngestionQueue()
    queue.start_workers()
    
    active_jobs = 0
    max_active_jobs = 0
    lock = asyncio.Lock()
    processed_count = 0
    failed_count = 0
    
    async def mock_process_pdf(job_id, file_path):
        nonlocal active_jobs, max_active_jobs, processed_count, failed_count
        async with lock:
            active_jobs += 1
            if active_jobs > max_active_jobs:
                max_active_jobs = active_jobs
        
        # Simulate some processing delay
        await asyncio.sleep(0.1)
        
        async with lock:
            active_jobs -= 1
            # Make jobs with odd indices fail, even indices succeed
            # to verify graceful error handling under load
            job_index = int(file_path.split("_")[-1].split(".")[0])
            if job_index % 2 == 1:
                failed_count += 1
                raise ValueError(f"Graceful error for job {job_index}")
            else:
                processed_count += 1
                
        return {"status": "success", "index": job_index}
        
    with patch.object(queue, "_process_pdf", mock_process_pdf):
        # Queue 10 jobs
        for i in range(10):
            await queue.add_job(
                notebook_id="test-nb-direct",
                source_type="pdf",
                file_path=f"file_{i}.pdf"
            )
            
        # Wait for all jobs in the queue to be completed
        await queue.queue.join()
        await queue.stop_workers()
        
        # Verify concurrency limit
        assert max_active_jobs <= 2, f"Expected concurrency <= 2, got {max_active_jobs}"
        assert processed_count == 5, f"Expected 5 successful jobs, got {processed_count}"
        assert failed_count == 5, f"Expected 5 failed jobs, got {failed_count}"
        
        # Verify job statuses in queue.jobs
        for i in range(10):
            job_id = list(queue.jobs.keys())[i]
            job = queue.jobs[job_id]
            if i % 2 == 1:
                assert job["status"] == "failed"
                assert "Graceful error" in job["error"]
            else:
                assert job["status"] == "completed"
                assert job["result"]["status"] == "success"

@pytest.mark.asyncio
async def test_api_queue_concurrency_stress():
    """
    Tests the FastAPI app endpoints under stress.
    Enqueues 10 jobs via POST requests concurrently.
    Polls the GET /jobs/{job_id} endpoint to track statuses and assert concurrency <= 2.
    """
    # We will patch the main app's ingestion_queue _process_pdf
    active_jobs = 0
    max_active_jobs = 0
    lock = asyncio.Lock()
    
    async def mock_process_pdf(job_id, file_path):
        nonlocal active_jobs, max_active_jobs
        async with lock:
            active_jobs += 1
            if active_jobs > max_active_jobs:
                max_active_jobs = active_jobs
                
        # Simulate processing delay
        await asyncio.sleep(0.1)
        
        async with lock:
            active_jobs -= 1
        
        # Mock successful or failed processing
        job_index = int(file_path.split("_")[-1].split(".")[0])
        if job_index == 9:
            # Let's fail one job to check error handling in the API
            raise ValueError("API job failed gracefully")
        return {"status": "success", "index": job_index}
        
    with patch.object(ingestion_queue, "_process_pdf", mock_process_pdf):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # 1. Enqueue 10 jobs concurrently
            tasks = []
            for i in range(10):
                payload = {
                    "source_type": "pdf",
                    "file_path": f"file_{i}.pdf",
                    "metadata": {}
                }
                tasks.append(client.post("/notebooks/test-nb-api/sources", json=payload))
            
            responses = await asyncio.gather(*tasks)
            job_ids = []
            for r in responses:
                assert r.status_code == 202
                data = r.json()
                assert "job_id" in data
                job_ids.append(data["job_id"])
                
            # 2. Poll job statuses concurrently to measure active running jobs
            # and verify concurrency never exceeds 2
            running_counts = []
            completed_jobs = set()
            
            while len(completed_jobs) < 10:
                poll_tasks = [client.get(f"/jobs/{jid}") for jid in job_ids]
                poll_responses = await asyncio.gather(*poll_tasks)
                
                current_running = 0
                for r in poll_responses:
                    assert r.status_code == 200
                    job = r.json()
                    status = job["status"]
                    if status == "running":
                        current_running += 1
                    if status in ("completed", "failed"):
                        completed_jobs.add(job["job_id"])
                        
                running_counts.append(current_running)
                await asyncio.sleep(0.02)
                
            # Verify concurrency from timeline checks
            max_observed_concurrency = max(running_counts) if running_counts else 0
            assert max_observed_concurrency <= 2, f"Observed API concurrency was {max_observed_concurrency}, expected <= 2"
            assert max_active_jobs <= 2, f"Max active jobs executing in parallel was {max_active_jobs}, expected <= 2"
            
            # Verify all completed/failed
            for jid in job_ids:
                status_res = await client.get(f"/jobs/{jid}")
                job_data = status_res.json()
                if job_data["file_path"] == "file_9.pdf":
                    assert job_data["status"] == "failed"
                    assert "API job failed gracefully" in job_data["error"]
                else:
                    assert job_data["status"] == "completed"
                    assert job_data["result"]["status"] == "success"
