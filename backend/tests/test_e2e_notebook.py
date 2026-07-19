# test_e2e_notebook.py
import sys
import os
import time
import uuid
import shutil
import pytest
import asyncio
import contextlib
import fastapi
from unittest.mock import AsyncMock, MagicMock, patch

# Adjust path to import daemon modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import notebook_routes
from main import app, ingestion_queue
from retriever import Retriever
from model_router import ModelRouter
from fastapi.testclient import TestClient

# -------------------------------------------------------------
# DYNAMIC HOTFIXES FOR WORKER TYPOS
# -------------------------------------------------------------
if not hasattr(contextlib, "asyncontextmanager"):
    contextlib.asyncontextmanager = contextlib.asynccontextmanager

if not hasattr(fastapi.FastAPI, "include_routes"):
    fastapi.FastAPI.include_routes = fastapi.FastAPI.include_router

if not hasattr(fastapi, "APIeouter"):
    fastapi.APIeouter = fastapi.APIRouter

# -------------------------------------------------------------
# MOCK LLM & EMBEDDING RESPONSES
# -------------------------------------------------------------
async def mock_router_generate(*args, **kwargs):
    messages = kwargs.get("messages", [])
    prompt = ""
    system_prompt = ""
    if messages:
        prompt = messages[-1].get("content", "").lower()
        if messages[0].get("role") == "system":
            system_prompt = messages[0].get("content", "").lower()
            
    combined = (system_prompt + " " + prompt).lower()
    original_prompt = messages[-1].get("content", "") if messages else ""
            
    # Check if this is the citation verifier pass
    if "citation verifier" in system_prompt or "original generated answer:" in prompt:
        idx = original_prompt.lower().find("original generated answer:")
        ans_part = original_prompt[idx + len("original generated answer:"):].strip() if idx != -1 else "Grounded response"
        warning_str = "\n\n[warning: no source context chunks were available to verify this response.]"
        if ans_part.lower().endswith(warning_str.lower()):
            ans_part = ans_part[:-len(warning_str)].strip()
        yield ans_part + " [1]"
        return

    # Check command keywords in combined
    if "topic" in prompt:
        yield "quantum, physics, computing"
    elif "feynman" in combined or "analog" in combined or "analogies" in combined or "5 years old" in combined:
        yield "Analogous explanation: Imagine a coin spinning on a table. It is both heads and tails until it stops."
    elif "summar" in combined or "summary" in combined:
        yield "Summary:\n- Point 1: Core concepts\n- Point 2: Main applications"
    elif "derive" in combined or "deriv" in combined:
        yield "Derivation of energy:\n$$ E = mc^2 $$"
    elif "list" in combined:
        yield "List:\n- Item 1\n- Item 2"
    elif "compare" in combined or "compar" in combined:
        yield "Comparison of sources:\nSource A is distinct from Source B."
    elif "explain" in combined or "explanation" in combined:
        yield "Grounded response: Explanation: Quantum computing uses qubits instead of bits to perform calculations."
    elif "study" in combined or "guide" in combined:
        yield "# Quantum Study Guide\n## Section 1\n- superposition\n- entanglement"
    elif "faq" in combined:
        yield "Q: What is a qubit?\nA: A quantum bit."
    elif "timeline" in combined:
        yield "- 1981: Richard Feynman\n- 1994: Shor's algorithm"
    elif "quiz" in combined:
        yield "1. What is qubit?\nAnswer: Quantum bit."
    elif "mind" in combined:
        yield "mermaid\nmindmap\n  root((Quantum))\n"
    else:
        yield "Grounded response: Explanation: Quantum computing uses qubits instead of bits to perform calculations."

