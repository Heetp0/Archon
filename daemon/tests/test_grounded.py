# test_grounded.py
import sys
import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from chat_grounded import GroundedChatAgent
from citation_verifier import CitationVerifier
from model_router import ModelRouter
from retriever import Retriever

@pytest.fixture
def mock_grounded_services():
    router = MagicMock(spec=ModelRouter)
    retriever = MagicMock(spec=Retriever)
    
    # Mock retriever search
    retriever.search = AsyncMock(return_value=[
        {"notebook_id": "nb_123", "source_id": "Document A", "text": "The speed of light in vacuum is 299,792,458 meters per second.", "location": {"page_number": 3}, "score": 0.95},
        {"notebook_id": "nb_123", "source_id": "Document B", "text": "Einstein formulated E = m c^2 in 1905.", "location": {"page_number": 12}, "score": 0.88}
    ])
    
    return router, retriever

@pytest.mark.asyncio
async def test_parse_command_and_query(mock_grounded_services):
    router, retriever = mock_grounded_services
    agent = GroundedChatAgent(router, retriever)
    
    # Case 1: Command in payload
    payload1 = {"notebook_id": "nb_123", "content": "What is light?", "command": "explain"}
    cmd, query = agent._parse_command_and_query(payload1)
    assert cmd == "explain"
    assert query == "What is light?"
    
    # Case 2: Command in payload, clean query text prefix
    payload2 = {"notebook_id": "nb_123", "content": "/explain What is light?", "command": "explain"}
    cmd, query = agent._parse_command_and_query(payload2)
    assert cmd == "explain"
    assert query == "What is light?"
    
    # Case 3: Command parsed from query prefix
    payload3 = {"notebook_id": "nb_123", "content": "/derive Prove relativity"}
    cmd, query = agent._parse_command_and_query(payload3)
    assert cmd == "derive"
    assert query == "Prove relativity"
    
    # Case 4: Invalid/unregistered command parsed from query prefix (defaults to explain)
    payload4 = {"notebook_id": "nb_123", "content": "/unknowncmd Prove relativity"}
    cmd, query = agent._parse_command_and_query(payload4)
    assert cmd == "explain"
    assert query == "/unknowncmd Prove relativity"

@pytest.mark.asyncio
async def test_grounded_agent_derive_command(mock_grounded_services):
    router, retriever = mock_grounded_services
    
    # Mock router draft generation
    async def mock_generate_draft(*args, **kwargs):
        yield "The derivation step: E = mc^2 where $ is the speed of light."
    router.generate.side_effect = [mock_generate_draft()]
    
    # Mock CitationVerifier verify (avoid secondary API call in unit test)
    with patch("chat_grounded.CitationVerifier") as MockVerifier:
        mock_verifier_instance = MockVerifier.return_value
        mock_verifier_instance.verify = AsyncMock(return_value="The derivation step: E = mc^2 [2] where $ is the speed of light [1].")
        
        agent = GroundedChatAgent(router, retriever)
        
        events = []
        async def callback(event_type, payload):
            events.append((event_type, payload))
            
        payload = {"notebook_id": "nb_123", "content": "/derive E=mc^2"}
        result = await agent.run(payload, callback)
        
        assert "E = mc^2" in result["response"]
        assert "" in result["response"]
        assert "$" in result["response"]
        assert retriever.search.called
        assert mock_verifier_instance.verify.called

@pytest.mark.asyncio
async def test_citation_verifier(mock_grounded_services):
    router, retriever = mock_grounded_services
    
    # Mock router verification generation
    async def mock_generate_verification(*args, **kwargs):
        yield "The speed of light is 299,792,458 m/s [1] and E = m c^2 was formulated in 1905 [2]."
    router.generate.side_effect = [mock_generate_verification()]
    
    verifier = CitationVerifier(router)
    
    chunks = [
        {"source_id": "Document A", "text": "The speed of light in vacuum is 299,792,458 meters per second.", "location": {"page_number": 3}},
        {"source_id": "Document B", "text": "Einstein formulated E = m c^2 in 1905.", "location": {"page_number": 12}}
    ]
    
    result = await verifier.verify(
        answer="The speed of light is 299,792,458 m/s and E = m c^2 was formulated in 1905.",
        chunks=chunks
    )
    
    assert "[1]" in result
    assert "[2]" in result
    assert "References:" in result
    assert "Document A (Page 3)" in result
    assert "Document B (Page 12)" in result

def test_system_prompt_selection(mock_grounded_services):
    router, retriever = mock_grounded_services
    agent = GroundedChatAgent(router, retriever)
    
    derive_prompt = agent._get_system_prompt("derive")
    assert "mathematical derivation steps" in derive_prompt
    assert "standard LaTeX math delimiters" in derive_prompt
    assert "" in derive_prompt
    assert "$" in derive_prompt
    assert "Do not use '\\(' or '\\['" in derive_prompt
    
    feynman_prompt = agent._get_system_prompt("feynman")
    assert "5 years old" in feynman_prompt
    assert "simple analogies" in feynman_prompt
    
    compare_prompt = agent._get_system_prompt("compare")
    assert "Compare and contrast" in compare_prompt
    
    summarize_prompt = agent._get_system_prompt("summarize")
    assert "concise, high-level summary" in summarize_prompt

def test_format_chunks_for_context_compare(mock_grounded_services):
    router, retriever = mock_grounded_services
    agent = GroundedChatAgent(router, retriever)
    
    chunks = [
        {"source_id": "DocA", "text": "Intro to chemistry", "location": "page 1"},
        {"source_id": "DocA", "text": "Advanced chemistry", "location": "page 5"},
        {"source_id": "DocB", "text": "Intro to physics", "location": "page 2"}
    ]
    
    formatted = agent._format_chunks_for_context(chunks, "compare")
    assert "Source: DocA" in formatted
    assert "Chunk 1" in formatted
    assert "Source: DocB" in formatted

@pytest.mark.asyncio
async def test_citation_verifier_empty_chunks(mock_grounded_services):
    router, retriever = mock_grounded_services
    verifier = CitationVerifier(router)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    result = await verifier.verify(
        answer="Speed of light is fast.",
        chunks=[],
        send_token_callback=callback
    )
    
    assert "No source context chunks were available to verify this response" in result
    assert len(events) > 0

@pytest.mark.asyncio
async def test_citation_verifier_error_handling(mock_grounded_services):
    router, retriever = mock_grounded_services
    router.generate.side_effect = Exception("Model connection error")
    
    verifier = CitationVerifier(router)
    
    chunks = [
        {"source_id": "Document A", "text": "The speed of light in vacuum is 299,792,458 meters per second."}
    ]
    
    result = await verifier.verify(
        answer="The speed of light is 299,792,458 m/s.",
        chunks=chunks
    )
    
    assert "Citation verification failed" in result
    assert "The speed of light is 299,792,458 m/s." in result
