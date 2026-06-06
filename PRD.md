# Real-Time Singing Feedback — Product Requirements Document

## 1. Summary

We are building a tool that listens to a person sing a known song and, once they
finish, returns constructive vocal feedback. The system is split into three
phases — **capture**, **analysis**, and **feedback** — connected by stable data
contracts. Analysis compares the sung audio against a seeded reference melody;
the LLM never measures pitch directly, it only interprets numbers the DSP layer
produces.

**Time budget:** ~3 hours (hackathon). **Demo plan:** one song, pre-recorded as
two fixed takes — sung *badly* first, then *well* — so the entire analysis is
deterministic and pre-computable. The "good" take's feedback references the
improvement over the "bad" take.

**Guiding split:** DSP *measures*, the LLM *interprets*. A conversational audio
model cannot reliably produce cents-accurate, per-note measurements, so all
objective numbers come from signal processing and only the natural-language
coaching comes from the model.

---

## 2. Core design principles

1. **DSP measures, LLM interprets.** Pitch, onset, and alignment numbers are
   computed deterministically. The model receives those numbers as JSON and
   turns them into language. It is never asked to act as a tuner.
2. **Contracts are seams.** Each phase depends only on the *shape* of the
   previous phase's output, not its internals. Contracts are defined once and
   shared. Swapping an implementation behind a contract changes nothing
   downstream.
3. **Deterministic validation gates.** Every phase ends with a deterministic,
   autonomous validator. No phase is considered "done" until its validator
   passes.
4. **Cache with live fallback.** Metrics and feedback are both cached. Feedback
   is always *generated from cached metrics*; cached feedback is used only if
   live generation fails.
5. **Modality-agnostic feedback.** Generation produces a modality-neutral
   result. Delivery is a lean, swappable layer configured for Gemini Live text
   or audio — text now, audio later, by config only.

---

## 3. System architecture

### 3.1 Phase overview

```
[ Reference MIDI (seeded) ]
            |
            v
  Capture  ->  Analysis  ->  Feedback (Generation -> Delivery)
   (WAV)       (Metrics)        (FeedbackResult)   (text|audio)
     |            |                   |
   validate     validate           validate
```

- **Capture** — record/ingest the take as a fixed 16 kHz mono WAV.
- **Analysis** — extract pitch + onsets, align to the seeded reference via DTW,
  emit per-note metrics. Cache metrics.
- **Feedback** — *generate* a modality-neutral `FeedbackResult` from cached
  metrics (live, with cached fallback), then *deliver* it via the configurable
  channel.

### 3.2 Reference seeding

The reference melody is a **pre-made, monophonic, vocals-only MIDI** of the
song, downloaded from the internet (community MIDI, melody track isolated). It
is treated as a static asset and loaded by a single module into the canonical
note list the analyzer consumes. No runtime audio-to-MIDI transcription.

> **Hard prerequisite:** the MIDI asset must exist at the agreed path before the
> Analysis subagent is spawned. If it is missing or contains more than the
> vocal line, the orchestrator must **stop and ask** (see §5.4).

### 3.3 Feedback: generation vs delivery

- **Generation layer** — input: cached metrics JSON. Output: `FeedbackResult`
  (structured fields + a TTS-safe narration string). Calls the model live; on
  any failure, returns the cached `FeedbackResult`.
- **Delivery layer** — input: `FeedbackResult`. Lean adapter with a single
  `mode` config in `{"text", "audio"}`. `text` renders `narration` directly;
  `audio` routes `narration` through Gemini Live audio. Default `text`.

The narration is authored to read naturally aloud from day one (no markdown, no
"see above"), so flipping to audio requires no rewrite.

### 3.4 Caching strategy

| Artifact | Path | When written | Used at demo |
|---|---|---|---|
| Take audio | `cache/<take>_take.wav` | pre-recorded fixture | played back |
| Metrics | `cache/<take>_metrics.json` | analysis (deterministic) | source of truth for generation |
| Feedback | `cache/<take>_feedback.json` | generation | **fallback only** if live gen fails |

`<take>` is `bad` or `good`. Live generation always runs against the cached
metrics; the cached feedback exists purely as a safety net.

### 3.5 Validation strategy

Validation runs at the **end of each phase**, is **deterministic**, and runs
**autonomously** (one command, pass/fail, no human babysitting, no LLM judgment
in the gate). Checks per phase are specified in §7. An optional, non-gating
LLM quality probe for feedback tone/relevance may exist but is explicitly
**outside** the deterministic gate.

---

## 4. Shared data contracts (the seams)

Defined once in `src/contracts.py`. All subagents code against these.

