# socratic-feedback

## Overview
Targeted follow-up question generation when a user scores less than 8.5/10. Analyzes the failed dimension, generates a Socratic probe without revealing the answer, and limits expected user writing to 1-2 minutes.

## Key Files
- `backend/socratic_agent.py` — Follow-up question generation logic

## API / Interface
- `class SocraticAgent`

## Data Flow
1. Analyze the grading breakdown to identify the failing dimension (concept/reasoning/form).
2. Generate a targeted Socratic probe that encourages the user to think without giving away the answer.
3. Constrain expected user response to 1-2 minutes of writing.
4. On Socratic pass, mark the attempt as `learned_with_hint` (lower mastery weight).
5. After 2 failed attempts, display the reference answer.

## Configuration
- Max Socratic attempts: 2 before showing the reference answer.

## Error Handling
- If probe generation fails, defaults to a generic hint.
