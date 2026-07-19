# test_grounded_adversarial.py
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
def mock_services():
    router = MagicMock(spec=ModelRouter)
    retriever = MagicMock(spec=Retriever)
    return router, retriever

# 1. INPUT QUERIES EDGE CASES
@pytest.mark.asyncio
async def test_empty_and_whitespace_query(mock_services):
    router, retriever = mock_services
    agent = GroundedChatAgent(router, retriever)
    
    retriever.search = AsyncMock(return_value=[])
    
    async def mock_generate_draft(*args, **kwargs):
        yield "Since no source context was found, I cannot answer."
    router.generate.side_effect = [mock_generate_draft()]
    
    payload = {"notebook_id": "nb_123", "content": "   "}
    
    async def callback(event_type, payload):
        pass
        
    result = await agent.run(payload, callback)
    assert "no source context" in result["response"]
    retriever.search.assert_called_once_with("nb_123", "", top_k=5)

@pytest.mark.asyncio
async def test_missing_notebook_id(mock_services):
    router, retriever = mock_services
    agent = GroundedChatAgent(router, retriever)
    
    payload = {"content": "What is light?"}
    async def callback(event_type, payload):
        pass
        
    with pytest.raises(ValueError, match="Missing 'notebook_id'"):
        await agent.run(payload, callback)

@pytest.mark.asyncio
async def test_sql_injection_style_query(mock_services):
    router, retriever = mock_services
    agent = GroundedChatAgent(router, retriever)
    
    retriever.search = AsyncMock(return_value=[])
    async def mock_generate_draft(*args, **kwargs):
        yield "Query processed safely."
    router.generate.side_effect = [mock_generate_draft()]
    
    sql_injection_query = "/explain '; DROP TABLE notebook_chunks; --"
    payload = {"notebook_id": "nb_123", "content": sql_injection_query}
    
    async def callback(event_type, payload):
        pass
        
    result = await agent.run(payload, callback)
    assert "safely" in result["response"]
    retriever.search.assert_called_once_with("nb_123", "'; DROP TABLE notebook_chunks; --", top_k=5)

@pytest.mark.asyncio
async def test_single_and_double_quotes_query(mock_services):
    router, retriever = mock_services
    agent = GroundedChatAgent(router, retriever)
    
    retriever.search = AsyncMock(return_value=[])
    async def mock_generate_draft(*args, **kwargs):
        yield "Quotes handled."
    router.generate.side_effect = [mock_generate_draft()]
    
    payload = {"notebook_id": "nb_123", "content": "Explain Einstein's \"relativity\" theory."}
    
    async def callback(event_type, payload):
        pass
        
    result = await agent.run(payload, callback)
    assert "handled" in result["response"]
    retriever.search.assert_called_once_with("nb_123", "Explain Einstein's \"relativity\" theory.", top_k=5)

@pytest.mark.asyncio
async def test_extreme_text_length_query(mock_services):
    router, retriever = mock_services
    agent = GroundedChatAgent(router, retriever)
    
    retriever.search = AsyncMock(return_value=[])
    async def mock_generate_draft(*args, **kwargs):
        yield "Extreme length processed."
    router.generate.space_effect = [mock_generate_draft()] # wait, router.generate.side_effect below
    router.generate.side_effect = [mock_generate_draft()]
    
    extreme_query = "A" * 50000
    payload = {"notebook_id": "nb_123", "content": extreme_query}
    
    async def callback(event_type, payload):
        pass
        
    result = await agent.run(payload, callback)
    assert "processed" in result["response"]
    retriever.search.assert_called_once_with("nb_123", extreme_query, top_k=5)

