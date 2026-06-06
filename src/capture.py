"""Phase 1 — Capture (PRD §6).

Ingest a take into the canonical capture format and emit a ``CaptureResult``.

The capture contract (``src.contracts.CaptureResult``) is the only thing
downstream phases see: a 16 kHz mono PCM WAV at ``cache/<take>_take.wav`` plus
its metadata. This module provides two ways to produce that:

  * ``ingest_file`` — the demo path: read an arbitrary source recording (any
    format libsndfile can decode), downmix to mono, resample to 16 kHz, write
    the WAV, and return the populated ``CaptureResult``.
  * ``capture_live``  — a thin live-mic path behind the *same* contract, using
    ``sounddevice``. Secondary per the PRD; the demo uses fixtures.

Design notes
------------
* DSP here is deliberately dependency-light: no librosa/scipy. Downmix is a
  plain channel average; resampling is deterministic linear interpolation.
  This keeps Phase 1 installable on bleeding-edge Python (3.14) where the
  heavier DSP stack may have no wheels — that stack is Phase 2's concern.
* Format constants (``SAMPLE_RATE``, ``CHANNELS``) and the cache location come
  from ``src.config``; nothing is hardcoded here.
* The output is sized to satisfy the capture validator (PRD §7): decodes,
  16 kHz / mono, duration in range, RMS above the silence floor, clipping
  below the cap. Capture does not *invent* signal — a silent or clipped source
  will (correctly) fail the validator rather than be "fixed" here.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf

from .config import CACHE_DIR, CHANNELS, SAMPLE_RATE
from .contracts import CaptureResult

# Allowed take labels (PRD: ``<take>`` is "bad" or "good"). Kept local rather
# than imported as a Literal so the CLI can validate user input cleanly.
VALID_TAKES = ("bad", "good")


# --------------------------------------------------------------------------- #
# Core DSP helpers (deterministic, dependency-light)
# --------------------------------------------------------------------------- #

def _to_mono(samples: np.ndarray) -> np.ndarray:
    """Downmix to a single channel by averaging channels.

    Accepts soundfile's ``(frames,)`` or ``(frames, channels)`` float array
    and returns a 1-D float array. Averaging (not channel-pick) avoids losing a
    voice panned to one side.
    """
    samples = np.asarray(samples, dtype=np.float64)
    if samples.ndim == 1:
        return samples
    if samples.ndim == 2:
        return samples.mean(axis=1)
    raise ValueError(f"unexpected audio array shape {samples.shape!r}")


def _resample_linear(samples: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Resample a mono signal from ``src_rate`` to ``dst_rate``.

    Deterministic linear interpolation onto an evenly spaced target grid. This
    is intentionally simple (not a polyphase/anti-aliased resampler): Phase 1
    only needs a clean 16 kHz mono WAV for the analyzer, and high-quality
    resampling belongs with the Phase 2 DSP stack if ever needed. Identical
    input always yields identical output.
    """
    if src_rate == dst_rate:
        return samples.astype(np.float64, copy=False)
    if samples.size == 0:
        return samples.astype(np.float64, copy=False)

    duration_s = samples.size / float(src_rate)
    n_dst = int(round(duration_s * dst_rate))
    if n_dst <= 0:
        return np.zeros(0, dtype=np.float64)

    # Sample positions (in source-sample units) for each output sample.
    src_positions = np.arange(samples.size, dtype=np.float64)
    dst_positions = np.arange(n_dst, dtype=np.float64) * (src_rate / float(dst_rate))
    return np.interp(dst_positions, src_positions, samples).astype(np.float64)


def _normalize_to_canonical(samples: np.ndarray, src_rate: int) -> np.ndarray:
    """Downmix to mono and resample to the canonical ``SAMPLE_RATE``."""
    mono = _to_mono(samples)
    return _resample_linear(mono, src_rate, SAMPLE_RATE)


