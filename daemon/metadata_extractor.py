import numpy as np
from typing import Dict, Any, List

def extract_handwriting_metadata(binary_data: bytes, ground_truth: str) -> Dict[str, Any]:
    from image_renderer import deserialize_strokes
    
    strokes = deserialize_strokes(binary_data)
    valid_strokes = [s for s in strokes if s.get('points')]
    
    char_count = len(ground_truth)
    word_count = len(ground_truth.split())
    
    pressures = [p['pressure'] for s in valid_strokes for p in s['points']]
    pressure_variation = float(np.std(pressures)) if pressures else 0.0
    
    stroke_count = len(valid_strokes)
    
    return {
        "character_count": char_count,
        "word_count": word_count,
        "ink_pressure_variation": pressure_variation,
        "stroke_count": stroke_count,
    }
