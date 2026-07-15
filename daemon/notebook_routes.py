import time
import os
import uuid
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

# Import core classes from existing modules
from model_router import ModelRouter
from retriever import Retriever
from chat_grounded import GroundedChatAgent
from studio import StudioAgent
from audio_overview import AudioOverviewAgent

logger = logging.getLogger(__name__)

router = APIRouter()
# Globals to hold service singletons (initialized from main.py)
model_router: Optional[ModelRouter] = None
retriever: Optional[Retriever] = None
grounded_chat_agent: Optional[GroundedChatAgent] = None
studio_agent: Optional[StudioAgent] = None
audio_overview_agent: Optional[AudioOverviewAgent] = None

# Active notebooks dict
active_notebooks = {}

def init_notebook_services(app_router: ModelRouter, app_retriever: Retriever):
    global model_router, retriever, grounded_chat_agent, studio_agent, audio_overview_agent
    model_router = app_router
    retriever = app_retriever
    grounded_chat_agent = GroundedChatAgent(model_router, retriever)
    studio_agent = StudioAgent(model_router, retriever)
    audio_overview_agent = AudioOverviewAgent(model_router, retriever)

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
    query: Optional[str] = Field(None, description='Optional query for target context')
    model: Optional[str] = None
    temperature: Optional[float] = Field(0.7, description='Generation temperature')
    top_k: Optional[int] = Field(10, description='Number of context chunks to retrieve')
    stream: Optional[bool] = Field(False, description='Whether to stream the response tokens')
    format: Optional[str] = Field('conversational', description='Format for audio overview (conversational or lecture)')

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
            notebook_id = payload.get('notebook_ad') or payload.get('notebook_id')
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
async def create_notebook(request: Optional[NotebookCreate] = None):
    name = None
    if request is not None:
        if request.name is not None:
            if not request.name.strip():
                raise HTTPException(status_code=400, detail='Notebook name cannot be empty')
            name = request.name
            
    notebook_id = str(uuid.uuid4())
    active_notebooks[notebook_id] = {
        "notebook_id": notebook_id,
        "name": name,
        "created_at": time.time(),
        "sources": []
    }
    return active_notebooks[notebook_id]

@router.get('/notebooks')
async def list_notebooks():
    return list(active_notebooks.values())

@router.get('/notebooks/{id}')
async def get_notebook(id: str):
    if id not in active_notebooks:
        raise HTTPException(status_code=404, detail='Notebook not found')
    return active_notebooks[id]

@router.delete('/notebooks/{id}')
async def delete_notebook(id: str):
    if id not in active_notebooks:
        raise HTTPException(status_code=404, detail='Notebook not found')
        
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
            
    del active_notebooks[id]
    return {"status": "deleted"}

@router.post('/notebooks/{id}/sources', status_code=202)
async def add_source(id: str, request: SourceIngestionRequest):
    if id not in active_notebooks:
        raise HTTPException(status_code=404, detail='Notebook not found')
        
    source_type = request.source_type.lower()
    if source_type not in ('pdf', 'codebase', 'audio'):
        raise HTTPException(status_code=400, detail='Invalid source_type. Must be pdf, codebase, or audio')
    
    # Check if ingestion_queue exists
    from main import ingestion_queue
    job_id = await ingestion_queue.add_job(
        notebook_id=id,
        source_type=source_type,
        file_path=request.file_path,
        metadata=request.metadata
    )
    return {"job_id": job_id, "status": "pending"}

@router.get('/jobs/{id}')
async def get_job(id: str):
    from main import ingestion_queue
    status = ingestion_queue.get_status(id)
    if not status:
        raise HTTPException(status_code=404, detail='Job not found')
    return status

@router.get('/notebooks/{id}/sources')
async def list_sources(id: str):
    if id not in active_notebooks:
        raise HTTPException(status_code=404, detail='Notebook not found')
        
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
async def grounded_chat(id: str, request: ChatRequest):
    if id not in active_notebooks:
        raise HTTPException(status_code=404, detail='Notebook not found')
    if grounded_chat_agent is None:
        raise HTTPException(status_code=500, detail='Grounded Chat Agent not initialized')
        
    content = request.query if request.query is not None else request.message
    if content is None or not content.strip():
        raise HTTPException(status_code=400, detail="Empty query not allowed")
    payload = dict(
        notebook_id=id,
        content=content,
        command=request.command,
        model=request.model,
        temperature=request.temperature,
        top_k=request.top_k,
        history=request.history,
        source_ids=request.source_ids
    )
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
                
        return StreamingResponse(event_generator(), media_type='text/event-stream')
    else:
        tokens = []
        async def send_token_callback(event: str, data: Any):
            if event == 'token':
                tokens.append(data.get('text', ''))
                
        result = await grounded_chat_agent.run(payload, send_token_callback)
        response_text = result.get('response', ''.join(tokens))
        citations = result.get('citations', [])
        return dict(response=response_text, citations=citations)

@router.post('/notebooks/{id}/studio/{artifact_type}')
async def generate_studio_artifact(id: str, artifact_type: str, request: StudioRequest):
    if id not in active_notebooks:
        raise HTTPException(status_code=404, detail='Notebook not found')
        
    original_artifact_type = artifact_type
    if artifact_type == 'mindmap':
        artifact_type = 'mind_map'
    valid_types = {'study_guide', 'faq', 'timeline', 'quiz', 'mind_map', 'audio_overview'}
    if artifact_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid 'artifact_type': '{artifact_type}'. Must be one of {valid_types}.")
        
    payload = dict(
        notebook_id=id,
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

# ----------------- WebSockets -----------------

@router.websocket('/jobs/ws')
async def jobs_ws(websocket: WebSocket):
    await job_websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        job_websocket_manager.disconnect(websocket)
    except Exception:
        job_websocket_manager.disconnect(websocket)

@router.websocket('/notebooks/{id}/jobs/ws')
async def notebook_jobs_ws(websocket: WebSocket, id: str):
    await notebook_job_websocket_manager.connect(id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notebook_job_websocket_manager.disconnect(id, websocket)
    except Exception:
        notebook_job_websocket_manager.disconnect(id, websocket)
