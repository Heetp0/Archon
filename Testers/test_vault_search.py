import sys
import os
import unittest
import tempfile
import shutil
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'daemon')))
from vault_search import VaultSearch

class TestVaultSearch(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.vault_path = os.path.join(self.test_dir, 'vault')
        self.db_path = os.path.join(self.test_dir, 'db')
        os.makedirs(self.vault_path, exist_ok=True)
        
        # Write dummy files to vault
        self.f1 = os.path.join(self.vault_path, 'architect.md')
        with open(self.f1, 'w', encoding='utf-8') as f:
            f.write('---\ntitle: Software Architecture\ntags: [design, python]\n---\n# System Design\nThis file discusses software design systems and patterns.')
        
        self.f2 = os.path.join(self.vault_path, 'database.md')
        with open(self.f2, 'w', encoding='utf-8') as f:
            f.write('---\ntitle: database\n---\n# LanceDB embedded database\nWe use LanceDB for local vector indexing in Python.')
            
        self.searcher = VaultSearch(self.db_path, self.vault_path)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_indexing_and_search(self):
        self.searcher.index_vault()
        results = self.searcher.search('pattern design', top_k=2)
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]['title'], 'Software Architecture')
        self.assertIn('design', results[0]['tags'])

    def test_incremental_indexing(self):
        self.searcher.index_vault()
        results1 = self.searcher.search('LanceDB', top_k=1)
        self.assertEqual(results1[0]['title'], 'database')
        
        # Update file
        with open(self.f2, 'w', encoding='utf-8') as f:
            f.write('---\ntitle: database\n---\n# SQLite database fallback\nWe fallback to SQLite when LanceDB is not loaded.')
        
        self.searcher.index_vault()
        results2 = self.searcher.search('SQLite', top_k=1)
        self.assertEqual(results2[0]['title'], 'database')
        self.assertIn('SQLite', results2[0]['text'])

    def test_graph_connections_fallback(self):
        # Mock/create graphify-out directory to test graph connectivity resolution
        parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        graphify_dir = os.path.join(parent_dir, 'graphify-out')
        os.makedirs(graphify_dir, exist_ok=True)
        
        graph_path = os.path.join(graphify_dir, 'graph.json')
        mock_graph = {
            'edges': [
                {'source': 'architect.md', 'target': 'database.md'}
            ]
        }
        
        with open(graph_path, 'w', encoding='utf-8') as f:
            json.dump(mock_graph, f)
            
        try:
            self.searcher.index_vault()
            res = self.searcher.search('software pattern', top_k=1)
            self.assertIn('database.md', res[0]['graph_related_nodes'])
        finally:
            # Cleanup mock graph file
            if os.path.exists(graph_path):
                os.remove(graph_path)

if __name__ == '__main__':
    unittest.main()