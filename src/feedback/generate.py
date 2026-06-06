"""Phase 3 generation: build FeedbackResult from cached metrics via Gemini (PRD §6 Phase 3)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from src.contracts import FeedbackResult, Metrics
from src.config import CACHE_DIR

load_dotenv()

_GEMINI_MODEL = "gemini-2.5-flash"
_TIMEOUT_S = 30


def _feedback_path(take: str) -> Path:
    return CACHE_DIR / f"{take}_feedback.json"


def _metrics_path(take: str) -> Path:
    return CACHE_DIR / f"{take}_metrics.json"


def _build_prompt(metrics: Metrics, prior_metrics: Optional[Metrics]) -> str:
    s = metrics["summary"]
    take = metrics["take"]

    voiced = [n for n in metrics["notes"] if n["voiced"] and n["cents_error"] is not None]
    worst = sorted(voiced, key=lambda n: abs(n["cents_error"]), reverse=True)[:3]

    lines = [
        "You are a vocal coach delivering post-take feedback.",
        "",
        f"Measurements for the {take} take:",
        f"  Mean pitch error: {s['mean_abs_cents']:.0f} cents",
        f"  Mean timing offset: {s['mean_abs_onset_ms']:.0f} ms",
        f"  Notes matched: {s['notes_matched']} of {s['notes_total']}",
    ]

    if worst:
        lines.append("  Worst pitch errors (positive = sharp, negative = flat, in cents):")
        for n in worst:
            lines.append(f"    Note {n['ref_index']}: {n['cents_error']:.0f} cents")

    if prior_metrics:
        ps = prior_metrics["summary"]
        improvement = ps["mean_abs_cents"] - s["mean_abs_cents"]
        lines += [
            "",
            "Compared to the previous (bad) take:",
            f"  Previous mean pitch error: {ps['mean_abs_cents']:.0f} cents",
            f"  Current mean pitch error: {s['mean_abs_cents']:.0f} cents",
            f"  Improvement: {improvement:.0f} cents",
        ]

    lines += [
        "",
        "Write coaching feedback following ALL of these rules:",
        "1. summary: one concise sentence summarising this performance.",
        "2. narration: 2 to 4 spoken sentences. Must be TTS-safe:",
        "   - No asterisks, underscores, hash symbols, backticks, or ' - ' (space dash space).",
        "   - No phrases 'see above' or 'see below'.",
        "   - Any number you cite must appear (rounded to whole number) in the measurements above.",
        "3. fixes: exactly 3 short, specific, actionable coaching tips as a JSON array of strings.",
        "   - Same TTS-safe number rule applies to fixes.",
        "",
        "Respond with ONLY valid JSON, no markdown fences:",
        '{"summary": "...", "narration": "...", "fixes": ["...", "...", "..."]}',
    ]
    return "\n".join(lines)


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.rstrip())
    return text.strip()


def _save_to_cache(result: FeedbackResult, take: str) -> None:
    p = _feedback_path(take)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({
        "summary": result.summary,
        "narration": result.narration,
        "fixes": result.fixes,
        "metrics_ref": result.metrics_ref,
    }, indent=2))


def _load_cached(take: str) -> FeedbackResult:
    p = _feedback_path(take)
    if not p.exists():
        raise FileNotFoundError(f"No cached feedback at {p}")
    data = json.loads(p.read_text())
    return FeedbackResult(**data)


def generate_feedback(
    metrics: Metrics,
    prior_metrics: Optional[Metrics] = None,
) -> FeedbackResult:
    """Generate FeedbackResult from metrics via Gemini; fall back to cache on any error.

    For the good take, pass prior_metrics=bad_metrics so the narration can
    reference the improvement (PRD §6 Phase 3).
    """
    from google import genai  # imported here to keep module importable without the lib
    from google.genai import types as genai_types

    take = metrics["take"]
    metrics_ref = str(_metrics_path(take))

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set. Add it to your .env file.")

    gen_error: Optional[Exception] = None
    try:
        client = genai.Client(api_key=api_key)
        prompt = _build_prompt(metrics, prior_metrics)

        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        data = json.loads(_strip_fences(response.text))
        result = FeedbackResult(
            summary=data["summary"],
            narration=data["narration"],
            fixes=data["fixes"],
            metrics_ref=metrics_ref,
        )
        _save_to_cache(result, take)
        return result

    except Exception as exc:
        gen_error = exc

    # Fallback: return cached result if one exists
    try:
        return _load_cached(take)
    except FileNotFoundError:
        raise gen_error  # no cache to fall back to; surface the original error
