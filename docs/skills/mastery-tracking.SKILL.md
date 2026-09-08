# mastery-tracking

## Overview
Spaced repetition scheduling using the SM-2 algorithm. Manages Leitner intervals and progression rules based on score performance, updating mastery tracking tables and display indicators.

## Key Files
- `backend/sm2_scheduler.py` — Spaced repetition and interval logic

## API / Interface
- `sm2_scheduler.calculate_sm2(quality, current_interval, current_ef)`

## Data Flow
1. Evaluate attempt quality based on score.
2. Calculate new interval and easier factor using SM-2.
3. If score > 8/10, advance to the next interval (1d, 3d, 7d, 14d, 30d, 60d+).
4. Update `mastery_level` as the average score across all attempts (0-1 scale).
5. Update `mastery_tracking` and `spaced_repetition_schedule` tables.

## Configuration
- Leitner intervals: 1d, 3d, 7d, 14d, 30d, 60d+.
- Progression rule: score > 8/10.

## Error Handling
- Defaults to maintaining the current interval if calculation encounters unexpected values.
