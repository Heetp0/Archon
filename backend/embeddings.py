import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class RecursiveTextSplitter:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> List[str]:
        separators = ["\n\n", "\n", ". ", " ", ""]
        return self._split_text(text, separators)

    def _split_text(self, text: str, separators: List[str]) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text]
        
        if not separators:
            return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        separator = separators[0]
        if separator == "":
            splits = list(text)
        else:
            splits = text.split(separator)
        
        final_splits = []
        for s in splits:
            if len(s) > self.chunk_size:
                final_splits.extend(self._split_text(s, separators[1:]))
            else:
                final_splits.append(s)
                
        chunks = []
        current_splits = []
        current_len = 0
        
        for s in final_splits:
            sep_len = len(separator) if separator != "" else 0
            additional_len = len(s)
            if current_splits:
                additional_len += sep_len
            
            if current_len + additional_len > self.chunk_size:
                if current_splits:
                    chunks.append(separator.join(current_splits))
                
                # Keep splits for overlap
                while current_splits:
                    joined_len = sum(len(x) for x in current_splits) + (len(current_splits) - 1) * sep_len
                    if joined_len <= self.chunk_overlap:
                        break
                    current_splits.pop(0)
                
                if current_splits:
                    current_len = sum(len(x) for x in current_splits) + (len(current_splits) - 1) * sep_len
                    while current_splits and (current_len + sep_len + len(s) > self.chunk_size):
                        current_splits.pop(0)
                        if current_splits:
                            current_len = sum(len(x) for x in current_splits) + (len(current_splits) - 1) * sep_len
                        else:
                            current_len = 0
                else:
                    current_len = 0
                
                if current_splits:
                    current_splits.append(s)
                    current_len += sep_len + len(s)
                else:
                    current_splits = [s]
                    current_len = len(s)
            else:
                current_splits.append(s)
                current_len += additional_len
                
        if current_splits:
            chunks.append(separator.join(current_splits))
            
        return chunks

class OllamaEmbeddingClient:
    def __init__(self, base_url: str = "http://localhost:11434", model_name: str = "nomic-embed-text"):
        self.base_url = base_url
        self.model_name = model_name

    async def get_embedding(self, text: str) -> List[float]:
        res = await self.get_embeddings_batch([text])
        return res[0]

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        
        url = f"{self.base_url}/api/embed"
        payload = {"model": self.model_name, "input": texts}
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    return response.json()["embeddings"]
        except Exception as e:
            logger.warning(f"Ollama /api/embed failed: {e}. Trying fallback /api/embeddings...")
            
        fallback_url = f"{self.base_url}/api/embeddings"
        embeddings = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for text in texts:
                    fb_payload = {"model": self.model_name, "prompt": text}
                    response = await client.post(fallback_url, json=fb_payload)
                    if response.status_code == 200:
                        embeddings.append(response.json()["embedding"])
                    else:
                        response.raise_for_status()
            return embeddings
        except Exception as e:
            logger.error(f"Ollama embedding failure: {e}")
            raise RuntimeError(f"Could not fetch embeddings from local Ollama: {e}")

def chunk_pdf(parsed_content: Dict[str, Any]) -> List[Dict[str, Any]]:
    splitter = RecursiveTextSplitter()
    chunks = []
    for page in parsed_content.get("pages", []):
        page_num = page.get("page_number")
        text = page.get("text", "")
        split_texts = splitter.split_text(text)
        for t in split_texts:
            if t.strip():
                chunks.append({
                    "text": t,
                    "location": {"page_number": page_num}
                })
    return chunks

def chunk_codebase(parsed_content: Dict[str, Any]) -> List[Dict[str, Any]]:
    splitter = RecursiveTextSplitter()
    chunks = []
    for f in parsed_content.get("chunks", []):
        file_path = f.get("file_path", "")
        text = f.get("text", "")
        split_texts = splitter.split_text(text)
        for t in split_texts:
            if t.strip():
                chunks.append({
                    "text": t,
                    "location": {"file_path": file_path}
                })
    return chunks

def chunk_audio(parsed_content: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Group segments into ~1000 character chunks to keep context
    segments = parsed_content.get("segments", [])
    chunks = []
    current_text = []
    current_len = 0
    start_time = None
    speakers = set()
    
    for seg in segments:
        if start_time is None:
            start_time = seg.get("start_time", 0.0)
        speakers.add(seg.get("speaker", "Unknown"))
        current_text.append(seg.get("text", ""))
        current_len += len(seg.get("text", "")) + 1
        
        if current_len >= 1000:
            chunks.append({
                "text": " ".join(current_text),
                "location": {
                    "start_time": start_time,
                    "end_time": seg.get("end_time", 0.0),
                    "speaker": ", ".join(sorted(speakers))
                }
            })
            current_text = []
            current_len = 0
            start_time = None
            speakers = set()
            
    if current_text:
        chunks.append({
            "text": " ".join(current_text),
            "location": {
                "start_time": start_time if start_time is not None else 0.0,
                "end_time": segments[-1].get("end_time", 0.0) if segments else 0.0,
                "speaker": ", ".join(sorted(speakers))
            }
        })
    return chunks