def _write_wav(samples: np.ndarray, path: Path) -> None:
    """Write a mono float signal as 16 kHz 16-bit PCM WAV.

    Values are clamped to [-1, 1] before the PCM_16 conversion so an
    out-of-range source cannot wrap; genuine clipping in the *source* still
    shows up in the validator's clip-ratio check on the written file.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    clamped = np.clip(samples, -1.0, 1.0).astype(np.float64)
    sf.write(str(path), clamped, SAMPLE_RATE, subtype="PCM_16", format="WAV")


def _take_path(take: str) -> Path:
    """Deterministic cache path for a take: ``cache/<take>_take.wav`` (PRD §3.4)."""
    return CACHE_DIR / f"{take}_take.wav"


def _capture_result(path: Path) -> CaptureResult:
    """Build a ``CaptureResult`` by reading back the written WAV.

    Reading the file back (rather than trusting in-memory values) means the
    returned metadata reflects exactly what downstream phases will decode.
    """
    info = sf.info(str(path))
    return CaptureResult(
        path=str(path),
        sample_rate=info.samplerate,
        channels=info.channels,
        duration_s=float(info.frames) / float(info.samplerate),
    )


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def ingest_file(input_path: str | Path, take: str) -> CaptureResult:
    """Ingest a source recording into ``cache/<take>_take.wav`` (16 kHz mono).

    Parameters
    ----------
    input_path:
        Path to any audio file libsndfile can decode (WAV, FLAC, OGG, AIFF,
        ...). MP3 support depends on the bundled libsndfile build.
    take:
        ``"bad"`` or ``"good"``.

    Returns
    -------
    CaptureResult
        Populated from the freshly written WAV (``sample_rate == 16000``,
        ``channels == 1``).
    """
    if take not in VALID_TAKES:
        raise ValueError(f"take must be one of {VALID_TAKES}, got {take!r}")

    input_path = Path(input_path)
    if not input_path.is_file():
        raise FileNotFoundError(f"source audio not found: {input_path}")

    samples, src_rate = sf.read(str(input_path), dtype="float64", always_2d=False)
    canonical = _normalize_to_canonical(samples, src_rate)

    out_path = _take_path(take)
    _write_wav(canonical, out_path)
    return _capture_result(out_path)


def capture_live(take: str, duration_s: float, device: Optional[int] = None) -> CaptureResult:
    """Record from the default (or chosen) input device into the same contract.

    Thin live-mic path (PRD §6: secondary; the demo uses fixtures). Records
    ``duration_s`` seconds of mono audio at ``SAMPLE_RATE`` via ``sounddevice``
    and writes ``cache/<take>_take.wav``, then returns a ``CaptureResult``.

    ``sounddevice`` (and the PortAudio backend) is imported lazily so the file
    ingest path and this module stay importable on machines with no audio
    backend. Per PRD §5.4, an absent mic / PortAudio is a stop-and-ask, surfaced
    here as a clear ``RuntimeError`` rather than a fabricated recording.
    """
    if take not in VALID_TAKES:
        raise ValueError(f"take must be one of {VALID_TAKES}, got {take!r}")
    if duration_s <= 0:
        raise ValueError(f"duration_s must be positive, got {duration_s}")

    try:
        import sounddevice as sd
    except OSError as exc:  # PortAudio shared lib missing
        raise RuntimeError(
            "live-mic capture unavailable: PortAudio backend not found. "
            "Use ingest_file with a recorded fixture instead."
        ) from exc

    n_frames = int(round(duration_s * SAMPLE_RATE))
    try:
        recording = sd.rec(
            n_frames,
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float64",
            device=device,
        )
        sd.wait()
    except Exception as exc:  # no input device, busy device, etc.
        raise RuntimeError(
            f"live-mic capture failed ({exc}). "
            "Check that an input device is available, or use ingest_file."
        ) from exc

    mono = _to_mono(recording)  # already SAMPLE_RATE; just flatten channel dim
    out_path = _take_path(take)
    _write_wav(mono, out_path)
    return _capture_result(out_path)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m src.capture",
        description="Phase 1 capture: ingest a take to cache/<take>_take.wav (16 kHz mono).",
    )
    parser.add_argument(
        "--take",
        required=True,
        choices=VALID_TAKES,
        help="which take this is",
    )
    parser.add_argument(
        "--input",
        help="path to a source audio file to ingest (file-ingest path)",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="record from the microphone instead of ingesting a file",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=30.0,
        help="recording length in seconds for --live (default: 30)",
    )
    parser.add_argument(
        "--device",
        type=int,
        default=None,
        help="optional sounddevice input device index for --live",
    )
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.live and args.input:
        parser.error("use either --input or --live, not both")
    if not args.live and not args.input:
        parser.error("provide --input <path> (or --live to record from the mic)")

    if args.live:
        result = capture_live(args.take, duration_s=args.duration, device=args.device)
    else:
        result = ingest_file(args.input, args.take)

    print(
        f"captured take={args.take!r} -> {result.path} "
        f"(sample_rate={result.sample_rate}, channels={result.channels}, "
        f"duration_s={result.duration_s:.3f})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
