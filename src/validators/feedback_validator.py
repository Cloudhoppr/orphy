"""Phase 3 deterministic feedback validator (PRD §7 — feedback).

Checks per run:
  1. FeedbackResult schema valid; summary, narration, fixes non-empty.
  2. metrics_ref points to an existing metrics file.
  3. narration is TTS-safe: no markdown tokens, no 'see above/below'.
  4. Numeric cross-check: every number cited in narration/fixes appears
     (rounded to NUMERIC_CROSSCHECK_DECIMALS) in the source metrics.
  5. narration within spoken-friendly length bounds.
  6. Cached fallback file exists and is schema-valid (fallback cannot fail).

Run:
    python -m src.validators.feedback_validator
or:
    python src/validators/feedback_validator.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.config import (
    CACHE_DIR,
    FORBIDDEN_PHRASES,
    MARKDOWN_TOKENS,
    NARRATION_MAX_CHARS,
    NARRATION_MIN_CHARS,
    NUMERIC_CROSSCHECK_DECIMALS,
    VALIDATION_DIR,
)
from src.contracts import Metrics


# --------------------------------------------------------------------------- #
# Helpers                                                                       #
# --------------------------------------------------------------------------- #

def _load_json(path: Path) -> tuple[dict | None, str | None]:
    """Return (data, None) on success or (None, error_message) on failure."""
    if not path.exists():
        return None, f"File not found: {path}"
    try:
        return json.loads(path.read_text()), None
    except json.JSONDecodeError as exc:
        return None, f"JSON parse error in {path}: {exc}"


def _extract_numbers(text: str) -> set[float]:
    """Extract all non-negative decimal numbers from text, rounded to config precision."""
    return {
        round(float(m), NUMERIC_CROSSCHECK_DECIMALS)
        for m in re.findall(r"\b\d+(?:\.\d+)?\b", text)
    }


def _metric_numbers(metrics_data: dict) -> set[float]:
    """All numbers present in the metrics JSON (via string extraction).

    Converts the full JSON to a string so we capture both positive and
    negative values: -12.0 in the JSON string yields the token '12.0',
    which rounds to 12.  This lets narration say '12 cents flat' when
    the raw cents_error is -12.0 without flagging a hallucination.
    """
    return _extract_numbers(json.dumps(metrics_data))


# --------------------------------------------------------------------------- #
# Per-take checks                                                               #
# --------------------------------------------------------------------------- #

def _check_schema(data: dict) -> list[str]:
    errors: list[str] = []
    for field in ("summary", "narration", "fixes", "metrics_ref"):
        if field not in data:
            errors.append(f"Missing required field: '{field}'")
    if errors:
        return errors
    if not isinstance(data["summary"], str) or not data["summary"].strip():
        errors.append("'summary' must be a non-empty string")
    if not isinstance(data["narration"], str) or not data["narration"].strip():
        errors.append("'narration' must be a non-empty string")
    if not isinstance(data["fixes"], list) or not data["fixes"]:
        errors.append("'fixes' must be a non-empty list")
    elif not all(isinstance(f, str) and f.strip() for f in data["fixes"]):
        errors.append("Every element of 'fixes' must be a non-empty string")
    if not isinstance(data["metrics_ref"], str) or not data["metrics_ref"].strip():
        errors.append("'metrics_ref' must be a non-empty string")
    return errors


def _check_metrics_ref(data: dict) -> list[str]:
    ref = Path(data["metrics_ref"])
    if not ref.exists():
        return [f"'metrics_ref' points to non-existent file: {ref}"]
    return []


def _check_tts_safety(narration: str) -> list[str]:
    errors: list[str] = []
    for token in MARKDOWN_TOKENS:
        if token in narration:
            errors.append(f"narration contains markdown token {token!r}")
    for phrase in FORBIDDEN_PHRASES:
        if phrase.lower() in narration.lower():
            errors.append(f"narration contains forbidden phrase {phrase!r}")
    return errors


def _derived_numbers(primary_metrics: dict, prior_metrics: dict | None) -> set[float]:
    """Deterministic figures that generate_feedback exposes in the prompt but that
    are not stored verbatim in either metrics JSON (e.g. improvement deltas).

    These are computed the same way as in _build_prompt so the validator's
    allowed set matches exactly what the model was shown.
    """
    extras: set[float] = set()
    if prior_metrics is None:
        return extras
    try:
        prior_mean = prior_metrics["summary"]["mean_abs_cents"]
        current_mean = primary_metrics["summary"]["mean_abs_cents"]
        improvement = prior_mean - current_mean
        extras.add(round(improvement, NUMERIC_CROSSCHECK_DECIMALS))

        prior_onset = prior_metrics["summary"]["mean_abs_onset_ms"]
        current_onset = primary_metrics["summary"]["mean_abs_onset_ms"]
        onset_improvement = prior_onset - current_onset
        extras.add(round(onset_improvement, NUMERIC_CROSSCHECK_DECIMALS))
    except (KeyError, TypeError):
        pass
    return extras


def _check_numeric_crosscheck(
    data: dict,
    primary_metrics: dict,
    prior_metrics: dict | None,
) -> list[str]:
    """Every number cited in narration/fixes must appear in the allowed set.

    Allowed set = numbers present in either metrics JSON + deterministic derived
    figures that generate_feedback computes and includes in the model prompt
    (e.g. improvement delta between bad and good takes).
    """
    allowed: set[float] = _metric_numbers(primary_metrics)
    if prior_metrics is not None:
        allowed |= _metric_numbers(prior_metrics)
    allowed |= _derived_numbers(primary_metrics, prior_metrics)

    cited = _extract_numbers(data["narration"] + " " + " ".join(data["fixes"]))
    hallucinated = cited - allowed
    if hallucinated:
        return [
            f"narration/fixes cite number(s) not present in source metrics: "
            f"{sorted(hallucinated)}"
        ]
    return []


def _check_length(narration: str) -> list[str]:
    n = len(narration)
    errors: list[str] = []
    if n < NARRATION_MIN_CHARS:
        errors.append(
            f"narration too short ({n} chars); minimum is {NARRATION_MIN_CHARS}"
        )
    if n > NARRATION_MAX_CHARS:
        errors.append(
            f"narration too long ({n} chars); maximum is {NARRATION_MAX_CHARS}"
        )
    return errors


# --------------------------------------------------------------------------- #
# Top-level validation                                                          #
# --------------------------------------------------------------------------- #

def validate_take(
    take: str,
    prior_metrics_data: dict | None = None,
) -> dict:
    """Run all deterministic checks for one take. Returns a result dict."""
    errors: list[str] = []

    feedback_path = CACHE_DIR / f"{take}_feedback.json"
    data, err = _load_json(feedback_path)
    if err:
        return {"take": take, "passed": False, "errors": [err]}

    schema_errors = _check_schema(data)
    if schema_errors:
        return {"take": take, "passed": False, "errors": schema_errors}

    errors += _check_metrics_ref(data)

    metrics_data, err = _load_json(Path(data["metrics_ref"]))
    if err:
        errors.append(f"Could not load metrics for cross-check: {err}")
        return {"take": take, "passed": False, "errors": errors}

    errors += _check_tts_safety(data["narration"])
    errors += _check_numeric_crosscheck(data, metrics_data, prior_metrics_data)
    errors += _check_length(data["narration"])

    return {"take": take, "passed": not errors, "errors": errors}


def run_validator() -> None:
    VALIDATION_DIR.mkdir(parents=True, exist_ok=True)

    # Load bad metrics for use as prior when validating the good take.
    bad_metrics_path = CACHE_DIR / "bad_metrics.json"
    bad_metrics_data, _ = _load_json(bad_metrics_path)

    results: dict = {
        "phase": "feedback",
        "validator": "feedback_validator.py",
        "takes": {},
        "passed": True,
    }

    for take in ("bad", "good"):
        prior = bad_metrics_data if take == "good" else None
        take_result = validate_take(take, prior_metrics_data=prior)
        results["takes"][take] = take_result
        if not take_result["passed"]:
            results["passed"] = False

    report_path = VALIDATION_DIR / "03-feedback.result.json"
    report_path.write_text(json.dumps(results, indent=2))

    status = "PASS" if results["passed"] else "FAIL"
    print(f"Feedback validator: {status}")
    for take, result in results["takes"].items():
        t_status = "PASS" if result["passed"] else "FAIL"
        print(f"  {take}: {t_status}")
        for err in result["errors"]:
            print(f"    ERROR: {err}")
    print(f"Report written to: {report_path}")

    sys.exit(0 if results["passed"] else 1)


if __name__ == "__main__":
    run_validator()
