"""Phase 2 — Analysis (PRD §3.1, §6).

DSP *measures*; the LLM *interprets* (PRD §2). This module turns a captured
take WAV plus the seeded reference melody into the deterministic per-note
``Metrics`` document the feedback phase consumes. It does **no** language
generation and makes **no** model calls.

Pipeline
--------
1. Load the take WAV at the canonical ``SAMPLE_RATE`` (16 kHz mono).
2. Extract a per-frame fundamental contour with ``librosa.pyin`` constrained to
   the vocal range ``[F0_MIN_HZ, F0_MAX_HZ]`` -> (f0_hz, voiced_flag) per frame.
3. Detect note onsets with ``librosa.onset`` (used for onset-offset metrics).
4. Build a reference pitch contour on the *same* frame grid from the canonical
   ``Reference`` note list, in semitone (MIDI) units.
5. Align the sung contour to the reference with ``librosa.sequence.dtw``. The
   cost is computed in semitone space (octave-aware, robust to gross pitch
   errors) so the bad take's large deviations don't derail the path. A
   Sakoe-Chiba band (``global_constraints``) caps drift, the PRD's named risk
   for the bad take.
6. For each reference note, gather the sung frames the path maps onto its time
   span and compute ``sung_hz`` (median voiced f0), ``cents_error``
   (+sharp / -flat), ``onset_offset_ms``, and ``voiced``.
7. Aggregate the ``summary`` block and serialize to
   ``cache/<take>_metrics.json`` (conforming exactly to the ``Metrics`` schema).

Monotonicity guarantee
----------------------
``librosa.sequence.dtw`` returns a warping path that is monotonic
non-decreasing in both axes by construction (its step set only moves forward).
We reverse librosa's end->start path to start->end order; that reversal
preserves monotonicity. We then derive, for each reference frame, the *median*
aligned sung frame, which is likewise non-decreasing. The validator's
"DTW path monotonic non-decreasing" invariant therefore holds; we also assert
it internally before returning.

Public API
----------
    analyze(capture, take, reference, *, write=True) -> Metrics
    save_metrics(metrics, take) -> Path
    load_audio(path) -> np.ndarray

``capture`` may be a ``CaptureResult`` or a path string/Path to the take WAV.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from src.config import (
    CACHE_DIR,
    F0_MAX_HZ,
    F0_MIN_HZ,
    SAMPLE_RATE,
)
from src.reference import midi_to_hz

if TYPE_CHECKING:
    from src.contracts import CaptureResult, Metrics, NoteMetric, Reference

# --------------------------------------------------------------------------- #
# Frame analysis parameters. hop_length sets the temporal resolution of the
# pitch contour and the DTW grid; ~16 ms at 16 kHz is fine for vocal onsets.
# --------------------------------------------------------------------------- #

_HOP_LENGTH = 256          # samples -> 16 ms frames at 16 kHz
_FRAME_LENGTH = 1024       # pyin analysis window
# Sakoe-Chiba band radius (fraction of the longer sequence) passed to dtw's
# global_constraints. Caps how far the path may wander off the diagonal, which
# is what tames the bad take's drift without hand-segmenting phrases.
_DTW_BAND_RAD = 0.25
# Voiced-probability threshold for treating a pyin frame as voiced when we
# collapse a note's frames. pyin already returns a boolean voiced flag; this is
# only used as a secondary gate on the median.
_MIN_VOICED_FRAC = 0.20


class AnalysisError(Exception):
    """Raised on unrecoverable analysis preconditions (missing/empty audio)."""


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _capture_path(capture: "CaptureResult | str | Path") -> Path:
    """Resolve the take WAV path from a CaptureResult or a path-like."""
    path_attr = getattr(capture, "path", None)
    path = Path(path_attr) if path_attr is not None else Path(str(capture))
    if not path.exists():
        raise AnalysisError(
            f"Take WAV not found at {path}. Capture (Phase 1) must produce it "
            "before analysis can run."
        )
    return path


def load_audio(path: "str | Path") -> np.ndarray:
    """Load a take WAV as mono float32 at the canonical SAMPLE_RATE."""
    import librosa

    y, _ = librosa.load(str(path), sr=SAMPLE_RATE, mono=True)
    y = np.asarray(y, dtype=np.float64)
    if y.size == 0 or not np.any(np.isfinite(y)):
        raise AnalysisError(f"Take WAV at {path} decoded to empty/invalid audio.")
    return y


def _hz_to_semitone(hz: np.ndarray) -> np.ndarray:
    """Hz -> continuous MIDI semitone units (69 + 12*log2(hz/440)).

    Non-finite / non-positive entries map to NaN (caller masks them out).
    """
    hz = np.asarray(hz, dtype=np.float64)
    out = np.full(hz.shape, np.nan, dtype=np.float64)
    pos = np.isfinite(hz) & (hz > 0)
    out[pos] = 69.0 + 12.0 * np.log2(hz[pos] / 440.0)
    return out


def _reference_semitone_contour(
    reference: "Reference", n_frames: int, frame_times: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Sample the reference melody onto the frame grid.

    Returns ``(ref_semitones, ref_note_index)`` each length ``n_frames``.
    Frames in a rest (no note sounding) carry the nearest preceding note's
    pitch (held) so the DTW contour stays continuous; ``ref_note_index`` is -1
    in true leading silence before the first note.
    """
    ref_semi = np.full(n_frames, np.nan, dtype=np.float64)
    ref_idx = np.full(n_frames, -1, dtype=np.int64)
    for i, (pitch, start, dur) in enumerate(reference):
        end = start + dur
        lo = int(np.searchsorted(frame_times, start, side="left"))
        hi = int(np.searchsorted(frame_times, end, side="left"))
        lo = max(0, min(lo, n_frames))
        hi = max(0, min(hi, n_frames))
        if hi <= lo and lo < n_frames:
            hi = lo + 1  # guarantee very short notes get at least one frame
            hi = min(hi, n_frames)
        ref_semi[lo:hi] = float(pitch)
        ref_idx[lo:hi] = i
    # Forward-fill held pitch across rests so the contour is gap-free.
    last = np.nan
    last_i = -1
    for f in range(n_frames):
        if np.isnan(ref_semi[f]):
            ref_semi[f] = last
            ref_idx[f] = last_i
        else:
            last = ref_semi[f]
            last_i = ref_idx[f]
    # Leading frames before the first note remain NaN -> set to first pitch.
    if np.isnan(ref_semi).any():
        first_valid = next((v for v in ref_semi if not np.isnan(v)), 0.0)
        ref_semi = np.where(np.isnan(ref_semi), first_valid, ref_semi)
    return ref_semi, ref_idx


