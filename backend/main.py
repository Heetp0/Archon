import time
import threading
import psutil
import os
import uuid
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import Request, FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
import pyarrow as pa
import lancedb
from datetime import datetime

# Import agent modules
from chat_agent import ChatAgent
from council_debate import CouncilDebate
from deep_research import DeepResearch
from agent_runtime import AgentRuntime
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from calendar_service import CalendarService
from ingestion_queue import IngestionQueue
import config as config_module

# Auth imports
from auth_service import hash_password, verify_password, encode_jwt
from auth_middleware import get_current_user, UserContext

WORKSPACE_ROOT = config_module.WORKSPACE_ROOT
DAEMON_PORT = config_module.DAEMON_PORT
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServerLoadTracker:
    def __init__(self, cache_ttl: float = 10.0):
        self.cache_ttl = cache_ttl
        self.last_update = 0.0
        self.cached_metrics = {
            "cpu_percent": 0.0,
            "ram_percent": 0.0,
            "overall_load": 0.0,
            "timestamp": ""
        }
        self.lock = threading.Lock()

    def get_load(self) -> dict:
        now = time.time()
        with self.lock:
            if now - self.last_update > self.cache_ttl:
                try:
                    cpu = psutil.cpu_percent(interval=None) 
                    ram = psutil.virtual_memory().percent
                    overall = (cpu * 0.6 + ram * 0.4) / 100.0
                    self.cached_metrics = {
                        "cpu_percent": float(cpu),
                        "ram_percent": float(ram),
                        "overall_load": round(float(overall), 3),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    self.last_update = now
                except Exception as e:
                    pass
            return self.cached_metrics

load_tracker = ServerLoadTracker()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.active_gates: Dict[str, asyncio.Queue] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Active connections: {len(self.active_connections)}")

    async def send_event(self, websocket: WebSocket, req_id: str, event_type: str, payload: Any):
        message = {
            "id": req_id,
            "event": event_type,
            "payload": payload
        }
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending event to websocket: {e}")

    async def broadcast(self, event_type: str, payload: Any):
        for connection in list(self.active_connections):
            try:
                await connection.send_json({
                    "id": "broadcast",
                    "event": event_type,
                    "payload": payload
                })
            except Exception:
                pass

manager = ConnectionManager()

async def unified_broadcast(event_type: str, payload: Any):
    await manager.broadcast(event_type, payload)
    try:
        import notebook_routes
        await notebook_routes.job_websocket_manager.broadcast_job_update(event_type, payload)
        await notebook_routes.notebook_job_websocket_manager.broadcast_job_update(event_type, payload)
    except Exception as e:
        logging.getLogger(__name__).error(f"Error in unified broadcast: {e}")

# Initialize core services
router = ModelRouter()
from retriever import Retriever
db_path = os.getenv("LANCEDB_PATH", os.path.join(WORKSPACE_ROOT, ".lancedb"))
retriever = Retriever(db_path=db_path, model_router=router)

ingestion_queue = IngestionQueue(broadcast_callback=unified_broadcast, retriever=retriever)
vault_search = VaultSearch(db_path=db_path, vault_path=WORKSPACE_ROOT)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize users table on startup
    users_schema = pa.schema([
        pa.field("user_id", pa.string()),
        pa.field("email", pa.string()),
        pa.field("password_hash", pa.string()),
        pa.field("role", pa.string()),
        pa.field("created_at", pa.float64())
    ])
    retriever.db.create_table("users", schema=users_schema, exist_ok=True)

    ingestion_queue.start_workers()
    try:
        import notebook_routes
        if notebook_routes.ocr_job_manager:
            notebook_routes.ocr_job_manager.start_workers()
    except Exception as e:
        logger.error(f"Error starting ocr_job_manager: {e}")
    try:
        logger.info("Starting background vault index...")
        asyncio.create_task(asyncio.to_thread(vault_search.index_vault))
    except Exception as e:
        logger.error(f"Error starting background vault index: {e}")
    yield
    await ingestion_queue.stop_workers()
    try:
        import notebook_routes
        if notebook_routes.ocr_job_manager:
            await notebook_routes.ocr_job_manager.stop_workers()
    except Exception as e:
        logger.error(f"Error stopping ocr_job_manager: {e}")

app = FastAPI(title="Archon Daemon", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_server_load_header(request: Request, call_next):
    start_time = time.time()
    
    # Set request state defaults
    request.state.cache_hit = False
    request.state.tokens_used = 0
    request.state.provider_used = ""
    
    metrics = load_tracker.get_load()
    load_val = str(metrics["overall_load"])
    
    response = await call_next(request)
    response.headers["X-Server-Load"] = load_val
    cache_hit = getattr(request.state, "cache_hit", False)
    response.headers["X-Cache-Hit"] = "true" if cache_hit else "false"

    
    latency_ms = (time.time() - start_time) * 1000.0
    path = request.url.path
    if not any(path.startswith(prefix) for prefix in ("/static", "/docs", "/openapi.json", "/health", "/metrics")):
        try:
            import monitoring_metrics
            cache_hit = getattr(request.state, "cache_hit", False)
            tokens_used = getattr(request.state, "tokens_used", 0)
            provider_used = getattr(request.state, "provider_used", "")
            
            monitoring_metrics.record_metric(
                endpoint=path,
                latency_ms=latency_ms,
                tokens_used=tokens_used,
                cache_hit=cache_hit,
                provider_used=provider_used,
                status_code=response.status_code
            )
        except Exception:
            pass
            
    return response

@app.get("/health/load")
async def get_health_load(current_user: UserContext = Depends(get_current_user)):
    return load_tracker.get_load()

@app.get("/health")
async def health_check():
    import health_check
    return await health_check.health_monitor.get_health_status()

markit_down = MarkitDownNormalizer(cache_dir=os.path.join(WORKSPACE_ROOT, "MarkitCache"))
calendar_service = CalendarService()

chat_agent = ChatAgent(router, vault_search, markit_down)
council_agent = CouncilDebate(router, vault_search, markit_down)
research_agent = DeepResearch(router, vault_search, markit_down, manager.active_gates)
runtime_agent = AgentRuntime(router, vault_search, markit_down, manager.active_gates)

# --- Auth Models & Routes ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "student"

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/auth/register")
async def register(req: RegisterRequest):
    try:
        users_table = retriever.db.open_table("users")
    except Exception:
        raise HTTPException(status_code=500, detail="Users database not initialized")

    # Check if user already exists
    existing = users_table.search().where(f"email = '{req.email}'").to_list()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(req.password)
    
    new_user = {
        "user_id": user_id,
        "email": req.email,
        "password_hash": pw_hash,
        "role": req.role,
        "created_at": asyncio.get_event_loop().time()
    }
    
    users_table.add([new_user])
    token = encode_jwt({"user_id": user_id, "email": req.email, "role": req.role})
    return {"token": token, "user": {"user_id": user_id, "email": req.email, "role": req.role}}

@app.post("/auth/login")
async def login(req: LoginRequest):
    try:
        users_table = retriever.db.open_table("users")
    except Exception:
        raise HTTPException(status_code=500, detail="Users database not initialized")

    users = users_table.search().where(f"email = '{req.email}'").to_list()
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    user = users[0]
    if not verify_password(user["password_hash"], req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = encode_jwt({"user_id": user["user_id"], "email": user["email"], "role": user["role"]})
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "role": user["role"]}}

@app.get("/auth/me")
async def get_me(current_user: UserContext = Depends(get_current_user)):
    return {"user_id": current_user.user_id, "email": current_user.email, "role": current_user.role}

# --- Core REST Endpoints ---

@app.get("/models")
async def get_models(current_user: UserContext = Depends(get_current_user)):
    models = router.get_available_models_list()
    return {"models": models}

@app.get("/calendar/events")
async def get_calendar_events(days: int = 7, current_user: UserContext = Depends(get_current_user)):
    events = await calendar_service.get_events(days=days)
    return {"events": events}

@app.post("/settings/api-keys/test")
async def test_api_key(payload: dict, current_user: UserContext = Depends(get_current_user)):
    provider = payload.get("provider", "").lower()
    api_key = payload.get("api_key", "").strip()
    if not api_key:
        return {"success": False, "error": "API key cannot be empty"}
    if provider == "openai" and not api_key.startswith("sk-"):
        return {"success": False, "error": "Invalid OpenAI key format (must start with sk-)"}
    if provider == "anthropic" and not api_key.startswith("sk-ant-"):
        return {"success": False, "error": "Invalid Anthropic key format (must start with sk-ant-)"}
    if provider == "groq" and not api_key.startswith("gsk_"):
        return {"success": False, "error": "Invalid Groq key format (must start with gsk_)"}
    return {"success": True}

@app.post("/settings/api-keys")
async def save_api_keys(payload: dict, current_user: UserContext = Depends(get_current_user)):
    from dotenv import set_key
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    for key, value in payload.items():
        if key.endswith("_API_KEY") or key in ("WORKSPACE_ROOT", "DAEMON_PORT"):
            await asyncio.to_thread(set_key, env_path, key, value)
            os.environ[key] = value
    return {"status": "ok"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                req_id = message.get("id")
                mode = message.get("mode")
                msg_type = message.get("type")
                payload = message.get("payload") or {}
                
                # Compatibility bridge: populate missing content/text/topic keys
                task_text = payload.get("content") or payload.get("text") or payload.get("topic") or ""
                if task_text:
                    if "content" not in payload:
                        payload["content"] = task_text
                    if "text" not in payload:
                        payload["text"] = task_text
                    if "topic" not in payload:
                        payload["topic"] = task_text

                # Intercept context attachments and decode base64
                temp_dir = None
                if isinstance(payload, dict):
                    context = payload.get("context")
                    if isinstance(context, dict):
                        attachments = context.get("attachments")
                        if attachments:
                            import tempfile
                            import base64
                            import shutil
                            temp_dir = tempfile.mkdtemp(prefix="archon_attach_")
                            local_paths = []
                            ALLOWED_EXTS = {'.pdf', '.txt', '.md', '.docx', '.pptx', '.png', '.jpg', '.jpeg'}
                            for att in attachments:
                                name = att.get("name", "unnamed")
                                ext = os.path.splitext(name)[1].lower()
                                if ext not in ALLOWED_EXTS:
                                    logger.error(f"File extension {ext} not allowed for {name}")
                                    if req_id:
                                        await manager.send_event(websocket, req_id, "error", {"error": f"File type {ext} not allowed: {name}"})
                                    continue

                                content_b64 = att.get("content", "")
                                # Fast check string length before decoding
                                if len(content_b64) > 22 * 1024 * 1024:
                                    logger.error(f"File {name} exceeds 16MB limit before decode")
                                    if req_id:
                                        await manager.send_event(websocket, req_id, "error", {"error": f"File {name} exceeds 16MB limit"})
                                    continue
                                    
                                file_path = os.path.join(temp_dir, name)
                                try:
                                    file_data = base64.b64decode(content_b64)
                                    if len(file_data) > 16 * 1024 * 1024:
                                        logger.error(f"File {name} exceeds 16MB limit after decode")
                                        if req_id:
                                            await manager.send_event(websocket, req_id, "error", {"error": f"File {name} exceeds 16MB limit"})
                                        continue
                                except Exception as decode_err:
                                    logger.error(f"Failed to decode base64 for file {name}: {decode_err}")
                                    file_data = b""
                                    continue
                                
                                if not file_data:
                                    continue
                                    
                                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                                with open(file_path, "wb") as f_out:
                                    f_out.write(file_data)
                                local_paths.append(file_path)
                            context["attachments"] = local_paths

                if not req_id:
                    await manager.send_event(websocket, "unknown", "error", {"error": "Missing 'id' in request."})
                    continue

                if msg_type in ["confirm", "cancel"]:
                    if req_id in manager.active_gates:
                        await manager.active_gates[req_id].put({
                            "type": msg_type,
                            "payload": payload
                        })
                    else:
                        await manager.send_event(websocket, req_id, "error", {"error": f"No active gate for request ID: {req_id}"})
                    continue

                if not mode:
                    await manager.send_event(websocket, req_id, "error", {"error": "Missing 'mode' in request."})
                    continue
                
                async def send_token_callback(event: str, data_payload: Any):
                    await manager.send_event(websocket, req_id, event, data_payload)

                manager.active_gates[req_id] = asyncio.Queue()
                payload["req_id"] = req_id

                try:
                    if mode == "chat":
                        await chat_agent.run(payload, send_token_callback)
                    elif mode == "council":
                        await council_agent.run(payload, send_token_callback)
                    elif mode == "research":
                        await research_agent.run(payload, send_token_callback)
                    elif mode == "agent":
                        await runtime_agent.run(payload, send_token_callback)
                    else:
                        await manager.send_event(websocket, req_id, "error", {"error": f"Unsupported mode: {mode}"})
                    
                    await manager.send_event(websocket, req_id, "done", {"status": "success"})
                except Exception as e:
                    logger.error(f"Error executing agent: {e}")
                    await manager.send_event(websocket, req_id, "error", {"error": str(e)})
                finally:
                    manager.active_gates.pop(req_id, None)
                    if temp_dir:
                        import shutil
                        asyncio.create_task(asyncio.to_thread(shutil.rmtree, temp_dir, ignore_errors=True))

            except json.JSONDecodeError:
                await manager.send_event(websocket, "unknown", "error", {"error": "Invalid JSON format."})
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await manager.send_event(websocket, "unknown", "error", {"error": str(e)})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

class SourceIngestionRequest(BaseModel):
    source_type: str = Field(..., description="One of 'pdf', 'codebase', 'audio'")
    file_path: str = Field(..., description="Local path or GitHub URL to ingest")
    metadata: dict = Field(default_factory=dict, description="Optional metadata")

@app.post("/notebooks/{notebook_id}/sources", status_code=202)
async def queue_source_ingestion(notebook_id: str, request: Request, current_user: UserContext = Depends(get_current_user)):
    # Validate access
    import notebook_routes
    notebook_routes.verify_notebook_access(notebook_id, current_user.user_id)
    
    content_type = request.headers.get("content-type", "")
    source_type = None
    file_path = None
    metadata = {}
    
    if "multipart/form-data" in content_type:
        import uuid
        import shutil
        form = await request.form()
        source_type_val = form.get("source_type")
        file_val = form.get("file")
        if not source_type_val or not file_val:
            raise HTTPException(status_code=400, detail="Missing file or source_type in form data")
        
        source_type = str(source_type_val).lower()
        
        # Save file to uploads folder
        from config import UPLOAD_DIR
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = f"{uuid.uuid4()}_{file_val.filename}"
        saved_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file_val.file, buffer)
            
        file_path = saved_path
        metadata = {"filename": file_val.filename}
    else:
        # Assume JSON payload
        try:
            body = await request.json()
            req_obj = SourceIngestionRequest(**body)
            source_type = req_obj.source_type.lower()
            file_path = req_obj.file_path
            metadata = req_obj.metadata
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid payload format: {str(e)}")
            
    if source_type not in ("pdf", "codebase", "audio"):
        raise HTTPException(status_code=400, detail="Invalid source_type. Must be 'pdf', 'codebase', or 'audio'")
    
    job_id = await ingestion_queue.add_job(
        notebook_id=notebook_id,
        source_type=source_type,
        file_path=file_path,
        metadata=metadata
    )
    # Clear notebook cache when a new source is added
    if router and router.cache:
        await router.cache.clear_notebook_cache(notebook_id)
    return {"job_id": job_id, "status": "pending"}

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str, current_user: UserContext = Depends(get_current_user)):
    status = ingestion_queue.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status

