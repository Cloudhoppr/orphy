"""Reference seeding — load the canonical melody note list (PRD §3.2, §6).

The reference melody is a pre-made, **monophonic, vocals-only** MIDI of the
song (a static, human-provided asset). This module loads it via ``pretty_midi``,
isolates the single melody track, and returns the canonical ``Reference`` note
list the analyzer consumes:

    Reference = list[ReferenceNote]   # sorted by start time
    ReferenceNote = (midi_pitch: int, start_s: float, dur_s: float)

Per PRD §5.4 this module **stops and asks** rather than guessing: if the MIDI
is polyphonic / not melody-only, or fails the middle-C octave sanity check, it
raises :class:`ReferenceError` with an actionable message. It never silently
picks one of several tracks and never invents data.

Public API
----------
    load_reference(path: str | Path = REFERENCE_MIDI) -> Reference
    midi_to_hz(midi_pitch: float) -> float
    reference_to_hz(reference: Reference) -> list[float]

This module performs **no** runtime audio-to-MIDI transcription (PRD §10).
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from src.config import REFERENCE_MIDI

if TYPE_CHECKING:  # avoid importing the contract types' module cost at runtime is trivial,
    from src.contracts import Reference  # but keep imports explicit for readers.

# --------------------------------------------------------------------------- #
# Tunables for the monophonic / octave sanity gates. These are structural
# correctness checks on the *asset*, not analysis thresholds, so they live here
# rather than in config.py (which holds analysis/validator thresholds).
# --------------------------------------------------------------------------- #

# Two notes are considered "overlapping" (i.e. polyphonic) only if they overlap
# by more than this many seconds. A tiny tolerance absorbs MIDI quantization
# where one note's end coincides with the next note's start.
_OVERLAP_TOLERANCE_S = 1e-3

# Middle C (MIDI 60) in equal temperament at A4=440 Hz.
_MIDDLE_C_HZ = 261.6255653005986
# Allowed deviation (Hz) for the middle-C sanity check. A full octave error
# (130.8 Hz or 523.3 Hz) is ~131 Hz away, so a 1 Hz window is comfortably tight
# while tolerating float noise.
_MIDDLE_C_TOLERANCE_HZ = 1.0


class ReferenceError(Exception):
    """Raised when the seeded reference MIDI is unusable as a monophonic,
    correctly-octaved melody. Carries an actionable message (PRD §5.4)."""


def midi_to_hz(midi_pitch: float) -> float:
    """Convert a MIDI pitch number to frequency in Hz (A4 = 440, MIDI 69).

    Uses ``pretty_midi.note_number_to_hz`` so the conversion matches the
    library the reference is loaded with. MIDI 60 (middle C) -> ~261.6 Hz.
    """
    import pretty_midi

    return float(pretty_midi.note_number_to_hz(midi_pitch))


def reference_to_hz(reference: "Reference") -> list[float]:
    """Map each reference note's MIDI pitch to Hz, preserving order."""
    return [midi_to_hz(pitch) for pitch, _start, _dur in reference]


def _assert_middle_c_octave_ok() -> None:
    """Guard against an octave-broken conversion path (PRD §6).

    This validates the *conversion*, not the asset: MIDI 60 must map to
    ~261.6 Hz. If a future library swap silently shifted octaves this trips
    before any metrics are trusted.
    """
    hz = midi_to_hz(60)
    if abs(hz - _MIDDLE_C_HZ) > _MIDDLE_C_TOLERANCE_HZ:
        raise ReferenceError(
            "MIDI->Hz octave sanity check failed: MIDI 60 (middle C) converted "
            f"to {hz:.3f} Hz, expected ~{_MIDDLE_C_HZ:.1f} Hz "
            f"(tolerance {_MIDDLE_C_TOLERANCE_HZ} Hz). The conversion is "
            "octave-broken; refusing to trust reference pitches."
        )


def _select_melody_instrument(pm) -> "object":
    """Return the single non-drum instrument that holds the melody.

    Stops and asks rather than guessing (PRD §5.4): a monophonic vocals-only
    MIDI must contain exactly one pitched track. Drum tracks are ignored;
    empty (note-less) instruments are ignored. If after that filtering there
    is not exactly one candidate, raise :class:`ReferenceError`.
    """
    candidates = [
        inst for inst in pm.instruments if not inst.is_drum and len(inst.notes) > 0
    ]
    if len(candidates) == 0:
        raise ReferenceError(
            "Reference MIDI contains no pitched, note-bearing track. A "
            "monophonic vocals-only melody track is required (PRD §3.2)."
        )
    if len(candidates) > 1:
        names = ", ".join(
            f"#{i}('{inst.name or 'unnamed'}', {len(inst.notes)} notes)"
            for i, inst in enumerate(candidates)
        )
        raise ReferenceError(
            f"Reference MIDI is not melody-only: found {len(candidates)} pitched "
            f"tracks [{names}]. The seeded asset must be an isolated, monophonic "
            "vocal line (PRD §3.2). Refusing to silently pick a track — re-export "
            "the MIDI with only the vocal melody."
        )
    return candidates[0]


def _assert_monophonic(notes) -> None:
    """Verify the track is monophonic: no two notes sound simultaneously.

    ``notes`` must already be sorted by start time. Overlap beyond
    ``_OVERLAP_TOLERANCE_S`` between any pair indicates chords/harmony, which
    is a stop-and-ask condition.
    """
    prev_end = float("-inf")
    for n in notes:
        if n.start < prev_end - _OVERLAP_TOLERANCE_S:
            raise ReferenceError(
                "Reference MIDI is polyphonic: a note starting at "
                f"{n.start:.3f}s overlaps a still-sounding note ending at "
                f"{prev_end:.3f}s. The melody must be monophonic (one note at a "
                "time) — re-export the vocal line without chords (PRD §3.2)."
            )
        prev_end = max(prev_end, n.end)


def load_reference(path: "str | Path" = REFERENCE_MIDI) -> "Reference":
    """Load the seeded reference MIDI into the canonical ``Reference`` list.

    Returns a list of ``(midi_pitch:int, start_s:float, dur_s:float)`` tuples
    sorted by start time.

    Raises
    ------
    ReferenceError
        If the file is missing, contains no pitched track, contains more than
        one pitched track (not melody-only), is polyphonic, or fails the
        middle-C octave sanity check. The message is actionable (PRD §5.4).
    """
    import pretty_midi

    path = Path(path)
    if not path.exists():
        raise ReferenceError(
            f"Reference MIDI not found at {path}. The seeded monophonic, "
            "vocals-only melody MIDI is a required human-provided asset "
            "(PRD §3.2) and must not be fabricated."
        )

    # Octave-correctness of the conversion itself, before reading any notes.
    _assert_middle_c_octave_ok()

    try:
        pm = pretty_midi.PrettyMIDI(str(path))
    except Exception as exc:  # malformed / unreadable MIDI
        raise ReferenceError(
            f"Failed to parse reference MIDI at {path}: {exc}. Provide a valid "
            "monophonic vocal MIDI (PRD §3.2)."
        ) from exc

    instrument = _select_melody_instrument(pm)

    notes_sorted = sorted(instrument.notes, key=lambda n: (n.start, n.pitch))
    _assert_monophonic(notes_sorted)

    reference: "Reference" = [
        (int(n.pitch), float(n.start), float(n.end - n.start)) for n in notes_sorted
    ]

    if not reference:
        raise ReferenceError(
            f"Reference MIDI at {path} yielded an empty melody after loading."
        )

    return reference
