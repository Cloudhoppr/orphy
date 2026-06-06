# 02 — Analysis handoff

- **Phase:** 2 — Analysis, with reference seeding (PRD §3.1, §3.2, §6)
- **Owning subagent:** analysis-agent
- **Status:** `blocked` (updated by orchestrator — assets arrived; metrics produced but untrustworthy: reference-vs-recording mismatch)
- **Validation result reference:** `validation/02-analysis.result.json` — **not yet produced.** All assets now exist and the pipeline runs end-to-end, but the resulting metrics are untrustworthy (see Open question). The validator was deliberately NOT run on garbage; the broken `cache/*_metrics.json` were removed. No validator pass can exist until the reference and recordings correspond.

## Summary

The full analysis *code path* and its dependency stack are built, import-verified on Python 3.14.5, and smoke-tested end-to-end on throwaway synthetic data. What is blocked is purely **data**: the seeded reference MIDI and the two capture WAVs do not exist yet, so the real `cache/<take>_metrics.json` cannot be produced and the validator cannot run. Per PRD §5.4, no metrics, MIDI, or audio were fabricated.

## Files added / modified

- `src/reference.py` — **added.** Loads the seeded MIDI, isolates the melody, returns the canonical `Reference`. Stop-and-ask gates for polyphony / multi-track / octave errors.
- `src/analysis.py` — **added.** pyin pitch + onset detection + DTW alignment + per-note metrics, conforming to the `Metrics` schema; serializes to `cache/<take>_metrics.json`; CLI entry point.
- `requirements.txt` — **modified.** Added a clearly-commented **Phase 2 — Analysis** section pinning librosa/pretty_midi and their full closure; updated the stale header note that claimed Phase 2 deps were excluded. Phase 1 entries left intact.
- `.venv/` — Phase 2 deps installed into the existing project venv (not committed).
- `handoffs/02-analysis.handoff.md` — this file.

Not modified (per scope): `src/contracts.py`, `src/config.py`, `src/capture.py`. No other phases implemented. No git commit made.

## Public contract produced

Output contract is the metrics JSON / `src.contracts.Metrics` TypedDict (unchanged), cached at the deterministic path `cache/<take>_metrics.json`.

Import / call signatures:

```python
from src.reference import load_reference, midi_to_hz, reference_to_hz, ReferenceError
from src.analysis import analyze, save_metrics, load_audio, AnalysisError
from src.contracts import Metrics, Reference, CaptureResult

# Reference seeding (PRD §3.2). Path defaults to config.REFERENCE_MIDI.
reference: Reference = load_reference(path: str | Path = REFERENCE_MIDI)
#   -> sorted list[(midi_pitch:int, start_s:float, dur_s:float)]
#   raises ReferenceError (actionable) if: file missing; >1 pitched track
#   (not melody-only); polyphonic (overlapping notes); MIDI->Hz octave
#   sanity check fails (MIDI 60 must map to ~261.6 Hz).
hz: float = midi_to_hz(midi_pitch: float)          # MIDI -> Hz (A4=440)
hzs: list[float] = reference_to_hz(reference)

# Analysis (PRD §3.1). `capture` may be a CaptureResult OR a path str/Path.
metrics: Metrics = analyze(
    capture: CaptureResult | str | Path,
    take: str,                 # "bad" | "good" (also the output filename stem)
    reference: Reference,
    *, write: bool = True,     # write=True serializes to cache/<take>_metrics.json
)
#   raises AnalysisError if the take WAV is missing/empty or the reference is empty.
path = save_metrics(metrics, take)                 # -> cache/<take>_metrics.json
```

The returned `Metrics` conforms exactly to the schema: `take`, a `notes` list of `{ref_index, ref_pitch_midi, sung_hz, cents_error, onset_offset_ms, voiced}` (nullable floats use JSON `null`/`None`), and a `summary` of `{mean_abs_cents, mean_abs_onset_ms, notes_matched, notes_total}`.

## Entry points / how to run

Always use the project venv at `./.venv`.

Reproduce dependency setup:
```bash
.venv/bin/python -m pip install -r requirements.txt
```

Produce metrics for a take once the assets exist (CLI):
```bash
.venv/bin/python -m src.analysis --take bad   # reads cache/bad_take.wav + config.REFERENCE_MIDI
.venv/bin/python -m src.analysis --take good  # reads cache/good_take.wav + config.REFERENCE_MIDI
```
The CLI prints the output path and `notes_matched/notes_total`, `mean_abs_cents`, `mean_abs_onset_ms`. Optional flags: `--wav <path>`, `--reference <path>`.

## DTW / alignment approach (PRD §6 — bad take is the riskiest)

- **Features in semitone space, not Hz.** The sung f0 (from `librosa.pyin`, constrained to `[F0_MIN_HZ, F0_MAX_HZ]`) and the reference contour are both converted to continuous MIDI-semitone units before alignment. A logarithmic cost is musically meaningful and far more robust to the bad take's large pitch deviations than raw Hz.
- **Reference sampled onto the pyin frame grid** (16 ms hop), with held pitch forward-filled across rests so the contour is gap-free; unvoiced sung frames carry the last voiced pitch (or the reference pitch) so silence does not inject huge artificial cost.
- **`librosa.sequence.dtw` with a Sakoe-Chiba band** (`global_constraints=True, band_rad=0.25`) caps how far the warp may wander off the diagonal — this is the defensive measure against the bad take's drift, in lieu of manual phrase segmentation.
- **Monotonicity guaranteed and asserted.** librosa's path is monotonic non-decreasing by construction; we reverse its end→start output to start→end (reversal preserves monotonicity) and then `_assert_monotonic` rejects any decrease before metrics are emitted. Per-note sung frames are bucketed by the reference note active at each paired reference frame; `sung_hz` is the median of voiced frames in the bucket.
- **No NaN/inf, range-safe.** Voiced f0 outside `[F0_MIN_HZ, F0_MAX_HZ]` is demoted to unvoiced; all nullable outputs pass a finite-check and become `None` if non-finite; summary means default to `0.0` when empty.

