# citation_verifier.py
import logging
from typing import List, Dict, Any, Optional, Callable, Coroutine
from model_router import ModelRouter

logger = logging.getLogger(__name__)

class CitationVerifier:
    def __init__(self, model_router: ModelRouter):
        self.router = model_router

    def _format_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        parts = []
        for idx, chunk in enumerate(chunks, 1):
            source = chunk.get("source_id", "Unknown Source")
            location = chunk.get("location", {})
            loc_str = ""
            if isinstance(location, dict):
                if "page_number" in location:
                    loc_str = f", Page {location['page_number']}"
                elif "file_path" in location:
                    loc_str = f", File {location['file_path']}"
                elif "start_time" in location:
                    loc_str = f", Time {location['start_time']}-{location.get('end_time', '')}"
            
            parts.append(
                f"Source Chunk [{idx}]:\n"
                f"Source Name: {source}\n"
                f"Location: {loc_str or 'N/A'}\n"
                f"Content: {chunk.get('text', '')}"
            )
        return "\n\n---\n\n".join(parts)

    async def verify(
        self,
        answer: str,
        chunks: List[Dict[str, Any]],
        send_token_callback: Optional[Callable[[str, Any], Coroutine[Any, Any, None]]] = None,
        specific_model: Optional[str] = None
    ) -> str:
        if not chunks:
            # If no chunks, return original answer with a warning
            warning = "\n\n[Warning: No source context chunks were available to verify this response.]"
            if send_token_callback:
                # Stream the original response to the user
                for token in answer:
                    await send_token_callback("token", {"text": token})
                for token in warning:
                    await send_token_callback("token", {"text": token})
            return answer + warning

        formatted_chunks = self._format_chunks(chunks)

        system_prompt = (
            "You are a Citation Verifier assistant. Your task is to perform a second-pass grounding check "
            "on a generated answer against a set of retrieved source chunks, and insert citations in the text.\n\n"
            "Here is how you MUST process the text:\n"
            "1. Read the retrieved chunks and the generated answer carefully.\n"
            "2. Identify every claim, fact, or statement in the answer and verify if it is grounded in "
            "one or more of the retrieved chunks.\n"
            "3. For every grounded claim, insert a bracketed citation pointing to the chunk number(s) (e.g., [1] or [1, 3]) "
            "exactly at the end of the sentence or clause containing the claim. Do not insert citations for common knowledge.\n"
            "4. If a claim is NOT grounded in the retrieved chunks, you must do one of the following:\n"
            "   - Rewrite the claim to make it strictly grounded in the chunks.\n"
            "   - Omit the claim entirely if it cannot be grounded.\n"
            "   - If it is critical but ungrounded, append a warning immediately following the claim (e.g., '[Warning: Claim ungrounded]').\n"
            "5. Do NOT change the style, tone, or formatting (like LaTeX delimiters) of the answer unless required "
            "to enforce grounding.\n"
            "6. Output ONLY the verified answer with citations inserted. Do not include any meta-commentary, introduction, "
            "or explanations."
        )

        user_content = (
            f"Retrieved Chunks:\n{formatted_chunks}\n\n"
            f"Original Generated Answer:\n{answer}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        verified_answer = ""
        try:
            # We call the router to generate the verified answer.
            # If a send_token_callback is provided, we stream the output directly to the client.
            async for token in self.router.generate(
                tier="fast",
                messages=messages,
                specific_model=specific_model,
                temperature=0.3  # lower temperature for verification accuracy
            ):
                verified_answer += token
                if send_token_callback:
                    await send_token_callback("token", {"text": token})
            
            # Optionally, append a reference list at the end if it's not already in the output
            if "[1]" in verified_answer or "[2]" in verified_answer or "[3]" in verified_answer:
                ref_list = "\n\n**References:**\n"
                for idx, chunk in enumerate(chunks, 1):
                    source = chunk.get("source_id", "Unknown Source")
                    location = chunk.get("location", {})
                    loc_str = ""
                    if isinstance(location, dict):
                        if "page_number" in location:
                            loc_str = f" (Page {location['page_number']})"
                        elif "file_path" in location:
                            loc_str = f" (File {location['file_path']})"
                        elif "start_time" in location:
                            loc_str = f" (Time {location['start_time']}-{location.get('end_time', '')})"
                    ref_list += f"[{idx}] {source}{loc_str}\n"
                
                verified_answer += ref_list
                if send_token_callback:
                    # Stream the reference list too
                    await send_token_callback("token", {"text": ref_list})

            return verified_answer
        except Exception as e:
            logger.error(f"Error during citation verification: {e}")
            # Fallback: if verification fails, stream the original answer and append a warning
            warning = "\n\n[Warning: Citation verification failed. Returning unverified response.]"
            if send_token_callback:
                for token in answer:
                    await send_token_callback("token", {"text": token})
                for token in warning:
                    await send_token_callback("token", {"text": token})
            return answer + warning
