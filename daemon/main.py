import os
import json
import logging
import asyncio
from typing import Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# Import agent modules
from chat_agent import ChatAgent
from council_debate import CouncilDebate
from deep_research import DeepResearch
from agent_runtime import AgentRuntime
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
import config as config_module
WORKSPACE_ROOT = config_module.WORKSPACE_ROOT
DAEMON_PORT = config_module.DAEMON_PORT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Archon Daemon")

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

manager = ConnectionManager()

# Initialize core services
router = ModelRouter()
vault_search = VaultSearch(db_path=os.path.join(WORKSPACE_ROOT, ".lancedb"), vault_path=WORKSPACE_ROOT)
# Index vault on startup in background to avoid blocking
import threading
def background_index():
    try:
        logger.info("Starting background vault index...")
        vault_search.index_vault()
        logger.info("Background vault index complete.")
    except Exception as e:
        logger.error(f"Error indexing vault on startup: {e}")

threading.Thread(target=background_index, daemon=True).start()

markit_down = MarkitDownNormalizer(cache_dir=os.path.join(WORKSPACE_ROOT, "MarkitCache"))

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

@app.post("/settings/api-keys")
async def save_api_keys(payload: dict):
    """Writes API keys to .env and sets them in os.environ immediately."""
    from dotenv import set_key
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    for key, value in payload.items():
        if key.endswith("_API_KEY") or key in ("WORKSPACE_ROOT", "DAEMON_PORT"):
            set_key(env_path, key, value)
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


# Serve built React frontend as static files
from fastapi.staticfiles import StaticFiles
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