## Smoke-test results (code proven without the real fixtures)

All in a temp dir, deleted afterward; nothing named `bad`/`good` written to `cache/` (used `write=False` and `smoketest_*` stems).

**`reference.py`** — synthetic monophonic C-major MIDI: correct sorted note list and int pitches; `midi_to_hz(60)=261.626`, `midi_to_hz(69)=440.0`; polyphonic MIDI, multi-track MIDI, and missing-file each raised `ReferenceError`; a drum track alongside one melody track was correctly ignored.

**`analysis.py`** — synthetic sine tracking a 4-note reference (C4 E4 G4 C5):
- In-tune take → `mean_abs_cents ≈ 1.3`, `notes_matched 4/4`, per-note cents ≈ −1.3.
- 50-cents-sharp take → `mean_abs_cents ≈ 48.7`, all notes read **+**48.7 (correct sharp sign), measurably worse than the in-tune take.
- Schema conformance, no NaN/inf, voiced f0 within range, JSON round-trip stable, DTW monotonicity assertion held, missing-WAV raised `AnalysisError`.

`cache/` still contains only `.gitkeep`; `reference/` was not modified by the tests.

## Assumptions made

- Frame grid: `hop_length=256` (~16 ms at 16 kHz), `frame_length=1024` for pyin. Tunable in `src/analysis.py`; not a contract.
- DTW band radius `0.25` and the onset-snap window (~120 ms) are defensive defaults, re-tunable once the real bad take is inspected.
- `onset_offset_ms` is the aligned sung-note start minus the reference note start (+late / −early), snapped to a nearby detected onset when one is within ~2 frames.
- A reference note reached by the path but lacking usable voiced pitch is counted as matched (`voiced=False`, null pitch fields) so `notes_matched` reflects alignment coverage; revisit if the validator's `MATCH_TOLERANCE=0` requires stricter semantics on the real takes.
- All numeric thresholds come from `src/config.py`; none are hardcoded.

## Known limitations / deferred TODOs

- Alignment quality on the **real bad take** is unverified — the PRD's named risk. The band constraint and semitone cost are designed for it, but the bad-take F0-vs-reference overlay must be inspected once the WAV exists (PRD §6 checklist item) and `band_rad`/onset window re-tuned if it wanders.
- Octave robustness: cents are computed against the exact reference Hz, so a singer an octave off would report ~±1200 cents rather than being octave-folded — intentional (it is genuinely wrong), but worth a human glance on the real takes.
- `validation/02-analysis.result.json` does not exist yet — blocked on the assets below.
- **Stray asset note:** `reference/new-york-vocals-2.mid` exists but is NOT at the agreed path `reference/song_melody.mid`. It was left untouched (out of scope to rename/move/validate). If it is the intended reference, a human should place/verify it at `reference/song_melody.mid`; `load_reference` will then enforce the monophonic + octave gates on it.

## Open question (BLOCKER — requires human input, PRD §3.2, §5.4)

**Status update (orchestrator):** All three human assets were provided — `reference/song_melody.mid` (the renamed `new-york-vocals-2.mid`; passes `load_reference`'s monophonic + single-track + middle-C octave gates: 26 notes, A3–A4, 220–440 Hz) and both source recordings (`assets/source/{bad,good}_take_source.wav`). Phase 1 capture and Phase 2 analysis both ran end-to-end and produced metrics. **But the metrics are untrustworthy and were removed**, because the recordings do not correspond to the reference melody.

**Empirical finding (diagnosed by orchestrator):**
- Pitch/key offset: the good take's median sung pitch is ~1 octave below the reference (median −1181 cents); the bad take ~1.5 octaves below (~−1721 cents). The reference key does not match the singer's.
- Alignment/correspondence failure: even after octave-folding (octave-invariant comparison), the good take matches only **18% of notes within 50 cents** (27% within 200 cents), mean abs ~287 cents, with onset offsets up to **2.4 s**. The sung notes are not the reference notes — this is a genuine reference-vs-recording mismatch, not a DTW tuning issue, so no DSP change in `analysis.py` can rescue it.

**Decision taken (human):** "The takes/reference may not match." The fix is at the asset level, not the code. Provide EITHER:
- recordings that sing **this exact** `reference/song_melody.mid` melody straight (good = in tune, bad = audibly off-pitch, a cappella/headphone-monitored, 3–300 s), dropped at `assets/source/{bad,good}_take_source.wav`; **or**
- a reference MIDI (monophonic, vocals-only) that matches **what was actually recorded**, placed at `reference/song_melody.mid`.

**Exact commands to finish Phase 2 once corresponding assets are in place** (orchestrator will run these, then inspect bad-take alignment per §6, then spawn the validator subagent to author/run `validators/analysis_validator.py` → `validation/02-analysis.result.json`):
```bash
# Re-ingest only if new source recordings were provided:
.venv/bin/python -m src.capture --take bad  --input assets/source/bad_take_source.wav
.venv/bin/python -m src.capture --take good --input assets/source/good_take_source.wav

# Re-run analysis (regenerates cache/{bad,good}_metrics.json):
.venv/bin/python -m src.analysis --take bad
.venv/bin/python -m src.analysis --take good
```

**Note on code state:** `src/reference.py` and `src/analysis.py` are built, dependency-verified on Python 3.14, and run cleanly — they are NOT the blocker. The capture outputs (`cache/{bad,good}_take.wav`) are valid 16 kHz mono and remain in place.