```python
# Reference note: MIDI pitch number, start seconds, duration seconds
ReferenceNote = tuple[int, float, float]
Reference = list[ReferenceNote]            # sorted by start time

@dataclass
class CaptureResult:
    path: str          # WAV path
    sample_rate: int   # must be 16000
    channels: int      # must be 1
    duration_s: float

# Metrics JSON schema (cache/<take>_metrics.json)
{
  "take": "bad" | "good",
  "notes": [
    {
      "ref_index": int,
      "ref_pitch_midi": int,
      "sung_hz": float | null,
      "cents_error": float | null,   # +sharp / -flat vs reference
      "onset_offset_ms": float | null,
      "voiced": bool
    }
  ],
  "summary": {
    "mean_abs_cents": float,
    "mean_abs_onset_ms": float,
    "notes_matched": int,
    "notes_total": int
  }
}

@dataclass
class FeedbackResult:               # cache/<take>_feedback.json
    summary: str                    # one-line takeaway
    narration: str                  # full coaching, TTS-safe
    fixes: list[str]                # top actionable items
    metrics_ref: str                # path to the metrics file it was built from

class DeliveryChannel(Protocol):    # delivery seam
    def deliver(self, result: FeedbackResult) -> None: ...
    # configured implementation: GeminiLiveChannel(mode="text" | "audio")
```

### Repository layout

```
project/
  reference/song_melody.mid          # seeded monophonic vocal MIDI (human-provided)
  src/
    contracts.py                     # shared seams (Phase 0)
    reference.py                     # load REFERENCE from MIDI
    capture.py                       # Phase 1
    analysis.py                      # Phase 2 (pyin, onset, DTW, metrics)
    feedback/
      generate.py                    # Phase 3 generation (+ cached fallback)
      delivery.py                    # Phase 3 delivery (text|audio)
    validators/
      capture_validator.py
      analysis_validator.py
      feedback_validator.py
    demo.py                          # end-to-end runbook for one take
  cache/                             # wav, metrics, feedback fixtures
  handoffs/                          # subagent handoff summaries
  validation/                        # validator result reports
  PRD.md
```

### Deterministic filenames

- Handoff summary: `handoffs/<NN>-<phase>.handoff.md`
  (`01-capture`, `02-analysis`, `03-feedback`)
- Validator report: `validation/<NN>-<phase>.result.json`

Filenames are fully derivable from the phase, so each downstream subagent knows
exactly where to read its upstream context without being told.

---

## 5. Agentic execution model

### 5.1 Roles

- **Main orchestrator agent** — owns Phase 0 (scaffold + contracts), sequences
  the phases, spawns subagents, enforces validation gates, and routes handoff
  summaries. Maintains the master checklist (§9).
- **Phase implementation subagents** (3) — `capture-agent`, `analysis-agent`,
  `feedback-agent`. Each implements exactly one phase against the shared
  contracts.
- **Validator subagent** (1, reused per phase) — authors the deterministic,
  autonomous validator for the phase just implemented, then runs it.

### 5.2 Spawn order and per-phase loop

Phase 0 is done by the orchestrator directly: create the repo skeleton and
`contracts.py`, confirm the reference MIDI asset exists.

Then for each phase P in `[capture, analysis, feedback]`:

1. Orchestrator spawns the **phase-P implementation subagent**, providing: this
   PRD, `contracts.py`, and the upstream handoff summary
   (`handoffs/<NN-1>-*.handoff.md`; none for capture).
2. The implementation subagent builds phase P to satisfy its contract.
3. Orchestrator spawns the **validator subagent** to author/extend
   `validators/<phase>_validator.py` for phase P's output contract.
4. The validator runs and writes `validation/<NN>-<phase>.result.json`.
5. **Pass** → the implementation subagent writes
   `handoffs/<NN>-<phase>.handoff.md` and the orchestrator advances.
   **Fail or any ambiguity** → stop and ask (§5.4).

### 5.3 Handoff protocol

After a passing phase, the implementation subagent writes a **compacted** change
summary to the deterministic handoff filename. Required contents:

- Phase, owning subagent, status (`complete` | `blocked`).
- Files added/modified.
- The public contract produced (exact shape + how to import/call it).
- Entry points / how to run.
- Assumptions made.
- Known limitations or deferred TODOs.
- Validation result reference (path + pass/fail).

The downstream subagent reads the immediately-preceding handoff (and may read
earlier ones) as its primary context. It must not re-derive upstream behavior
from source; the handoff is the interface.

### 5.4 Stop-and-ask escalation (mandatory)

The orchestrator and every subagent **must halt and request human help** rather
than guess or fabricate, whenever any of the following occur:

- A requirement is missing, ambiguous, or self-contradictory.
- A validator fails and the fix is not deterministically obvious.
- A required asset/dependency is absent (e.g., reference MIDI missing, mic not
  found, library unavailable).