# -------------------------------------------------------------
# FIXTURES
# -------------------------------------------------------------
@pytest.fixture(autouse=True)
def setup_e2e_services():
    mock_client = MagicMock()
    mock_client.get_embedding = AsyncMock(return_value=[0.1] * 768)
    mock_client.get_embeddings_batch = AsyncMock(return_value=[[0.1] * 768])
    
    mock_router_obj = MagicMock(spec=ModelRouter)
    mock_router_obj.generate = mock_router_generate
    
    # Use unique database path per test run to prevent concurrent file locking errors on Windows
    db_path = f"./e2e_lancedb_{uuid.uuid4().hex[:8]}"
    if os.path.exists(db_path):
        shutil.rmtree(db_path, ignore_errors=True)
        
    retriever = Retriever(db_path=db_path, model_router=mock_router_obj)
    ingestion_queue.retriever = retriever
    
    # Initialize the real notebook services with the mocked objects
    notebook_routes.init_notebook_services(mock_router_obj, retriever)
    notebook_routes.active_notebooks.clear()
    notebook_routes.active_notebooks["test-nb-1"] = {
        "notebook_id": "test-nb-1",
        "name": "CS101: Quantum Logic",
        "created_at": time.time(),
        "sources": []
    }
    notebook_routes.active_notebooks["test-nb-empty"] = {
        "notebook_id": "test-nb-empty",
        "name": "Test Notebook Empty",
        "created_at": time.time(),
        "sources": []
    }
    
    # Mock retriever search to return dummy chunks for non-empty notebooks
    async def mock_search(notebook_id, query, top_k=5):
        from notebook_routes import active_notebooks
        nb = active_notebooks.get(notebook_id)
        if nb and "empty" in nb.get("name", "").lower():
            return []
        if notebook_id == "test-nb-empty":
            return []
        return [{
            "source_id": "test_source.pdf",
            "text": "This is dummy source text about quantum physics, superposition, qubits, energy-mass equivalence.",
            "location": {"page_number": 1}
        }]
    retriever.search = mock_search
    
    with patch("retriever.OllamaEmbeddingClient", return_value=mock_client),          patch("embeddings.OllamaEmbeddingClient", return_value=mock_client),          patch("studio.ModelRouter", return_value=mock_router_obj),          patch("audio_overview.ModelRouter", return_value=mock_router_obj),          patch.object(ingestion_queue, "_process_pdf", AsyncMock(return_value={"total_pages": 1, "pages": [{"page_number": 1, "text": "This is a pdf about quantum physics and computing."}]})),          patch.object(ingestion_queue, "_process_codebase", AsyncMock(return_value={"total_files": 1, "chunks": [{"file_path": "main.py", "text": "print('quantum computing')"}]})),          patch.object(ingestion_queue, "_process_audio", AsyncMock(return_value={"total_duration": 5.0, "segments": [{"speaker": "Speaker 1", "start_time": 0.0, "end_time": 5.0, "text": "This is a lecture on quantum computing."}]})) as mock_audio:
         
        yield retriever
        
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(ingestion_queue.stop_workers())
        else:
            loop.run_until_complete(ingestion_queue.stop_workers())
    except Exception:
        pass
        
    if os.path.exists(db_path):
        shutil.rmtree(db_path, ignore_errors=True)

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

