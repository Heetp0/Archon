import logging
logger = logging.getLogger(__name__)

import os
import time
import random
import asyncio
from typing import Callable, Any, Coroutine, List, Dict, Optional
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer

class CouncilDebate(BaseAgent):
    def __init__(self, model_router: ModelRouter, vault_search: VaultSearch, markit_down: MarkitDownNormalizer):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down
        
        # Operational limits & resilience parameters
        self.per_model_timeout = 45.0          # Max seconds per model response before isolating failure
        self.max_peer_draft_chars = 2000       # Truncate each peer draft in Round 2 to prevent token overflow
        self.max_transcript_chars = 7000       # Truncate debate transcript in Round 3
        self.max_shared_context_chars = 3500   # Max characters for attachments + vault snippets
        self.max_retries = 2                   # Max retries on transient rate-limit / network drops

    def _truncate(self, text: str, max_chars: int) -> str:
        """Safely truncate text with an indicator if it exceeds budget."""
        if not text or len(text) <= max_chars:
            return text
        return text[:max_chars].rstrip() + "\n\n...[content truncated for token budget]..."

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        start_time = time.time()
        
        # 1. Normalize query input (support both 'content' and 'text')
        text = payload.get("content") or payload.get("text") or ""
        context = payload.get("context", {}) or {}
        attachments = context.get("attachments", [])

        # 2. Normalize attachments
        attachment_contents = []
        for file_path in attachments:
            if os.path.exists(file_path):
                try:
                    cached_md_path = await self.normalizer.convert(file_path)
                    with open(cached_md_path, 'r', encoding='utf-8', errors='ignore') as f:
                        md_content = f.read()
                    attachment_contents.append(f"### Attachment: {os.path.basename(file_path)}\n\n{md_content}")
                except Exception as e:
                    logger.warning(f"Handled attachment conversion error: {e}")

        # 3. Retrieve top-3 vault snippets
        vault_context = ""
        if text:
            await send_token_callback("status", {"status": "Retrieving vault context for the council..."})
            try:
                search_results = self.search_service.search(text, top_k=3)
                if search_results:
                    vault_context_blocks = []
                    for res in search_results:
                        vault_context_blocks.append(f"Source Note: {res['relative_path']}\nContent:\n{res['text']}")
                    vault_context = "\n\n---\n\n".join(vault_context_blocks)
            except Exception as e:
                logger.warning(f"Vault search failed, continuing without vault context: {e}")

        # Build shared context with truncation guard
        shared_context_raw = ""
        if attachment_contents:
            shared_context_raw += "\n\n## Attached Documents\n" + "\n\n".join(attachment_contents)
        if vault_context:
            shared_context_raw += "\n\n## Vault Context\n" + vault_context
        shared_context = self._truncate(shared_context_raw, self.max_shared_context_chars)

        # 4. Resolve council member models
        requested_models = payload.get("models") or payload.get("selected_models")
        all_available_models = self.router.get_available_models("fast") + self.router.get_available_models("heavy")
        seen = set()
        unique_available = [m for m in all_available_models if not (m["model"] in seen or seen.add(m["model"]))]

        if requested_models and isinstance(requested_models, list):
            council_models = [m for m in unique_available if m["model"] in requested_models]
            # Fallback if requested models are currently unavailable
            if not council_models:
                council_models = unique_available[:len(requested_models)]
        else:
            fast_models = self.router.get_available_models("fast")
            if not fast_models:
                fast_models = self.router.get_available_models("heavy")
            council_models = fast_models[:3]

        if not council_models:
            raise RuntimeError("No models available for Council Debate.")

        model_names = [m["model"] for m in council_models]
        telemetry = {
            "models": model_names,
            "round_latencies_ms": {},
            "total_tokens_estimated": 0
        }

        # Resilient generator wrapper with timeout and exponential backoff retry
        async def generate_completion_with_resilience(model_meta: dict, messages: list, agent_name: str, tier: str = "fast", is_round_2: bool = False) -> str:
            full_text = ""
            model_id = model_meta.get("model", agent_name)

            # If this is Round 2, emit explicit visual delimiter before streaming so text doesn't merge into Round 1
            if is_round_2:
                delimiter = "\n\n---\n### Round 2: Critique & Refinement\n\n"
                full_text += delimiter
                await send_token_callback("token", {"text": delimiter, "model": agent_name})

            async def _stream_call():
                nonlocal full_text
                async for content in self.router.generate(tier=tier, messages=messages, specific_model=model_id):
                    full_text += content
                    await send_token_callback("token", {"text": content, "model": agent_name})

            # Retry loop with exponential backoff & jitter
            for attempt in range(self.max_retries + 1):
                try:
                    await asyncio.wait_for(_stream_call(), timeout=self.per_model_timeout)
                    break
                except asyncio.TimeoutError:
                    logger.error(f"Council model {model_id} timed out after {self.per_model_timeout}s.")
                    err_msg = f"\n[Model {model_id} timed out after {self.per_model_timeout}s]\n"
                    full_text += err_msg
                    await send_token_callback("token", {"text": err_msg, "model": agent_name})
                    break
                except Exception as e:
                    if attempt < self.max_retries and ("429" in str(e).lower() or "rate" in str(e).lower()):
                        backoff = (2 ** attempt) + random.uniform(0.2, 0.8)
                        logger.warning(f"Rate limit on {model_id}, retrying in {backoff:.2f}s (attempt {attempt+1}/{self.max_retries}): {e}")
                        await asyncio.sleep(backoff)
                        continue
                    else:
                        logger.error(f"Error from council model {model_id}: {e}")
                        err_msg = f"\n[Error from {model_id}: {str(e)}]\n"
                        full_text += err_msg
                        await send_token_callback("token", {"text": err_msg, "model": agent_name})
                        break

            return full_text

        # -------------------------------------------------------------
        # ROUND 1: Parallel Initial Drafts
        # -------------------------------------------------------------
        r1_start = time.time()
        await send_token_callback("status", {
            "status": f"Round 1/3 (Parallel Drafts): Consulting {len(council_models)} models ({', '.join(model_names)})",
            "phase": "round_1",
            "models": model_names
        })

        draft_tasks = []
        for i, m_meta in enumerate(council_models):
            m_name = model_names[i]
            prompt = (
                f"You are an expert member of the AI Council. Answer the user's question directly and authoritatively. "
                f"Be precise, provide technical rationale, and ground your response in the provided context where applicable.\n\n"
                f"Question: {text}\n{shared_context}"
            )
            draft_tasks.append(
                generate_completion_with_resilience(
                    m_meta,
                    [{"role": "user", "content": prompt}],
                    m_name,
                    tier="fast",
                    is_round_2=False
                )
            )

        drafts = await asyncio.gather(*draft_tasks)
        telemetry["round_latencies_ms"]["round_1"] = int((time.time() - r1_start) * 1000)

        # Check if all drafts completely failed
        valid_drafts = [d for d in drafts if d and not d.startswith("\n[Error") and not d.startswith("\n[Model")]
        if not valid_drafts:
            logger.error("All council members failed to provide a valid draft in Round 1.")
            await send_token_callback("status", {"status": "Council debate aborted: all providers failed to respond."})
            return {
                "drafts": drafts,
                "critiques": [],
                "synthesis": "The council was unable to formulate a response due to provider unavailability.",
                "telemetry": telemetry
            }

        # -------------------------------------------------------------
        # ROUND 2: Parallel Cross-Critique & Refinement
        # -------------------------------------------------------------
        r2_start = time.time()
        await send_token_callback("status", {
            "status": "Round 2/3 (Cross-Critique): Council members critiquing and refining proposals...",
            "phase": "round_2"
        })

        critique_tasks = []
        for i, m_meta in enumerate(council_models):
            m_name = model_names[i]
            
            # Format other drafts with truncation budget
            other_draft_blocks = []
            for j in range(len(drafts)):
                if j != i:
                    sanitized_draft = self._truncate(drafts[j], self.max_peer_draft_chars)
                    other_draft_blocks.append(f"### Proposed Draft from {model_names[j]}:\n{sanitized_draft}")
            other_drafts = "\n\n".join(other_draft_blocks) if other_draft_blocks else "[No peer drafts available]"

            own_draft_sanitized = self._truncate(drafts[i], self.max_peer_draft_chars)

            prompt = (
                f"You are participating in Round 2 of the AI Council debate.\n\n"
                f"Original Directive: {text}\n\n"
                f"Your Initial Draft Response:\n{own_draft_sanitized}\n\n"
                f"Draft Responses from Peer Council Members:\n{other_drafts}\n\n"
                f"Instructions:\n"
                f"1. Critique the peer responses: identify flawed assumptions, technical edge-case omissions, or scalability risks.\n"
                f"2. Acknowledge any superior points or insights raised by your peers.\n"
                f"3. State your refined position and how the final recommendation should be shaped."
            )
            critique_tasks.append(
                generate_completion_with_resilience(
                    m_meta,
                    [{"role": "user", "content": prompt}],
                    m_name,
                    tier="fast",
                    is_round_2=True
                )
            )

        critiques = await asyncio.gather(*critique_tasks)
        telemetry["round_latencies_ms"]["round_2"] = int((time.time() - r2_start) * 1000)

        # -------------------------------------------------------------
        # ROUND 3: Authoritative Consensus Synthesis
        # -------------------------------------------------------------
        r3_start = time.time()
        await send_token_callback("status", {
            "status": "Round 3/3 (Consensus Synthesis): Generating final authoritative verdict...",
            "phase": "round_3"
        })

        heavy_models = self.router.get_available_models("heavy")
        if not heavy_models:
            heavy_models = council_models
        synthesis_model = heavy_models[0]

        # Construct bounded debate transcript
        debate_transcript_blocks = []
        for i in range(len(council_models)):
            m_name = model_names[i]
            draft_snip = self._truncate(drafts[i], 1200)
            critique_snip = self._truncate(critiques[i], 1200)
            debate_transcript_blocks.append(
                f"### Council Member: {m_name}\n"
                f"**Initial Position:**\n{draft_snip}\n\n"
                f"**Critique & Refinement:**\n{critique_snip}\n"
            )
        debate_transcript = self._truncate("\n\n---\n\n".join(debate_transcript_blocks), self.max_transcript_chars)

        synthesis_prompt = (
            f"You are the Leader of the AI Council. Your mission is to synthesize a definitive, "
            f"consensus response based on the original question, supporting documentation, and the full multi-round debate transcript.\n\n"
            f"Original Question: {text}\n\n"
            f"{shared_context}\n\n"
            f"## Council Debate Transcript\n{debate_transcript}\n\n"
            f"Formatting Requirements:\n"
            f"1. Deliver an authoritative, high-density synthesis that reconciles conflicting opinions and extracts optimal design choices.\n"
            f"2. Conclude with a clear structured section formatted exactly as:\n"
            f"   ## Council Verdict\n"
            f"   - **Recommended Approach:** [Direct recommendation]\n"
            f"   - **Key Trade-offs:** [Primary advantages vs operational costs]\n"
            f"   - **Dissenting Points / Risks Mitigated:** [Issues flagged during critique]\n"
            f"   - **Immediate Next Steps:** [Actionable implementation guidance]"
        )

        final_synthesis = await generate_completion_with_resilience(
            synthesis_model,
            [{"role": "user", "content": synthesis_prompt}],
            "Council Consensus",
            tier="heavy",
            is_round_2=False
        )
        telemetry["round_latencies_ms"]["round_3"] = int((time.time() - r3_start) * 1000)
        telemetry["total_elapsed_ms"] = int((time.time() - start_time) * 1000)
        
        # Estimate total tokens: rough chars / 4
        all_text = "".join(drafts) + "".join(critiques) + final_synthesis
        telemetry["total_tokens_estimated"] = int(len(all_text) / 4)

        await send_token_callback("status", {
            "status": f"Council Debate complete in {telemetry['total_elapsed_ms'] / 1000:.1f}s (~{telemetry['total_tokens_estimated']} tokens).",
            "phase": "done",
            "telemetry": telemetry
        })

        return {
            "drafts": drafts,
            "critiques": critiques,
            "synthesis": final_synthesis,
            "telemetry": telemetry
        }
