import time
from typing import Dict, Any, List

def calculate_sm2(
    quality: int,
    ease: float = 2.5,
    repetitions: int = 0,
    interval: int = 0
) -> Dict[str, Any]:
    """
    Applies the SM-2 spaced repetition algorithm based on user quality rating.
    quality: 0-5 (0=incorrect, 5=perfect)
    ease: difficulty multiplier (starts at 2.5)
    repetitions: number of successful repetitions (starts at 0)
    interval: days until next review (starts at 0)
    """
    # Enforce standard bounds
    if ease < 1.3:
        ease = 1.3

    if quality < 3:
        repetitions = 0
        new_interval = 1
    else:
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 3
        else:
            new_interval = int(round(interval * ease))
            if new_interval < 1:
                new_interval = 1
        repetitions += 1

    # Update ease factor formula
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if ease < 1.3:
        ease = 1.3
    # Cap ease at a reasonable value like 5.0 to avoid unbounded growth
    if ease > 5.0:
        ease = 5.0

    return {
        "ease": float(ease),
        "repetitions": int(repetitions),
        "interval": int(new_interval),
        "next_review_date": time.time() + new_interval * 86400.0,
        "last_reviewed": time.time()
    }

def map_score_to_quality(is_correct: bool, hints_requested: int, score: float = 1.0) -> int:
    """
    Maps grading correctness and hints requested to a 0-5 quality score.
    - Correct, no hints: 5
    - Correct, 1 hint: 4
    - Correct, 2+ hints: 3
    - Partial credit (e.g. 50%): 2
    - Incorrect: 0
    """
    if not is_correct:
        if score > 0.0:
            return 2  # Partial credit
        return 0  # Incorrect
    
    if hints_requested == 0:
        return 5
    elif hints_requested == 1:
        return 4
    else:
        return 3
