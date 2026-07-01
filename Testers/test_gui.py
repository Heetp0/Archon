import sys
import os
import unittest
import customtkinter as ctk

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Codes', 'gui')))

try:
    from main_window import MainWindow
    from components.nav_rail import NavRail
    from components.context_sidebar import ContextSidebar
    from components.normal_chat import NormalChat
    from components.council_debate import CouncilDebate
    from components.system_agents import SystemAgents
    from components.deep_research import DeepResearch
    from components.settings_modal import SettingsModal
    CTK_AVAILABLE = True
except ImportError:
    CTK_AVAILABLE = False

class MockWsWorker:
    def __init__(self):
        pass
    def stop(self):
        pass

class TestGUIComponents(unittest.TestCase):
    root = None

    @classmethod
    def setUpClass(cls):
        if not CTK_AVAILABLE:
            raise unittest.SkipTest('CustomTkinter is not installed or available.')
        # Initialize a single persistent root window for widgets to avoid Tcl resource leaks
        ctk.set_appearance_mode("dark")
        cls.root = ctk.CTk()
        
    @classmethod
    def tearDownClass(cls):
        if cls.root:
            cls.root.destroy()
            cls.root = None

    def test_nav_rail_initialization(self):
        nav_rail = NavRail(self.root)
        self.assertIsNotNone(nav_rail.btn_chat)
        nav_rail.destroy()

    def test_context_sidebar_initialization(self):
        sidebar = ContextSidebar(self.root)
        self.assertIsNotNone(sidebar.tree)
        sidebar.destroy()

    def test_normal_chat_initialization(self):
        worker = MockWsWorker()
        chat = NormalChat(self.root, worker, None)
        self.assertIsNotNone(chat.chat_input)
        self.assertIsNotNone(chat.send_btn)
        chat.destroy()

    def test_council_debate_initialization(self):
        worker = MockWsWorker()
        debate = CouncilDebate(self.root, worker, None)
        self.assertIsNotNone(debate.agent1_panel)
        self.assertIsNotNone(debate.agent2_panel)
        self.assertIsNotNone(debate.agent3_panel)
        debate.destroy()

    def test_system_agents_initialization(self):
        worker = MockWsWorker()
        agents = SystemAgents(self.root, worker, None)
        self.assertIsNotNone(agents.term_output)
        agents.destroy()

    def test_deep_research_initialization(self):
        worker = MockWsWorker()
        research = DeepResearch(self.root, worker, None)
        self.assertIsNotNone(research.report_text)
        research.destroy()

    def test_settings_modal_initialization(self):
        settings = SettingsModal(self.root)
        self.assertIsNotNone(settings.theme_switch)
        settings.destroy()

    def test_main_window_initialization(self):
        worker = MockWsWorker()
        import _tkinter
        try:
            # MainWindow inherits from ctk.CTk, so it creates its own top level window
            window = MainWindow(worker)
            self.assertIsNotNone(window.nav_rail)
            self.assertIsNotNone(window.context_sidebar)
            self.assertEqual(len(window.mode_panels), 4)
            window.destroy()
        except _tkinter.TclError:
            self.skipTest("TclError during MainWindow initialization in PyTest loop")

if __name__ == '__main__':
    unittest.main()
