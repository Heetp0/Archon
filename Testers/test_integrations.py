import sys
import os
import unittest
import tempfile
import shutil

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'daemon')))

class TestExternalIntegrations(unittest.TestCase):
    def test_ecc_bridge(self):
        from ecc_bridge import ECCBridge
        # Point to the cloned ecc directory
        ecc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ecc'))
        bridge = ECCBridge(ecc_path)
        skills = bridge.list_skills()
        self.assertIsNotNone(skills)
        # Verify that we can query python rules
        rules = bridge.get_rules('python')
        self.assertIsNotNone(rules)

    def test_vault_graph_service(self):
        from vault_graph_service import VaultGraphService
        temp_dir = tempfile.mkdtemp()
        try:
            vault_path = r'D:\The core'
            service = VaultGraphService(vault_path, temp_dir)
            self.assertEqual(service.vault_path, vault_path)
            self.assertEqual(service.output_dir, temp_dir)
            # Check loaders return default empty structs headlessly before running graphifyy CLI
            self.assertEqual(service.get_graph_json(), {})
            self.assertIn('No report generated yet', service.get_insights())
        finally:
            shutil.rmtree(temp_dir)

if __name__ == '__main__':
    unittest.main()
