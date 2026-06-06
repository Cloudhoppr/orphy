"""End-to-end demo runbook (PRD §8): bad take then good take, text delivery.

Usage:
    python demo.py                   # both takes, text delivery
    python demo.py --take bad        # bad take only
    python demo.py --take good       # good take only
    python demo.py --mode audio      # audio delivery (requires Gemini Live)
    python demo.py --no-live         # skip live generation; use cached feedback only
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from src.config import CACHE_DIR
from src.contracts import Metrics
from src.feedback.delivery import GeminiLiveChannel
from src.feedback.generate import generate_feedback, _load_cached


def load_metrics(take: str) -> Metrics:
    p = CACHE_DIR / f"{take}_metrics.json"
    if not p.exists():
        print(f"ERROR: metrics file not found: {p}", file=sys.stderr)
        print("Run the analysis phase first (phase 2) to generate metrics.", file=sys.stderr)
        sys.exit(1)
    return json.loads(p.read_text())


def run_take(
    take: str,
    prior_metrics: Metrics | None,
    channel: GeminiLiveChannel,
    live: bool,
) -> None:
    print(f"\n[demo] Running {take} take...")

    metrics = load_metrics(take)

    if live:
        print(f"[demo] Generating live feedback for {take} take...")
        try:
            result = generate_feedback(metrics, prior_metrics=prior_metrics)
            print("[demo] Live generation succeeded.")
        except Exception as exc:
            print(f"[demo] Live generation failed ({exc}); using cached feedback.")
            result = _load_cached(take)
    else:
        print(f"[demo] Loading cached feedback for {take} take...")
        result = _load_cached(take)

    channel.deliver(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Orphy singing feedback demo")
    parser.add_argument(
        "--take", choices=["bad", "good", "both"], default="both",
        help="Which take to run (default: both)",
    )
    parser.add_argument(
        "--mode", choices=["text", "audio"], default="text",
        help="Delivery mode (default: text)",
    )
    parser.add_argument(
        "--no-live", action="store_true",
        help="Skip live Gemini generation; use cached feedback only",
    )
    args = parser.parse_args()

    channel = GeminiLiveChannel(mode=args.mode)
    live = not args.no_live

    takes = ["bad", "good"] if args.take == "both" else [args.take]

    bad_metrics: Metrics | None = None
    for take in takes:
        prior = bad_metrics if take == "good" else None
        run_take(take, prior, channel, live)
        if take == "bad":
            bad_metrics = load_metrics("bad")

    print("[demo] Done.")


if __name__ == "__main__":
    main()
