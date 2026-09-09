import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from council_debate import CouncilDebate

@pytest.fixture
def mock_router():
    router = MagicMock()
    router.get_available_models.return_value = [
        {"model": "groq/llama-3.1-8b-instant", "provider": "Groq", "api_key_name": "GROQ_API_KEY"},
        {"model": "gemini/gemini-2.0-flash", "provider": "Gemini", "api_key_name": "GEMINI_API_KEY"},
        {"model": "cerebras/llama3.3-70b", "provider": "Cerebras", "api_key_name": "CEREBRAS_API_KEY"}
    ]
    return router

@pytest.fixture
def mock_vault_search():
    search = MagicMock()
    search.search.return_value = [
        {"relative_path": "Architecture.md", "text": "Archon uses FastAPI and LanceDB."}
    ]
    return search

@pytest.fixture
def mock_normalizer():
    norm = MagicMock()
    norm.convert = AsyncMock(return_value="/tmp/test.md")
    return norm

@pytest.mark.asyncio
async def test_council_debate_success_flow(mock_router, mock_vault_search, mock_normalizer):
    """Test standard 3-round debate with 3 models."""
    async def mock_gen(tier, messages, specific_model=None, **kwargs):
        yield f"Response from {specific_model} for {tier}"

    mock_router.generate.side_effect = mock_gen
    agent = CouncilDebate(mock_router, mock_vault_search, mock_normalizer)

    events = []
    async def callback(event, data):
        events.append((event, data))

    payload = {
        "content": "Should we use microservices or modular monolith?",
        "models": ["groq/llama-3.1-8b-instant", "gemini/gemini-2.0-flash"]
    }

    result = await agent.run(payload, callback)

    assert "drafts" in result
    assert "critiques" in result
    assert "synthesis" in result
    assert len(result["drafts"]) == 2
    assert len(result["critiques"]) == 2
    assert "Council Consensus" in [e[1].get("model") for e in events if e[0] == "token"]

    # Verify status events track all 3 rounds
    statuses = [e[1].get("status") for e in events if e[0] == "status"]
    assert any("Round 1" in s for s in statuses)
    assert any("Round 2" in s for s in statuses)
    assert any("Round 3" in s for s in statuses)

@pytest.mark.asyncio
async def test_council_debate_payload_fallback(mock_router, mock_vault_search, mock_normalizer):
    """Test that payload['text'] is properly recognized if 'content' is missing."""
    async def mock_gen(tier, messages, specific_model=None, **kwargs):
        yield "Valid draft"

    mock_router.generate.side_effect = mock_gen
    agent = CouncilDebate(mock_router, mock_vault_search, mock_normalizer)

    events = []
    async def callback(event, data):
        events.append((event, data))

    # Provide 'text' instead of 'content'
    payload = {"text": "Explain quantum entanglement"}
    result = await agent.run(payload, callback)

    assert len(result["drafts"]) > 0
    # Vault search should have been called with the fallback text
    mock_vault_search.search.assert_called_with("Explain quantum entanglement", top_k=3)

@pytest.mark.asyncio
async def test_council_debate_model_timeout(mock_router, mock_vault_search, mock_normalizer):
    """Test that a frozen/hanging model does not block the council forever."""
    async def mock_gen(tier, messages, specific_model=None, **kwargs):
        if specific_model == "groq/llama-3.1-8b-instant":
            # Simulate infinite hang
            await asyncio.sleep(100)
            yield "Never reached"
        else:
            yield "Quick response"

    mock_router.generate.side_effect = mock_gen
    agent = CouncilDebate(mock_router, mock_vault_search, mock_normalizer)
    agent.per_model_timeout = 0.2  # 200ms timeout for test

    events = []
    async def callback(event, data):
        events.append((event, data))

    payload = {
        "content": "Test timeout isolation",
        "models": ["groq/llama-3.1-8b-instant", "gemini/gemini-2.0-flash"]
    }

    result = await agent.run(payload, callback)

    # Groq should have timed out with error message, Gemini should succeed
    assert len(result["drafts"]) == 2
    assert any("timed out" in d.lower() or "error" in d.lower() for d in result["drafts"])
    assert any("Quick response" in d for d in result["drafts"])

@pytest.mark.asyncio
async def test_council_debate_context_truncation(mock_router, mock_vault_search, mock_normalizer):
    """Test that massive drafts are safely truncated before being passed to Round 2 & Round 3."""
    recorded_prompts = []

    async def mock_gen(tier, messages, specific_model=None, **kwargs):
        for m in messages:
            recorded_prompts.append(m.get("content", ""))
        # Return a massive 20,000 character draft
        yield "A" * 20000

    mock_router.generate.side_effect = mock_gen
    agent = CouncilDebate(mock_router, mock_vault_search, mock_normalizer)
    agent.max_transcript_chars = 4000

    events = []
    async def callback(event, data):
        events.append((event, data))

    payload = {
        "content": "Stress test prompt length",
        "models": ["groq/llama-3.1-8b-instant", "gemini/gemini-2.0-flash"]
    }

    result = await agent.run(payload, callback)

    # Check synthesis prompt length
    synthesis_prompts = [p for p in recorded_prompts if "Council Debate Transcript" in p]
    assert len(synthesis_prompts) > 0
    # Synthesis prompt transcript portion must be bounded
    for p in synthesis_prompts:
        transcript_part = p.split("## Council Debate Transcript")[1]
        assert len(transcript_part) <= 6000  # Well within safe bounds

@pytest.mark.asyncio
async def test_council_debate_round_separators(mock_router, mock_vault_search, mock_normalizer):
    """Test that Round 2 critique output includes an explicit round delimiter."""
    async def mock_gen(tier, messages, specific_model=None, **kwargs):
        yield "content"

    mock_router.generate.side_effect = mock_gen
    agent = CouncilDebate(mock_router, mock_vault_search, mock_normalizer)

    events = []
    async def callback(event, data):
        events.append((event, data))

    payload = {
        "content": "Test separator emission",
        "models": ["gemini/gemini-2.0-flash"]
    }

    await agent.run(payload, callback)

    token_texts = [e[1]["text"] for e in events if e[0] == "token" and e[1].get("model") == "gemini/gemini-2.0-flash"]
    # Verify separator was emitted between Round 1 and Round 2
    full_stream = "".join(token_texts)
    assert "Round 2" in full_stream or "Critique" in full_stream