# --- News Aggregation Widget Route ---

@app.get("/news")
async def get_news(category: str = "all", limit: int = 10):
    import news_service
    articles = await news_service.aggregate_news()
    
    cat = category.lower()
    if cat != "all":
        # Match source
        source_map = {
            "hackernews": "HackerNews",
            "arxiv": "ArXiv",
            "producthunt": "ProductHunt"
        }
        target_source = source_map.get(cat)
        if target_source:
            articles = [a for a in articles if a["source"] == target_source]
            
    return articles[:limit]



@app.get("/alerts/recent")
async def get_recent_alerts(limit: int = 10, current_user: UserContext = Depends(get_current_user)):
    import scaling_monitor
    scaling_monitor.check_resources()
    return scaling_monitor.get_recent_alerts(limit)

@app.post("/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, current_user: UserContext = Depends(get_current_user)):
    import scaling_monitor
    success = scaling_monitor.acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "success", "alert_id": alert_id}

@app.get("/metrics")
@app.get("/metrics/summary")
async def get_metrics_summary(period: str = "1h", current_user: UserContext = Depends(get_current_user)):
    import monitoring_metrics
    return monitoring_metrics.get_metrics_summary(period)

@app.post("/cache/clear")
async def clear_cache(notebook_id: Optional[str] = None, current_user: UserContext = Depends(get_current_user)):
    if router and router.cache:
        if notebook_id:
            await router.cache.clear_notebook_cache(notebook_id)
            return {"status": "success", "detail": f"Cache cleared for notebook {notebook_id}"}
        else:
            await router.cache.clear_all()
            return {"status": "success", "detail": "Entire semantic cache cleared"}
    raise HTTPException(status_code=500, detail="Cache service not initialized")

