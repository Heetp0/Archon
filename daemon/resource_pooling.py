import lancedb
import httpx
import logging
from typing import Optional

logger = logging.getLogger("resource_pooling")

class ResourcePool:
    def __init__(self):
        self._db_conn: Optional[lancedb.db.LanceDBConnection] = None
        self._http_client: Optional[httpx.AsyncClient] = None

    def get_db(self, db_path: str) -> lancedb.db.LanceDBConnection:
        """
        Returns a shared LanceDB connection to minimize file open/lock overhead.
        """
        if self._db_conn is None:
            logger.info(f"Opening shared LanceDB connection at {db_path}...")
            self._db_conn = lancedb.connect(db_path)
        return self._db_conn

    def get_http_client(self) -> httpx.AsyncClient:
        """
        Returns a shared httpx.AsyncClient instance to enable HTTP connection pooling
        and keep-alive reuse for external APIs (e.g. MyScript, LiteLLM).
        """
        if self._http_client is None:
            logger.info("Initializing shared httpx.AsyncClient...")
            self._http_client = httpx.AsyncClient(
                timeout=30.0,
                limits=httpx.Limits(max_connections=50, max_keepalive_connections=20)
            )
        return self._http_client

    async def close(self) -> None:
        """
        Closes resources cleanly during application shutdown.
        """
        if self._http_client:
            logger.info("Closing shared httpx.AsyncClient...")
            await self._http_client.aclose()
            self._http_client = None
        self._db_conn = None
        logger.info("Shared Resource Pool closed.")

# Global shared pool instance
resource_pool = ResourcePool()
