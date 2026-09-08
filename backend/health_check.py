import os
import time
import httpx
import logging
import lancedb
from datetime import datetime
import config

logger = logging.getLogger("health_check")

class HealthMonitor:
    def __init__(self, cache_ttl: float = 10.0):
        self.cache_ttl = cache_ttl
        self.last_update = 0.0
        self.cached_status = {}

    async def check_database_lancedb(self) -> bool:
        # Re-try up to 3 times
        db_path = getattr(config, "LANCEDB_PATH", None)
        if not db_path:
            db_path = os.path.join(getattr(config, "WORKSPACE_ROOT", "."), ".lancedb")
            
        for attempt in range(1, 4):
            try:
                db = lancedb.connect(db_path)
                # Try listing tables to verify connection is active
                db.list_tables()
                return True
            except Exception as e:
                logger.warning(f"LanceDB health check attempt {attempt} failed: {e}")
                if attempt < 3:
                    await asyncio.sleep(0.5) # simple async sleep
                else:
                    logger.error(f"LanceDB health check failed after 3 attempts.")
        return False

    async def check_embeddings_ollama(self) -> bool:
        ollama_url = getattr(config, "OLLAMA_BASE_URL", "http://localhost:11434")
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{ollama_url}/api/tags", timeout=3.0)
                if resp.status_code == 200:
                    data = resp.json()
                    # Check if nomic-embed-text is in tags
                    models = [m.get("name") for m in data.get("models", [])]
                    has_model = any("nomic-embed-text" in m for m in models)
                    if not has_model:
                        logger.warning(f"Ollama running but nomic-embed-text model not found in: {models}")
                    return True
        except Exception as e:
            logger.warning(f"Ollama embeddings service not reachable at {ollama_url}: {e}")
        return False

    async def get_health_status(self) -> dict:
        now = time.time()
        if now - self.last_update < self.cache_ttl and self.cached_status:
            return self.cached_status

        # Perform checks
        db_ok = await self.check_database_lancedb()
        ollama_ok = await self.check_embeddings_ollama()
        
        # Check LLM keys (check config first, then env)
        groq_key = getattr(config, "GROQ_API_KEY", "") or os.environ.get("GROQ_API_KEY", "")
        gemini_key = getattr(config, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
        
        groq_ok = len(groq_key.strip()) > 0
        gemini_ok = len(gemini_key.strip()) > 0
        
        # Determine overall status
        # If database is offline, or ALL LLM providers are down, it's down!
        if not db_ok or (not groq_ok and not gemini_ok):
            status = "down"
        # If some secondary service is down (e.g. Ollama or one of the LLMs), it's degraded
        elif not ollama_ok or not groq_ok or not gemini_ok:
            status = "degraded"
        else:
            status = "healthy"
            
        checks = {
            "api_server": True,
            "database": db_ok,
            "database_lancedb": db_ok,
            "embeddings": ollama_ok,
            "embeddings_ollama": ollama_ok,
            "llm": groq_ok or gemini_ok,
            "model_provider_groq": groq_ok,
            "model_provider_gemini": gemini_ok
        }

        self.cached_status = {
            "status": status,
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": checks,
            "database": db_ok,
            "embeddings": ollama_ok,
            "llm": groq_ok or gemini_ok
        }
        self.last_update = now
        return self.cached_status


import asyncio
health_monitor = HealthMonitor()
