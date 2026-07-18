import logging
import asyncio
from typing import List, Dict, Any, Callable, Awaitable, Optional

logger = logging.getLogger("error_handlers")

# Fallback 1: MyScript API quota exceeded/throttled -> local Tesseract OCR
async def call_ocr_with_fallback(myscript_func: Callable[[], Awaitable[Dict[str, Any]]], tesseract_func: Callable[[], Awaitable[Dict[str, Any]]]) -> Dict[str, Any]:
    try:
        # Try primary OCR (MyScript)
        result = await myscript_func()
        if result.get("status") == "error" and result.get("error_code") == 429:
            logger.warning("MyScript quota limit exceeded (429). Falling back to Tesseract OCR...")
            fallback_res = await tesseract_func()
            fallback_res["ocr_fallback_used"] = True
            fallback_res["ocr_fallback_message"] = "Using local Tesseract OCR (less accurate)"
            return fallback_res
        return result
    except Exception as e:
        logger.error(f"MyScript invocation failed: {e}. Falling back to Tesseract OCR...")
        try:
            fallback_res = await tesseract_func()
            fallback_res["ocr_fallback_used"] = True
            fallback_res["ocr_fallback_message"] = f"Using local Tesseract OCR due to error: {e}"
            return fallback_res
        except Exception as e_inner:
            logger.critical(f"Both OCR methods failed: {e_inner}")
            return {"status": "error", "error": "Both OCR engines failed", "text": ""}

# Fallback 2: LLM provider down -> cycle alternative endpoints
async def call_llm_with_provider_chain(
    llm_func: Callable[[str], Awaitable[Dict[str, Any]]], 
    providers: List[str], 
    query: str
) -> Dict[str, Any]:
    last_error = None
    for provider in providers:
        try:
            logger.debug(f"Attempting query with LLM provider '{provider}'...")
            res = await llm_func(provider)
            # Add provider source metadata
            res["provider"] = provider
            return res
        except Exception as e:
            logger.warning(f"LLM provider '{provider}' failed: {e}. Trying next...")
            last_error = e
            # Small cooldown before trying next provider
            await asyncio.sleep(0.1)
    
    logger.error("All LLM providers in chain exhausted.")
    raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

# Fallback 3: Vector search timeout/error -> keyword BM25 search
async def call_search_with_fallback(
    vector_search_func: Callable[[], List[Dict[str, Any]]],
    keyword_search_func: Callable[[], List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    try:
        # Perform vector search
        return vector_search_func()
    except Exception as e:
        logger.warning(f"Vector search failed: {e}. Falling back to keyword BM25 search...")
        try:
            results = keyword_search_func()
            for r in results:
                r["search_fallback_used"] = True
            return results
        except Exception as e_inner:
            logger.error(f"Keyword search fallback failed: {e_inner}")
            return []