# --- Offline Mode & Request Queueing ---

class QueuedRequestInput(BaseModel):
    id: str
    endpoint: str
    method: str
    payload: dict
    user_id: Optional[str] = None

class BatchSyncInput(BaseModel):
    requests: list[QueuedRequestInput]

@app.post("/offline/queue")
async def queue_offline_request(input_data: QueuedRequestInput, current_user: UserContext = Depends(get_current_user)):
    import offline_queue
    target_user_id = input_data.user_id or current_user.user_id
    res = offline_queue.add_to_queue(
        req_id=input_data.id,
        endpoint=input_data.endpoint,
        method=input_data.method,
        payload=input_data.payload,
        user_id=target_user_id
    )
    return res

@app.get("/offline/queue/{user_id}")
async def get_offline_queue(user_id: str, current_user: UserContext = Depends(get_current_user)):
    import offline_queue
    if user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return offline_queue.get_user_queue(user_id)

@app.delete("/offline/queue/{request_id}")
async def delete_offline_request(request_id: str, current_user: UserContext = Depends(get_current_user)):
    import offline_queue
    offline_queue.delete_from_queue(request_id)
    return {"status": "deleted"}

@app.post("/offline/sync")
async def batch_sync(request: Request, input_data: BatchSyncInput, current_user: UserContext = Depends(get_current_user)):
    import offline_queue
    import httpx
    
    auth_header = request.headers.get("Authorization")
    results = []
    
    port = request.url.port or DAEMON_PORT
    host = request.url.hostname or "127.0.0.1"
    async with httpx.AsyncClient(base_url=f"http://{host}:{port}") as client:
        if auth_header:
            client.headers["Authorization"] = auth_header
            
        for req in input_data.requests:
            target_user_id = req.user_id or current_user.user_id
            # Add to local sqlite queue
            offline_queue.add_to_queue(
                req_id=req.id,
                endpoint=req.endpoint,
                method=req.method,
                payload=req.payload,
                user_id=target_user_id
            )
            # Sync
            success = await offline_queue.process_sync(req.id, client)
            results.append({
                "id": req.id,
                "endpoint": req.endpoint,
                "status": "synced" if success else "failed"
            })
    return {"results": results}