def _aligned_sung_frames(reference, frame_times, wp, n_sung_frames):
    """Map each reference note -> the sorted list of sung frame indices the DTW
    path assigns to it.

    ``wp`` is the start->end warping path of shape (K, 2) with columns
    (ref_frame, sung_frame), monotonic non-decreasing. We bucket sung frames by
    the reference note active at their paired reference frame.
    """
    # Reference-frame -> note index lookup, recomputed from times for accuracy.
    n_ref_frames = len(frame_times)
    _, ref_idx = _reference_semitone_contour(reference, n_ref_frames, frame_times)

    buckets: dict[int, list[int]] = {i: [] for i in range(len(reference))}
    for ref_f, sung_f in wp:
        ref_f = int(ref_f)
        sung_f = int(sung_f)
        if 0 <= ref_f < n_ref_frames and 0 <= sung_f < n_sung_frames:
            note_i = int(ref_idx[ref_f])
            if note_i >= 0:
                buckets[note_i].append(sung_f)
    for i in buckets:
        buckets[i] = sorted(set(buckets[i]))
    return buckets


def _assert_monotonic(wp: np.ndarray) -> None:
    """Validate the (start->end) warping path is monotonic non-decreasing in
    both columns — the validator invariant — before we trust any metric."""
    if wp.ndim != 2 or wp.shape[1] != 2 or len(wp) == 0:
        raise AnalysisError(f"DTW path has unexpected shape {wp.shape}.")
    d = np.diff(wp, axis=0)
    if np.any(d < 0):
        raise AnalysisError(
            "DTW warping path is not monotonic non-decreasing — alignment is "
            "invalid; refusing to emit metrics."
        )


