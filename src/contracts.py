"""Shared data contracts — the seams between phases (PRD §4).

Every subagent codes against these shapes. A phase depends only on the *shape*
of the previous phase's output, never its internals. Defined once, here.

This module is intentionally dependency-free (stdlib + typing only) so it can
be imported from any phase, validator, or the demo runbook without pulling in
DSP or model libraries.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional, Protocol, TypedDict, runtime_checkable

# --------------------------------------------------------------------------- #
# Reference melody (seeded from monophonic vocal MIDI)
# --------------------------------------------------------------------------- #

# A single reference note: (MIDI pitch number, start seconds, duration seconds).
ReferenceNote = tuple[int, float, float]

# The canonical reference note list, sorted by start time.
Reference = list[ReferenceNote]


# --------------------------------------------------------------------------- #
# Capture (Phase 1)
# --------------------------------------------------------------------------- #

@dataclass
class CaptureResult:
    """Result of ingesting/recording one take.

    Invariants enforced by the capture validator (PRD §7):
      - ``sample_rate == 16000``
      - ``channels == 1``
    """

    path: str          # WAV path, e.g. "cache/bad_take.wav"
    sample_rate: int   # must be 16000
    channels: int      # must be 1
    duration_s: float


# --------------------------------------------------------------------------- #
# Analysis (Phase 2) — metrics JSON schema (cache/<take>_metrics.json)
# --------------------------------------------------------------------------- #

Take = Literal["bad", "good"]


class NoteMetric(TypedDict):
    """Per-note measurement. ``cents_error`` is +sharp / -flat vs reference."""

    ref_index: int
    ref_pitch_midi: int
    sung_hz: Optional[float]
    cents_error: Optional[float]
    onset_offset_ms: Optional[float]
    voiced: bool


class MetricsSummary(TypedDict):
    mean_abs_cents: float
    mean_abs_onset_ms: float
    notes_matched: int
    notes_total: int


class Metrics(TypedDict):
    """Full metrics document cached at ``cache/<take>_metrics.json``."""

    take: Take
    notes: list[NoteMetric]
    summary: MetricsSummary


# --------------------------------------------------------------------------- #
# Feedback (Phase 3) — generation output + delivery seam
# --------------------------------------------------------------------------- #

@dataclass
class FeedbackResult:
    """Modality-neutral coaching result, cached at ``cache/<take>_feedback.json``.

    ``narration`` is authored to read naturally aloud (TTS-safe): no markdown,
    no "see above/below". Precise numbers live in the structured metrics, not
    buried in prose.
    """

    summary: str          # one-line takeaway
    narration: str        # full coaching, TTS-safe
    fixes: list[str]      # top actionable items
    metrics_ref: str      # path to the metrics file it was built from


@runtime_checkable
class DeliveryChannel(Protocol):
    """Delivery seam. Configured implementation: ``GeminiLiveChannel(mode=...)``
    where ``mode in {"text", "audio"}``. No upstream code knows the mode."""

    def deliver(self, result: FeedbackResult) -> None: ...
