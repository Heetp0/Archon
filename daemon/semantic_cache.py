import os
import lancedb
import time
import asyncio
from fastembed import TextEmbedding
from typing import Optional
import threading

class SemanticCache:
    def __init__(self, db_path: str, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2', max_size: int = 100, ttl: float = 3600.0):
        self.db_path = db_path
        self.max_size = max_size
        self.ttl = ttl
        os.makedirs(db_path, exist_ok=True)
        self.db = lancedb.connect(db_path)
        self.model = TextEmbedding(model_name)
        self.table_name = 'semantic_cache'
        self.lock = threading.Lock()
        self._init_table()

    def _init_table(self):
        try:
            self.table = self.db.open_table(self.table_name)
        except Exception:
            # Create table with dummy record to define schema
            dummy_data = [{
                'vector': list(self.model.embed(['dummy query']))[0].tolist(),
                'query': 'dummy query',
                'response': 'dummy response',
                'timestamp': float(time.time())
            }]
            self.table = self.db.create_table(self.table_name, dummy_data, exist_ok=True)

    def _embed_sync(self, query: str):
        return list(self.model.embed([query]))[0].tolist()

    async def _embed_query(self, query: str):
        return await asyncio.to_thread(self._embed_sync, query)

    async def get(self, query: str, threshold: float = 0.92) -> Optional[str]:
        if not query.strip():
            return None
            
        try:
            query_vec = await self._embed_query(query)
            # Exclude dummy record
            with self.lock:
                results = self.table.search(query_vec).where('query != "dummy query"').limit(1).to_list()
            
            if results:
                match = results[0]
                d_sq = match.get('_distance', 999.0)
                sim = 1.0 - (d_sq / 2.0)
                if sim >= threshold:
                    # Enforce TTL during lookup checks
                    timestamp = match.get('timestamp', 0.0)
                    if time.time() - timestamp > self.ttl:
                        # Expired, evict and return None
                        with self.lock:
                            escaped_q = match['query'].replace('"', '\\"')
                            self.table.delete(f'query = "{escaped_q}"')
                        return None
                    
                    # LRU: Update timestamp on cache hit
                    with self.lock:
                        escaped_q = match['query'].replace('"', '\\"')
                        self.table.delete(f'query = "{escaped_q}"')
                        new_record = {
                            'vector': match['vector'],
                            'query': match['query'],
                            'response': match['response'],
                            'timestamp': float(time.time())
                        }
                        self.table.add([new_record])
                    
                    return match.get('response')
        except Exception as e:
            print(f"Error querying semantic cache: {str(e)}")
        return None

    async def set(self, query: str, response: str):
        if not query.strip() or not response.strip():
            return
            
        try:
            query_vec = await self._embed_query(query)
            new_record = {
                'vector': query_vec,
                'query': query,
                'response': response,
                'timestamp': float(time.time())
            }
            with self.lock:
                # LRU Eviction: if size >= max_size, evict oldest
                all_records = self.table.search().where('query != "dummy query"').to_list()
                if len(all_records) >= self.max_size:
                    all_records.sort(key=lambda x: x.get('timestamp', 0.0))
                    to_evict_count = len(all_records) - self.max_size + 1
                    for i in range(to_evict_count):
                        escaped_q = all_records[i]['query'].replace('"', '\\"')
                        self.table.delete(f'query = "{escaped_q}"')
                
                self.table.add([new_record])
        except Exception as e:
            print(f"Error writing to semantic cache: {str(e)}")

    async def cleanup(self):
        """Remove all expired cache entries."""
        limit_time = float(time.time()) - self.ttl
        def _delete_expired():
            with self.lock:
                self.table.delete(f'timestamp < {limit_time}')
        await asyncio.to_thread(_delete_expired)
