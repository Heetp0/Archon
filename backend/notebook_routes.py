import time
import os
import uuid
import json
import logging
import asyncio
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse
import pyarrow as pa

# Import core classes from existing modules
from model_router import ModelRouter
from retriever import Retriever
from chat_grounded import GroundedChatAgent
from studio import StudioAgent
from audio_overview import AudioOverviewAgent

# Multi-user imports
from auth_middleware import get_current_user, UserContext
from quota_enforcer import check_notebook_quota

logger = logging.getLogger(__name__)

router = APIRouter()

# Globals to hold service singletons (initialized from main.py)
model_router: Optional[ModelRouter] = None
retriever: Optional[Retriever] = None
grounded_chat_agent: Optional[GroundedChatAgent] = None
studio_agent: Optional[StudioAgent] = None
audio_overview_agent: Optional[AudioOverviewAgent] = None

DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
STROKES_DIR = os.path.join(DAEMON_DIR, 'data', 'strokes')

ocr_job_manager = None
active_notebooks: Dict[str, Any] = {}

def init_notebook_services(app_router: ModelRouter, app_retriever: Retriever):
    global model_router, retriever, grounded_chat_agent, studio_agent, audio_overview_agent, ocr_job_manager
    model_router = app_router
    retriever = app_retriever
    grounded_chat_agent = GroundedChatAgent(model_router, retriever)
    studio_agent = StudioAgent(model_router, retriever)
    audio_overview_agent = AudioOverviewAgent(model_router, retriever)
    
    # Initialize notebooks table in LanceDB
    notebook_schema = pa.schema([
        pa.field("id", pa.string()),
        pa.field("user_id", pa.string()),
        pa.field("name", pa.string()),
        pa.field("created_at", pa.float64())
    ])
    retriever.db.create_table("notebooks", schema=notebook_schema, exist_ok=True)
    
    from ocr_job_manager import OcrJobManager
    from main import unified_broadcast
    ocr_job_manager = OcrJobManager(broadcast_callback=unified_broadcast, retriever=retriever)

# Helper to verify notebook ownership
def verify_notebook_access(notebook_id: str, user_id: str):
    if notebook_id in active_notebooks:
        return active_notebooks[notebook_id]
    if retriever is None:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    nb_table = retriever.db.open_table("notebooks")
    nbs = nb_table.search().where(f"id = '{notebook_id}' AND user_id = '{user_id}'").to_list()
    if not nbs:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return nbs[0]

# ----------------- Models -----------------

class SourceIngestionRequest(BaseModel):
    source_type: str = Field(..., description='One of pdf, codebase, audio')
    file_path: str = Field(..., description='Local path or GitHub URL to ingest')
    metadata: dict = Field(default_factory=dict, description='Optional metadata')

class NotebookCreate(BaseModel):
    name: Optional[str] = Field(None, description='Optional name of the notebook')

class ChatRequest(BaseModel):
    query: Optional[str] = Field(None, description='The query/content to send to grounded chat')
    message: Optional[str] = Field(None, description='The message/content to send to grounded chat')
    command: Optional[str] = Field(None, description='Optional command (derive, explain, feynman, compare, list, summarize)')
    stream: Optional[bool] = Field(False, description='Whether to stream the response tokens')
    model: Optional[str] = Field(None, description='Optional model to target')
    temperature: Optional[float] = Field(0.7, description='Generation temperature')
    top_k: Optional[int] = Field(5, description='Number of context chunks to retrieve')
    history: Optional[List[dict]] = Field(default_factory=list, description='Chat history')
    source_ids: Optional[List[str]] = Field(default=None, description='Filter context retrieval by specific source IDs')

class StudioRequest(BaseModel):
    query: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(0.7, description='Generation temperature')
    top_k: Optional[int] = Field(10, description='Number of context chunks to retrieve')
    stream: Optional[bool] = Field(False, description='Whether to stream the response tokens')
    format: Optional[str] = Field('conversational', description='Format for audio overview (conversational or lecture)')
    type: Optional[str] = None
    artifact_type: Optional[str] = None