- An upstream handoff contract does not match what was actually produced.
- Live model/network access fails *during the build* (distinct from runtime
  fallback, which is handled by caching).

On halting, write a `blocked` handoff naming the open question, and wait for
human input. Never invent data, thresholds, or contract fields to keep going.

### 5.5 Validator subagent notes

The validator subagent writes only **deterministic** checks (§7). It does not
implement phase logic and does not modify phase code; it only authors
`validators/*` and reports. If a check requires a threshold not defined here, it
must stop and ask rather than choose one silently.

---

## 6. Phases (detailed) with TODO checklists

### Phase 0 — Scaffold and contracts (orchestrator)

**Owner:** main orchestrator. **Output:** repo skeleton, `contracts.py`,
confirmed reference asset.

- [ ] Create repository layout per §4.
- [ ] Implement `src/contracts.py` with all contracts from §4.
- [ ] Confirm `reference/song_melody.mid` exists and is monophonic / melody-only;
      **stop and ask** if not.
- [ ] Define numeric thresholds used by validators (see §7); record them in a
      single `src/config.py`.
- [ ] Commit skeleton; verify imports resolve.

---

### Phase 1 — Capture

**Owner:** `capture-agent`. **Input:** none (or live mic for non-demo path).
**Output:** `CaptureResult` + a 16 kHz mono WAV at `cache/<take>_take.wav`.
**Handoff:** `handoffs/01-capture.handoff.md`.

**Implementation notes:** for the demo, capture means ingesting the two
pre-recorded fixtures and normalizing them to 16 kHz mono. Avoid backing-track
bleed (a cappella or headphone monitoring). Keep a thin live-mic path behind the
same `CaptureResult` contract for completeness, but the demo uses fixtures.

- [ ] Implement audio ingest → 16 kHz mono WAV writer.
- [ ] Produce `cache/bad_take.wav` and `cache/good_take.wav`.
- [ ] Return populated `CaptureResult` for each take.
- [ ] (Optional) live-mic capture behind the same contract.
- [ ] Run capture validator; ensure `validation/01-capture.result.json` passes.
- [ ] Write `handoffs/01-capture.handoff.md`.

---

### Phase 2 — Analysis (with reference seeding)

**Owner:** `analysis-agent`. **Input:** `CaptureResult` (capture handoff) +
seeded reference. **Output:** metrics JSON at `cache/<take>_metrics.json`.
**Handoff:** `handoffs/02-analysis.handoff.md`.

**Implementation notes:**
- `reference.py` loads the MIDI via `pretty_midi`, isolates the melody track,
  and returns the canonical `Reference` note list. Convert MIDI pitch → Hz
  (`note_number_to_hz`) for comparison; sanity-check middle C ≈ 262 Hz to avoid
  octave errors.
- Pitch via `librosa.pyin`, constraining `fmin`/`fmax` to vocal range. Onsets
  via `librosa.onset`. Align sung contour to the reference with
  `librosa.sequence.dtw`; segment by phrase if alignment wanders.
- The **bad take is the riskiest for DTW** (large errors + drift). Validate its
  alignment offline before trusting metrics.
- Compute per-note `cents_error`, `onset_offset_ms`, `voiced`, and the summary
  block. Cache to `cache/<take>_metrics.json`.

- [ ] Implement `reference.py`; load `Reference` from the MIDI.
- [ ] Verify MIDI→Hz conversion (middle C ≈ 262 Hz); **stop and ask** on octave
      mismatch.
- [ ] Implement pyin pitch extraction with range constraints.
- [ ] Implement onset detection.
- [ ] Implement DTW alignment of sung contour to reference.
- [ ] Compute per-note metrics + summary; conform to the metrics schema.
- [ ] Write `cache/bad_metrics.json` and `cache/good_metrics.json`.
- [ ] Manually inspect the bad-take alignment (F0-vs-reference); confirm sane.
- [ ] Run analysis validator (invariants + golden regression); ensure
      `validation/02-analysis.result.json` passes.
- [ ] Write `handoffs/02-analysis.handoff.md`.

---

### Phase 3 — Feedback (generation + delivery)

**Owner:** `feedback-agent`. **Input:** cached metrics (analysis handoff).
**Output:** `FeedbackResult` per take + delivery via the configured channel.
**Handoff:** `handoffs/03-feedback.handoff.md`.

**Implementation notes:**
- **Generation** (`feedback/generate.py`): build a `FeedbackResult` from a
  metrics JSON via the model. Prompt for plain, spoken-friendly sentences and
  3 specific fixes; keep precise numbers in the structured metrics, not buried
  in prose. For the **good** take, pass *both* metric sets so the narration can
  cite the improvement (e.g., chorus "~40 cents flat → within 10"). Live call
  with timeout; on any exception, load the cached `FeedbackResult`.
