import os
import shutil
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from retriever import Retriever, TopicExtractor
from model_router import ModelRouter

@pytest.mark.asyncio
async def test_retriever_indexing_and_search():
    db_path = "./test_lancedb_retriever"
    if os.path.exists(db_path):
        shutil.rmtree(db_path)

    # Mock ModelRouter & Ollama client
    mock_router = MagicMock(spec=ModelRouter)
    # Mocking generator for topic extraction: returns "topic_a, topic_b"
    async def mock_gen(*args, **kwargs):
        yield "topic_a, topic_b"
    mock_router.generate.side_effect = mock_gen

    with patch("retriever.OllamaEmbeddingClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value
        # Explicitly setup AsyncMocks for async functions
        mock_client.get_embeddings_batch = AsyncMock(return_value=[[0.1] * 768])
        mock_client.get_embedding = AsyncMock(return_value=[0.1] * 768)

        retriever = Retriever(db_path=db_path, model_router=mock_router)
        
        parsed_content = {
            "pages": [{"page_number": 1, "text": "This is a document about topic_a and topic_b."}]
        }
        
        # Test index_source
        await retriever.index_source(
            notebook_id="notebook_123",
            source_id="source_abc",
            source_type="pdf",
            parsed_content=parsed_content
        )
        
        # Verify topic table populated
        topics = retriever.topic_table.search().to_list()
        assert len(topics) == 2
        assert topics[0]["topic"] in ["topic_a", "topic_b"]

        # Test search
        results = await retriever.search(notebook_id="notebook_123", query="topic_a", top_k=2)
        assert len(results) == 1
        assert results[0]["notebook_id"] == "notebook_123"
        assert results[0]["source_id"] == "source_abc"
        assert results[0]["location"]["page_number"] == 1

    if os.path.exists(db_path):
        shutil.rmtree(db_path)

@pytest.mark.asyncio
async def test_topic_extractor_fallback():
    # Test fallback extraction when ModelRouter raises an error
    mock_router = MagicMock(spec=ModelRouter)
    mock_router.generate.side_effect = Exception("API key missing or throttled")
    
    extractor = TopicExtractor(mock_router)
    
    text = "Artificial intelligence and machine learning are revolutionizing software engineering. Software is everywhere."
    topics = await extractor.extract_topics(text)
    # The fallback should extract common words of length >= 5
    assert len(topics) > 0
    assert "software" in topics

@pytest.mark.asyncio
async def test_near_duplicate_removal():
    mock_router = MagicMock(spec=ModelRouter)
    retriever = Retriever(db_path="./test_lancedb_dup", model_router=mock_router)
    
    docs = [
        {"notebook_id": "nb", "source_id": "s1", "text": "This is a unique sentence one.", "location": "{}"},
        {"notebook_id": "nb", "source_id": "s2", "text": "This is a unique sentence one.", "location": "{}"}, # Near duplicate but different source -> preserved
        {"notebook_id": "nb", "source_id": "s1", "text": "This is a unique sentence one.", "location": "{}"}, # Near duplicate same source -> deduplicated
        {"notebook_id": "nb", "source_id": "s3", "text": "This is completely different.", "location": "{}"}
    ]
    
    deduped = retriever._remove_near_duplicates(docs, threshold=0.85)
    assert len(deduped) == 3
    assert deduped[0]["source_id"] == "s1"
    assert deduped[1]["source_id"] == "s2"
    assert deduped[2]["source_id"] == "s3"
    
    if os.path.exists("./test_lancedb_dup"):
        shutil.rmtree("./test_lancedb_dup")


@pytest.mark.asyncio
async def test_retriever_single_quote_injection():
    db_path = "./test_lancedb_quotes"
    if os.path.exists(db_path):
        shutil.rmtree(db_path)

    mock_router = MagicMock(spec=ModelRouter)
    async def mock_query_gen(*args, **kwargs):
        yield "topic'a, topic'b"
    mock_router.generate.side_effect = mock_query_gen

    with patch("retriever.OllamaEmbeddingClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value
        mock_client.get_embeddings_batch = AsyncMock(return_value=[[0.1] * 768])
        mock_client.get_embedding = AsyncMock(return_value=[0.1] * 768)

        retriever = Retriever(db_path=db_path, model_router=mock_router)
        
        parsed_content = {
            "pages": [{"page_number": 1, "text": "This is a document about topic'a."}]
        }
        
        # Test index_source with single quotes
        await retriever.index_source(
            notebook_id="notebook'123",
            source_id="source'abc",
            source_type="pdf",
            parsed_content=parsed_content
        )
        
        # Test search with single quotes in query and check that it runs without crash
        results = await retriever.search(notebook_id="notebook'123", query="topic'a", top_k=2)
        
    if os.path.exists(db_path):
        shutil.rmtree(db_path)

@pytest.mark.asyncio
async def test_retriever_fallback_limit():
    db_path = "./test_lancedb_fallback"
    if os.path.exists(db_path):
        shutil.rmtree(db_path)

    mock_router = MagicMock(spec=ModelRouter)
    
    with patch("retriever.OllamaEmbeddingClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value
        mock_client.get_embeddings_batch = AsyncMock(return_value=[[0.1] * 768])
        mock_client.get_embedding = AsyncMock(return_value=[0.1] * 768)

        retriever = Retriever(db_path=db_path, model_router=mock_router)
        
        original_search = retriever.chunks_table.search
        mock_query = MagicMock()
        mock_where = MagicMock()
        mock_limit = MagicMock()
        
        mock_query.where.return_value = mock_where
        mock_where.limit.return_value = mock_limit
        mock_limit.to_list.return_value = []
        
        def spy_search(*args, **kwargs):
            if not args and not kwargs:
                return mock_query
            if len(args) > 1 and args[1] == "fts":
                raise Exception("Simulated FTS Failure")
            if "query_type" in kwargs and kwargs["query_type"] == "fts":
                raise Exception("Simulated FTS Failure")
            return original_search(*args, **kwargs)
            
        retriever.chunks_table.search = spy_search
        
        # Trigger the fallback search
        await retriever.search(notebook_id="nb", query="paragraph", top_k=2)
        
        # Verify that limit(1000) was indeed called in fallback
        mock_where.limit.assert_called_with(1000)
        
    if os.path.exists(db_path):
        shutil.rmtree(db_path)