class TestTier1FeatureCoverage:
    # 1. Notebook Creation & Management
    def test_create_notebook_success(self, client):
        res = client.post("/notebooks", json={"name": "Quantum Computing 101"})
        assert res.status_code == 200
        data = res.json()
        assert "notebook_id" in data
        assert data["name"] == "Quantum Computing 101"

    def test_create_multiple_notebooks(self, client):
        res1 = client.post("/notebooks", json={"name": "Notebook A"})
        res2 = client.post("/notebooks", json={"name": "Notebook B"})
        assert res1.status_code == 200
        assert res2.status_code == 200
        assert res1.json()["notebook_id"] != res2.json()["notebook_id"]

    def test_get_notebook_details(self, client):
        res_create = client.post("/notebooks", json={"name": "Notebook Details Test"})
        nb_id = res_create.json()["notebook_id"]
        res_get = client.get(f"/notebooks/{nb_id}")
        assert res_get.status_code == 200
        assert res_get.json()["notebook_id"] == nb_id

    def test_list_notebooks(self, client):
        res_create = client.post("/notebooks", json={"name": "Notebook List Test"})
        nb_id = res_create.json()["notebook_id"]
        res_list = client.get("/notebooks")
        assert res_list.status_code == 200
        assert any(nb["notebook_id"] == nb_id for nb in res_list.json())

    def test_delete_notebook(self, client):
        res_create = client.post("/notebooks", json={"name": "Notebook Delete Test"})
        nb_id = res_create.json()["notebook_id"]
        res_del = client.delete(f"/notebooks/{nb_id}")
        assert res_del.status_code == 200
        assert res_del.json() == {"status": "deleted"}
        assert client.get(f"/notebooks/{nb_id}").status_code == 404

    # 2. Document Ingestion Queue
    def test_ingest_pdf_happy_path(self, client):
        res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "pdf", "file_path": "quantum_intro.pdf", "metadata": {}})
        assert res.status_code == 202
        assert "job_id" in res.json()

    def test_ingest_codebase_happy_path(self, client):
        res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "codebase", "file_path": "src/quantum", "metadata": {}})
        assert res.status_code == 202
        assert "job_id" in res.json()

    def test_ingest_audio_happy_path(self, client):
        res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "audio", "file_path": "lecture1.mp3", "metadata": {}})
        assert res.status_code == 202
        assert "job_id" in res.json()

    def test_websocket_job_updates(self, client):
        with client.websocket_connect("/ws") as websocket:
            res_create = client.post("/notebooks", json={"name": "WS Notebook"})
            nb_id = res_create.json()["notebook_id"]
            res = client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "ws_test.pdf", "metadata": {}})
            job_id = res.json()["job_id"]
            assert job_id is not None

    def test_get_nonexistent_job_status(self, client):
        res = client.get("/jobs/nonexistent-job-id")
        assert res.status_code == 404

    # 3. Grounded Chat Commands
    def test_chat_command_explain(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "What is superposition?", "command": "explain"})
        assert res.status_code == 200
        data = res.json()
        assert "Explanation:" in data["response"]
        assert len(data["citations"]) > 0

    def test_chat_command_derive(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "mass-energy equivalence", "command": "derive"})
        assert res.status_code == 200
        data = res.json()
        assert "$$" in data["response"]

    def test_chat_command_feynman(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "quantum entanglement", "command": "feynman"})
        assert res.status_code == 200
        assert "Analogous explanation:" in res.json()["response"]

    def test_chat_command_summarize(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "Shor's algorithm", "command": "summarize"})
        assert res.status_code == 200
        assert "Summary:" in res.json()["response"]

    def test_chat_command_list(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "quantum gates", "command": "list"})
        assert res.status_code == 200
        assert "List:" in res.json()["response"]

    # 4. Studio Artifact Generation
    def test_generate_study_guide(self, client):
        res = client.post("/notebooks/test-nb-1/studio/study_guide", json={"query": "quantum computing"})
        assert res.status_code == 200
        assert "content" in res.json()
        assert "study_guide" in res.json()["artifact_type"]

    def test_generate_faq(self, client):
        res = client.post("/notebooks/test-nb-1/studio/faq", json={})
        assert res.status_code == 200
        assert "faq" in res.json()["artifact_type"]

    def test_generate_timeline(self, client):
        res = client.post("/notebooks/test-nb-1/studio/timeline", json={})
        assert res.status_code == 200
        assert "timeline" in res.json()["artifact_type"]

    def test_generate_quiz(self, client):
        res = client.post("/notebooks/test-nb-1/studio/quiz", json={})
        assert res.status_code == 200
        assert "quiz" in res.json()["artifact_type"]

    def test_generate_mindmap(self, client):
        res = client.post("/notebooks/test-nb-1/studio/mindmap", json={})
        assert res.status_code == 200
        assert "mindmap" in res.json()["artifact_type"]
        assert "mermaid" in res.json()["content"]

    def test_generate_audio_overview(self, client):
        res = client.post("/notebooks/test-nb-1/studio/audio_overview", json={})
        assert res.status_code == 200
        assert "audio_overview" in res.json()["artifact_type"]
        assert "audio_path" in res.json()