- **Delivery** (`feedback/delivery.py`): `GeminiLiveChannel(mode="text"|"audio")`
  behind `DeliveryChannel`. `text` renders `narration`; `audio` streams it via
  Gemini Live audio. Default `text`. No upstream code knows the mode.
- Write `cache/<take>_feedback.json` so the fallback path is always populated.

- [ ] Implement `generate_feedback(metrics, prior_metrics=None) -> FeedbackResult`.
- [ ] Author a generation prompt producing TTS-safe narration + fixes.
- [ ] Implement live-call-with-timeout + cached fallback.
- [ ] Write `cache/bad_feedback.json` and `cache/good_feedback.json`.
- [ ] Implement `DeliveryChannel` + `GeminiLiveChannel(mode=...)`, default text.
- [ ] Confirm flipping `mode` to `audio` needs no change outside delivery.
- [ ] Run feedback validator (deterministic); ensure
      `validation/03-feedback.result.json` passes.
- [ ] Write `handoffs/03-feedback.handoff.md`.

---

## 7. Validator subagent — deterministic checks per phase

### Capture validator
- [ ] WAV exists and decodes; not empty.
- [ ] `sample_rate == 16000`, `channels == 1`.
- [ ] `duration_s` within `[SONG_MIN_S, SONG_MAX_S]`.
- [ ] RMS level above `SILENCE_FLOOR` (catches dead mic / silence).
- [ ] Clipping ratio below `CLIP_MAX` (catches input gain too hot).

### Analysis validator
Invariants (take-agnostic):
- [ ] No NaN/inf anywhere in metrics.
- [ ] Voiced F0 within `[80, 1100] Hz`.
- [ ] DTW path monotonic non-decreasing.
- [ ] `notes_matched == notes_total` (or within `MATCH_TOLERANCE`).
- [ ] Metrics conform to schema.

Golden regression (fixtures):
- [ ] `bad.summary.mean_abs_cents > BAD_CENTS_MIN` (the bad take is measurably bad).
- [ ] `good.summary.mean_abs_cents < GOOD_CENTS_MAX` (the good take is measurably good).
- [ ] `good.mean_abs_cents < bad.mean_abs_cents - IMPROVEMENT_MARGIN`
      (guards the "noticed improvement" demo beat).

### Feedback validator (deterministic gate)
- [ ] `FeedbackResult` schema valid; `summary`, `narration`, `fixes` non-empty.
- [ ] `metrics_ref` points to an existing metrics file.
- [ ] `narration` is TTS-safe: contains no markdown tokens (`* _ # \` -`), no
      "see above/below".
- [ ] **Numeric cross-check:** every number cited in `narration`/`fixes` appears
      (rounded) in the source metrics → no hallucinated figures.
- [ ] `narration` within spoken-friendly length bounds.
- [ ] Cached fallback file exists and is schema-valid (fallback cannot fail).

> Optional, **non-gating**, non-deterministic: an LLM-as-judge probe for tone and
> whether the top errors are addressed. Reported separately; never blocks a gate.

---

## 8. Demo runbook

For each take, in order **bad → good**:

1. Play `cache/<take>_take.wav` (capture fixture).
2. Run analysis (or load cached metrics).
3. Generate feedback live from cached metrics; fall back to cached feedback on
   failure. For the good take, pass both metric sets for the improvement line.
4. Deliver via `GeminiLiveChannel(mode="text")`.

The good-take feedback should explicitly contrast against the bad take. Audio
delivery is a config flip (`mode="audio"`) if time and confidence allow.

---

## 9. Orchestrator master checklist (phase gates)

- [ ] **Phase 0** scaffold + contracts complete; reference MIDI confirmed.
- [ ] **Phase 1** capture implemented; `01-capture.result.json` passes;
      `01-capture.handoff.md` written.
- [ ] **Phase 2** analysis implemented; `02-analysis.result.json` passes;
      `02-analysis.handoff.md` written.
- [ ] **Phase 3** feedback implemented; `03-feedback.result.json` passes;
      `03-feedback.handoff.md` written.
- [ ] End-to-end demo runbook (§8) executes bad → good with text delivery.
- [ ] Audio-delivery flip verified as config-only (not required for demo).

A phase gate is open only when its validator report shows pass **and** its
handoff summary exists. Any blocked handoff halts the pipeline pending human
input (§5.4).

---

## 10. Out of scope / known limitations

- Objective tone/timbre scoring (subjective; out of scope — qualitative mention
  only, clearly labeled).
- Real-time per-note feedback while singing (not needed; feedback is post-take).
- Runtime audio-to-MIDI transcription (reference is seeded, not transcribed).
- Lyric/diction analysis (deferred).
- Generalization beyond the one demo song (fixtures are frozen).
