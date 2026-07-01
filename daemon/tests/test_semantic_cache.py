import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import os
import shutil
import unittest
from semantic_cache import SemanticCache

class TestSemanticCache(unittest.TestCase):
    def setUp(self):
        self.db_dir = os.path.join(os.path.dirname(__file__), "test_db_cache")
        # Ensure clean directory
        if os.path.exists(self.db_dir):
            shutil.rmtree(self.db_dir)
        self.cache = SemanticCache(self.db_dir)

    def tearDown(self):
        if os.path.exists(self.db_dir):
            shutil.rmtree(self.db_dir)

    def test_cache_hit_and_miss(self):
        # 1. Initially query is a cache miss
        query = "How do I implement a binary search tree in python?"
        response = "To implement a BST in Python, define a Node class with left/right children..."
        
        cached = self.cache.get(query)
        self.assertIsNone(cached)

        # 2. Set response in cache
        self.cache.set(query, response)

        # 3. Exact query matches (Cosine similarity = 1.0)
        cached = self.cache.get(query)
        self.assertEqual(cached, response)

        # 4. Near-identical query matches (Cosine similarity should be > 0.92)
        near_query = "How do you implement a binary search tree in Python?"
        cached_near = self.cache.get(near_query)
        self.assertEqual(cached_near, response)

        # 5. Unrelated query misses (Cosine similarity should be low)
        different_query = "What is the capital of France?"
        cached_diff = self.cache.get(different_query)
        self.assertIsNone(cached_diff)
