import time
from collections import OrderedDict
from typing import Any, Optional

class LRUCacheWithTTL:
    def __init__(self, max_size: int = 1000, default_ttl_sec: int = 600):
        self.max_size = max_size
        self.default_ttl_sec = default_ttl_sec
        self.cache = OrderedDict()

    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        val, expiry = self.cache[key]
        if time.time() > expiry:
            del self.cache[key]
            return None
        # Move to end to represent recently used
        self.cache.move_to_end(key)
        return val

    def set(self, key: str, value: Any, ttl_sec: Optional[int] = None) -> None:
        ttl = ttl_sec if ttl_sec is not None else self.default_ttl_sec
        expiry = time.time() + ttl
        if key in self.cache:
            del self.cache[key]
        elif len(self.cache) >= self.max_size:
            # Evict oldest entry (first item)
            self.cache.popitem(last=False)
        self.cache[key] = (value, expiry)

    def clear(self) -> None:
        self.cache.clear()


class SemanticCache(LRUCacheWithTTL):
    """
    SemanticCache interface matching performance benchmark and test specifications.
    """
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 600):
        super().__init__(max_size=max_size, default_ttl_sec=ttl_seconds)

    def put(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        self.set(key, value, ttl_sec=ttl_seconds)


# Global cache instances
embedding_cache = LRUCacheWithTTL(max_size=2000, default_ttl_sec=3600)  # Embeddings cached for 1 hour
llm_cache = LRUCacheWithTTL(max_size=500, default_ttl_sec=300)          # LLM completions cached for 5 mins
semantic_cache = SemanticCache(max_size=1000, ttl_seconds=600)