def _clean_float(x: float | None) -> float | None:
    """Coerce a value to a JSON-safe float or None; reject NaN/inf as None."""
    if x is None:
        return None
    xf = float(x)
    if not np.isfinite(xf):
        return None
    return xf


# --------------------------------------------------------------------------- #
# Main entry point
# --------------------------------------------------------------------------- #

def analyze(
    capture: "CaptureResult | str | Path",
    take: str,
    reference: "Reference",
    *,
    write: bool = True,
) -> "Metrics":
    """Analyze one take against the reference and return the ``Metrics`` doc.

    Parameters
    ----------
    capture
        A ``CaptureResult`` or a path to the take WAV (``cache/<take>_take.wav``).
    take
        ``"bad"`` or ``"good"`` (used as the metrics ``take`` field and output
        filename). Any string is accepted for smoke-testing.
    reference
        Canonical reference note list from ``reference.load_reference``.
    write
        If True (default), serialize to ``cache/<take>_metrics.json``.

    Returns
    -------
    Metrics
        Conforms exactly to the ``Metrics`` TypedDict / metrics JSON schema.
    """
    import librosa

    if not reference:
        raise AnalysisError("Empty reference note list; nothing to align against.")

    path = _capture_path(capture)
    y = load_audio(path)

    # --- 2. Pitch contour via pyin, constrained to the vocal range. --------- #
    fmin = float(F0_MIN_HZ)
    fmax = float(F0_MAX_HZ)
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=fmin,
        fmax=fmax,
        sr=SAMPLE_RATE,
        frame_length=_FRAME_LENGTH,
        hop_length=_HOP_LENGTH,
        center=True,
    )
    f0 = np.asarray(f0, dtype=np.float64)            # NaN where unvoiced
    voiced_flag = np.asarray(voiced_flag, dtype=bool)
    n_frames = f0.shape[0]
    frame_times = librosa.frames_to_time(
        np.arange(n_frames), sr=SAMPLE_RATE, hop_length=_HOP_LENGTH
    )

    # Clamp any voiced f0 that strayed outside the configured range (defensive;
    # pyin is already constrained). Out-of-range -> treat as unvoiced.
    out_of_range = voiced_flag & ((f0 < F0_MIN_HZ) | (f0 > F0_MAX_HZ) | ~np.isfinite(f0))
    voiced_flag = voiced_flag & ~out_of_range

    # --- 3. Onsets (seconds). ---------------------------------------------- #
    onset_times = librosa.onset.onset_detect(
        y=y, sr=SAMPLE_RATE, hop_length=_HOP_LENGTH, units="time", backtrack=True
    )
    onset_times = np.asarray(onset_times, dtype=np.float64)

    # --- 4. Reference + sung contours in semitone space for DTW. ----------- #
    ref_semi, _ = _reference_semitone_contour(reference, n_frames, frame_times)
    sung_semi = _hz_to_semitone(f0)
    # For DTW cost, fill unvoiced sung frames by carrying the last voiced pitch
    # (so silence doesn't create huge artificial cost spikes). If a frame has no
    # prior voiced value, fall back to the reference pitch at that frame.
    sung_filled = sung_semi.copy()
    last = np.nan
    for f in range(n_frames):
        if np.isnan(sung_filled[f]):
            sung_filled[f] = last if not np.isnan(last) else ref_semi[f]
        else:
            last = sung_filled[f]
    if np.isnan(sung_filled).any():
        sung_filled = np.where(np.isnan(sung_filled), ref_semi, sung_filled)

    # --- 5. DTW alignment (1xN feature rows; cost = |semitone diff|). ------- #
    X = ref_semi.reshape(1, -1)    # reference along axis 0 of the path
    Y = sung_filled.reshape(1, -1)  # sung along axis 1
    _, wp = librosa.sequence.dtw(
        X=X,
        Y=Y,
        metric="euclidean",
        global_constraints=True,
        band_rad=_DTW_BAND_RAD,
        backtrack=True,
    )
    # librosa returns the path end->start; reverse to start->end (monotonic).
    wp = np.asarray(wp, dtype=np.int64)[::-1]
    _assert_monotonic(wp)

    buckets = _aligned_sung_frames(reference, frame_times, wp, n_frames)

    # --- 6. Per-note metrics. ---------------------------------------------- #
    notes: list[NoteMetric] = []
    abs_cents: list[float] = []
    abs_onset: list[float] = []
    notes_matched = 0

    for i, (pitch, start, dur) in enumerate(reference):
        ref_hz = midi_to_hz(pitch)
        frames = buckets.get(i, [])
        voiced_frames = [f for f in frames if voiced_flag[f] and np.isfinite(f0[f])]

        sung_hz: float | None = None
        cents_error: float | None = None
        onset_offset_ms: float | None = None
        voiced = False

        if frames and voiced_frames and (len(voiced_frames) / max(len(frames), 1)) >= _MIN_VOICED_FRAC:
            voiced = True
            notes_matched += 1
            sung_hz = float(np.median(f0[voiced_frames]))
            cents_error = float(1200.0 * np.log2(sung_hz / ref_hz))
            # Onset offset: first aligned sung frame time minus note start.
            sung_onset_t = float(frame_times[min(voiced_frames)])
            # Prefer a detected onset near the aligned start if available.
            if onset_times.size:
                near = onset_times[np.argmin(np.abs(onset_times - sung_onset_t))]
                if abs(near - sung_onset_t) <= 0.12:  # within ~2 frames
                    sung_onset_t = float(near)
            onset_offset_ms = float((sung_onset_t - start) * 1000.0)
        elif frames:
            # The note was reached by the path but no usable voiced pitch.
            notes_matched += 1
            voiced = False

        sung_hz = _clean_float(sung_hz)
        cents_error = _clean_float(cents_error)
        onset_offset_ms = _clean_float(onset_offset_ms)

        if cents_error is not None:
            abs_cents.append(abs(cents_error))
        if onset_offset_ms is not None:
            abs_onset.append(abs(onset_offset_ms))

        notes.append(
            {
                "ref_index": i,
                "ref_pitch_midi": int(pitch),
                "sung_hz": sung_hz,
                "cents_error": cents_error,
                "onset_offset_ms": onset_offset_ms,
                "voiced": bool(voiced),
            }
        )

    summary = {
        "mean_abs_cents": float(np.mean(abs_cents)) if abs_cents else 0.0,
        "mean_abs_onset_ms": float(np.mean(abs_onset)) if abs_onset else 0.0,
        "notes_matched": int(notes_matched),
        "notes_total": int(len(reference)),
    }
    # Final NaN/inf guard on the summary.
    for k, v in summary.items():
        if isinstance(v, float) and not np.isfinite(v):
            summary[k] = 0.0

    metrics: "Metrics" = {"take": take, "notes": notes, "summary": summary}  # type: ignore[typeddict-item]

    if write:
        save_metrics(metrics, take)

    return metrics