@app.post("/ocr")
async def ocr_smoke_endpoint(request: Request, mode: str = "text"):
    body = await request.body()
    from ocr_fallback_manager import OcrFallbackManager
    ocr_manager = OcrFallbackManager()
    return ocr_manager.recognize(body, mode=mode)

@app.get("/queue/status")
async def get_queue_status_endpoint():
    import offline_queue
    count = offline_queue.get_queue_count() if hasattr(offline_queue, "get_queue_count") else 0
    return {"status": "online", "pending_requests": count, "queue_length": count}

@app.post("/queue/sync")
@app.post("/batch_sync")
async def batch_sync_alias(request: Request, input_data: Optional[BatchSyncInput] = None, current_user: UserContext = Depends(get_current_user)):
    if input_data is None:
        try:
            body = await request.json()
            input_data = BatchSyncInput(**body)
        except Exception:
            input_data = BatchSyncInput(requests=[])
    return await batch_sync(request, input_data, current_user)


# Initialize and register notebook routes
import notebook_routes
notebook_routes.init_notebook_services(router, retriever)
app.include_router(notebook_routes.router)

# Initialize and register lecture routes
import lecture_routes
lecture_routes.init_lecture_services(router, retriever)
app.include_router(lecture_routes.router)

# Initialize and register tutor and ocr routes
import tutor_routes
import ocr_routes
tutor_routes.init_tutor_services(router, retriever)
app.include_router(tutor_routes.router)
app.include_router(ocr_routes.router)

from fastapi.staticfiles import StaticFiles

if WORKSPACE_ROOT:
    os.makedirs(WORKSPACE_ROOT, exist_ok=True)
    app.mount("/static/audio", StaticFiles(directory=WORKSPACE_ROOT), name="audio_static")

# Serve built React frontend as static files
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_path):
    class NoCacheStaticFiles(StaticFiles):
        def is_not_modified(self, response_headers, req_headers):
            return False
        def file_response(self, *args, **kwargs):
            resp = super().file_response(*args, **kwargs)
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            resp.headers['Pragma'] = 'no-cache'
            resp.headers['Expires'] = '0'
            return resp

    app.mount("/", NoCacheStaticFiles(directory=static_path, html=True), name="frontend")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=SERVER_HOST, port=DAEMON_PORT, reload=True)



