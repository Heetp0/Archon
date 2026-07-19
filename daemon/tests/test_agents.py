import sys
import os
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from chat_agent import ChatAgent
from council_debate import CouncilDebate
from deep_research import DeepResearch
from agent_runtime import AgentRuntime
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from opencode_client import OpenCodeClient

@pytest.fixture
def mock_services():
    router = MagicMock(spec=ModelRouter)
    vault_search = MagicMock(spec=VaultSearch)
    markit_down = MagicMock(spec=MarkitDownNormalizer)
    
    # Mock vault_search.search
    vault_search.search.return_value = [
        {"relative_path": "note1.md", "text": "context 1", "title": "Note 1"}
    ]
    
    # Mock markit_down.convert
    markit_down.convert = AsyncMock(return_value="cached_path.md")
    
    return router, vault_search, markit_down

@pytest.mark.asyncio
async def test_chat_agent(mock_services):
    router, vault_search, markit_down = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "Hello"
        yield " "
        yield "world"
        
    router.generate.side_effect = mock_generate
    
    agent = ChatAgent(router, vault_search, markit_down)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "hi", "context": {"attachments": []}}
    result = await agent.run(payload, callback)
    
    assert result["response"] == "Hello world"
    assert ("status", {"status": "Searching vault context..."}) in events
    assert ("status", {"status": "Generating response..."}) in events
    assert ("token", {"text": "Hello"}) in events
    assert ("token", {"text": "world"}) in events

@pytest.mark.asyncio
async def test_council_debate(mock_services):
    router, vault_search, markit_down = mock_services
    
    router.get_available_models.return_value = [
        {"model": "groq/llama-3.1-8b-instant", "api_key_name": "GROQ_API_KEY", "env_name": "GROQ_API_KEY"},
        {"model": "gemini/gemini-1.5-flash", "api_key_name": "GEMINI_API_KEY", "env_name": "GEMINI_API_KEY"},
    ]
    router._get_api_key.return_value = "mock_key"
    
    async def mock_generate(*args, **kwargs):
        yield "draft response"
    router.generate.side_effect = mock_generate
    
    agent = CouncilDebate(router, vault_search, markit_down)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "what is AI?", "context": {}}
    result = await agent.run(payload, callback)
    
    assert "drafts" in result
    assert "critiques" in result
    assert "synthesis" in result
    assert len(result["drafts"]) == 2
    tokens = [e[1]["text"] for e in events if e[0] == "token"]
    assert "draft response" in tokens

@pytest.mark.asyncio
async def test_deep_research(mock_services):
    router, vault_search, markit_down = mock_services
    
    async def mock_generate_queries(*args, **kwargs):
        yield '["query1", "query2"]'
        
    async def mock_generate_summary(*args, **kwargs):
        yield "Summary Content"
        
    async def mock_generate_synthesis(*args, **kwargs):
        yield "Final Report Content"
        
    router.generate.side_effect = [
        mock_generate_queries(),
        mock_generate_summary(),
        mock_generate_synthesis()
    ]
    
    active_gates = {}
    agent = DeepResearch(router, vault_search, markit_down, active_gates)
    
    req_id = "req-test-research"
    active_gates[req_id] = asyncio.Queue()
    
    async def respond_to_gate():
        await asyncio.sleep(0.1)
        await active_gates[req_id].put({
            "type": "confirm",
            "payload": {"approved_urls": ["https://test.com"]}
        })
        
    asyncio.create_task(respond_to_gate())
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "test topic", "req_id": req_id}
    agent._crawl_url = AsyncMock(return_value="raw page content")
    
    result = await agent.run(payload, callback)
    
    assert result["report"] == "Final Report Content"
    assert any(e[0] == "gate" for e in events)
    assert any(e[0] == "token" and e[1]["text"] == "Final Report Content" for e in events)

@pytest.mark.asyncio
async def test_agent_runtime(mock_services):
    router, vault_search, markit_down = mock_services
    
    async def mock_gen_plan(*args, **kwargs):
        yield "Plan step 1"
        
    async def mock_gen_code(*args, **kwargs):
        yield "print('hello')"
        
    async def mock_gen_test(*args, **kwargs):
        yield "PASS"
        
    router.generate.side_effect = [mock_gen_plan(), mock_gen_code(), mock_gen_test()]
    
    agent = AgentRuntime(router, vault_search, markit_down, {})
    agent.opencode = MagicMock(spec=OpenCodeClient)
    
    async def mock_opencode_stream(*args, **kwargs):
        yield "Executing solution.py...\n"
        
    agent.opencode.execute_task.return_value = mock_opencode_stream()
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "make calculator", "context": {}, "task_id": "test_runtime_normal"}
    result = await agent.run(payload, callback)
    
    assert result["plan"] == "Plan step 1"
    assert result["code"] == "print('hello')"
    assert "PASS" in result["test_result"]

@pytest.mark.asyncio
async def test_agent_runtime_watchdog_halt(mock_services):
    router, vault_search, markit_down = mock_services
    
    agent = AgentRuntime(router, vault_search, markit_down, {})
    agent.supervisor.token_budget = 1  # Low token budget to trigger halt
    
    async def mock_gen_plan(*args, **kwargs):
        yield "Plan step 1: Write a calculator app. Planning takes some space."
        
    router.generate.side_effect = [mock_gen_plan()]
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "make calculator", "context": {}, "task_id": "test_runtime_watchdog_halt"}
    
    with pytest.raises(RuntimeError) as exc_info:
        await agent.run(payload, callback)
        
    assert "Supervisor halted execution" in str(exc_info.value)
    assert any(e[0] == "error" and "Token budget exceeded" in e[1]["error"] for e in events)

@pytest.mark.asyncio
async def test_deep_research_watchdog_halt(mock_services):
    router, vault_search, markit_down = mock_services
    
    agent = DeepResearch(router, vault_search, markit_down, {})
    agent.supervisor.token_budget = 1  # Low token budget to trigger halt
    
    async def mock_gen_queries(*args, **kwargs):
        yield '["query1", "query2"]'
        
    router.generate.side_effect = [mock_gen_queries()]
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "test topic", "req_id": "req-test-research"}
    
    with pytest.raises(RuntimeError) as exc_info:
        await agent.run(payload, callback)
        
    assert "Supervisor halted" in str(exc_info.value)
    assert any(e[0] == "error" and "Token budget exceeded" in e[1]["error"] for e in events)
