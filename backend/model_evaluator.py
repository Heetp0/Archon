import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("model_evaluator")

def calculate_levenshtein(ref: List[Any], hyp: List[Any]) -> Tuple[int, int, int]:
    m = len(ref)
    n = len(hyp)
    dp = np.zeros((m + 1, n + 1), dtype=int)
    
    for i in range(1, m + 1):
        dp[i][0] = i
    for j in range(1, n + 1):
        dp[0][j] = j
        
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if ref[i-1] == hyp[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                sub = dp[i-1][j-1] + 1
                deletion = dp[i-1][j] + 1
                insertion = dp[i][j-1] + 1
                dp[i][j] = min(sub, deletion, insertion)
                
    i, j = m, n
    s, d, ins = 0, 0, 0
    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref[i-1] == hyp[j-1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            s += 1
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            d += 1
            i -= 1
        else:
            ins += 1
            j -= 1
            
    return s, d, ins

def get_confusion_pairs(ref: str, hyp: str) -> List[Tuple[str, str]]:
    pairs = []
    m, n = len(ref), len(hyp)
    dp = np.zeros((m + 1, n + 1), dtype=int)
    for i in range(1, m + 1): dp[i][0] = i
    for j in range(1, n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if ref[i-1] == hyp[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = min(dp[i-1][j-1] + 1, dp[i-1][j] + 1, dp[i][j-1] + 1)
                
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref[i-1] == hyp[j-1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            pairs.append((ref[i-1], hyp[j-1]))
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            i -= 1
        else:
            j -= 1
    return pairs

def evaluate_predictions(references: List[str], hypotheses: List[str]) -> Dict[str, Any]:
    total_words_ref = 0
    total_chars_ref = 0
    
    total_wer_s, total_wer_d, total_wer_i = 0, 0, 0
    total_cer_s, total_cer_d, total_cer_i = 0, 0, 0
    
    confusion_counts = {}
    
    for ref, hyp in zip(references, hypotheses):
        ref_words = ref.split()
        hyp_words = hyp.split()
        
        # Word-level Levenshtein
        ws, wd, wi = calculate_levenshtein(ref_words, hyp_words)
        total_wer_s += ws
        total_wer_d += wd
        total_wer_i += wi
        total_words_ref += len(ref_words)
        
        # Char-level Levenshtein
        cs, cd, ci = calculate_levenshtein(list(ref), list(hyp))
        total_cer_s += cs
        total_cer_d += cd
        total_cer_i += ci
        total_chars_ref += len(ref)
        
        # Confusion pairs
        pairs = get_confusion_pairs(ref, hyp)
        for r_c, h_c in pairs:
            key = (r_c, h_c)
            confusion_counts[key] = confusion_counts.get(key, 0) + 1
            
    # Compute final rates
    wer = ((total_wer_s + total_wer_d + total_wer_i) / total_words_ref * 100) if total_words_ref > 0 else 0.0
    cer = ((total_cer_s + total_cer_d + total_cer_i) / total_chars_ref * 100) if total_chars_ref > 0 else 0.0
    
    # Format top 10 confusions
    sorted_confusions = sorted(confusion_counts.items(), key=lambda x: x[1], reverse=True)
    top_10 = []
    total_substitutions = max(1, sum(confusion_counts.values()))
    for (r_c, h_c), count in sorted_confusions[:10]:
        top_10.append({
            "char": r_c,
            "confused_with": h_c,
            "count": count,
            "rate_percent": round((count / total_substitutions) * 100, 2)
        })
        
    return {
        "wer_percent": round(wer, 2),
        "cer_percent": round(cer, 2),
        "accuracy_word": round(100.0 - wer, 2) if wer <= 100 else 0.0,
        "accuracy_char": round(100.0 - cer, 2) if cer <= 100 else 0.0,
        "confusion_matrix_top_10": top_10
    }

def compare_models(
    baseline_hyps: List[str], 
    fine_tuned_hyps: List[str], 
    references: List[str]
) -> Dict[str, Any]:
    baseline_metrics = evaluate_predictions(references, baseline_hyps)
    fine_tuned_metrics = evaluate_predictions(references, fine_tuned_hyps)
    
    # Calculate improvements
    base_wer = baseline_metrics["wer_percent"]
    ft_wer = fine_tuned_metrics["wer_percent"]
    
    wer_reduction = ((base_wer - ft_wer) / base_wer * 100) if base_wer > 0 else 0.0
    
    return {
        "baseline": baseline_metrics,
        "fine_tuned": fine_tuned_metrics,
        "improvement": {
            "wer_reduction_percent": round(wer_reduction, 2),
            "accuracy_gain_word": round(fine_tuned_metrics["accuracy_word"] - baseline_metrics["accuracy_word"], 2),
            "accuracy_gain_char": round(fine_tuned_metrics["accuracy_char"] - baseline_metrics["accuracy_char"], 2)
        }
    }