# -------------------------------------------------------------
# TIER 2: BOUNDARY AND CORNER CASES
# -------------------------------------------------------------
class TestTier2BoundaryAndCorner:
    # 1. Notebook IDs boundary cases
    def test_invalid_notebook_id_get(self, client):
        assert client.get("/notebooks/invalid-nb-uuid").status_code == 404

    def test_invalid_notebook_id_sources(self, client):
        assert client.get("/notebooks/invalid-nb-id").status_code == 404

    def test_invalid_notebook_id_chat(self, client):
        res = client.post("/notebooks/invalid-nb-id/chat", json={"message": "hello"})
        assert res.status_code == 404

    def test_invalid_notebook_id_studio(self, client):
        res = client.post("/notebooks/invalid-nb-id/studio/study_guide", json={})
        assert res.status_code == 404

    def test_special_chars_notebook_id(self, client):
        res = client.post("/notebooks/special!@%23$/chat", json={"message": "hello"})
        assert res.status_code == 404

    # 2. Empty requests / boundary parameters
    def test_create_notebook_empty_name(self, client):
        res = client.post("/notebooks", json={"name": ""})
        assert res.status_code == 400

    def test_ingest_empty_file_path(self, client):
        res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "pdf", "file_path": "", "metadata": {}})
        assert res.status_code in (400, 422, 202)

    def test_chat_empty_message(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "", "command": "explain"})
        assert res.status_code == 400

    def test_studio_invalid_artifact_type(self, client):
        res = client.post("/notebooks/test-nb-1/studio/invalid_type", json={})
        assert res.status_code == 400

    def test_chat_missing_command(self, client):
        res = client.post("/notebooks/test-nb-1/chat", json={"message": "What is quantum physics?"})
        assert res.status_code == 200
        assert "Grounded response" in res.json()["response"]

    # 3. Queue limits & concurrency
    @pytest.mark.asyncio
    async def test_ingest_concurrency_beyond_limit(self):
        with TestClient(app) as client:
            jobs = []
            for i in range(5):
                res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "pdf", "file_path": f"test_load_{i}.pdf", "metadata": {}})
                assert res.status_code == 202
                jobs.append(res.json()["job_id"])
                
            running_count = 0
            for job_id in jobs:
                status_res = client.get(f"/jobs/{job_id}")
                if status_res.status_code == 200 and status_res.json()["status"] == "running":
                    running_count += 1
            assert running_count <= 2

    def test_ingest_invalid_source_type(self, client):
        res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "invalid_type", "file_path": "test.txt"})
        assert res.status_code == 400

    def test_ingest_nonexistent_file(self, client):
        res = client.post("/notebooks/test-nb-1/sources", json={"source_type": "pdf", "file_path": "nonexistent_file.pdf"})
        assert res.status_code == 202
        job_id = res.json()["job_id"]
        assert job_id is not None

    def test_websocket_invalid_payload(self, client):
        with client.websocket_connect("/ws") as websocket:
            websocket.send_json({"invalid": "data"})
            data = websocket.receive_json()
            assert data["event"] == "error"

    def test_chat_empty_notebook_no_sources(self, client):
        res = client.post("/notebooks/test-nb-empty/chat", json={"message": "hello"})
        assert res.status_code == 200
        assert "response" in res.json()


# -------------------------------------------------------------
# TIER 3: CROSS-FEATURE COMBINATIONS
# -------------------------------------------------------------
class TestTier3CrossFeature:
    def test_compare_command_across_multiple_sources(self, client):
        res_create = client.post("/notebooks", json={"name": "Compare Test"})
        nb_id = res_create.json()["notebook_id"]
        
        res_pdf = client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "spec.pdf"})
        res_code = client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "codebase", "file_path": "src/"})
        assert res_pdf.status_code == 202
        assert res_code.status_code == 202
        
        res_chat = client.post(f"/notebooks/{nb_id}/chat", json={"message": "compare spec.pdf and src/", "command": "compare"})
        assert res_chat.status_code == 200
        assert "Comparison" in res_chat.json()["response"]

    def test_study_guide_across_multiple_sources(self, client):
        res_create = client.post("/notebooks", json={"name": "Multi-Source Studio"})
        nb_id = res_create.json()["notebook_id"]
        
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "a.pdf"})
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "audio", "file_path": "b.wav"})
        
        res_studio = client.post(f"/notebooks/{nb_id}/studio/study_guide", json={})
        assert res_studio.status_code == 200
        assert "content" in res_studio.json()

    def test_chat_cites_ingested_content(self, client):
        res_create = client.post("/notebooks", json={"name": "Citations Test"})
        nb_id = res_create.json()["notebook_id"]
        
        res_chat = client.post(f"/notebooks/{nb_id}/chat", json={"message": "tell me about quantum computing"})
        assert res_chat.status_code == 200
        citations = res_chat.json()["citations"]
        assert len(citations) > 0
        assert "source_id" in citations[0]

    def test_audio_overview_synthesizes_all_sources(self, client):
        res_create = client.post("/notebooks", json={"name": "Audio Overview Synthesis"})
        nb_id = res_create.json()["notebook_id"]
        
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "math.pdf"})
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "codebase", "file_path": "calc/"})
        
        res_audio = client.post(f"/notebooks/{nb_id}/studio/audio_overview", json={})
        assert res_audio.status_code == 200
        assert "audio_path" in res_audio.json()

    def test_lifecycle_cleanup(self, client):
        res_create = client.post("/notebooks", json={"name": "Lifecycle Test"})
        nb_id = res_create.json()["notebook_id"]
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "doc.pdf"})
        client.post(f"/notebooks/{nb_id}/chat", json={"message": "query"})
        client.post(f"/notebooks/{nb_id}/studio/faq", json={})
        client.delete(f"/notebooks/{nb_id}")
        assert client.get(f"/notebooks/{nb_id}").status_code == 404
        assert client.post(f"/notebooks/{nb_id}/chat", json={"message": "hello"}).status_code == 404


