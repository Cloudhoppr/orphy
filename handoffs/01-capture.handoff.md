# 01 — Capture handoff

- **Phase:** 1 — Capture (PRD §6)
- **Owning subagent:** capture-agent
- **Status:** `blocked`
- **Validation result reference:** `validation/01-capture.result.json` — **not yet produced.** The capture validator cannot run because the two source recordings are absent (see Open question). No validator pass can exist until `cache/bad_take.wav` and `cache/good_take.wav` are produced from real inputs.

## Summary

The full capture *code path* and its dependencies are built and verified. What is blocked is purely **data**: the two human-provided demo recordings do not exist yet, so the two cached take WAVs cannot be produced and the validator cannot be run. Per PRD §5.4, no audio was fabricated to fill the gap.

## Files added / modified

- `src/capture.py` — **added.** Ingest pipeline, live-mic path, CLI.
- `requirements.txt` — **added.** Phase-1 (capture) deps only, clearly commented. Phase-2 deps (librosa/numba/pretty_midi) deliberately excluded.
- `.venv/` — **created** (project virtualenv; not committed, gitignored as usual).
- `handoffs/01-capture.handoff.md` — this file.

Not modified (per scope): `src/contracts.py`, `src/config.py`.

## Public contract produced

Output contract is `src.contracts.CaptureResult` (unchanged). Capture produces a 16 kHz mono 16-bit PCM WAV at the deterministic path `cache/<take>_take.wav` and returns a populated `CaptureResult(path, sample_rate=16000, channels=1, duration_s)`.

Import / call signatures:

```python
from src.capture import ingest_file, capture_live
from src.contracts import CaptureResult

# Demo path — ingest an arbitrary source recording (any libsndfile format).
result: CaptureResult = ingest_file(input_path: str | Path, take: str)  # take in {"bad","good"}

# Secondary live-mic path, same contract (raises RuntimeError if no mic/PortAudio).
result: CaptureResult = capture_live(take: str, duration_s: float, device: int | None = None)
```

Both write `cache/<take>_take.wav` and return a `CaptureResult` read back from the written file (metadata reflects exactly what downstream decodes).

Internal helpers (stable but not the public seam): `_to_mono`, `_resample_linear` (deterministic linear interp), `_normalize_to_canonical`, `_write_wav`, `_capture_result`.

## Entry points / how to run

Always use the project venv at `./.venv`.

Setup (already done; reproduce with):
```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Ingest a take (the exact demo invocation, once the source files exist):
```bash
.venv/bin/python -m src.capture --take bad  --input /absolute/path/to/bad_source.<wav|flac|aiff|ogg>
.venv/bin/python -m src.capture --take good --input /absolute/path/to/good_source.<wav|flac|aiff|ogg>
```

Live-mic (non-demo, optional):
```bash
.venv/bin/python -m src.capture --take bad --live --duration 30
```

The CLI prints the resulting path, sample_rate, channels, and duration_s.

## Assumptions made

- `<take>` is `"bad"` or `"good"`; output path is `cache/<take>_take.wav` (PRD §3.4).
- Downmix = unweighted channel average; resample = deterministic linear interpolation onto a 16 kHz grid. Intentionally dependency-light (numpy only) — high-quality/anti-aliased resampling is Phase 2's stack if ever needed. Identical input yields byte-identical output (verified).
- Source values are clamped to [-1, 1] before PCM_16 conversion to prevent wrap; this does NOT mask genuine source clipping (the validator's clip-ratio check still sees it on the written file).
- Capture measures, it does not repair: a silent or hot source is allowed through so the validator can (correctly) fail it, rather than capture inventing/normalizing signal.
- `sounddevice` is imported lazily inside `capture_live`, so the module and the file-ingest path import on machines with no audio backend.

## Dependency situation on Python 3.14

- System Python is **3.14.5** at `/usr/local/bin/python3`. Project venv created at `./.venv`.
- Installed and import-verified (cp314 wheels available for all):
  - `numpy==2.4.6`, `soundfile==0.14.0` (bundled libsndfile **1.2.2**), `sounddevice==0.5.5`
  - transitive: `cffi==2.0.0`, `pycparser==3.0`, `typing_extensions==4.15.0`
- No capture dependency was blocked on 3.14 — all imported cleanly. **librosa/numba were intentionally NOT installed** (Phase 2 concern; possible 3.14 wheel gaps).

## Smoke test result (code proven without the demo fixtures)

Generated a throwaway 5 s **stereo 44.1 kHz** 220 Hz sine in a temp dir, ran it through the real pipeline helpers (downmix + resample + WAV write + `CaptureResult` read-back), then deleted the temp dir. Confirmed:

- output `sample_rate == 16000`, `channels == 1`, `duration_s == 5.000`
- RMS `0.1909 > SILENCE_FLOOR (0.01)`; clip ratio `0.00000 < CLIP_MAX (0.01)`; duration within `[3.0, 300.0]`
- byte-identical output on a second run (deterministic)

No synthetic file was written to `cache/`; nothing named `bad_take`/`good_take` was created. `cache/` contains only `.gitkeep`.

## Known limitations / deferred TODOs

- Linear resampler has no anti-aliasing — adequate for the analyzer's 16 kHz vocal input; revisit only if Phase 2 reports aliasing artifacts.
- `capture_live` is untested against real hardware in this environment (no PortAudio device exercised); it raises a clear `RuntimeError` if the backend/device is missing. The demo uses fixtures, so this is acceptable.
- MP3 ingest depends on the bundled libsndfile build; WAV/FLAC/AIFF/OGG are safe.
- `validation/01-capture.result.json` does not exist yet — blocked on the source recordings below.

## Open question (BLOCKER — requires human input, PRD §5.4)

**The two source recordings (the bad take and the good take) are needed at agreed input paths to produce `cache/bad_take.wav` and `cache/good_take.wav` and to run the capture validator.** They do not exist anywhere in the repo and must not be fabricated.

Requirements for the source files (so they pass the validator after ingest):
- Same song for both takes; the **bad** take audibly off-pitch, the **good** take in tune (drives the bad→good demo beat downstream).
- A cappella or headphone-monitored (no backing-track bleed — PRD §6).
- Length between **3 s and 300 s** (`SONG_MIN_S`..`SONG_MAX_S`).
- Real singing at a sane level (full-clip RMS above `SILENCE_FLOOR=0.01`) and not clipped (full-scale sample fraction below `CLIP_MAX=0.01`).
- Any format libsndfile reads (WAV/FLAC/AIFF/OGG; preferably lossless WAV/FLAC). Sample rate/channel count don't matter — ingest normalizes to 16 kHz mono.

**Proposed drop location:** create `assets/source/` and place the files at:
- `assets/source/bad_take_source.wav`
- `assets/source/good_take_source.wav`

Then run:
```bash
.venv/bin/python -m src.capture --take bad  --input assets/source/bad_take_source.wav
.venv/bin/python -m src.capture --take good --input assets/source/good_take_source.wav
```
to produce the two cached takes, after which the validator subagent can author/run `validators/capture_validator.py` and write `validation/01-capture.result.json`.
