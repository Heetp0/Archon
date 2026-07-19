import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import shutil
import unittest
from semantic_cache import SemanticCache

class TestSemanticCache(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db_dir = os.path.join(os.path.dirname(__file__), "test_db_cache")
        if os.path.exists(self.db_dir):
            shutil.rmtree(self.db_dir)
        self.cache = SemanticCache(self.db_dir)

    def tearDown(self):
        if os.path.exists(self.db_dir):
            shutil.rmtree(self.db_dir)

    async def test_cache_hit_and_miss(self):
        query = "How do I implement a binary search tree in python?"
        response = "To implement a BST in Python, define a Node class with left/right children..."
        
        cached = await self.cache.get(query)
        self.assertIsNone(cached)

        await self.cache.set(query, response)

        cached = await self.cache.get(query)
        self.assertEqual(cached, response)

        near_query = "How do you implement a binary search tree in Python?"
        cached_near = await self.cache.get(near_query)
        self.assertEqual(cached_near, response)

        different_query = "What is the capital of France?"
        cached_diff = await self.cache.get(different_query)
        self.assertIsNone(cached_diff)
