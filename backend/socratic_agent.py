import json
import logging
from typing import Dict, Any, List, Optional
from model_router import ModelRouter

logger = logging.getLogger("socratic_agent")

class SocraticAgent:
    def __init__(self, model_router: ModelRouter):
        self.router = model_router

    async def _call_llm(self, system_prompt: str, user_content: str) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        try:
            generator = self.router.generate(tier="fast", messages=messages)
            response_chunks = []
            async for chunk in generator:
                response_chunks.append(chunk)
            return "".join(response_chunks).strip()
        except Exception as e:
            logger.error(f"LLM call failed in SocraticAgent: {e}")
            raise e

    async def generate_socratic_hint(
        self,
        question_text: str,
        expected_answer_latex: str,
        student_answer_latex: str,
        error_type: Optional[str],
        level: int
    ) -> str:
        # Step 1: Error Analyzer
        error_analyzer_system = (
            "You are an Error Analyzer AI. Classify any errors in the student's mathematical work compared to the expected answer.\n"
            "Identify what went wrong (e.g., sign error, forgot constant of integration, arithmetic mistake, incomplete simplification).\n"
            "Provide a short, precise description of the error."
        )
        error_analyzer_user = (
            f"Question: {question_text}\n"
            f"Expected Solution: {expected_answer_latex}\n"
            f"Student Answer: {student_answer_latex}\n"
            f"Detected error code: {error_type or 'UNKNOWN'}"
        )
        
        try:
            error_analysis = await self._call_llm(error_analyzer_system, error_analyzer_user)
        except Exception:
            error_analysis = f"Student got an incorrect answer. Sympy error code: {error_type or 'OTHER_ERROR'}."

        logger.info(f"SocraticAgent - Step 1 (Error Analysis): {error_analysis}")

        # Step 2: Hint Generator
        hint_gen_system = (
            f"You are a Socratic Hint Generator. Generate a math hint of level {level} (1 to 3) to guide the student.\n"
            "Guidelines:\n"
            "- Level 1 (Mild): Generic guidance. Ask a high-level question about the method or order of operations. Do NOT mention specific numbers/variables from the error.\n"
            "- Level 2 (Moderate): Focus on the error type. Point out that they made a sign error, or forgot a constant, and ask them how to fix it.\n"
            "- Level 3 (Strong): Specific step help. Lead them right to the next action (e.g. 'What happens when you subtract 5 from both sides?') but do NOT compute it for them.\n"
            "CRITICAL: Do NOT give away the expected final answer under any circumstances. Phrase your hint as a Socratic question."
        )
        hint_gen_user = (
            f"Question: {question_text}\n"
            f"Expected Solution: {expected_answer_latex}\n"
            f"Student Answer: {student_answer_latex}\n"
            f"Error Analysis: {error_analysis}\n"
            f"Requested Hint Level: {level}"
        )

        try:
            draft_hint = await self._call_llm(hint_gen_system, hint_gen_user)
        except Exception:
            draft_hint = "Take a close look at your steps. Can you verify your last calculation?"

        logger.info(f"SocraticAgent - Step 2 (Draft Hint): {draft_hint}")

        # Step 3: Validator
        validator_system = (
            "You are a Socratic Validator. Verify if the drafted hint spoils or explicitly reveals the expected correct solution.\n"
            "Respond ONLY with 'SAFE' if the solution is hidden, or 'SPOILED' if it reveals the solution."
        )
        validator_user = (
            f"Expected Solution: {expected_answer_latex}\n"
            f"Drafted Hint: {draft_hint}"
        )

        try:
            validation = await self._call_llm(validator_system, validator_user)
            is_spoiled = "SPOILED" in validation.upper()
        except Exception:
            is_spoiled = False

        logger.info(f"SocraticAgent - Step 3 (Validation Result): {validation} (IsSpoiled={is_spoiled})")

        # If spoiled, regenerate with a strict spoiler ban
        if is_spoiled:
            logger.info("Draft hint was flagged as a spoiler. Regenerating safe hint...")
            strict_system = (
                "You are a strict Socratic Tutor. Create a safe mathematical hint that contains absolutely NO spoilers.\n"
                f"It must not mention the expected correct answer '{expected_answer_latex}'."
            )
            try:
                draft_hint = await self._call_llm(strict_system, hint_gen_user)
            except Exception:
                pass

        # Step 4: Tutor (encouraging phrasing)
        tutor_system = (
            "You are a Socratic Math Tutor. Rephrase the hint into a warm, encouraging, and clear 1-2 sentence response.\n"
            "Keep the Socratic question format intact. Do not add any conversational filler like 'Sure!' or 'Here is your hint'."
        )
        tutor_user = f"Hint: {draft_hint}"

        try:
            final_hint = await self._call_llm(tutor_system, tutor_user)
        except Exception:
            final_hint = draft_hint

        logger.info(f"SocraticAgent - Step 4 (Final Hint): {final_hint}")
        return final_hint
