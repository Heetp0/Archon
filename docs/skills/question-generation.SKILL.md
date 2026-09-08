# question-generation

## Overview
LLM-based question synthesis from Notebook sources. Queries LanceDB retrieval system for top-5 source chunks on the topic, crafts a DeepSeek R1 or Gemini reasoning prompt, and returns a structured JSON object with the question, reference answer, key points, and source attribution.

## Key Files
- `backend/quiz_manager.py` — Question generation and LLM orchestration (assumed)
- `backend/lancedb_client.py` — Retrieval logic (assumed)

## API / Interface
- `quiz_manager.generate_question(topic, difficulty, notebook_id)`

## Data Flow
1. Query LanceDB for top-5 relevant source chunks based on topic.
2. Construct DeepSeek R1/Gemini reasoning prompt incorporating chunks.
3. Generate structured JSON: `{question, reference_answer, expected_key_points, source_attribution}`.
4. Cache generated question for the session to prevent regeneration on refresh.

## Configuration
- Difficulty levels: beginner, intermediate, advanced.
- LLM Provider: DeepSeek R1 / Gemini.

## Error Handling
- Retries with lower complexity if LLM fails to output valid JSON.
- Uses cached question if retrieval or generation fails during a refresh.
