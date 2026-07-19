import sys
from unittest.mock import MagicMock, AsyncMock, patch

mock_client = MagicMock()
mock_client.get_embedding = AsyncMock(return_value=[0.1] * 768)
mock_client.get_embeddings_batch = AsyncMock(return_value=[[0.1] * 768])

patch_emb = patch('embeddings.OllamaEmbeddingClient', return_value=mock_client)
patch_ret = patch('retriever.OllamaEmbeddingClient', return_value=mock_client)
patch_emb.start()
patch_ret.start()
