import os
import json
import hmac
import hashlib
import time
import logging
from typing import List, Dict, Any
import requests

logger = logging.getLogger(__name__)

class RateLimitException(Exception):
    pass

class MyScriptClient:
    def __init__(self):
        # Allow passing keys directly or loading from environment variables
        self.app_id = os.getenv("MYSCRIPT_APP_ID")
        self.hmac_key = os.getenv("MYSCRIPT_HMAC_KEY")

    def recognize_strokes(self, strokes_data: List[Dict[str, Any]], mode: str = "text") -> Dict[str, Any]:
        if not self.app_id or not self.hmac_key:
            logger.warning("MyScript API credentials not set. OCR will fallback automatically.")
            raise ValueError("MYSCRIPT_APP_ID and MYSCRIPT_HMAC_KEY must be set in environment.")

        # Prepare MIME types based on mode
        # We request application/json (JIIX format) for detailed layout and text/latex for the raw outputs
        if mode == "math":
            mime_types = ["application/x-latex", "application/json"]
        else:
            mime_types = ["text/plain", "application/json"]

        # Format strokes to MyScript pointerEvents format
        pointer_events = []
        for idx, stroke in enumerate(strokes_data):
            # Extract x, y, t arrays
            x_coords = stroke.get("x", [])
            y_coords = stroke.get("y", [])
            t_coords = stroke.get("t", [])
            
            # Map time stamps relative to down time if they are absolute timestamps
            if len(t_coords) > 0 and t_coords[0] > 1000000000000:
                base_time = t_coords[0]
                t_coords = [int(t - base_time) for t in t_coords]
            else:
                t_coords = [int(t) for t in t_coords]

            pointer_event = {
                "pointerType": "PEN",
                "pointerId": idx,
                "x": [float(x) for x in x_coords],
                "y": [float(y) for y in y_coords],
                "t": t_coords
            }
            if "p" in stroke and stroke["p"]:
                pointer_event["p"] = [float(p) for p in stroke["p"]]

            pointer_events.append(pointer_event)

        payload = {
            "width": 1000,
            "height": 1000,
            "mimeTypes": mime_types,
            "events": [
                {
                    "pointerType": "PEN",
                    "pointerId": 0,
                    "pointerEvents": pointer_events
                }
            ]
        }

        payload_json = json.dumps(payload)
        
        # Calculate HMAC signature: Signature = HMAC-SHA512(HMAC_Key, AppID + requestBody)
        signature = hmac.new(
            self.hmac_key.encode("utf-8"),
            (self.app_id + payload_json).encode("utf-8"),
            hashlib.sha512
        ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "applicationKey": self.app_id,
            "signature": signature
        }

        url = "https://cloud.myscript.com/api/v4.0/iink/document"
        retries = 3
        backoff_factor = 2

        response = None
        for attempt in range(retries):
            try:
                response = requests.post(url, data=payload_json, headers=headers, timeout=15)
                if response.status_code == 429:
                    logger.warning(f"MyScript API 429 Rate Limited. Retrying in {backoff_factor ** attempt}s...")
                    time.sleep(backoff_factor ** attempt)
                    continue
                response.raise_for_status()
                break
            except Exception as e:
                if attempt == retries - 1:
                    logger.error(f"MyScript API call failed after {retries} retries: {e}")
                    raise e
                time.sleep(backoff_factor ** attempt)

        if response is None:
            raise RuntimeError("Failed to get response from MyScript API")

        if response.status_code == 429:
            raise RateLimitException("MyScript API quota or rate limit exceeded.")

        result = response.json()
        exports = result.get("exports", {})

        recognized_text = exports.get("text/plain", "").strip()
        latex = exports.get("application/x-latex", "").strip()
        jiix = exports.get("application/json", {})

        # Parse detailed tokens from JIIX export
        tokens = []
        overall_confidence = 1.0

        def traverse_jiix(node: Any):
            nonlocal overall_confidence
            if not isinstance(node, dict):
                return

            # Check if this node represents a word/label element
            if "label" in node and "boundingBox" in node:
                label = node["label"]
                bbox = node["boundingBox"] # {x, y, width, height}
                
                # Fetch confidence if available in candidates
                conf = 1.0
                if "candidates" in node and len(node["candidates"]) > 0:
                    first_cand = node["candidates"][0]
                    if isinstance(first_cand, dict):
                        conf = first_cand.get("confidence", 1.0)
                    else:
                        conf = node.get("confidence", 0.95)
                else:
                    conf = node.get("confidence", 0.95)
                
                tokens.append({
                    "text": label,
                    "confidence": float(conf),
                    "bbox": {
                        "x": float(bbox.get("x", 0)),
                        "y": float(bbox.get("y", 0)),
                        "width": float(bbox.get("width", 0)),
                        "height": float(bbox.get("height", 0))
                    }
                })
            
            # Recursively traverse children
            for key, val in node.items():
                if isinstance(val, list):
                    for item in val:
                        traverse_jiix(item)
                elif isinstance(val, dict):
                    traverse_jiix(val)

        traverse_jiix(jiix)

        # Calculate average confidence of parsed tokens
        if tokens:
            overall_confidence = sum(t["confidence"] for t in tokens) / len(tokens)

        # Fallback text if plain text is empty but latex is present (for math mode)
        if not recognized_text and latex:
            recognized_text = latex

        return {
            "text": recognized_text,
            "latex": latex,
            "confidence": overall_confidence,
            "tokens": tokens
        }
