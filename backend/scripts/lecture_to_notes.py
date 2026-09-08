import os
import sys
import argparse
import asyncio
import time

# Append backend directory to sys.path
backend_path = r"d:\The core\Workspace\CodeSpace\Archon-main-2zip-1zip\backend"
sys.path.insert(0, backend_path)

import config
from model_router import ModelRouter
from retriever import Retriever
from audio_processor import AudioProcessor
from note_generator import NoteGenerator
from obsidian_exporter import LectureExporter

def print_progress(step_name: str, percent: int):
    bar_len = 30
    filled_len = int(round(bar_len * percent / 100))
    bar = '=' * filled_len + '-' * (bar_len - filled_len)
    sys.stdout.write(f"\r[{bar}] {percent}% — Step: {step_name}")
    sys.stdout.flush()

async def main_async():
    parser = argparse.ArgumentParser(description="Convert lecture audio to study notes")
    parser.add_argument("--subject", required=True, help="Subject name (e.g. Thermodynamics)")
    parser.add_argument("--lecture", required=True, type=int, help="Lecture number")
    parser.add_argument("--audio", required=True, help="Path to lecture audio recording file")
    parser.add_argument("--prof-notes", help="Path to text/markdown file containing professor outline notes")
    parser.add_argument("--vault-path", help="Alternative path to Obsidian vault")
    parser.add_argument("--dry-run", action="store_true", help="Simulate progress without actual API calls")

    args = parser.parse_args()

    if args.dry_run:
        print("\n--- Running Dry-Run Simulation ---\n")
        steps = [
            ("Denoising audio", 10),
            ("Transcribing audio", 40),
            ("Extracting concepts", 55),
            ("Explaining concepts", 70),
            ("Finding derivations", 85),
            ("Generating diagrams", 95),
            ("Formatting Obsidian note", 100)
        ]
        for name, pct in steps:
            print_progress(name, pct)
            await asyncio.sleep(0.5)
            
        date_str = time.strftime("%Y-%m-%d")
        vault = args.vault_path or os.getenv("OBSIDIAN_VAULT_PATH", "D:/Notes")
        note_path = os.path.join(vault, args.subject, f"Lecture_{args.lecture}_{date_str}.md")
        print(f"\n\n[SUCCESS] (Simulated) Note saved to: {note_path}")
        return

    # Real run
    print(f"Initializing Lecture Audio to Study Notes Pipeline for {args.subject} Lecture {args.lecture}...")
    
    # 1. Initialize services
    router = ModelRouter()
    db_path = os.path.join(config.WORKSPACE_ROOT, "lancedb")
    retriever = Retriever(db_path=db_path, model_router=router)
    
    processor = AudioProcessor()
    generator = NoteGenerator(router)
    exporter = LectureExporter()

    # 2. Check audio file exists
    if not os.path.exists(args.audio):
        print(f"Error: Audio file not found at '{args.audio}'")
        sys.exit(1)

    # 3. Read prof notes if provided
    prof_notes_content = None
    if args.prof_notes:
        if os.path.exists(args.prof_notes):
            with open(args.prof_notes, "r", encoding="utf-8") as f:
                prof_notes_content = f.read()
        else:
            print(f"Warning: Professor notes file not found at '{args.prof_notes}'. Continuing without it.")

    # 4. Run pipeline
    print_progress("Denoising audio", 10)
    denoised_wav = processor.denoise_audio(args.audio)
    
    print_progress("Transcribing audio", 40)
    transcription = processor.transcribe_audio(denoised_wav)
    
    # Clean up temp denoised wav
    try:
        os.remove(denoised_wav)
    except Exception:
        pass

    # Progress callbacks for NoteGenerator
    async def progress_cb(step_name: str, step_progress: int):
        print_progress(step_name, step_progress)

    # Generate Obsidian note content
    notes_content = await generator.generate_lecture_notes(
        transcript=transcription["transcript"],
        prof_notes=prof_notes_content,
        subject=args.subject,
        lecture_num=args.lecture,
        retriever=retriever,
        notebook_id="default_notebook",
        progress_callback=progress_cb
    )

    # Export to vault
    print_progress("Saving note to Obsidian", 98)
    note_path = exporter.save_lecture_note(notes_content, args.subject, args.lecture, args.vault_path)
    
    print_progress("Completed", 100)
    print(f"\n\n[SUCCESS] Obsidian study note saved to: {note_path}")

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