@pytest.mark.asyncio
async def test_malformed_history_elements(mock_services):
    router, retriever = mock_services
    agent = GroundedChatAgent(router, retriever)
    
    retriever.search = AsyncMock(return_value=[])
    
    async def mock_generate_draft(*args, **kwargs):
        yield "Draft response."
    async def mock_generate_verifier(*args, **kwargs):
        yield "Verified response."
        
    router.generate.side_effect = [mock_generate_draft(), mock_generate_verifier()]
    
    payload1 = {
        "notebook_id": "nb_123",
        "content": "query",
        "history": ["invalid_history_element"]
    }
    
    async def callback(event_type, payload):
        pass
        
    # Should not throw AttributeError and run successfully
    res1 = await agent.run(payload1, callback)
    assert "Draft response." in res1["response"]
    
    # Reset side effect
    router.generate.side_effect = [mock_generate_draft(), mock_generate_verifier()]
    
    payload2 = {
        "notebook_id": "nb_123",
        "content": "query",
        "history": "not a list"
    }
    # Should not throw AttributeError and run successfully
    res2 = await agent.run(payload2, callback)
    assert "Draft response." in res2["response"]


# 2. MALFORMED RESPONSES FROM LLM/VERIFIER
@pytest.mark.asyncio
async def test_empty_draft_response(mock_services):
    router, retriever = mock_services
    
    retriever.search = AsyncMock(return_value=[
        {"notebook_id": "nb_123", "source_id": "DocA", "text": "Einstein was born in 1879.", "location": {"page_number": 1}}
    ])
    
    async def mock_generate_empty(*args, **kwargs):
        yield ""
    
    async def mock_generate_verifier_empty(*args, **kwargs):
        yield ""
        
    router.generate.side_effect = [mock_generate_empty(), mock_generate_verifier_empty()]
    
    agent = GroundedChatAgent(router, retriever)
    
    async def callback(event_type, payload):
        pass
        
    payload = {"notebook_id": "nb_123", "content": "When was Einstein born?"}
    result = await agent.run(payload, callback)
    
    assert result["response"] == ""

@pytest.mark.asyncio
async def test_citation_verifier_exception_streaming_bug(mock_services):
    router, retriever = mock_services
    
    async def mock_generate_draft(*args, **kwargs):
        yield "Einstein was born in 1879."
        
    router.generate.side_effect = [
        mock_generate_draft(),
        Exception("LLM connection error during verification")
    ]
    
    retriever.search = AsyncMock(return_value=[
        {"notebook_id": "nb_123", "source_id": "DocA", "text": "Einstein was born in 1879.", "location": {"page_number": 1}}
    ])
    
    agent = GroundedChatAgent(router, retriever)
    
    streamed_tokens = []
    async def callback(event_type, payload):
        if event_type == "token":
            streamed_tokens.append(payload["text"])
            
    payload = {"notebook_id": "nb_123", "content": "When was Einstein born?"}
    result = await agent.run(payload, callback)
    
    warning = "\n\n[Warning: Citation verification failed. Returning unverified response.]"
    assert "Einstein was born in 1879." in result["response"]
    assert warning in result["response"]
    
    answer = "Einstein was born in 1879."
    assert "".join(streamed_tokens) == answer + warning


# 3. RETRIEVAL & VECTOR BIAS (MULTI-SOURCE TESTING)
def test_retriever_deduplication_multi_source_bias():
    router = MagicMock(spec=ModelRouter)
    with patch("retriever.lancedb.connect") as mock_connect:
        r = Retriever(db_path="dummy_path", model_router=router)
        
        docs = [
            {"notebook_id": "nb_123", "source_id": "DocA", "text": "The speed of light in vacuum is 299792458 m/s.", "location": "{}"},
            {"notebook_id": "nb_123", "source_id": "DocB", "text": "The speed of light in vacuum is 299792458 m/s.", "location": "{}"}
        ]
        
        deduped = r._remove_near_duplicates(docs, threshold=0.85)
        
        assert len(deduped) == 2
        
        docs_different = [
            {"notebook_id": "nb_123", "source_id": "DocA", "text": "Einstein formulated theory of relativity.", "location": "{}"},
            {"notebook_id": "nb_123", "source_id": "DocB", "text": "Newton formulated theory of gravity.", "location": "{}"}
        ]
        
        deduped_diff = r._remove_near_duplicates(docs_different, threshold=0.85)
        assert len(deduped_diff) == 2