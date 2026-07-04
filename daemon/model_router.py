import os
import json
import time
import logging
import asyncio
from typing import AsyncGenerator, List, Dict, Optional
import litellm
from litellm import acompletion
from litellm.exceptions import RateLimitError

# Set litellm to silent by default
litellm.telemetry = False

# Import credentials from config
try:
    import config
except ImportError:
    class DummyConfig:
        GEMINI_API_KEY = ""
        GROQ_API_KEY = ""
        CEREBRAS_API_KEY = ""
        OPENROUTER_API_KEY = ""
        MISTRAL_API_KEY = ""
        WORKSPACE_ROOT = "."
    config = DummyConfig()

# Configure logger
logger = logging.getLogger("model_router")
logging.basicConfig(level=logging.INFO)

# Define our models metadata
MODEL_TIERS = {
    "fast": [
        {
            "model": "groq/llama-3.1-8b-instant",
            "api_key_name": "GROQ_API_KEY",
            "env_name": "GROQ_API_KEY",
            "provider": "Groq",
            "display_name": "Llama 3.1 8B"
        },
        {
            "model": "groq/gemma2-9b-it",
            "api_key_name": "GROQ_API_KEY",
            "env_name": "GROQ_API_KEY",
            "provider": "Groq",
            "display_name": "Gemma 2 9B"
        },
        {
            "model": "gemini/gemini-2.0-flash",
            "api_key_name": "GEMINI_API_KEY",
            "env_name": "GEMINI_API_KEY",
            "provider": "Gemini",
            "display_name": "Gemini 2.0 Flash"
        },
        {
            "model": "openrouter/meta-llama/llama-3.3-70b-instruct:free",
            "api_key_name": "OPENROUTER_API_KEY",
            "env_name": "OPENROUTER_API_KEY",
            "provider": "OpenRouter",
            "display_name": "Llama 3.3 70B"
        },
        {
            "model": "gpt-4o-mini",
            "api_key_name": "OPENAI_API_KEY",
            "env_name": "OPENAI_API_KEY",
            "provider": "OpenAI",
            "display_name": "GPT 4o Mini"
        },
        {
            "model": "claude-3-5-haiku-latest",
            "api_key_name": "ANTHROPIC_API_KEY",
            "env_name": "ANTHROPIC_API_KEY",
            "provider": "Anthropic",
            "display_name": "Claude 3.5 Haiku"
        },
    ],
    "heavy": [
        {
            "model": "gemini/gemini-2.5-flash",
            "api_key_name": "GEMINI_API_KEY",
            "env_name": "GEMINI_API_KEY",
            "provider": "Gemini",
            "display_name": "Gemini 2.5 Flash"
        },
        {
            "model": "groq/llama-3.3-70b-versatile",
            "api_key_name": "GROQ_API_KEY",
            "env_name": "GROQ_API_KEY",
            "provider": "Groq",
            "display_name": "Llama 3.3 70B"
        },
        {
            "model": "mistral/open-mistral-nemo",
            "api_key_name": "MISTRAL_API_KEY",
            "env_name": "MISTRAL_API_KEY",
            "provider": "Mistral",
            "display_name": "Mistral Nemo"
        },
        {
            "model": "openrouter/deepseek/deepseek-r1:free",
            "api_key_name": "OPENROUTER_API_KEY",
            "env_name": "OPENROUTER_API_KEY",
            "provider": "OpenRouter",
            "display_name": "DeepSeek R1"
        },
        {
            "model": "openrouter/google/gemini-2.0-flash-exp:free",
            "api_key_name": "OPENROUTER_API_KEY",
            "env_name": "OPENROUTER_API_KEY",
            "provider": "OpenRouter",
            "display_name": "Gemini 2.0 Flash Exp"
        },
    ]
}

CEREBRAS_MODEL = {
    "model": "openai/llama3.3-70b",
    "api_key_name": "CEREBRAS_API_KEY",
    "env_name": "OPENAI_API_KEY",
    "api_base": "https://api.cerebras.ai/v1",
    "provider": "Cerebras",
    "display_name": "Llama 3.3 70B"
}

# Import semantic cache dynamically
try:
    from semantic_cache import SemanticCache
except ImportError:
    SemanticCache = None