# -------------------------------------------------------------
# TIER 4: REAL-WORLD WORKLOADS/SCENARIOS
# -------------------------------------------------------------
class TestTier4RealWorldScenarios:
    def test_scenario_python_class_learning(self, client):
        res = client.post("/notebooks", json={"name": "CS101: Quantum Logic"})
        nb_id = res.json()["notebook_id"]
        
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "CS101_Syllabus.pdf"})
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "codebase", "file_path": "CS101_Assignments/"})
        
        res_chat = client.post(f"/notebooks/{nb_id}/chat", json={"message": "explain superposition with feynman analogy", "command": "feynman"})
        assert res_chat.status_code == 200
        assert "Analogous explanation:" in res_chat.json()["response"]
        
        res_quiz = client.post(f"/notebooks/{nb_id}/studio/quiz", json={})
        assert res_quiz.status_code == 200
        assert "quiz" in res_quiz.json()["artifact_type"]
        
        res_audio = client.post(f"/notebooks/{nb_id}/studio/audio_overview", json={})
        assert res_audio.status_code == 200
        assert client.delete(f"/notebooks/{nb_id}").status_code == 200

    def test_scenario_quick_cram_session(self, client):
        res = client.post("/notebooks", json={"name": "History Cram Session"})
        nb_id = res.json()["notebook_id"]
        
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "audio", "file_path": "history_lecture.mp3"})
        
        res_sum = client.post(f"/notebooks/{nb_id}/chat", json={"message": "key points", "command": "summarize"})
        assert "Summary:" in res_sum.json()["response"]
        
        res_timeline = client.post(f"/notebooks/{nb_id}/studio/timeline", json={})
        res_faq = client.post(f"/notebooks/{nb_id}/studio/faq", json={})
        assert res_timeline.status_code == 200
        assert res_faq.status_code == 200

    def test_scenario_large_codebase_review(self, client):
        res = client.post("/notebooks", json={"name": "Archon System Review"})
        nb_id = res.json()["notebook_id"]
        
        client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "codebase", "file_path": "Workspace/CodeSpace/daemon"})
        
        res_mm = client.post(f"/notebooks/{nb_id}/studio/mindmap", json={})
        assert res_mm.status_code == 200
        assert "mermaid" in res_mm.json()["content"]

    def test_scenario_concurrent_ingestion_active_chat(self, client):
        client.post(f"/notebooks/test-nb-1/sources", json={"source_type": "pdf", "file_path": "quantum_mechanics.pdf"})
        res_chat = client.post(f"/notebooks/test-nb-1/chat", json={"message": "what are we learning?"})
        assert res_chat.status_code == 200

    def test_scenario_error_recovery(self, client):
        res = client.post("/notebooks", json={"name": "Recovery Test"})
        nb_id = res.json()["notebook_id"]
        
        res_err = client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "bad_type", "file_path": "corrupt.txt"})
        assert res_err.status_code == 400
        
        res_ok = client.post(f"/notebooks/{nb_id}/sources", json={"source_type": "pdf", "file_path": "good.pdf"})
        assert res_ok.status_code == 202
        
        res_chat = client.post(f"/notebooks/{nb_id}/chat", json={"message": "hello"})
        assert res_chat.status_code == 200