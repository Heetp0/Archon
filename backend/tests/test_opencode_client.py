import unittest
import asyncio
import sys
import os
from unittest.mock import patch, MagicMock, AsyncMock

# Add daemon directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from opencode_client import OpenCodeClient

class TestOpenCodeClient(unittest.TestCase):
    def setUp(self):
        self.client = OpenCodeClient(workspace_root="/mock/workspace")

    @patch('asyncio.create_subprocess_shell')
    def test_execute_task_success(self, mock_create_shell):
        # Setup mock process
        mock_process = AsyncMock()
        mock_process.returncode = 0
        
        # Mock stream lines
        mock_stdout = AsyncMock()
        mock_stdout.readline.side_effect = [
            b"Analyzing repository...\n",
            b"Generating code changes...\n",
            b"" # End of stream
        ]
        mock_process.stdout = mock_stdout
        
        mock_create_shell.return_value = mock_process

        # Run async execute
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            output_lines = []
            async def run():
                async for line in self.client.execute_task("fix bugs"):
                    output_lines.append(line)
            
            loop.run_until_complete(run())
            self.assertEqual(output_lines, [
                "Analyzing repository...\n",
                "Generating code changes...\n"
            ])
            
            # Verify shell execution command format
            mock_create_shell.assert_called_once()
            args, kwargs = mock_create_shell.call_args
            cmd_string = args[0]
            if sys.platform == "win32":
                self.assertIn("powershell.exe", cmd_string)
                self.assertIn("opencode run \"fix bugs\"", cmd_string)
            else:
                self.assertIn("opencode run \"fix bugs\"", cmd_string)
                
        finally:
            loop.close()

    @patch('asyncio.create_subprocess_shell')
    def test_execute_task_failure(self, mock_create_shell):
        # Setup mock process failing with exit code 1
        mock_process = AsyncMock()
        mock_process.returncode = 1
        mock_stdout = AsyncMock()
        mock_stdout.readline.side_effect = [
            b"Compilation failed!\n",
            b"" # End of stream
        ]
        mock_process.stdout = mock_stdout
        mock_create_shell.return_value = mock_process

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            output_lines = []
            async def run():
                async for line in self.client.execute_task("compile"):
                    output_lines.append(line)
            
            loop.run_until_complete(run())
            self.assertEqual(output_lines, [
                "Compilation failed!\n",
                "\n[ERROR] OpenCode exited with code 1\n"
            ])
        finally:
            loop.close()

if __name__ == '__main__':
    unittest.main()