# ----------------- WebSocket Managers -----------------

class JobConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, webSocket: WebSocket):
        await webSocket.accept()
        self.active_connections.append(webSocket)

    def disconnect(self, webSocket: WebSocket):
        if webSocket in self.active_connections:
            self.active_connections.remove(webSocket)

    async def broadcast_job_update(self, event_type: str, payload: Any):
        if event_type == 'job_progress':
            for connection in list(self.active_connections):
                try:
                    await connection.send_json({
                        'event': event_type,
                        'payload': payload
                    })
                except Exception:
                    pass

class NotebookJobConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, notebook_id: str, webSocket: WebSocket):
        await webSocket.accept()
        self.active_connections.setdefault(notebook_id, []).append(webSocket)

    def disconnect(self, notebook_id: str, webSocket: WebSocket):
        if notebook_id in self.active_connections:
            if webSocket in self.active_connections[notebook_id]:
                self.active_connections[notebook_id].remove(webSocket)
            if not self.active_connections[notebook_id]:
                del self.active_connections[notebook_id]

    async def broadcast_job_update(self, event_type: str, payload: Any):
        if event_type == 'job_progress':
            notebook_id = payload.get('notebook_id')
            if notebook_id and notebook_id in self.active_connections:
                for connection in list(self.active_connections[notebook_id]):
                    try:
                        await connection.send_json({
                            'event': event_type,
                            'payload': payload
                        })
                    except Exception:
                        pass

job_websocket_manager = JobConnectionManager()
notebook_job_websocket_manager = NotebookJobConnectionManager()

# ----------------- REST Endpoints -----------------

@router.post('/notebooks')
async def create_notebook(request: Optional[NotebookCreate] = None, current_user: UserContext = Depends(get_current_user)):
    if retriever is None:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
        
    name = "Untitled Notebook"
    if request is not None and request.name is not None:
        if not request.name.strip():
            raise HTTPException(status_code=400, detail='Notebook name cannot be empty')
        name = request.name

    # Quota check
    check_notebook_quota(retriever.db, current_user.user_id, current_user.role)
            
    notebook_id = str(uuid.uuid4())
    nb_table = retriever.db.open_table("notebooks")
    
    new_nb = {
        "id": notebook_id,
        "notebook_id": notebook_id,
        "user_id": current_user.user_id,
        "name": name,
        "created_at": time.time()
    }
    db_nb = {
        "id": notebook_id,
        "user_id": current_user.user_id,
        "name": name,
        "created_at": new_nb["created_at"]
    }
    nb_table.add([db_nb])
    active_notebooks[notebook_id] = new_nb
    return new_nb

@router.get('/notebooks')
async def list_notebooks(current_user: UserContext = Depends(get_current_user)):
    if retriever is None:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    nb_table = retriever.db.open_table("notebooks")
    return nb_table.search().where(f"user_id = '{current_user.user_id}'").to_list()

@router.get('/notebooks/{id}')
async def get_notebook(id: str, current_user: UserContext = Depends(get_current_user)):
    return verify_notebook_access(id, current_user.user_id)

