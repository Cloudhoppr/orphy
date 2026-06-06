"""Phase 3 delivery: GeminiLiveChannel behind the DeliveryChannel protocol (PRD §6 Phase 3).

Flipping mode from "text" to "audio" requires no change outside this module.
"""

from __future__ import annotations

import os
from typing import Literal

from src.contracts import DeliveryChannel, FeedbackResult


class GeminiLiveChannel:
    """DeliveryChannel implementation backed by Gemini.

    mode="text"  — renders narration to stdout (default, always available).
    mode="audio" — streams narration via Gemini Live audio output.
                   Requires GEMINI_API_KEY and google-genai>=0.8 with live support.

    No upstream code needs to know which mode is active.
    """

    def __init__(self, mode: Literal["text", "audio"] = "text") -> None:
        if mode not in ("text", "audio"):
            raise ValueError(f"mode must be 'text' or 'audio', got {mode!r}")
        self.mode: Literal["text", "audio"] = mode

    def deliver(self, result: FeedbackResult) -> None:
        if self.mode == "text":
            self._deliver_text(result)
        else:
            self._deliver_audio(result)

    # ---------------------------------------------------------------------- #
    # Private: text delivery                                                   #
    # ---------------------------------------------------------------------- #

    def _deliver_text(self, result: FeedbackResult) -> None:
        print(f"\n{'=' * 60}")
        print(f"Feedback  (source: {result.metrics_ref})")
        print(f"{'=' * 60}")
        print(f"Summary: {result.summary}")
        print(f"\n{result.narration}")
        print("\nTop fixes:")
        for i, fix in enumerate(result.fixes, 1):
            print(f"  {i}. {fix}")
        print(f"{'=' * 60}\n")

    # ---------------------------------------------------------------------- #
    # Private: audio delivery via Gemini Live                                  #
    # ---------------------------------------------------------------------- #

    def _deliver_audio(self, result: FeedbackResult) -> None:
        """Stream narration through Gemini Live audio.

        Audio bytes (PCM 16-bit LE, 24 kHz mono by default) are written to
        stdout so the caller can pipe them to a player, e.g.:
            python demo.py | ffplay -f s16le -ar 24000 -ac 1 -
        """
        import asyncio

        try:
            from google import genai as gai
        except ImportError as exc:
            raise ImportError(
                "google-genai is required for audio delivery: pip install google-genai"
            ) from exc

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY not set")

        import sys

        async def _stream() -> None:
            client = gai.Client(api_key=api_key)
            config = {"response_modalities": ["AUDIO"]}
            async with client.aio.live.connect(
                model="gemini-2.5-flash-preview-native-audio-dialog", config=config
            ) as session:
                await session.send(input=result.narration, end_of_turn=True)
                async for chunk in session.receive():
                    if chunk.data:
                        sys.stdout.buffer.write(chunk.data)
                        sys.stdout.buffer.flush()

        asyncio.run(_stream())


# Structural check: GeminiLiveChannel must satisfy the DeliveryChannel protocol.
def _assert_protocol() -> None:
    ch = GeminiLiveChannel()
    assert isinstance(ch, DeliveryChannel), (
        "GeminiLiveChannel does not satisfy DeliveryChannel protocol"
    )

_assert_protocol()
