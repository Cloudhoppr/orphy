# Handoff 03 — Feedback (Generation + Delivery)

**Phase:** 3 — Feedback  
**Owner:** feedback-agent  
**Status:** complete  
**Validator report:** `validation/03-feedback.result.json` — PASS

---

## Files added / modified

| File | Role |
|------|------|
| `src/feedback/generate.py` | Generation: Gemini call + cached fallback |
| `src/feedback/delivery.py` | Delivery: `GeminiLiveChannel(mode=...)` |
| `src/validators/feedback_validator.py` | Deterministic gate for phase 3 |
| `cache/bad_metrics.json` | Placeholder bad-take metrics (dev fixture) |
| `cache/good_metrics.json` | Placeholder good-take metrics (dev fixture) |
| `cache/bad_feedback.json` | Pre-generated fallback feedback for bad take |
| `cache/good_feedback.json` | Pre-generated fallback feedback for good take |
| `demo.py` | End-to-end runbook (PRD §8) |
| `requirements.txt` | Python dependencies |
| `.env` | API key file (gitignored) — add `GEMINI_API_KEY=<key>` |

---

## Public contracts produced

### `generate_feedback`

```python
from src.feedback.generate import generate_feedback
from src.contracts import Metrics, FeedbackResult

result: FeedbackResult = generate_feedback(
    metrics: Metrics,          # loaded from cache/<take>_metrics.json
    prior_metrics: Metrics | None = None,  # pass bad take's metrics when take="good"
)
```

- Calls Gemini (`gemini-2.0-flash`) with a 30-second timeout.
- On any exception: returns cached `FeedbackResult` from `cache/<take>_feedback.json`.
- On success: writes result to `cache/<take>_feedback.json` (updates fallback) and returns it.
- Reads `GEMINI_API_KEY` from environment (loaded via `python-dotenv`).

### `GeminiLiveChannel`

```python
from src.feedback.delivery import GeminiLiveChannel

channel = GeminiLiveChannel(mode="text")   # or mode="audio"
channel.deliver(result: FeedbackResult) -> None
```

- Implements `DeliveryChannel` protocol (verified at import time with `isinstance`).
- `mode="text"`: renders summary, narration, and numbered fixes to stdout.
- `mode="audio"`: streams narration via Gemini Live audio (requires `google-genai`).
  Switching modes requires no change in any calling code.

---

## How to run

### Validator (deterministic gate)

```bash
python src/validators/feedback_validator.py
# or
python -m src.validators.feedback_validator
```

### End-to-end demo (PRD §8)

```bash
# Requires GEMINI_API_KEY in .env
python demo.py                  # bad → good, text delivery, live generation
python demo.py --no-live        # use cached feedback (no API key needed)
python demo.py --take bad       # bad take only
python demo.py --mode audio     # audio delivery (Gemini Live)
```

### Generate feedback for one take

```python
import json
from src.feedback.generate import generate_feedback
from src.feedback.delivery import GeminiLiveChannel

bad_metrics  = json.loads(open("cache/bad_metrics.json").read())
good_metrics = json.loads(open("cache/good_metrics.json").read())

bad_result  = generate_feedback(bad_metrics)
good_result = generate_feedback(good_metrics, prior_metrics=bad_metrics)

GeminiLiveChannel(mode="text").deliver(bad_result)
GeminiLiveChannel(mode="text").deliver(good_result)
```

---

## Assumptions made

1. **Metrics are pre-computed (phase 2).** `generate_feedback` reads from
   `cache/<take>_metrics.json`; it never measures pitch directly.
2. **Placeholder fixtures.** `cache/{bad,good}_metrics.json` and
   `cache/{bad,good}_feedback.json` are dev fixtures. Phase 2 will overwrite
   the metrics files with real values; re-run generation after phase 2 completes.
3. **`response_mime_type="application/json"`** is used with Gemini to obtain
   clean JSON; a fence-stripper handles the edge case where fences appear anyway.
4. **Numeric crosscheck** uses string extraction from the full metrics JSON, so
   negative values like `-12.0` produce the token `12` in the allowed set —
   narration can say "12 cents flat" without triggering a false positive.
5. **Good-take validator** loads both `bad_metrics.json` and `good_metrics.json`
   as the allowed numeric set, since `generate_feedback` receives both and the
   narration is permitted to cite improvement figures from the prior take.

---

## Known limitations / deferred TODOs

- **Audio delivery is implemented but not demo-validated.** The audio path connects
  to Gemini Live and writes PCM bytes to stdout. Playback requires piping to
  `ffplay` or similar. Not required for the demo; text mode is the gate.
- **Placeholder metrics will be replaced by phase 2.** After phase 2 runs,
  re-run `generate_feedback` with the real metrics to regenerate the fallback cache.
- **No retry logic.** A single Gemini attempt; any failure falls through to cache.
  A retry with backoff could be added without touching the DeliveryChannel contract.
- **`fixes` list length not enforced by validator.** The prompt asks for exactly 3;
  the validator only checks that the list is non-empty. Could add a strict 3-item check.
