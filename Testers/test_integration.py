import sys
import os
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Codes', 'gui')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'daemon')))

class TestIntegration(unittest.TestCase):
    def test_import_all_modules(self):
        from main_window import MainWindow
        from components.nav_rail import NavRail
        from components.normal_chat import NormalChat
        import model_router
        import vault_parser
        import opencode_client
        import config
        self.assertTrue(True)

    def test_model_router_with_gui_settings(self):
        import model_router
        from components.settings_modal import SettingsModal
        import customtkinter as ctk
        ctk.set_appearance_mode("dark")
        root = ctk.CTk()
        modal = SettingsModal(root)
        models = model_router.MODEL_TIERS
        self.assertIsNotNone(models)
        self.assertTrue(len(models) > 0)
        modal.destroy()
        root.destroy()

if __name__ == '__main__':
    unittest.main()