def save_metrics(metrics: "Metrics", take: str) -> Path:
    """Serialize metrics to ``cache/<take>_metrics.json`` and return the path."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    out = CACHE_DIR / f"{take}_metrics.json"
    out.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return out


# --------------------------------------------------------------------------- #
# CLI: analyze a single take once the assets exist.
#   .venv/bin/python -m src.analysis --take bad
# --------------------------------------------------------------------------- #

def _main(argv: list[str] | None = None) -> int:
    import argparse

    from src.config import REFERENCE_MIDI
    from src.reference import load_reference

    parser = argparse.ArgumentParser(description="Phase 2 analysis: WAV -> metrics JSON.")
    parser.add_argument("--take", required=True, choices=["bad", "good"])
    parser.add_argument(
        "--wav",
        default=None,
        help="Take WAV path (default: cache/<take>_take.wav).",
    )
    parser.add_argument(
        "--reference",
        default=str(REFERENCE_MIDI),
        help="Reference MIDI path (default: config.REFERENCE_MIDI).",
    )
    args = parser.parse_args(argv)

    wav = args.wav or str(CACHE_DIR / f"{args.take}_take.wav")
    reference = load_reference(args.reference)
    metrics = analyze(wav, args.take, reference, write=True)
    out = CACHE_DIR / f"{args.take}_metrics.json"
    s = metrics["summary"]
    print(f"wrote {out}")
    print(
        f"  notes_matched={s['notes_matched']}/{s['notes_total']}  "
        f"mean_abs_cents={s['mean_abs_cents']:.1f}  "
        f"mean_abs_onset_ms={s['mean_abs_onset_ms']:.1f}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
