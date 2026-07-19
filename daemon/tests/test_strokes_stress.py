import os
import sys
import time
import socket
import asyncio
import subprocess
import pytest
from concurrent.futures import ThreadPoolExecutor
import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app
import notebook_routes

# Helper to find a free port
def get_free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port

# Clean up strokes dir helper
def clean_up_page(page_id):
    file_path = os.path.join(notebook_routes.STROKES_DIR, f"{page_id}.bin")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Warning: Failed to remove {file_path}: {e}")

# --- 1. In-process Asyncio Concurrency Tests ---
@pytest.mark.anyio
async def test_async_concurrency_same_page():
    page_id = "test_async_con_same"
    clean_up_page(page_id)
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        async def post_task(i):
            payload = f"stroke_data_{i}".encode('utf-8')
            response = await client.post(f"/notebook/pages/{page_id}/strokes", content=payload)
            return response

        tasks = [post_task(i) for i in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify no exceptions were raised and all returned 200
        for r in results:
            assert not isinstance(r, Exception), f"Request raised exception: {r}"
            assert r.status_code == 200
            
    # Verify we can GET the file and it has the last written content
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        get_response = await client.get(f"/notebook/pages/{page_id}/strokes")
        assert get_response.status_code == 200
        content = get_response.content.decode('utf-8')
        assert content.startswith("stroke_data_")
        
    clean_up_page(page_id)

@pytest.mark.anyio
async def test_async_concurrency_diff_pages():
    page_ids = [f"test_async_con_diff_{i}" for i in range(20)]
    for pid in page_ids:
        clean_up_page(pid)
        
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        async def post_task(pid, i):
            payload = f"stroke_data_{pid}_{i}".encode('utf-8')
            response = await client.post(f"/notebook/pages/{pid}/strokes", content=payload)
            return response

        tasks = [post_task(page_ids[i % len(page_ids)], i) for i in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for r in results:
            assert not isinstance(r, Exception), f"Request raised exception: {r}"
            assert r.status_code == 200
            
    for pid in page_ids:
        clean_up_page(pid)


# --- 2. In-process Thread-based Concurrency Tests ---
def test_thread_concurrency_same_page():
    page_id = "test_thread_con_same"
    clean_up_page(page_id)
    
    client = TestClient(app)
    
    def post_call(i):
        payload = f"thread_data_{i}".encode('utf-8')
        return client.post(f"/notebook/pages/{page_id}/strokes", content=payload)
        
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(post_call, i) for i in range(50)]
        results = [f.result() for f in futures]
        
    for r in results:
        assert r.status_code == 200
        
    # Get and check content
    get_response = client.get(f"/notebook/pages/{page_id}/strokes")
    assert get_response.status_code == 200
    assert get_response.content.decode('utf-8').startswith("thread_data_")
    
    clean_up_page(page_id)


# --- 3. Out-of-process Server Concurrency Tests (Real HTTP) ---
def test_real_server_concurrency():
    port = get_free_port()
    env = os.environ.copy()
    env['PYTHONPATH'] = os.path.abspath('daemon')
    env['WORKSPACE_ROOT'] = os.path.abspath('daemon/data/test_workspace')
    
    # Spawn uvicorn subprocess using virtualenv python executable
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd="daemon",
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for the server to spin up
    url = f"http://127.0.0.1:{port}"
    max_retries = 30
    connected = False
    for _ in range(max_retries):
        try:
            with httpx.Client() as client:
                res = client.get(f"{url}/notebook/pages/healthcheck/strokes")
                if res.status_code in [400, 404]:
                    connected = True
                    break
        except Exception:
            pass
        time.sleep(0.2)
        
    if not connected:
        proc.terminate()
        stdout, stderr = proc.communicate(timeout=5)
        pytest.fail(f"Server failed to start on port {port}. Stdout: {stdout}, Stderr: {stderr}")
        
    page_id = "test_real_server_con_same"
    clean_up_page(page_id)
    
    # We will run mixed GET and POST requests in parallel threads
    client = httpx.Client()
    
    def post_call(i):
        payload = f"real_server_data_{i}".encode('utf-8')
        try:
            return client.post(f"{url}/notebook/pages/{page_id}/strokes", content=payload, timeout=10.0)
        except Exception as e:
            return e
            
    def get_call(i):
        try:
            return client.get(f"{url}/notebook/pages/{page_id}/strokes", timeout=10.0)
        except Exception as e:
            return e

    # Mix of POSTs and GETs running concurrently - reduce request load to 30 to avoid over-saturating single-thread event loop
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for i in range(30):
            if i % 2 == 0:
                futures.append(executor.submit(post_call, i))
            else:
                futures.append(executor.submit(get_call, i))
                
        results = [f.result() for f in futures]
        
    # Shutdown server
    proc.terminate()
    stdout, stderr = "", ""
    try:
        stdout, stderr = proc.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()
        
    # Print server logs for visibility
    print("\n--- Uvicorn Server Stdout ---")
    print(stdout)
    print("--- Uvicorn Server Stderr ---")
    print(stderr)
    print("-----------------------------\n")
    
    # Check results
    exceptions = [r for r in results if isinstance(r, Exception)]
    responses = [r for r in results if not isinstance(r, Exception)]
    
    assert len(exceptions) == 0, f"Concurrent requests raised exceptions: {exceptions}"
    
    for r in responses:
        assert r.status_code in [200, 404], f"Unexpected status code {r.status_code}: {r.text}"
        
    clean_up_page(page_id)


# --- 4. Robustness and Empty Payload Tests ---
def test_strokes_robustness_empty_payload():
    page_id = "test_robust_empty"
    clean_up_page(page_id)
    
    client = TestClient(app)
    
    # 1. POST empty payload (body = b"")
    res = client.post(f"/notebook/pages/{page_id}/strokes", content=b"")
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert data['bytes_written'] == 0
    
    # Verify file exists and is of size 0
    file_path = os.path.join(notebook_routes.STROKES_DIR, f"{page_id}.bin")
    assert os.path.exists(file_path)
    assert os.path.getsize(file_path) == 0
    
    # 2. GET empty payload
    res_get = client.get(f"/notebook/pages/{page_id}/strokes")
    assert res_get.status_code == 200
    assert res_get.content == b""
    
    clean_up_page(page_id)

if __name__ == '__main__':
    # Allow running the script directly
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args()
    
    if args.run:
        print("Running tests manually...")
        try:
            print("Running test_strokes_robustness_empty_payload...")
            test_strokes_robustness_empty_payload()
            print("Running test_thread_concurrency_same_page...")
            test_thread_concurrency_same_page()
            print("Running test_real_server_concurrency...")
            test_real_server_concurrency()
            print("Running async tests...")
            asyncio.run(test_async_concurrency_same_page())
            asyncio.run(test_async_concurrency_diff_pages())
            print("All tests passed manually!")
        except Exception as e:
            import traceback
            traceback.print_exc()
            sys.exit(1)
