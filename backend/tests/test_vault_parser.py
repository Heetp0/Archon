import unittest
import os
import sys
import tempfile
import shutil

# Add daemon directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from vault_parser import parse_frontmatter, parse_note, walk_vault

class TestVaultParser(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for vault scanning tests
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_parse_frontmatter_standard(self):
        lines = [
            "---",
            "title: Note Title",
            "tags: [tag1, tag2]",
            "status: Draft",
            "---",
            "Note content goes here."
        ]
        meta, end_idx = parse_frontmatter(lines)
        self.assertEqual(meta["title"], "Note Title")
        self.assertEqual(meta["tags"], ["tag1", "tag2"])
        self.assertEqual(meta["status"], "Draft")
        self.assertEqual(end_idx, 5)

    def test_parse_frontmatter_list(self):
        lines = [
            "---",
            "tags:",
            "  - tag1",
            "  - tag2",
            "---"
        ]
        meta, end_idx = parse_frontmatter(lines)
        self.assertEqual(meta["tags"], ["tag1", "tag2"])

    def test_parse_note_complete(self):
        # Create a temp file
        filepath = os.path.join(self.test_dir, "test_note.md")
        note_text = """---
title: Test Note Title
tags: [concept, physics]
---
# Main Header

Some body text here with link [[Quantum Mechanics|QM]] and another link [[Fluid Dynamics]].
Also has an inline #physics-tag here.
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(note_text)

        note_meta = parse_note(filepath, self.test_dir)
        self.assertEqual(note_meta["relative_path"], "test_note.md")
        self.assertEqual(note_meta["title"], "Test Note Title")
        # Check tags (deduplicated combination of frontmatter + inline)
        self.assertIn("concept", note_meta["tags"])
        self.assertIn("physics", note_meta["tags"])
        self.assertIn("physics-tag", note_meta["tags"])
        # Check links
        self.assertIn("Quantum Mechanics", note_meta["links"])
        self.assertIn("Fluid Dynamics", note_meta["links"])
        self.assertEqual(len(note_meta["links"]), 2)

    def test_walk_vault_exclusions(self):
        # Setup files in temp directory
        os.makedirs(os.path.join(self.test_dir, "SecondBrain"))
        os.makedirs(os.path.join(self.test_dir, ".obsidian"))
        os.makedirs(os.path.join(self.test_dir, "Archives"))

        # Valid markdown
        with open(os.path.join(self.test_dir, "SecondBrain", "note1.md"), "w") as f:
            f.write("# Note 1")

        # Excluded directory markdown
        with open(os.path.join(self.test_dir, ".obsidian", "config.md"), "w") as f:
            f.write("# Config")
        with open(os.path.join(self.test_dir, "Archives", "old_note.md"), "w") as f:
            f.write("# Archive")

        notes = walk_vault(self.test_dir)
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["relative_path"], "SecondBrain/note1.md")

if __name__ == '__main__':
    unittest.main()
