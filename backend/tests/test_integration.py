import unittest
import asyncio
import os
import sys
import tempfile
import shutil
from unittest.mock import patch, MagicMock, AsyncMock

# Add daemon directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from vault_parser import parse_note
from model_router import ModelRouter
from opencode_client import OpenCodeClient

class TestIntegrationCore(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.router = ModelRouter()
        self.opencode = OpenCodeClient(workspace_root=self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    @patch('model_router.acompletion')
    @patch('asyncio.create_subprocess_shell')
    def test_end_to_end_flow_mocked(self, mock_create_shell, mock_acompletion):
        # 1. Parse a dummy specification note in the vault
        spec_path = os.path.join(self.test_dir, "spec.md")
        with open(spec_path, "w", encoding="utf-8") as f:
            f.write("""---
title: System Spec
---
# Goals
- Implement a math calculation utility.
""")
        
        note_meta = parse_note(spec_path, self.test_dir)
        self.assertEqual(note_meta["title"], "System Spec")

        # 2. Use ModelRouter to formulate a coding prompt based on vault spec context
        mock_response_chunk = MagicMock()
        mock_response_chunk.choices = [MagicMock()]
        mock_response_chunk.choices[0].delta = MagicMock()
        mock_response_chunk.choices[0].delta.content = "Create a calculator script"

        async def mock_generator():
            yield mock_response_chunk

        mock_acompletion.return_value = mock_generator()
        self.router._get_api_key = lambda name: "mock_key"

        # Mock OpenCode execution stdout
        mock_process = AsyncMock()
        mock_process.returncode = 0
        mock_stdout = AsyncMock()
        mock_stdout.readline.side_effect = [
            b"Writing calculator.py...\n",
            b"Running tests...\n",
            b""
        ]
        mock_process.stdout = mock_stdout
        mock_create_shell.return_value = mock_process

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Run the integrated task
            async def run_pipeline():
                # Router generates plan
                prompt = f"Given spec: {note_meta['title']}. What should we code?"
                generated_prompt = ""
                async for chunk in self.router.generate("fast", [{"role": "user", "content": prompt}]):
                    generated_prompt += chunk
                
                self.assertEqual(generated_prompt, "Create a calculator script")
                
                # OpenCode executes the generated plan
                opencode_output = []
                async for line in self.opencode.execute_task(generated_prompt):
                    opencode_output.append(line)
                    
                self.assertEqual(opencode_output, [
                    "Writing calculator.py...\n",
                    "Running tests...\n"
                ])

            loop.run_until_complete(run_pipeline())
        finally:
            loop.close()

if __name__ == '__main__':
    unittest.main()
