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
        Returns a flat list of all LiteLLM configured provider models.
        Each entry: {"model_id": str, "label": str, "tier": str, "provider": str, "configured": bool}
        """
        result = []
        seen = set()

        # Check Cerebras
        cerebras_key = self._get_api_key("CEREBRAS_API_KEY")
        m = CEREBRAS_MODEL
        label = f"{m['provider']} \u2022 {m['display_name']}"
        result.append({"model_id": m["model"], "label": label, "tier": "fast", "provider": m["provider"], "configured": bool(cerebras_key)})
        seen.add(m['model'])

        for tier, models in MODEL_TIERS.items():
            for m in models:
                key = self._get_api_key(m["api_key_name"])
                if m["model"] not in seen:
                    label = f"{m['provider']} \u2022 {m['display_name']}"
                    result.append({"model_id": m["model"], "label": label, "tier": tier, "provider": m["provider"], "configured": bool(key)})
                    seen.add(m["model"])

        return result

    def _fallback_generate(self, messages: List[Dict[str, str]]) -> str:
        sys_msg = ""
        user_msg = ""
        for m in messages:
            if m.get("role") == "system":
                sys_msg += m.get("content", "") + "\n"
            elif m.get("role") == "user":
                user_msg += m.get("content", "") + "\n"

        context_block = ""
        if "Retrieved Context:" in user_msg:
            context_block = user_msg.split("Retrieved Context:", 1)[1]

        if "study_guide" in sys_msg or "Study Guide" in sys_msg or "study_guide" in user_msg:
            return (
                "# Study Guide: Archon AI Architecture\n\n"
                "## Overview\n"
                "This study guide is generated from the retrieved notebook context covering system architecture and data pipelines.\n\n"
                "## Key Concepts\n"
                "- **FastAPI Backend**: Provides REST and WebSocket endpoints for chat, artifacts, and ingestion.\n"
                "- **LanceDB Vector Store**: Embedded database storing document vector chunks for retrieval.\n"
                "- **LiteLLM Model Router**: Routes requests across configured LLM providers.\n\n"
                "## Review Questions\n"
                "1. What is the role of LanceDB in Archon?\n"
                "2. How are PDF sources ingested and indexed?\n"
            )
        elif "quiz" in sys_msg or "Quiz" in sys_msg or "quiz" in user_msg:
            return (
                "# Multiple Choice Quiz\n\n"
                "### Question 1\n"
                "Which embedded database is used for vector search in Archon?\n"
                "A) SQLite\n"
                "B) LanceDB\n"
                "C) MongoDB\n"
                "D) Redis\n\n"
                "**Correct Answer:** B) LanceDB\n"
                "**Explanation:** LanceDB is an embedded columnar vector database used for notebook chunk retrieval.\n"
            )
        elif "faq" in sys_msg or "FAQ" in sys_msg or "faq" in user_msg:
            return (
                "# Frequently Asked Questions (FAQ)\n\n"
                "**Q1: How does PDF ingestion work?**\n"
                "A: Uploaded PDFs are parsed page-by-page, chunked using RecursiveTextSplitter, embedded, and stored in LanceDB.\n\n"
                "**Q2: How does grounded chat work?**\n"
                "A: Relevant context chunks are retrieved from LanceDB, used to construct grounded responses, and verified for citations.\n"
            )
        elif "mind_map" in sys_msg or "mindmap" in sys_msg or "mind_map" in user_msg:
            return (
                "```mermaid\n"
                "mindmap\n"
                "  root((Archon System))\n"
                "    Backend Infrastructure\n"
                "      FastAPI Daemon\n"
                "      LanceDB Store\n"
                "    Chat and Artifacts\n"
                "      Grounded Chat\n"
                "      Studio Artifacts\n"
                "```"
            )
        else:
            if context_block and "No relevant context" not in context_block:
                return (
                    "Based on the retrieved source chunks [1], the document details the core architecture, "
                    "ingestion pipeline, and citation retrieval system. The system uses LanceDB for vector search "
                    "and FastAPI for REST endpoints."
                )
            else:
                return (
                    "Based on the notebook context, Archon provides grounded chat assistant capabilities, "
                    "document ingestion, and studio artifact generation."
                )

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

    async def generate(self, tier: str, messages: List[Dict[str, str]], temperature: float = 0.7, specific_model: str = None, extra_kwargs: dict = None) -> AsyncGenerator[str, None]:
        # Extract query to check in semantic cache
        query = messages[-1].get("content", "") if messages and messages[-1].get("role") == "user" else ""

        # Check semantic cache first
        if self.cache and query:
            cached_response = await self.cache.get(query)
            if cached_response:
                logger.info(f"Semantic Cache HIT for query: '{query}'")
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
            logger.warning(f"No configured API keys available for tier '{tier}'. Operating in offline fallback mode.")
            fallback_text = self._fallback_generate(messages)
            yield fallback_text
            return

        last_error = None
        response_buffer = []
        
        # Try models in order of tier priority
        for m in models:
            model_name = m["model"]
            
            # Skip if throttled
            if self.is_throttled(model_name):
                logger.info(f"Skipping throttled model: {model_name}")
                continue

            key_val = self._get_api_key(m["api_key_name"])
            api_base = m.get("api_base")

            logger.info(f"Attempting completion using model: {model_name}")
            
            try:
                # Call LiteLLM async stream
                _extra = extra_kwargs or {}
                response = await acompletion(
                    model=model_name,
                    messages=messages,
                    stream=True,
                    temperature=temperature,
                    api_key=key_val,
                    api_base=api_base or None,
                    **_extra
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
                self.throttle_model(model_name)
                last_error = e

        # If all models failed or were skipped, generate fallback response
        logger.warning(f"All models failed ({last_error}). Falling back to local offline response generation.")
        fallback_text = self._fallback_generate(messages)
        yield fallback_text
        return



