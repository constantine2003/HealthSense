#!/usr/bin/env python3
"""
bp_openai.py — HealthSense BP Monitor reader via OpenAI Vision API

Captures one frame from the USB webcam, sends it to gpt-4o-mini, and parses
the systolic / diastolic / pulse values from the blood pressure monitor shown
in the image.

Output protocol (newline-delimited, same as bp_ocr.py):
  BPFRAME:<json>   — preview frame sent immediately after capture
  <json>\n         — final result line:
      success: {"sys":120,"dia":80,"pulse":72,"valid":true,"complete":true,
                "raw_sys":"120","raw_dia":"80","raw_pulse":"72"}
      failure: {"valid":false,"reason":"..."}

Environment variables:
  OPENAI_API_KEY   — required; OpenAI API key
  BP_WEBCAM_INDEX  — webcam device index (default 0)
  BP_CAPTURE_TRIES — warm-up frames to discard before capturing (default 3)
"""

import sys
import os
import json
import base64
import time

import cv2
from openai import OpenAI

# ── Config ────────────────────────────────────────────────────────────────────

WEBCAM_INDEX   = int(os.environ.get("BP_WEBCAM_INDEX", 0))
CAPTURE_TRIES  = int(os.environ.get("BP_CAPTURE_TRIES", 3))
MAX_ATTEMPTS   = 3     # OpenAI call retries on non-fatal errors


def emit(obj: dict):
    """Emit the final result to stdout (the only thing server.js parses from stdout)."""
    print(json.dumps(obj), flush=True)


def stderr_line(text: str):
    """Write a line to stderr (server.js uses stderr for BPFRAME + warn logs)."""
    sys.stderr.write(text + "\n")
    sys.stderr.flush()


def progress(n: int):
    stderr_line(json.dumps({"type": "progress", "sensor": "bp", "progress": n}))


def error(msg: str):
    emit({"valid": False, "reason": msg})


# ── Webcam capture ─────────────────────────────────────────────────────────────

def capture_frame() -> bytes:
    """
    Open the USB webcam, discard warm-up frames, and return a JPEG-encoded
    bytes object of the captured frame.
    """
    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open webcam index {WEBCAM_INDEX}")

    try:
        # Warm-up: first frames from USB webcams are often stale/black
        for _ in range(CAPTURE_TRIES):
            cap.read()
            time.sleep(0.05)

        ret, frame = cap.read()
        if not ret or frame is None:
            raise RuntimeError("Webcam returned no frame")

        frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            raise RuntimeError("JPEG encode failed")

        return bytes(buf)
    finally:
        cap.release()


# ── OpenAI Vision call ────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are a medical device reader. The user will show you a photo of a blood pressure "
    "monitor display. Extract the three numeric readings shown: systolic pressure (SYS), "
    "diastolic pressure (DIA), and pulse (heart rate). "
    "Respond ONLY with a single JSON object, no markdown, no explanation: "
    '{"sys": <integer or null>, "dia": <integer or null>, "pulse": <integer or null>}'
    "\nUse null for any value you cannot read clearly."
)


def call_openai(client: OpenAI, jpeg_bytes: bytes) -> dict:
    """Send the JPEG to gpt-4o-mini vision and return the parsed dict."""
    b64 = base64.b64encode(jpeg_bytes).decode()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=64,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}",
                            "detail": "high",
                        },
                    },
                    {"type": "text", "text": "Read the blood pressure monitor values."},
                ],
            },
        ],
    )
    raw_text = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    return json.loads(raw_text)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        error("OPENAI_API_KEY not set — configure it in serial-bridge/.env")
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    progress(10)

    # Capture frame
    try:
        jpeg = capture_frame()
    except Exception as exc:
        error(f"Webcam capture failed: {exc}")
        sys.exit(1)

    progress(30)

    # Emit BPFRAME to stderr so the debug panel shows the captured image.
    # server.js parses BPFRAME: lines from stderr and expects key "imageData".
    b64_preview = base64.b64encode(jpeg).decode()
    stderr_line(
        "BPFRAME:" + json.dumps({
            "sys": None, "dia": None,
            "imageData": b64_preview,
        })
    )

    progress(50)

    # Call OpenAI, retry on transient errors
    last_err = "Unknown error"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            result = call_openai(client, jpeg)
            break
        except json.JSONDecodeError as exc:
            last_err = f"Could not parse OpenAI response (attempt {attempt}): {exc}"
        except Exception as exc:
            last_err = f"OpenAI API error (attempt {attempt}): {exc}"
            time.sleep(1.5)
    else:
        error(last_err)
        sys.exit(1)

    progress(90)

    sys_val   = result.get("sys")
    dia_val   = result.get("dia")
    pulse_val = result.get("pulse")

    if sys_val is None or dia_val is None:
        emit({"valid": False, "reason": f"Monitor values not readable — reposition the camera and retry. (Got: {result})",
              "debug_image": base64.b64encode(jpeg).decode()})
        sys.exit(1)

    emit({
        "sys":         int(sys_val),
        "dia":         int(dia_val),
        "pulse":       int(pulse_val) if pulse_val is not None else None,
        "raw_sys":     str(sys_val),
        "raw_dia":     str(dia_val),
        "raw_pulse":   str(pulse_val) if pulse_val is not None else "",
        "debug_image": base64.b64encode(jpeg).decode(),
        "valid":       True,
        "complete":    True,
    })


if __name__ == "__main__":
    main()
