import os
import lancedb
import time
from fastembed import TextEmbedding
from typing import Optional

import threading

class SemanticCache:
    def __init__(self, db_path: str, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        self.db_path = db_path
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

    def get(self, query: str, threshold: float = 0.92) -> Optional[str]:
        """
        Embeds the query, searches the LanceDB cache table,
        and returns the cached response if similarity >= threshold.
        
        Note: LanceDB search returns L2 squared distance (d^2).
        For normalized vectors, cosine distance is d^2 / 2.
        Cosine similarity is 1 - Cosine Distance = 1 - (d^2 / 2).
        Therefore: Cosine Similarity >= Threshold
                   1 - (d^2 / 2) >= Threshold
                   d^2 / 2 <= 1 - Threshold
                   d^2 <= 2 * (1 - Threshold)
        """
        if not query.strip():
            return None
            
        try:
            query_vec = list(self.model.embed([query]))[0].tolist()
            # Exclude dummy record
            with self.lock:
                results = self.table.search(query_vec).where('query != "dummy query"').limit(1).to_list()
            
            if results:
                match = results[0]
                d_sq = match.get('_distance', 999.0)
                sim = 1.0 - (d_sq / 2.0)
                if sim >= threshold:
                    return match.get('response')
        except Exception as e:
            print(f"Error querying semantic cache: {str(e)}")
        return None

    def set(self, query: str, response: str):
        if not query.strip() or not response.strip():
            return
            
        try:
            query_vec = list(self.model.embed([query]))[0].tolist()
            new_record = {
                'vector': query_vec,
                'query': query,
                'response': response,
                'timestamp': float(time.time())
            }
            with self.lock:
                self.table.add([new_record])
        except Exception as e:
            print(f"Error writing to semantic cache: {str(e)}")
