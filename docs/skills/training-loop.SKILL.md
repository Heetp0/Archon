# training-loop

## Overview
Weekly automated fine-tuning pipeline using user handwriting data. Trains a LoRA adapter on a PaddleOCR encoder and syncs checkpoints to Android devices.

## Key Files
- `backend/agents/tutor_training.py` — Training loop coordination
- `weekly_finetuning_cron.py` — Scheduled entry point

## API / Interface
- `Cron: 0 2 * * 0` (Sunday 2AM UTC)

## Data Flow
1. Fetch training data from `handwriting_training_data` (last 7 days, minimum 10 samples).
2. Train a LoRA adapter (r=8) on the PaddleOCR encoder for 3 epochs using an 80/20 train/validation split.
3. Save output checkpoint `.pth` file.
4. Log results to the `training_loop_results` table (sample_count, accuracy, checkpoint_path).
5. Sync the checkpoint via Syncthing to the Android model directory.

## Configuration
- Epochs: 3
- LoRA rank (r): 8
- Data split: 80/20

## Error Handling
- Aborts training if <10 samples are available.
- Employs graceful degradation to a stub checkpoint if PaddleOCR is unavailable or training fails.
