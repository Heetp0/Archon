import sys
import os
import unittest
import asyncio
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'daemon')))
from shell_runner import SecureShellRunner
from autopilot_supervisor import AutopilotSupervisor

class TestSupervisorAndSandbox(unittest.TestCase):
    def setUp(self):
        self.workspace_root = r'D:\The core'
        self.runner = SecureShellRunner(self.workspace_root)
        self.supervisor = AutopilotSupervisor(file_budget_mb=1.0, token_budget=1000)

    def test_sandbox_path_verification(self):
        # Safe paths inside workspace
        self.assertTrue(self.runner.is_path_safe('Workspace/test.txt', self.workspace_root))
        self.assertTrue(self.runner.is_path_safe('Codes/gui/app.py', self.workspace_root))
        
        # Unsafe paths outside workspace
        self.assertFalse(self.runner.is_path_safe('../escaped.txt', self.workspace_root))
        self.assertFalse(self.runner.is_path_safe('C:/Windows/System32', self.workspace_root))
        self.assertFalse(self.runner.is_path_safe('D:/forbidden_folder', self.workspace_root))

    def test_sandbox_command_check(self):
        # Safe command
        ok1, _ = self.runner.check_sandbox('python app.py', self.workspace_root)
        self.assertTrue(ok1)
        
        # Command with relative escape attempt
        ok2, _ = self.runner.check_sandbox('cat ../../../secret.txt', self.workspace_root)
        self.assertFalse(ok2)
        
        # Command accessing external absolute path
        ok3, _ = self.runner.check_sandbox('copy C:/Windows/win.ini .', self.workspace_root)
        self.assertFalse(ok3)

    def test_supervisor_heartbeat(self):
        self.supervisor.ping('Coder')
        # Test immediate heartbeat check
        self.assertTrue(self.supervisor.check_heartbeat('Coder', max_gap=1.0))
        
        # Test timeout case
        time.sleep(0.2)
        self.assertFalse(self.supervisor.check_heartbeat('Coder', max_gap=0.1))
        halted, _ = self.supervisor.is_halted()
        self.assertTrue(halted)

    def test_supervisor_loop_breaker(self):
        for _ in range(5):
            self.assertTrue(self.supervisor.log_action('Coder', 'write_file'))
        # 6th time should trigger loop breaker
        self.assertFalse(self.supervisor.log_action('Coder', 'write_file'))
        halted, _ = self.supervisor.is_halted()
        self.assertTrue(halted)

    def test_supervisor_file_budget(self):
        # Under budget (0.5MB)
        self.assertTrue(self.supervisor.add_write_volume(500 * 1024))
        # Exceeds budget (over 1MB total)
        self.assertFalse(self.supervisor.add_write_volume(600 * 1024))
        halted, _ = self.supervisor.is_halted()
        self.assertTrue(halted)

    def test_supervisor_token_budget(self):
        # Under budget (500 tokens)
        self.assertTrue(self.supervisor.add_tokens(500))
        # Exceeds budget (over 1000 total)
        self.assertFalse(self.supervisor.add_tokens(600))
        halted, _ = self.supervisor.is_halted()
        self.assertTrue(halted)

    def test_secure_execution_block(self):
        # Test execution of a high-risk blocked command
        res = asyncio.run(self.runner.run('rm -rf D:/The core/Workspace', self.workspace_root))
        self.assertFalse(res['safe'])
        self.assertIn('blocked', res['details'].lower())

if __name__ == '__main__':
    unittest.main()