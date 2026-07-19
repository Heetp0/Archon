import unittest
import asyncio
import sys
import os
from unittest.mock import patch, MagicMock, AsyncMock

# Add daemon directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from model_router import ModelRouter, MODEL_TIERS, RateLimitError

class TestModelRouter(unittest.TestCase):
    def setUp(self):
        self.router = ModelRouter()
        # Disable semantic cache during unit tests to avoid persistent state interference
        self.router.cache = None

    def test_get_available_models_empty(self):
        # When no keys are present, available models should be empty
        with patch.object(self.router, '_get_api_key', return_value=""):
            fast_models = self.router.get_available_models("fast")
            self.assertEqual(fast_models, [])

    def test_get_available_models_with_keys(self):
        # Mock API keys present
        def mock_keys(name):
            if name in ["GROQ_API_KEY", "GEMINI_API_KEY", "CEREBRAS_API_KEY"]:
                return "mock_key"
            return ""

        with patch.object(self.router, '_get_api_key', side_effect=mock_keys):
            fast_models = self.router.get_available_models("fast")
            # Should match the configured fast models that have keys
            self.assertTrue(len(fast_models) >= 2)

    def test_throttling_logic(self):
        model_name = "groq/llama-3.1-8b-instant"
        self.assertFalse(self.router.is_throttled(model_name))
        
        self.router.throttle_model(model_name)
        self.assertTrue(self.router.is_throttled(model_name))
        
        # Test expiration
        with patch('time.time', return_value=self.router.throttled_until[model_name] + 1):
            self.assertFalse(self.router.is_throttled(model_name))

    @patch('model_router.acompletion')
    def test_generate_fallback_flow(self, mock_acompletion):
        # We want to test that if the first model fails with RateLimitError, 
        # it falls back to the second model and succeeds.
        
        # Setup mock keys
        def mock_keys(name):
            return "mock_key"
            
        self.router._get_api_key = mock_keys

        # Configure mock_acompletion responses:
        # First call raises RateLimitError
        # Second call returns a mock generator yielding a single text chunk
        mock_response_chunk = MagicMock()
        mock_response_chunk.choices = [MagicMock()]
        mock_response_chunk.choices[0].delta = MagicMock()
        mock_response_chunk.choices[0].delta.content = "success token"

        async def mock_generator():
            yield mock_response_chunk

        mock_acompletion.side_effect = [
            RateLimitError(message="Rate limit exceeded", response=MagicMock(), model="groq/llama-3.1-8b-instant", llm_provider="groq"),
            mock_generator()
        ]

        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            tokens = []
            async def run():
                async for token in self.router.generate("fast", [{"role": "user", "content": "hi"}], temperature=0.7):
                    tokens.append(token)
            
            loop.run_until_complete(run())
            self.assertEqual(tokens, ["success token"])
            # The first model should now be throttled
            first_model = self.router.get_available_models("fast")[0]["model"]
            self.assertTrue(self.router.is_throttled(first_model))
        finally:
            loop.close()

if __name__ == '__main__':
    unittest.main()