class ModelRouter:
    def __init__(self):
        # Maps model string -> unix timestamp when it is unthrottled
        self.throttled_until: Dict[str, float] = {}
        # Cooldown duration in seconds
        self.cooldown_period = 60.0
        
        # Initialize semantic cache layer
        self.cache = None
        if SemanticCache:
            try:
                db_path = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), ".lancedb")
                self.cache = SemanticCache(db_path)
                logger.info("Semantic cache successfully loaded in ModelRouter.")
            except Exception as e:
                logger.error(f"Failed to load semantic cache: {str(e)}")

    def _get_api_key(self, api_key_name: str) -> str:
        # Check config first, then os.environ
        val = getattr(config, api_key_name, "")
        if not val:
            val = os.environ.get(api_key_name, "")
        return val

    def get_available_models_list(self) -> list:
        """
        Returns a flat list of all models whose API keys are configured.
        Each entry: {"model_id": str, "label": str, "tier": str}
        label format: "Provider â€¢ Display Name"
        """
        result = []
        seen = set()

        # Check Cerebras
        cerebras_key = self._get_api_key("CEREBRAS_API_KEY")
        if cerebras_key:
            m = CEREBRAS_MODEL
            label = f"{m['provider']} â€¢ {m['display_name']}"
            if m['model'] not in seen:
                result.append({"model_id": m["model"], "label": label, "tier": "fast"})
                seen.add(m['model'])

        for tier, models in MODEL_TIERS.items():
            for m in models:
                key = self._get_api_key(m["api_key_name"])
                if key and m["model"] not in seen:
                    label = f"{m['provider']} â€¢ {m['display_name']}"
                    result.append({"model_id": m["model"], "label": label, "tier": tier})
                    seen.add(m["model"])

        return result

    def get_available_models(self, tier: str) -> List[Dict]:
        models = []
        
        # Check if Cerebras is available and requested for "fast" tier
        if tier == "fast":
            cerebras_key = self._get_api_key("CEREBRAS_API_KEY")
            if cerebras_key:
                models.append(CEREBRAS_MODEL)

        # Add rest of the tier models
        for m in MODEL_TIERS.get(tier, []):
            models.append(m)

        # Filter out models where API keys are missing
        available = []
        for m in models:
            key = self._get_api_key(m["api_key_name"])
            if key:
                available.append(m)
        return available

    def throttle_model(self, model_name: str):
        logger.warning(f"Throttling model {model_name} for {self.cooldown_period} seconds.")
        self.throttled_until[model_name] = time.time() + self.cooldown_period

    def is_throttled(self, model_name: str) -> bool:
        until = self.throttled_until.get(model_name, 0.0)
        return time.time() < until

    async def generate(self, tier: str, messages: List[Dict[str, str]], temperature: float = 0.7, specific_model: str = None) -> AsyncGenerator[str, None]:
        # Extract query to check in semantic cache
        query = ""
        if messages and messages[-1].get("role") == "user":
            # Use full conversation history for cache key to avoid cross-pollination
            query = json.dumps(messages, sort_keys=True)

        # Check semantic cache first
        if self.cache and query:
            cached_response = await self.cache.get(query)
            if cached_response:
                logger.info(f"Semantic Cache HIT for query: '{query}'")
                # Stream cache chunks back to caller
                chunk_size = 30
                for i in range(0, len(cached_response), chunk_size):
                    yield cached_response[i:i+chunk_size]
                    await asyncio.sleep(0.01)
                return

        models = self.get_available_models(tier)
        if specific_model:
            filtered = [m for m in models if m["model"] == specific_model]
            if filtered:
                models = filtered
        if not models:
            raise RuntimeError(f"No configured API keys available for tier '{tier}'. Please check your config.py / .env file.")

        last_error = None
        response_buffer = []
        
        # Try models in order of tier priority
        for m in models:
            model_name = m["model"]
            
            # Skip if throttled
            if self.is_throttled(model_name):
                logger.info(f"Skipping throttled model: {model_name}")
                continue

            # Set correct environment variable dynamically for LiteLLM
            key_val = self._get_api_key(m["api_key_name"])
            os.environ[m["env_name"]] = key_val
            
            api_base = m.get("api_base", None)
            if api_base:
                os.environ["OPENAI_API_BASE"] = api_base
            else:
                os.environ.pop("OPENAI_API_BASE", None)

            logger.info(f"Attempting completion using model: {model_name}")
            
            try:
                # Call LiteLLM async stream
                response = await acompletion(
                    model=model_name,
                    messages=messages,
                    stream=True,
                    temperature=temperature
                )
                
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        response_buffer.append(content)
                        yield content
                
                # Cache response on successful completion
                if self.cache and query and response_buffer:
                    await self.cache.set(query, "".join(response_buffer))
                
                # Success, terminate loop
                return

            except RateLimitError as e:
                logger.error(f"RateLimitError encountered for {model_name}: {str(e)}")
                self.throttle_model(model_name)
                last_error = e
            except Exception as e:
                # Catch other API/network errors and fall back to next model
                logger.error(f"Error encountered for {model_name}: {str(e)}")
                # We throttle it temporarily to avoid hammering a failing provider
                self.throttle_model(model_name)
                last_error = e

        # If all models failed or were skipped
        if last_error:
            raise last_error
        else:
            raise RuntimeError(f"All available models in tier '{tier}' are currently throttled. Please wait a minute and try again.")


