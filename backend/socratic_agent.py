import json
import logging
import asyncio
import random
from typing import Dict, Any, List, Optional
from model_router import ModelRouter

logger = logging.getLogger("socratic_agent")

class SocraticAgent:
    def __init__(self, model_router: ModelRouter):
        self.router = model_router

    async def _call_llm(self, system_prompt: str, user_content: str, max_retries: int = 3) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                generator = self.router.generate(tier="fast", messages=messages)
                response_chunks = []
                async for chunk in generator:
                    response_chunks.append(chunk)
                return "".join(response_chunks).strip()
            except Exception as e:
                logger.error(f"LLM call failed in SocraticAgent (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise e
                
                # Exponential backoff with jitter
                delay = (base_delay * (2 ** attempt)) + random.uniform(0, 0.5)
                await asyncio.sleep(delay)

    async def generate_scaffold(
        self,
        student_error: str,
        expected_answer: str,
        tier: int = 1,
        question_text: str = ""
    ) -> Dict[str, Any]:
        """
        4 tiers of progressive disclosure:
        Level 1: Nudge / error zone highlight (high-level, no numbers spoiled)
        Level 2: Diagnostic question (e.g. "Look at step 2 where you factored...")
        Level 3: Methodological hint (suggests next rule/identity to apply)
        Level 4: Worked sub-step (demonstrates how to simplify one sub-part)
        """
        hint_gen_system = (
            "You are a Socratic Saffolding Tutor. Generate a mathematical hint in strictly valid JSON format.\n"
            "Format: {\"hint\": \"...\", \"tier\": %d, \"is_spoiler\": false}\n"
            "Guidelines based on tier:\n"
            "- Tier 1 (Nudge): High-level error zone highlight. Point out the general area, but no numbers/variables. Ask a nudge question.\n"
            "- Tier 2 (Diagnostic): Ask a diagnostic question (e.g. 'Look at step 2, what happens when you factored x?').\n"
            "- Tier 3 (Methodological): Suggest a specific rule, identity, or method to apply next without doing it.\n"
            "- Tier 4 (Worked sub-step): Demonstrate simplifying one sub-part of the problem, but leave the final result out.\n"
            "CRITICAL: Do NOT leak the final expected answer! Phrase your hint as a Socratic question if possible." % tier
        )
        hint_gen_user = (
            f"Question: {question_text}\n"
            f"Expected Solution: {expected_answer}\n"
            f"Student Error/Work: {student_error}\n"
            f"Requested Hint Tier: {tier}"
        )

        draft_json_str = await self._call_llm(hint_gen_system, hint_gen_user)
        
        try:
            if "```json" in draft_json_str:
                draft_json_str = draft_json_str.split("```json")[1].split("```")[0].strip()
            draft = json.loads(draft_json_str)
            draft_hint = draft.get("hint", draft_json_str)
        except Exception:
            draft_hint = draft_json_str

        logger.info(f"SocraticAgent - Draft Hint (Tier {tier}): {draft_hint}")

        # Validator
        validator_system = (
            "You are a strict Socratic Validator. Verify if the drafted hint spoils or explicitly reveals the expected final answer.\n"
            "Respond ONLY with 'SAFE' if the final answer is hidden, or 'SPOILED' if it reveals the solution."
        )
        validator_user = (
            f"Expected Final Solution: {expected_answer}\n"
            f"Drafted Hint: {draft_hint}"
        )

        try:
            validation = await self._call_llm(validator_system, validator_user)
            is_spoiled = "SPOILED" in validation.upper()
        except Exception:
            is_spoiled = False

        if is_spoiled:
            logger.warning("Spoiler detected in draft hint! Regenerating safe hint...")
            strict_system = (
                "You are a strict Socratic Tutor. Create a safe mathematical hint that contains absolutely NO spoilers.\n"
                f"It must not mention the expected correct answer '{expected_answer}'. Just output the hint text."
            )
            try:
                final_hint = await self._call_llm(strict_system, hint_gen_user)
            except Exception:
                final_hint = "Double check your steps against the rules of algebra. Are you missing anything?"
        else:
            final_hint = draft_hint

        return {
            "hint": final_hint,
            "tier": tier,
            "is_spoiler": is_spoiled
        }

    async def chat_with_tutor(
        self,
        message: str,
        lesson_id: str,
        checkpoint_id: str,
        notebook_id: str
    ) -> Dict[str, Any]:
        """
        Floating tutor side-dock chat endpoint handler inside the agent.
        Takes context to adapt notes, provide analogies, or change difficulty.
        """
        system_prompt = (
            "You are an intelligent side-dock Tutor for Archon. "
            "You are context-aware of the student's current notebook, lesson, and checkpoint.\n"
            "If the student asks for simpler theory, visually adapt the notes or provide a brilliant analogy.\n"
            "Keep the response Socratic, highly informative, and encouraging."
        )
        user_content = (
            f"Notebook ID: {notebook_id}\n"
            f"Lesson ID: {lesson_id}\n"
            f"Checkpoint ID: {checkpoint_id}\n"
            f"Student Message: {message}"
        )
        
        reply = await self._call_llm(system_prompt, user_content)
        return {"reply": reply}
