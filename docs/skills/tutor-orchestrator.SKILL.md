# tutor-orchestrator

## Overview
Session lifecycle management for Tutor Mode. Handles session start (topic+difficulty selection, question generation), question display, answer submission, grading dispatch, Socratic follow-up routing, session finalization, and mastery update triggers.

## Key Files
- `backend/tutor_routes.py` — Endpoints for session management (assumed)
- `backend/agents/tutor_orchestrator.py` — State machine and orchestration logic (assumed)

## API / Interface
- `POST /tutor/session/start`
- `POST /tutor/session/{id}/answer`
- `POST /tutor/session/{id}/socratic_answer`

## Data Flow
1. State changes from IDLE to SESSION_STARTED upon `/start`.
2. QUESTION_DISPLAYED state entered when question is loaded.
3. User submits answer -> ANSWER_SUBMITTED state.
4. Moves to GRADING state to evaluate submission.
5. Transitions to FEEDBACK state with results.
6. Branches to NEXT_QUESTION or SESSION_END.

## Configuration
- Difficulty levels: beginner, intermediate, advanced.
- State machine transitions defined per session.

## Error Handling
- Invalid state transitions will throw an error and return 400 Bad Request.
- Fallback to IDLE on unrecoverable session crashes.
