import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import os
import shutil
import unittest
from agent_journal import AgentJournal

class TestAgentJournal(unittest.TestCase):
    def setUp(self):
        self.db_dir = os.path.join(os.path.dirname(__file__), "test_db_journal")
        if os.path.exists(self.db_dir):
            shutil.rmtree(self.db_dir)
        self.journal = AgentJournal(self.db_dir)

    def tearDown(self):
        self.journal.close()
        if os.path.exists(self.db_dir):
            shutil.rmtree(self.db_dir)

    def test_run_lifecycle_and_checkpointing(self):
        task_id = "test_run_123"
        
        # 1. Start execution run
        self.journal.start_run(task_id)
        
        # 2. Checkpoint step 1
        input_payload = {"task": "Build CLI"}
        output_payload = {"plan": "Roadmap: 1. Setup parser, 2. Run execution"}
        self.journal.log_step(task_id, 1, "Reader", "reader_node", input_payload, output_payload)
        
        # Verify checkpoint recovery
        checkpoint = self.journal.get_last_checkpoint(task_id)
        self.assertIsNotNone(checkpoint)
        self.assertEqual(checkpoint["step_index"], 1)
        self.assertEqual(checkpoint["agent_name"], "Reader")
        self.assertEqual(checkpoint["output_payload"]["plan"], output_payload["plan"])

        # 3. Checkpoint step 2
        output_payload_2 = {"code": "print('hello')"}
        self.journal.log_step(task_id, 2, "Coder", "coder_node", output_payload, output_payload_2)

        # Verify last checkpoint updates to step 2
        checkpoint = self.journal.get_last_checkpoint(task_id)
        self.assertEqual(checkpoint["step_index"], 2)
        self.assertEqual(checkpoint["agent_name"], "Coder")

        # 4. Fetch all steps
        all_steps = self.journal.get_all_steps(task_id)
        self.assertEqual(len(all_steps), 2)
        self.assertEqual(all_steps[0]["step_index"], 1)
        self.assertEqual(all_steps[1]["step_index"], 2)

        # 5. Complete run
        self.journal.complete_run(task_id, "completed")
