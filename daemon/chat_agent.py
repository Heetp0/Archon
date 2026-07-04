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

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        text = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        context = payload.get("context", {}) or {}
        attachments = context.get("attachments", [])  # List of file paths
        
        # 1. Parse attachments using MarkitDown
        attachment_contents = []
        for file_path in attachments:
            if os.path.exists(file_path):
                await send_token_callback("status", {"status": f"Parsing attachment: {os.path.basename(file_path)}..."})
                try:
                    cached_md_path = await self.normalizer.convert(file_path)
                    with open(cached_md_path, 'r', encoding='utf-8', errors='ignore') as f:
                        md_content = f.read()
                    attachment_contents.append(f"### Attachment: {os.path.basename(file_path)}\n\n{md_content}")
                except Exception as e:
                    attachment_contents.append(f"### Attachment Error: {os.path.basename(file_path)}\n\nFailed to parse file: {str(e)}")

        # 2. Retrieve context from vault
        vault_context = ""
        if text:
            await send_token_callback("status", {"status": "Searching vault context..."})
            search_results = self.search_service.search(text, top_k=3)
            if search_results:
                vault_context_blocks = []
                for res in search_results:
                    vault_context_blocks.append(f"Source Note: {res['relative_path']}\nContent:\n{res['text']}")
                vault_context = "\n\n---\n\n".join(vault_context_blocks)
        
        # 3. Formulate system and user prompt
        system_prompt = (
            "You are The Core, a helpful AI operating system assistant. "
            "Use the provided vault context and attachment context to answer the user's question accurately."
        )
        
        user_content = text
        if attachment_contents:
            user_content += "\n\n## Attached Documents\n" + "\n\n".join(attachment_contents)
        if vault_context:
            user_content += "\n\n## Retrieved Vault Context\n" + vault_context

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        await send_token_callback("status", {"status": "Generating response..."})
        
        # 4. Stream response tokens via callback
        full_response = ""
        target_model = payload.get("model")
        async for token in self.router.generate(tier="fast", messages=messages, specific_model=target_model):
            full_response += token
            await send_token_callback("token", {"text": token})

        return {"response": full_response}

