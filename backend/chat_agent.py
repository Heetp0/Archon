import os
import asyncio
import logging
import random
from typing import Callable, Any, Coroutine, List, Dict
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from config import WORKSPACE_ROOT

logger = logging.getLogger(__name__)

class ChatAgent(BaseAgent):
    def __init__(self, model_router: ModelRouter, vault_search: VaultSearch, markit_down: MarkitDownNormalizer):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down

    def _build_web_search_kwargs(self, model: str) -> dict:
        if not model:
            return {}
        m = model.lower()
        if m.startswith("gemini/"):
            return {"tools": [{"googleSearch": {}}]}
        if m.startswith("xai/"):
            return {"extra_body": {"search_parameters": {"mode": "auto"}}}
        return {}

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        req_id = payload.get("req_id", "unknown")
        logger.info(f"[{req_id}] Starting ChatAgent run")
        
        text        = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        context     = payload.get("context", {}) or {}
        attachments = context.get("attachments", [])

        use_vault   = payload.get("use_vault", True)
        web_search  = payload.get("web_search", False)

        history: List[Dict[str, str]] = payload.get("history", [])

        attachment_contents = []
        for file_path in attachments:
            if os.path.exists(file_path):
                await send_token_callback("status", {"status": f"Parsing attachment: {os.path.basename(file_path)}..."})
                try:
                    cached_md_path = await self.normalizer.convert(file_path)
                    with open(cached_md_path, "r", encoding="utf-8", errors="ignore") as f:
                        md_content = f.read()
                    attachment_contents.append(f"### Attachment: {os.path.basename(file_path)}\n\n{md_content}")
                except Exception as e:
                    logger.error(f"[{req_id}] Failed to parse file {file_path}: {e}")
                    attachment_contents.append(f"### Attachment Error: {os.path.basename(file_path)}\n\nFailed to parse file: {str(e)}")

        vault_context = ""
        if use_vault and text:
            await send_token_callback("status", {"status": "Searching vault context..."})
            try:
                search_results = await asyncio.to_thread(self.search_service.search, text, top_k=3)
                if search_results:
                    blocks = [
                        f"Source Note: {r['relative_path']}\nContent:\n{r['text']}"
                        for r in search_results
                    ]
                    vault_context = "\n\n---\n\n".join(blocks)
            except Exception as e:
                logger.error(f"[{req_id}] Vault search failed: {e}")

        system_parts = [
            "You are The Core, a helpful AI operating system assistant. "
            "Answer the user's question accurately and concisely."
        ]
        if use_vault:
            system_parts.append("When relevant, use the vault context provided at the end of the user's message.")
        if web_search:
            system_parts.append("You have access to real-time web search — use it to answer questions about current events.")
        system_prompt = " ".join(system_parts)

        user_content = text
        if attachment_contents:
            user_content += "\n\n## Attached Documents\n" + "\n\n".join(attachment_contents)
        if vault_context:
            user_content += "\n\n## Retrieved Vault Context\n" + vault_context

        sanitised_history = [
            {"role": entry["role"], "content": entry.get("content", "")}
            for entry in history
            if entry.get("role") in ("user", "assistant") and entry.get("content")
        ]

        # History truncation strategy (8000 tokens rolling window max approx)
        MAX_HISTORY_TOKENS = 8000
        CHARS_PER_TOKEN = 4
        
        system_tokens = len(system_prompt) // CHARS_PER_TOKEN
        user_tokens = len(user_content) // CHARS_PER_TOKEN
        
        available_history_tokens = MAX_HISTORY_TOKENS - system_tokens - user_tokens
        
        truncated_history = []
        if available_history_tokens > 0:
            current_history_tokens = 0
            # iterate in reverse to keep newest history
            for entry in reversed(sanitised_history):
                entry_tokens = len(entry["content"]) // CHARS_PER_TOKEN
                if current_history_tokens + entry_tokens <= available_history_tokens:
                    truncated_history.insert(0, entry)
                    current_history_tokens += entry_tokens
                else:
                    logger.info(f"[{req_id}] History truncated to stay under token limit.")
                    break

        messages = (
            [{"role": "system", "content": system_prompt}]
            + truncated_history
            + [{"role": "user", "content": user_content}]
        )

        total_estimated_tokens = sum(len(m["content"]) for m in messages) // CHARS_PER_TOKEN
        if total_estimated_tokens > 6000:
            logger.warning(f"[{req_id}] Context window large: estimated {total_estimated_tokens} tokens.")

        target_model = payload.get("model")
        extra_kwargs  = self._build_web_search_kwargs(target_model) if web_search else {}

        await send_token_callback("status", {"status": "Generating response..."})

        # Retry logic with exponential backoff + jitter
        max_retries = 3
        base_delays = [1, 2, 4]
        full_response = ""
        
        for attempt in range(max_retries + 1):
            try:
                full_response = ""
                async for token in self.router.generate(
                    tier="fast",
                    messages=messages,
                    specific_model=target_model,
                    extra_kwargs=extra_kwargs,
                ):
                    full_response += token
                    await send_token_callback("token", {"text": token})
                break  # Success
            except Exception as e:
                logger.error(f"[{req_id}] Router generation failed on attempt {attempt + 1}: {e}")
                if attempt < max_retries:
                    delay = base_delays[attempt] + random.uniform(0, 0.5)
                    logger.info(f"[{req_id}] Retrying in {delay:.2f} seconds...")
                    await asyncio.sleep(delay)
                else:
                    raise RuntimeError(f"Failed to generate response after {max_retries} retries: {e}")

        logger.info(f"[{req_id}] Completed ChatAgent run")
        return {"response": full_response}
