import os
import json
import logging
import asyncio
from typing import Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

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
WORKSPACE_ROOT = config_module.WORKSPACE_ROOT
DAEMON_PORT = config_module.DAEMON_PORT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # Maps request_id -> asyncio.Queue for gating decisions
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
            # Silently discard to prevent crashing the event loop, 
            # allowing the next receive_text to properly throw WebSocketDisconnect
            pass

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
retriever = Retriever(db_path=os.path.join(WORKSPACE_ROOT, ".lancedb"), model_router=router)

ingestion_queue = IngestionQueue(broadcast_callback=unified_broadcast, retriever=retriever)
vault_search = VaultSearch(db_path=os.path.join(WORKSPACE_ROOT, ".lancedb"), vault_path=WORKSPACE_ROOT)
@asynccontextmanager
async def lifespan(app: FastAPI):
    ingestion_queue.start_workers()
    # Index vault on startup in background to avoid blocking
    try:
        logger.info("Starting background vault index...")
        asyncio.create_task(asyncio.to_thread(vault_search.index_vault))
    except Exception as e:
        logger.error(f"Error starting background vault index: {e}")
    yield
    await ingestion_queue.stop_workers()

app = FastAPI(title="Archon Daemon", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

markit_down = MarkitDownNormalizer(cache_dir=os.path.join(WORKSPACE_ROOT, "MarkitCache"))

# Initialize Google Calendar
calendar_service = CalendarService()

# Initialize agents
chat_agent = ChatAgent(router, vault_search, markit_down)
council_agent = CouncilDebate(router, vault_search, markit_down)
research_agent = DeepResearch(router, vault_search, markit_down, manager.active_gates)
runtime_agent = AgentRuntime(router, vault_search, markit_down, manager.active_gates)

@app.get("/models")
async def get_models():
    """Returns all models whose API keys are configured."""
    models = router.get_available_models_list()
    return {"models": models}

@app.get("/calendar/events")
async def get_calendar_events(days: int = 7):
    """Returns upcoming calendar events from Google Calendar (or mock schedule)."""
    events = await calendar_service.get_events(days=days)
    return {"events": events}

@app.post("/settings/api-keys/test")
async def test_api_key(payload: dict):
    """Validates API key formats for major providers before saving."""
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
async def save_api_keys(payload: dict):
    """Writes API keys to .env and sets them in os.environ immediately."""
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
                payload = message.get("payload") or {} or {}
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
                if isinstance(payload, dict):
                    context = payload.get("context")
                    if isinstance(context, dict):
                        attachments = context.get("attachments")
                        if attachments:
                            import tempfile
                            import base64
                            temp_dir = tempfile.mkdtemp(prefix="archon_attach_")
                            local_paths = []
                            for att in attachments:
                                name = att.get("name", "unnamed")
                                content_b64 = att.get("content", "")
                                file_path = os.path.join(temp_dir, name)
                                try:
                                    file_data = base64.b64decode(content_b64)
                                except Exception as decode_err:
                                    logger.error(f"Failed to decode base64 for file {name}: {decode_err}")
                                    file_data = b""
                                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                                with open(file_path, "wb") as f_out:
                                    f_out.write(file_data)
                                local_paths.append(file_path)
                            context["attachments"] = local_paths

                if not req_id:
                    await manager.send_event(websocket, "unknown", "error", {"error": "Missing 'id' in request."})
                    continue

                # Handle gating confirmation/cancel messages
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
                
                # Setup callback for streaming
                async def send_token_callback(event: str, data_payload: Any):
                    await manager.send_event(websocket, req_id, event, data_payload)

                # Initialize gate queue for this request
                manager.active_gates[req_id] = asyncio.Queue()

                # Add request ID into payload so agents can access it
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
                    # Clean up gate queue
                    manager.active_gates.pop(req_id, None)

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


from pydantic import BaseModel, Field

class SourceIngestionRequest(BaseModel):
    source_type: str = Field(..., description="One of 'pdf', 'codebase', 'audio'")
    file_path: str = Field(..., description="Local path or GitHub URL to ingest")
    metadata: dict = Field(default_factory=dict, description="Optional metadata")

@app.post("/notebooks/{notebook_id}/sources", status_code=202)
async def queue_source_ingestion(notebook_id: str, request: SourceIngestionRequest):
    source_type = request.source_type.lower()
    if source_type not in ("pdf", "codebase", "audio"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid source_type. Must be 'pdf', 'codebase', or 'audio'")
    
    job_id = await ingestion_queue.add_job(
        notebook_id=notebook_id,
        source_type=source_type,
        file_path=request.file_path,
        metadata=request.metadata
    )
    return {"job_id": job_id, "status": "pending"}

@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    status = ingestion_queue.get_status(job_id)
    if not status:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return status

# Initialize and register notebook routes
import notebook_routes
notebook_routes.init_notebook_services(router, retriever)
app.include_router(notebook_routes.router)

from fastapi.staticfiles import StaticFiles

# Serve generated audio files from WORKSPACE_ROOT dynamically mounted at /static/audio
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
    uvicorn.run("main:app", host="127.0.0.1", port=DAEMON_PORT, reload=True)






