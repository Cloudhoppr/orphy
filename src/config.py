"""Single source of truth for numeric thresholds and fixed assets (PRD §6, §7).

The PRD names these constants in §7 but does not pin their values; per the
Phase 0 checklist the orchestrator defines them here so validators never have
to choose a threshold silently (PRD §5.5). Values are hackathon defaults tuned
for a short a-cappella demo clip and may be re-tuned once the fixtures exist —
change them here only, never inline in a validator.
"""

from __future__ import annotations

from pathlib import Path

# --------------------------------------------------------------------------- #
# Fixed assets / paths
# --------------------------------------------------------------------------- #

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REFERENCE_MIDI = PROJECT_ROOT / "reference" / "song_melody.mid"
CACHE_DIR = PROJECT_ROOT / "cache"
HANDOFFS_DIR = PROJECT_ROOT / "handoffs"
VALIDATION_DIR = PROJECT_ROOT / "validation"

# Canonical capture format (the WAV contract).
SAMPLE_RATE = 16000   # Hz, mono
CHANNELS = 1

# --------------------------------------------------------------------------- #
# Capture validator thresholds (PRD §7 — capture)
# --------------------------------------------------------------------------- #

SONG_MIN_S = 3.0      # reject clips shorter than this (truncated/empty take)
SONG_MAX_S = 300.0    # reject clips longer than this (wrong file ingested)
SILENCE_FLOOR = 0.01  # min full-clip RMS on [-1, 1] audio (catches dead mic)
CLIP_MAX = 0.01       # max fraction of samples at full scale (catches hot gain)

# --------------------------------------------------------------------------- #
# Analysis validator thresholds (PRD §7 — analysis)
# --------------------------------------------------------------------------- #

F0_MIN_HZ = 80.0      # voiced F0 floor (PRD invariant)
F0_MAX_HZ = 1100.0    # voiced F0 ceiling (PRD invariant)

# Allowed shortfall between notes_matched and notes_total. 0 = every reference
# note must be matched; raise if DTW legitimately drops phrase boundaries.
MATCH_TOLERANCE = 0

# Golden-regression bounds guarding the bad -> good demo beat.
BAD_CENTS_MIN = 40.0      # bad take must be at least this far off (mean abs cents)
GOOD_CENTS_MAX = 25.0     # good take must be at least this in tune (mean abs cents)
IMPROVEMENT_MARGIN = 15.0  # good must beat bad by at least this many cents

# --------------------------------------------------------------------------- #
# Feedback validator thresholds (PRD §7 — feedback)
# --------------------------------------------------------------------------- #

NARRATION_MIN_CHARS = 80     # below this the coaching is too thin to be useful
NARRATION_MAX_CHARS = 1200   # above this it is too long to read aloud cleanly

# Markdown / formatting tokens that must NOT appear in TTS-safe narration.
MARKDOWN_TOKENS = ("*", "_", "#", "`", " - ")

# Phrases that imply visual layout and break spoken delivery.
FORBIDDEN_PHRASES = ("see above", "see below")

# Rounding precision used by the numeric cross-check (no hallucinated figures).
NUMERIC_CROSSCHECK_DECIMALS = 0
