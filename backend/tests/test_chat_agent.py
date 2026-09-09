import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import os

from chat_agent import ChatAgent
from chat_grounded import GroundedChatAgent

@pytest.mark.asyncio
async def test_vault_search_is_not_blocking():
    mock_router = MagicMock()
    mock_search = MagicMock()
    mock_search.search.return_value = [{"relative_path": "test", "text": "content"}]
    mock_markit = MagicMock()

    agent = ChatAgent(mock_router, mock_search, mock_markit)

    with patch("asyncio.to_thread", new_callable=AsyncMock) as mock_to_thread:
        mock_to_thread.return_value = []
        await agent.run({"content": "test", "use_vault": True}, AsyncMock())
        mock_to_thread.assert_called_once_with(mock_search.search, "test", top_k=3)

@pytest.mark.asyncio
async def test_history_truncation_under_limit():
    mock_router = MagicMock()
    async def dummy_gen(*args, **kwargs):
        yield "response"
    mock_router.generate = MagicMock(side_effect=dummy_gen)
    agent = ChatAgent(mock_router, MagicMock(), MagicMock())
    
    history = [{"role": "user", "content": "hello"}]
    payload = {"content": "world", "history": history, "use_vault": False}
    
    await agent.run(payload, AsyncMock())
    
    # Assert router.generate called with correct messages
    call_args = mock_router.generate.call_args
    messages = call_args.kwargs['messages']
    # 1 system, 1 history, 1 current user
    assert len(messages) == 3

@pytest.mark.asyncio
async def test_history_truncation_over_limit():
    mock_router = MagicMock()
    async def dummy_gen(*args, **kwargs):
        yield "response"
    mock_router.generate = MagicMock(side_effect=dummy_gen)
    agent = ChatAgent(mock_router, MagicMock(), MagicMock())
    
    # Generate history that exceeds 8000 tokens (32000 chars)
    # We will make 10 messages of 4000 chars each = 40000 chars
    large_text = "A" * 4000
    history = [{"role": "user", "content": large_text} for _ in range(10)]
    
    payload = {"content": "world", "history": history, "use_vault": False}
    
    await agent.run(payload, AsyncMock())
    
    call_args = mock_router.generate.call_args
    messages = call_args.kwargs['messages']
    
    # System + truncated history + user
    # Total history kept should be around 8 messages
    assert len(messages) < 12
    assert len(messages) > 2

@pytest.mark.asyncio
async def test_attachment_size_limit_exceeded():
    # Test for main.py websocket logic mock
    # Just a placeholder for testing
    pass

@pytest.mark.asyncio
async def test_temp_dir_cleanup():
    # Test for main.py websocket logic mock
    pass

@pytest.mark.asyncio
async def test_retry_on_llm_failure():
    mock_router = MagicMock()
    
    # Async generator that raises Exception on first call, yields on second
    call_count = 0
    async def mock_generate(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("Temporary LLM error")
        yield "Success"

    mock_router.generate = mock_generate
    agent = ChatAgent(mock_router, MagicMock(), MagicMock())
    
    # Mock sleep to run fast
    with patch("asyncio.sleep", new_callable=AsyncMock):
        res = await agent.run({"content": "test", "use_vault": False}, AsyncMock())
    assert res["response"] == "Success"
    assert call_count == 2

@pytest.mark.asyncio
async def test_grounded_chat_streams_tokens():
    mock_router = MagicMock()
    mock_retriever = AsyncMock()
    mock_retriever.search.return_value = [{"text": "content", "source_id": "test"}]
    
    async def mock_generate(*args, **kwargs):
        yield "token1"
        yield "token2"

    mock_router.generate = mock_generate
    agent = GroundedChatAgent(mock_router, mock_retriever)
    
    mock_callback = AsyncMock()
    await agent.run({"content": "test", "notebook_id": "123"}, mock_callback)
    
    token_calls = [call for call in mock_callback.call_args_list if call.args[0] == "token"]
    assert len(token_calls) > 0
