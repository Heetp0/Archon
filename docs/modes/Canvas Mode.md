# Canvas Mode & Interactive Tutor

## 1. Overview & Inspirations
Canvas Mode brings spatial handwriting, freeform digital ink, and interactive Socratic tutoring to Archon.
The user experience takes direct inspiration from:
- **Duolingo & Mimo:** Active accountability with low cognitive friction — instant, in-place verification without leaving your flow.
- **Khanmigo & Brilliant:** Socratic scaffolding rather than immediate answer spoilers — tiered disclosure (`Nudge` → `Diagnostic Question` → `Methodological Hint` → `Worked Sub-step`).
- **GoodNotes, Apple Math Notes & Nebo:** Distraction-free digital ink canvas with low-latency stylus rendering, Cornell/grid templates, and MyScript Interactive Ink math recognition.

---

## 2. The Unified Dual-Mode Architecture

The mode supports two complementary view paradigms switchable via a top toggle:

### A. Practice / Exam Mode (Canvas-First)
- **100% Viewport Ink Canvas:** Complete spatial freedom for long derivations, circuit diagrams, and scratchpad calculations.
- **Top Hovering Question Bar:** A floating rectangular island (`top: 24px`, centered, frosted glass):
  ```
  +-----------------------------------------------------------------------------------+
  | [Q 3/5] Solve for x:  2x² - 8x + 6 = 0                            [ ✓ CHECK STEP ]|
  +-----------------------------------------------------------------------------------+
  ```
- **In-Place Accordion Feedback:** Tapping `[CHECK STEP]` evaluates strokes via backend OCR & SymPy/LLM, smoothly expanding downward *inside the same rectangle*:
  ```
  +-----------------------------------------------------------------------------------+
  | [Q 3/5] Solve for x:  2x² - 8x + 6 = 0                            [  RE-CHECK  ]  |
  |-----------------------------------------------------------------------------------|
  | 💡 Tutor: Good factorization of 2(x² - 4x + 3)! In your final roots step, check   |
  |           the sign of the second factor (x - 3)(x - 1).                           |
  | [Request Hint]                                                [Next Question →]   |
  +-----------------------------------------------------------------------------------+
  ```

### B. Learn Mode (Continuous Stream)
- **Vertical Learning Stream:** Modeled after interactive notebooks and ChatGPT/Claude study modes:
  1. **Theory Block:** High-density conceptual explanation with LaTeX formulas and diagrams.
  2. **Dedicated Canvas Sandbox:** Embedded digital ink block directly beneath the theory for solving the checkpoint.
  3. **Check Step Button:** Anchored in the sandbox footer to verify mastery before unlocking downstream sections.
  4. **Progressive Unlocking:** Step-by-step topic mastery with adaptive difficulty.
- **Floating Tutor Control Panel (Side Dock):**
  - Dedicated side button opening a slide-over tutor chat drawer.
  - Allows adapting notes in real-time (*"make the theory notes more visual"*, *"explain using an aerodynamic analogy"*, *"make the next question harder"*).

---

## 3. Architecture & Data Flow

```mermaid
sequenceDiagram
    participant User
    participant CanvasUI as Canvas / Stream UI
    participant FloatPill as Top Hovering Bar / Side Dock
    participant Backend as FastAPI (tutor_routes.py)
    participant OCR as OCR / Vision Service
    participant SymPy as SymPy Math Validator
    participant Socratic as Socratic Agent (LLM)
    participant SM2 as Spaced Repetition (SM-2)

    User->>CanvasUI: Writes handwritten derivation with stylus
    User->>FloatPill: Taps [CHECK STEP]
    FloatPill->>Backend: POST /quiz-attempts/{id}/check-ink (or /answers)
    
    alt Ink / Image Provided
        Backend->>OCR: Recognize handwriting to LaTeX
        OCR-->>Backend: Recognized LaTeX string
    end

    Backend->>SymPy: Symbolic algebraic equivalence test
    alt Math Match
        SymPy-->>Backend: is_correct: true, score: 1.0
        Backend->>SM2: Update ease factor & review interval
        Backend-->>FloatPill: Success feedback & celebration state
    else Math Discrepancy / Error
        SymPy-->>Backend: error_type (sign_error, incomplete, etc.)
        Backend->>Socratic: Generate non-spoiler Socratic hint (Level 1-3)
        Socratic-->>Backend: Targeted hint text
        Backend-->>FloatPill: Accordion expansion with Socratic hint
    end
```

---

## 4. Key API Endpoints

Managed primarily by `backend/tutor_routes.py` and `backend/ocr_routes.py`:

* `GET /notebooks/{id}/quiz-questions` — List questions (supports `due_only` for spaced repetition).
* `POST /notebooks/{id}/quiz-attempts?question_id={id}` — Start an active attempt.
* `POST /quiz-attempts/{id}/answers` — Submit student LaTeX answer for SymPy/LLM validation.
* `POST /quiz-attempts/{id}/hints` — Request tiered Socratic hint (Level 1: Nudge, Level 2: Error-focused, Level 3: Next step).
* `POST /quiz-attempts/{id}/finalize` — Finalize attempt and recalculate SM-2 interval.
* `POST /tutor/chat` — Contextual dialogue with the tutor to adapt notes, explain theory, or request tailored questions.
* `POST /canvas/evaluate-strokes` — Direct ink stroke / image evaluation for clients without local OCR.

---

## 5. Data Models & Database Schema

Stored in LanceDB via `quiz_manager.py`:
- **`QuizQuestion`**: `question_id`, `notebook_id`, `topic`, `difficulty`, `question_latex`, `expected_answer_latex`, `spaced_repetition_json`.
- **`QuizAttempt`**: `attempt_id`, `question_id`, `status`, `student_answer_latex`, `hints_requested`, `score`, `time_spent_seconds`.
- **`LearningLesson`**: `lesson_id`, `topic`, `theory_markdown`, `checkpoints_json`.

---

## 6. Android Implementation
- `CanvasHost.kt` & `InkCanvas.kt`: Low-latency front-buffered stylus rendering with palm rejection.
- `TutorModeScreen.kt`: Jetpack Compose UI with top question island and FloatingToolbar.
- `TutorNetworkService.kt`: Ktor HTTP client managing attempts, answers, and hints.

---

## 7. Known Issues & Roadmap
- Backend needs direct stroke/image evaluation fallback for clients without MyScript SDK licenses.
- Tutor chat needs bidirectional synchronization with the active lesson theory markdown.

