import os
import logging
from typing import Dict, Any, List
from myscript_client import MyScriptClient, RateLimitException
from tesseract_client import TesseractClient, deserialize_strokes

logger = logging.getLogger(__name__)

class OcrFallbackManager:
    def __init__(self):
        self.myscript = MyScriptClient()
        self.tesseract = TesseractClient()

    def recognize(self, binary_data: bytes, mode: str = "text") -> Dict[str, Any]:
        has_credentials = bool(self.myscript.app_id and self.myscript.hmac_key)
        
        # If no credentials or daily quota exhausted indicator, fallback to Tesseract
        if not has_credentials:
            logger.info("MyScript API credentials missing, executing Tesseract OCR fallback.")
            return self._run_tesseract_fallback(binary_data)
            
        try:
            # 1. Parse strokes to python dictionary format
            strokes = deserialize_strokes(binary_data)
            if not strokes:
                return {
                    "text": "",
                    "latex": "",
                    "confidence": 1.0,
                    "tokens": [],
                    "provider": "empty"
                }

            # 2. Convert to coordinate lists for MyScript
            formatted_strokes = []
            for stroke in strokes:
                x_list = [p["x"] for p in stroke["points"]]
                y_list = [p["y"] for p in stroke["points"]]
                t_list = [p["time"] for p in stroke["points"]]
                p_list = [p["pressure"] for p in stroke["points"]]
                
                formatted_strokes.append({
                    "x": x_list,
                    "y": y_list,
                    "t": t_list,
                    "p": p_list
                })

            # 3. Call MyScript
            logger.info(f"Calling MyScript API for OCR (mode={mode})...")
            res = self.myscript.recognize_strokes(formatted_strokes, mode=mode)
            res["provider"] = "myscript"
            return res
            
        except (RateLimitException, Exception) as e:
            logger.warning(f"MyScript API failed ({e}), falling back to local Tesseract CPU OCR.")
            return self._run_tesseract_fallback(binary_data)

    def _run_tesseract_fallback(self, binary_data: bytes) -> Dict[str, Any]:
        text = self.tesseract.recognize_strokes(binary_data)
        # Tesseract doesn't return confidence per token or LaTeX math structure by default, 
        # so we map to structure with default values
        return {
            "text": text,
            "latex": "",
            "confidence": 0.75, # default estimated fallback confidence
            "tokens": [],
            "provider": "tesseract"
        }