@router.delete('/notebooks/{id}')
async def delete_notebook(id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(id, current_user.user_id)
        
    if retriever is not None:
        escaped_id = id.replace(chr(39), chr(39)+chr(39))
        try:
            retriever.chunks_table.delete(f"notebook_id = '{escaped_id}'")
        except Exception as e:
            logger.debug(f"Delete from chunks_table failed or skipped: {e}")
        try:
            retriever.topic_table.delete(f"notebook_id = '{escaped_id}'")
        except Exception as e:
            logger.debug(f"Delete from topic_table failed or skipped: {e}")
            
    nb_table = retriever.db.open_table("notebooks")
    nb_table.delete(f"id = '{id}'")
    return {"status": "deleted"}

@router.post('/notebooks/{id}/sources', status_code=202)
async def add_source(id: str, request: Request, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(id, current_user.user_id)
    
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
            
    if source_type not in ('pdf', 'codebase', 'audio'):
        raise HTTPException(status_code=400, detail='Invalid source_type. Must be pdf, codebase, or audio')
    
    # Check if ingestion_queue exists
    from main import ingestion_queue
    job_id = await ingestion_queue.add_job(
        notebook_id=id,
        source_type=source_type,
        file_path=file_path,
        metadata=metadata
    )
    # Clear notebook cache when a new source is added
    if model_router and model_router.cache:
        await model_router.cache.clear_notebook_cache(id)
    return {"job_id": job_id, "status": "pending"}

@router.post('/notebooks/{id}/ingest', status_code=202)
async def ingest_source_alias(id: str, request: Request, current_user: UserContext = Depends(get_current_user)):
    return await add_source(id, request, current_user)

@router.get('/jobs/{id}')
async def get_job(id: str, current_user: UserContext = Depends(get_current_user)):
    from main import ingestion_queue
    status = ingestion_queue.get_status(id)
    if not status:
        raise HTTPException(status_code=404, detail='Job not found')
    return status

@router.get('/notebooks/{id}/sources')
async def list_sources(id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(id, current_user.user_id)
        
    if retriever is None:
        raise HTTPException(status_code=500, detail='Retriever service not initialized')
    
    escaped_id = id.replace(chr(39), chr(39)+chr(39))
    try:
        rows = retriever.chunks_table.search().where(f"notebook_id = '{escaped_id}'").to_list()
        sources = list({row["source_id"] for row in rows})
        return {"notebook_id": id, "sources": sources}
    except Exception as e:
        logger.error(f"Error querying sources for notebook {id}: {e}")
        return {"notebook_id": id, "sources": []}

@router.post('/notebooks/{id}/chat')
async def grounded_chat(id: str, request: ChatRequest, req: Request, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(id, current_user.user_id)
    if grounded_chat_agent is None:
        raise HTTPException(status_code=500, detail='Grounded Chat Agent not initialized')
        
    content = request.query if request.query is not None else request.message
    if content is None or not content.strip():
        raise HTTPException(status_code=400, detail="Empty query not allowed")
    
    payload = dict(
        notebook_id=id,
        user_id=current_user.user_id,
        content=content,
        command=request.command,
        model=request.model,
        temperature=request.temperature,
        top_k=request.top_k,
        history=request.history,
        source_ids=request.source_ids
    )
    
    # Query semantic cache first
    if model_router and model_router.cache:
        cached_result = await model_router.cache.get_cached(id, content, threshold=0.85)
        if cached_result:
            try:
                req.state.cache_hit = True
                cached_data = json.loads(cached_result)
                if request.stream:
                    async def cached_event_generator():
                        yield "data: " + json.dumps(dict(event="status", data={"status": "Searching relevant chunks in notebook..."})) + chr(10) + chr(10)
                        await asyncio.sleep(0.02)
                        yield "data: " + json.dumps(dict(event="status", data={"status": "Cache HIT! Serving response..."})) + chr(10) + chr(10)
                        await asyncio.sleep(0.02)
                        
                        text = cached_data.get("response", "")
                        chunk_size = 20
                        for i in range(0, len(text), chunk_size):
                            token = text[i:i+chunk_size]
                            yield "data: " + json.dumps(dict(event="token", data={"text": token})) + chr(10) + chr(10)
                            await asyncio.sleep(0.01)
                            
                        citations = cached_data.get("citations", [])
                        yield "data: " + json.dumps(dict(event="citations", data=citations)) + chr(10) + chr(10)
                    return StreamingResponse(cached_event_generator(), media_type='text/event-stream')
                else:
                    return cached_data
            except Exception as e:
                logger.error(f"Error serving cached response: {e}")

    if request.stream:
        async def event_generator():
            queue = asyncio.Queue()
            async def send_token_callback(event: str, data: Any):
                await queue.put((event, data))
            task = asyncio.create_task(grounded_chat_agent.run(payload, send_token_callback))
            
            while not task.done() or not queue.empty():
                try:
                    event, data = await asyncio.wait_for(queue.get(), timeout=0.1)
                    yield "data: " + json.dumps(dict(event=event, data=data)) + chr(10) + chr(10)
                    queue.task_done()
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Error in grounded chat stream queue: {e}")
                    break
            if task.done() and task.exception():
                err = task.exception()
                yield 'data: ' + json.dumps(dict(event='error', data=dict(error=str(err)))) + chr(10) + chr(10)
                
            if task.done() and not task.cancelled() and not task.exception():
                result = task.result()
                if isinstance(result, dict) and 'citations' in result:
                    yield 'data: ' + json.dumps(dict(event='citations', data=result['citations'])) + chr(10) + chr(10)
                    # Cache the response on streaming end
                    if model_router and model_router.cache:
                        await model_router.cache.cache_response(id, content, json.dumps(result))
                    # Record metrics values
                    req.state.tokens_used = (len(result.get('response', '')) + len(content)) // 4
                    req.state.provider_used = request.model or "fast_tier" 
                
        return StreamingResponse(event_generator(), media_type='text/event-stream')
    else:
        tokens = []
        async def send_token_callback(event: str, data: Any):
            if event == 'token':
                tokens.append(data.get('text', ''))
                
        result = await grounded_chat_agent.run(payload, send_token_callback)
        response_text = result.get('response', ''.join(tokens))
        citations = result.get('citations', [])
        
        # Cache response
        if model_router and model_router.cache:
            await model_router.cache.cache_response(id, content, json.dumps(result))
            
        # Set request state values for metrics recording
        req.state.tokens_used = (len(response_text) + len(content)) // 4
        req.state.provider_used = request.model or "fast_tier"
        
        return dict(response=response_text, citations=citations)

@router.post('/notebooks/{id}/studio/{artifact_type}')
async def generate_studio_artifact(id: str, artifact_type: str, request: StudioRequest, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(id, current_user.user_id)
        
    original_artifact_type = artifact_type
    if artifact_type == 'mindmap':
        artifact_type = 'mind_map'
    valid_types = {'study_guide', 'faq', 'timeline', 'quiz', 'mind_map', 'audio_overview'}
    if artifact_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid 'artifact_type': '{artifact_type}'. Must be one of {valid_types}.")
        
    payload = dict(
        notebook_id=id,
        user_id=current_user.user_id,
        artifact_type=artifact_type,
        query=request.query,
        model=request.model,
        temperature=request.temperature,
        top_k=request.top_k,
        format=request.format or 'conversational'
    )
    if artifact_type == 'audio_overview':
        if audio_overview_agent is None:
            raise HTTPException(status_code=500, detail='Audio Overview Agent not initialized')
        agent = audio_overview_agent
    else:
        if studio_agent is None:
            raise HTTPException(status_code=500, detail='Studio Agent not initialized')
        agent = studio_agent
        
    if request.stream:
        async def event_generator():
            queue = asyncio.Queue()
            async def send_token_callback(event: str, data: Any):
                await queue.put((event, data))
            task = asyncio.create_task(agent.run(payload, send_token_callback))
            
            while not task.done() or not queue.empty():
                try:
                    event, data = await asyncio.wait_for(queue.get(), timeout=0.1)
                    yield "data: " + json.dumps(dict(event=event, data=data)) + chr(10) + chr(10)
                    queue.task_done()
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Error in studio artifact stream queue: {e}")
                    break
            if task.done() and task.exception():
                err = task.exception()
                yield 'data: ' + json.dumps(dict(event='error', data=dict(error=str(err)))) + chr(10) + chr(10)
                
        return StreamingResponse(event_generator(), media_type='text/event-stream')
    else:
        tokens = []
        async def send_token_callback(event: str, data: Any):
            if event == 'token':
                tokens.append(data.get('text', ''))
                
        result = await agent.run(payload, send_token_callback)
        
        if artifact_type == 'audio_overview':
            script_content = result.get('script', ''.join(tokens))
            audio_path = result.get('audio_path', '')
            return dict(
                artifact=script_content,
                content=script_content,
                artifact_type=original_artifact_type,
                audio_path=audio_path
            )
        else:
            artifact_content = result.get('artifact', ''.join(tokens))
            return dict(
                artifact=artifact_content,
                content=artifact_content,
                artifact_type=original_artifact_type
            )

@router.post('/notebooks/{id}/artifact')
async def generate_artifact_alias(id: str, request: StudioRequest, current_user: UserContext = Depends(get_current_user)):
    target_type = request.artifact_type or request.type or 'study_guide'
    return await generate_studio_artifact(id, target_type, request, current_user)


# ----------------- Strokes -----------------

def get_stroke_file_path(user_id: str, notebook_id: str, page_id: str) -> str:
    # Safe isolation nesting: data/strokes/<user_id>/<notebook_id>/<page_id>.bin
    nb_id = notebook_id if notebook_id else "default"
    path = os.path.join(STROKES_DIR, user_id, nb_id)
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, f"{page_id}.bin")

@router.post('/notebook/pages/{page_id:path}/strokes')
async def save_page_strokes(page_id: str, request: Request, current_user: UserContext = Depends(get_current_user)):
    if not re.match(r'^[a-zA-Z0-9_\-]+$', page_id):
        raise HTTPException(status_code=400, detail='Invalid page_id format')
    
    body = await request.body()
    file_path = get_stroke_file_path(current_user.user_id, "default", page_id)
    with open(file_path, 'wb') as f:
        f.write(body)
        
    return {'status': 'success', 'page_id': page_id, 'bytes_written': len(body)}

@router.get('/notebook/pages/{page_id:path}/strokes')
async def get_page_strokes(page_id: str, current_user: UserContext = Depends(get_current_user)):
    if not re.match(r'^[a-zA-Z0-9_\-]+$', page_id):
        raise HTTPException(status_code=400, detail='Invalid page_id format')
        
    file_path = get_stroke_file_path(current_user.user_id, "default", page_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail='Strokes not found')
        
    return FileResponse(file_path, media_type='application/octet-stream')

# New page management and OCR endpoints
@router.post('/notebooks/{notebook_id}/pages')
async def create_notebook_page(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    page_id = str(uuid.uuid4())
    file_path = get_stroke_file_path(current_user.user_id, notebook_id, page_id)
    with open(file_path, 'wb') as f:
        pass
    return {'page_id': page_id, 'status': 'created'}

@router.get('/notebooks/{notebook_id}/pages')
async def list_notebook_pages(notebook_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    nb_dir = os.path.join(STROKES_DIR, current_user.user_id, notebook_id)
    if not os.path.exists(nb_dir):
        return []
    pages = []
    for fname in os.listdir(nb_dir):
        if fname.endswith('.bin'):
            page_id = fname[:-4]
            file_path = os.path.join(nb_dir, fname)
            stat = os.stat(file_path)
            pages.append({
                'page_id': page_id,
                'notebook_id': notebook_id,
                'last_modified': stat.st_mtime,
                'size': stat.st_size
            })
    return pages

@router.delete('/notebooks/{notebook_id}/pages/{page_id}')
async def delete_notebook_page(notebook_id: str, page_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    file_path = get_stroke_file_path(current_user.user_id, notebook_id, page_id)
    if os.path.exists(file_path):
        os.remove(file_path)
    if retriever is not None:
        try:
            retriever.chunks_table.delete(f"source_id = 'page_{page_id}'")
        except Exception:
            pass
    return {'status': 'deleted'}

@router.put('/notebooks/{notebook_id}/pages/{page_id}/strokes')
@router.put('/notebooks/{notebook_id}/pages/{page_id}')
@router.post('/notebooks/{notebook_id}/pages/{page_id}/strokes')
async def save_page_strokes_new(
    notebook_id: str, 
    page_id: str, 
    request: Request, 
    current_user: UserContext = Depends(get_current_user),
    ocr_requested: bool = False, 
    mode: str = "text",
    simulate_conflict: bool = False
):
    verify_notebook_access(notebook_id, current_user.user_id)
    if simulate_conflict or request.headers.get("X-Simulate-Conflict") == "true":
        raise HTTPException(
            status_code=409,
            detail={
                "status": "conflict",
                "message": "Version conflict on page PUT",
                "remote_text": "Remote page content (Server)",
                "local_text": "Local page content"
            }
        )
    body = await request.body()
    file_path = get_stroke_file_path(current_user.user_id, notebook_id, page_id)
    with open(file_path, 'wb') as f:
        f.write(body)
    
    job_id = None
    if ocr_requested and ocr_job_manager is not None:
        # Inject user_id context into the background job if needed
        job_id = await ocr_job_manager.add_job(notebook_id, page_id, mode)
        
    return {
        'status': 'success',
        'page_id': page_id,
        'bytes_written': len(body),
        'ocr_job_id': job_id
    }

@router.get('/notebooks/{notebook_id}/pages/{page_id}/strokes')
async def get_page_strokes_new(notebook_id: str, page_id: str, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    file_path = get_stroke_file_path(current_user.user_id, notebook_id, page_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail='Strokes not found')
    return FileResponse(file_path, media_type='application/octet-stream')

@router.post('/notebooks/{notebook_id}/pages/{page_id}/ocr')
async def enqueue_ocr_job(notebook_id: str, page_id: str, mode: str = "text", current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if ocr_job_manager is None:
        raise HTTPException(status_code=500, detail='OCR Job Manager not initialized')
    
    # Quota limit validation
    from quota_enforcer import check_ocr_quota
    check_ocr_quota(retriever.db, current_user.user_id, current_user.role)
    
    job_id = await ocr_job_manager.add_job(notebook_id, page_id, mode)
    return {'job_id': job_id, 'status': 'queued'}

class CorrectionRequest(BaseModel):
    original_token: str
    corrected_token: str
    confidence: float

@router.post('/notebooks/{notebook_id}/pages/{page_id}/corrections')
async def log_ocr_correction(notebook_id: str, page_id: str, req: CorrectionRequest, current_user: UserContext = Depends(get_current_user)):
    verify_notebook_access(notebook_id, current_user.user_id)
    if ocr_job_manager is None:
        raise HTTPException(status_code=500, detail='OCR Job Manager not initialized')
    
    # log correction scoped by user_id
    ocr_job_manager.log_correction(page_id, req.original_token, req.corrected_token, req.confidence)
    return {'status': 'logged'}

# ----------------- WebSockets -----------------

@router.websocket('/jobs/ws')
async def jobs_ws(websocket: WebSocket):
    await job_websocket_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data.strip() in ("ping", '{"type":"ping"}', '{"event":"ping"}'):
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        job_websocket_manager.disconnect(websocket)
    except Exception:
        job_websocket_manager.disconnect(websocket)

@router.websocket('/notebooks/{id}/jobs/ws')
async def notebook_jobs_ws(websocket: WebSocket, id: str):
    await notebook_job_websocket_manager.connect(id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data.strip() in ("ping", '{"type":"ping"}', '{"event":"ping"}'):
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        notebook_job_websocket_manager.disconnect(id, websocket)
    except Exception:
        notebook_job_websocket_manager.disconnect(id, websocket)
