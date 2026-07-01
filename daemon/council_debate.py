import logging
logger = logging.getLogger(__name__)

import os
import asyncio
from typing import Callable, Any, Coroutine, List, Dict
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from litellm import acompletion

class CouncilDebate(BaseAgent):
    def __init__(self, model_router: ModelRouter, vault_search: VaultSearch, markit_down: MarkitDownNormalizer):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        text = payload.get("content", "")
        context = payload.get("context", {}) or {}
        attachments = context.get("attachments", [])

        # 1. Normalise attachments
        attachment_contents = []
        for file_path in attachments:
            if os.path.exists(file_path):
                try:
                    cached_md_path = self.normalizer.convert(file_path)
                    with open(cached_md_path, 'r', encoding='utf-8', errors='ignore') as f:
                        md_content = f.read()
                    attachment_contents.append(f"### Attachment: {os.path.basename(file_path)}\n\n{md_content}")
                except Exception as e:
                    logger.warning(f"Handled exception: {e}")

        # 2. Retrieve top-3 vault snippets
        vault_context = ""
        if text:
            await send_token_callback("status", {"status": "Retrieving vault context for the council..."})
            search_results = self.search_service.search(text, top_k=3)
            if search_results:
                vault_context_blocks = []
                for res in search_results:
                    vault_context_blocks.append(f"Source Note: {res['relative_path']}\nContent:\n{res['text']}")
                vault_context = "\n\n---\n\n".join(vault_context_blocks)

        # Build shared context
        shared_context = ""
        if attachment_contents:
            shared_context += "\n\n## Attached Documents\n" + "\n\n".join(attachment_contents)
        if vault_context:
            shared_context += "\n\n## Vault Context\n" + vault_context

        # Get available fast models for Round 1 & 2
        fast_models = self.router.get_available_models("fast")
        if not fast_models:
            # Fallback to whatever is available
            fast_models = self.router.get_available_models("heavy")
        
        # Limit to top 3 models
        council_models = fast_models[:3]
        if not council_models:
            raise RuntimeError("No models available for Council Debate.")

        # Names for frontend routing
        model_names = [m["model"] for m in council_models]

        await send_token_callback("status", {"status": f"Initiating Round 1 (Parallel Draft) with: {', '.join(model_names)}"})

        # Helper function to generate completion from a specific model
        async def generate_completion(model_meta: dict, messages: list, agent_name: str) -> str:
            model_name = model_meta["model"]
            key_val = self.router._get_api_key(model_meta["api_key_name"])
            api_base = model_meta.get("api_base", None)

            full_text = ""
            try:
                response = await acompletion(
                    model=model_name,
                    messages=messages,
                    stream=True,
                    temperature=0.7,
                    api_key=key_val,
                    api_base=api_base
                )
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        full_text += content
                        await send_token_callback("token", {"content": content, "model": agent_name})
            except Exception as e:
                err_msg = f"\n[Error from {model_name}: {str(e)}]\n"
                full_text += err_msg
                await send_token_callback("token", {"content": err_msg, "model": agent_name})
            return full_text

        # ROUND 1: Parallel Draft
        draft_tasks = []
        for i, m_meta in enumerate(council_models):
            m_name = model_names[i]
            prompt = (
                f"You are a member of the AI Council. Answer the user's question. "
                f"Be precise and rely on the provided context where applicable.\n\n"
                f"Question: {text}\n{shared_context}"
            )
            draft_tasks.append(generate_completion(m_meta, [{"role": "user", "content": prompt}], m_name))

        drafts = await asyncio.gather(*draft_tasks)

        await send_token_callback("status", {"status": "Initiating Round 2 (Parallel Critique)..."})

        # ROUND 2: Critique
        critique_tasks = []
        for i, m_meta in enumerate(council_models):
            m_name = model_names[i]
            other_drafts = "\n\n".join([
                f"Draft from {model_names[j]}:\n{drafts[j]}" 
                for j in range(len(drafts)) if j != i
            ])
            prompt = (
                f"Here is the original question: {text}\n"
                f"Here is your original draft response:\n{drafts[i]}\n\n"
                f"Here are the draft responses from other council members:\n{other_drafts}\n\n"
                f"Please critique the other responses. Point out any errors, omissions, or gaps. "
                f"Then, briefly summarize how your response could be improved based on their ideas."
            )
            critique_tasks.append(generate_completion(m_meta, [{"role": "user", "content": prompt}], m_name))

        critiques = await asyncio.gather(*critique_tasks)

        await send_token_callback("status", {"status": "Initiating Round 3 (Consensus Synthesis)..."})

        # ROUND 3: Synthesis
        heavy_models = self.router.get_available_models("heavy")
        if not heavy_models:
            heavy_models = council_models
        synthesis_model = heavy_models[0]

        debate_transcript = ""
        for i in range(len(council_models)):
            debate_transcript += f"### Council Member {model_names[i]}\n"
            debate_transcript += f"**Draft Response:**\n{drafts[i]}\n\n"
            debate_transcript += f"**Critique of others & refinement:**\n{critiques[i]}\n\n"

        synthesis_prompt = (
            f"You are the Leader of the AI Council. Your job is to synthesize a single, authoritative, "
            f"consensus response based on the question, the context, and the debate transcript (drafts and critiques) "
            f"from other council members.\n\n"
            f"Be comprehensive, merge the best points, resolve contradictions, and provide citation links to the vault note files "
            f"where appropriate.\n\n"
            f"Question: {text}\n\n"
            f"{shared_context}\n\n"
            f"## Council Debate Transcript\n{debate_transcript}"
        )

        final_synthesis = await generate_completion(
            synthesis_model, 
            [{"role": "user", "content": synthesis_prompt}], 
            "Council Consensus"
        )

        return {
            "drafts": drafts,
            "critiques": critiques,
            "synthesis": final_synthesis
        }



