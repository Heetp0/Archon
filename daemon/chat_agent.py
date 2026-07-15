import os
from typing import Callable, Any, Coroutine, List, Dict
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from config import WORKSPACE_ROOT


class ChatAgent(BaseAgent):
    def __init__(self, model_router: ModelRouter, vault_search: VaultSearch, markit_down: MarkitDownNormalizer):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down

    def _build_web_search_kwargs(self, model: str) -> dict:
        """
        Return provider-specific extra kwargs to enable web/grounding search.
        - Gemini models  → tools with googleSearch
        - xAI/Grok       → extra_body with search_parameters
        - Everything else → {} (silently ignored)
        """
        if not model:
            return {}
        m = model.lower()
        if m.startswith("gemini/"):
            return {"tools": [{"googleSearch": {}}]}
        if m.startswith("xai/"):
            return {"extra_body": {"search_parameters": {"mode": "auto"}}}
        return {}

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        text        = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        context     = payload.get("context", {}) or {}
        attachments = context.get("attachments", [])          # list of file paths

        # Flags sent by the frontend (with safe defaults)
        use_vault   = payload.get("use_vault", True)          # default ON for backward compat
        web_search  = payload.get("web_search", False)        # default OFF

        # Conversation history from the frontend: [{role, content}, ...]
        # Each entry mirrors the Message type used in WebSocketContext.
        history: List[Dict[str, str]] = payload.get("history", [])

        # 1. Parse attachments using MarkitDown
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
                    attachment_contents.append(f"### Attachment Error: {os.path.basename(file_path)}\n\nFailed to parse file: {str(e)}")

        # 2. (Optional) Retrieve context from vault
        vault_context = ""
        if use_vault and text:
            await send_token_callback("status", {"status": "Searching vault context..."})
            search_results = self.search_service.search(text, top_k=3)
            if search_results:
                blocks = [
                    f"Source Note: {r['relative_path']}\nContent:\n{r['text']}"
                    for r in search_results
                ]
                vault_context = "\n\n---\n\n".join(blocks)

        # 3. Build system prompt
        system_parts = [
            "You are The Core, a helpful AI operating system assistant. "
            "Answer the user's question accurately and concisely."
        ]
        if use_vault:
            system_parts.append("When relevant, use the vault context provided at the end of the user's message.")
        if web_search:
            system_parts.append("You have access to real-time web search — use it to answer questions about current events.")
        system_prompt = " ".join(system_parts)

        # 4. Build the current user turn (message + appended context)
        user_content = text
        if attachment_contents:
            user_content += "\n\n## Attached Documents\n" + "\n\n".join(attachment_contents)
        if vault_context:
            user_content += "\n\n## Retrieved Vault Context\n" + vault_context

        # 5. Assemble full message list:  [system] + prior history + [current user turn]
        # History entries from the frontend have role "user" or "assistant".
        # We keep them as-is; only strip the model field if present (not a valid OpenAI role key).
        sanitised_history = [
            {"role": entry["role"], "content": entry.get("content", "")}
            for entry in history
            if entry.get("role") in ("user", "assistant") and entry.get("content")
        ]

        messages = (
            [{"role": "system", "content": system_prompt}]
            + sanitised_history
            + [{"role": "user", "content": user_content}]
        )

        # 6. (Optional) Build provider-specific web-search kwargs
        target_model = payload.get("model")
        extra_kwargs  = self._build_web_search_kwargs(target_model) if web_search else {}

        await send_token_callback("status", {"status": "Generating response..."})

        # 7. Stream response
        full_response = ""
        async for token in self.router.generate(
            tier="fast",
            messages=messages,
            specific_model=target_model,
            extra_kwargs=extra_kwargs,
        ):
            full_response += token
            await send_token_callback("token", {"text": token})

        return {"response": full_response}
