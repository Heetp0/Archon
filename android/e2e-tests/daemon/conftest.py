import os
import shutil
import base64
import pytest
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.testclient import TestClient

app = FastAPI()
DATA_DIR = "e2e_data/strokes"

@app.post("/notebook/pages/{page_id}/strokes")
async def upload_strokes(page_id: str, request: Request):
    content_type = request.headers.get("content-type", "")
    os.makedirs(DATA_DIR, exist_ok=True)
    file_path = os.path.join(DATA_DIR, f"{page_id}.bin")
    
    if "application/octet-stream" in content_type:
        binary_data = await request.body()
        with open(file_path, "wb") as f:
            f.write(binary_data)
        return {"status": "success", "page_id": page_id}
        
    elif "application/json" in content_type:
        try:
            payload = await request.json()
            strokes_b64 = payload.get("strokes", "")
            binary_data = base64.b64decode(strokes_b64)
            with open(file_path, "wb") as f:
                f.write(binary_data)
            return {"status": "success", "page_id": page_id}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 payload: {str(e)}")
    else:
        raise HTTPException(status_code=415, detail="Unsupported media type")

@app.get("/notebook/pages/{page_id}/strokes")
async def get_strokes(page_id: str, request: Request):
    file_path = os.path.join(DATA_DIR, f"{page_id}.bin")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Page not found")
        
    with open(file_path, "rb") as f:
        binary_data = f.read()
        
    accept = request.headers.get("accept", "")
    if "application/octet-stream" in accept:
        return Response(content=binary_data, media_type="application/octet-stream")
    else:
        encoded = base64.b64encode(binary_data).decode("utf-8")
        return {"page_id": page_id, "strokes": encoded}

@pytest.fixture(scope="function")
def client():
    if os.path.exists(DATA_DIR):
        try:
            shutil.rmtree(DATA_DIR)
        except Exception:
            pass
    os.makedirs(DATA_DIR, exist_ok=True)
    
    with TestClient(app) as test_client:
        yield test_client
        
    if os.path.exists(DATA_DIR):
        try:
            shutil.rmtree(DATA_DIR)
        except Exception:
            pass
