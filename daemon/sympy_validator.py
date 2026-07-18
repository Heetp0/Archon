import logging
import re
from typing import Optional, Dict, Any
from pydantic import BaseModel
import sympy
from sympy import Symbol, Eq, simplify, diff
from sympy.parsing.latex import parse_latex

logger = logging.getLogger("sympy_validator")

class ValidationResult(BaseModel):
    is_correct: Optional[bool]
    is_partial: bool = False
    score: float = 0.0
    student_simplified: str = ""
    expected_simplified: str = ""
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    suggestion: Optional[str] = None

def clean_latex(latex_str: str) -> str:
    if not latex_str:
        return ""
    s = latex_str.strip().strip("$").strip()
    s = s.replace(r"\cdot", "*")
    s = s.replace(r"\times", "*")
    s = s.replace(r"\left(", "(").replace(r"\right)", ")")
    s = s.replace(r"\left[", "[").replace(r"\right]", "]")
    return s

def parse_latex_to_sympy(latex_str: str):
    cleaned = clean_latex(latex_str)
    if "=" in cleaned:
        parts = cleaned.split("=")
        if len(parts) == 2:
            lhs = parse_latex(parts[0].strip())
            rhs = parse_latex(parts[1].strip())
            return Eq(lhs, rhs)
    return parse_latex(cleaned)

def has_zero_denominator(expr) -> bool:
    try:
        if expr == sympy.zoo or expr == sympy.nan:
            return True
        from sympy import fraction
        num, den = fraction(expr)
        if den == 0:
            return True
    except Exception:
        pass
    return False

def check_algebraic_equivalence(student_expr, expected_expr) -> bool:
    try:
        diff_expr = simplify(student_expr - expected_expr)
        return diff_expr == 0
    except Exception:
        return False

def check_equation_equivalence(student_eq, expected_eq) -> bool:
    if isinstance(student_eq, Eq) and isinstance(expected_eq, Eq):
        try:
            student_diff = simplify(student_eq.lhs - student_eq.rhs)
            expected_diff = simplify(expected_eq.lhs - expected_eq.rhs)
            ratio = simplify(student_diff / expected_diff)
            if ratio.is_number and ratio != 0:
                return True
        except Exception:
            pass
    return False

def detect_common_mistake(student, expected, q_type: str = "algebra", integrand: Optional[str] = None) -> Optional[str]:
    if not isinstance(student, Eq) and not isinstance(expected, Eq):
        if check_algebraic_equivalence(student, -expected):
            return "SIGN_ERROR"
    if isinstance(student, Eq) and isinstance(expected, Eq):
        try:
            student_diff = simplify(student.lhs - student.rhs)
            expected_diff = simplify(expected.lhs - expected.rhs)
            if check_algebraic_equivalence(student_diff, -expected_diff):
                return "SIGN_ERROR"
        except Exception:
            pass

    if q_type == "integration":
        if integrand:
            try:
                var = Symbol("x")
                student_expr = student.rhs if isinstance(student, Eq) else student
                student_deriv = diff(student_expr, var)
                integrand_expr = parse_latex(integrand) if "\\" in integrand or "{" in integrand else sympy.sympify(integrand)
                if check_algebraic_equivalence(student_deriv, integrand_expr):
                    has_C = any(s.name == "C" for s in student_expr.free_symbols)
                    expected_expr = expected.rhs if isinstance(expected, Eq) else expected
                    expected_has_C = any(s.name == "C" for s in expected_expr.free_symbols)
                    if expected_has_C and not has_C:
                        return "MISSING_CONSTANT"
            except Exception:
                pass

    if has_zero_denominator(student):
        return "INVALID_DOMAIN"

    if check_algebraic_equivalence(student, expected):
        try:
            if student.count_ops() > expected.count_ops():
                return "INCOMPLETE_SIMPLIFICATION"
        except Exception:
            pass

    return "OTHER_ERROR"

def validate_math_answer(
    student_latex: str,
    expected_latex: str,
    q_type: str = "algebra",
    integrand: Optional[str] = None
) -> ValidationResult:
    try:
        student_sympy = parse_latex_to_sympy(student_latex)
        expected_sympy = parse_latex_to_sympy(expected_latex)
        
        is_correct = False
        
        if q_type == "integration" and integrand:
            try:
                var = Symbol("x")
                student_expr = student_sympy.rhs if isinstance(student_sympy, Eq) else student_sympy
                student_deriv = diff(student_expr, var)
                integrand_expr = parse_latex(integrand) if "\\" in integrand or "{" in integrand else sympy.sympify(integrand)
                if check_algebraic_equivalence(student_deriv, integrand_expr):
                    has_C = any(s.name == "C" for s in student_expr.free_symbols)
                    if has_C:
                        is_correct = True
                    else:
                        return ValidationResult(
                            is_correct=False,
                            score=0.5,
                            is_partial=True,
                            student_simplified=str(student_sympy),
                            expected_simplified=str(expected_sympy),
                            error_type="MISSING_CONSTANT",
                            suggestion="Check your constant of integration (did you forget '+ C'?)"
                        )
            except Exception as e:
                logger.warning(f"Integration diff check failed: {e}")

        if not is_correct and isinstance(student_sympy, Eq) and isinstance(expected_sympy, Eq):
            is_correct = check_equation_equivalence(student_sympy, expected_sympy)
            
        if not is_correct and not isinstance(student_sympy, Eq) and isinstance(expected_sympy, Eq):
            is_correct = check_algebraic_equivalence(student_sympy, expected_sympy.rhs)

        if not is_correct and isinstance(student_sympy, Eq) and not isinstance(expected_sympy, Eq):
            is_correct = check_algebraic_equivalence(student_sympy.rhs, expected_sympy)

        if not is_correct and not isinstance(student_sympy, Eq) and not isinstance(expected_sympy, Eq):
            is_correct = check_algebraic_equivalence(student_sympy, expected_sympy)

        if is_correct:
            return ValidationResult(
                is_correct=True,
                score=1.0,
                student_simplified=str(student_sympy),
                expected_simplified=str(expected_sympy)
            )
        
        error_type = detect_common_mistake(student_sympy, expected_sympy, q_type, integrand)
        
        suggestion = {
            "SIGN_ERROR": "It looks like you have a sign error. Check your positive and negative signs.",
            "MISSING_CONSTANT": "Did you forget the constant of integration (+ C)?",
            "INVALID_DOMAIN": "Your answer contains a division by zero, which is undefined.",
            "INCOMPLETE_SIMPLIFICATION": "Your answer is mathematically equivalent but can be simplified further.",
            "OTHER_ERROR": "Your answer is incorrect. Review your steps and try again."
        }.get(error_type, "Incorrect answer. Try again.")

        return ValidationResult(
            is_correct=False,
            score=0.0,
            student_simplified=str(student_sympy),
            expected_simplified=str(expected_sympy),
            error_type=error_type,
            suggestion=suggestion
        )

    except Exception as e:
        logger.error(f"SymPy validation exception: {e}")
        return ValidationResult(
            is_correct=None,
            score=0.0,
            error_message=str(e),
            suggestion="Could not parse LaTeX math. Double-check your notation or enter it manually."
        )
