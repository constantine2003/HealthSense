#!/usr/bin/env python3
"""
bp_ocr.py — HealthSense BP Monitor OCR

Captures one frame from the Pi CSI camera, extracts SYS / DIA / Pulse readings
from the BP monitor's 7-segment display using ssocr (primary) or Tesseract
(fallback), and prints a single JSON line to stdout.

Primary output (valid reading):
  {
    "sys": 120, "dia": 80, "pulse": 72,
    "raw_sys": "120", "raw_dia": "80", "raw_pulse": "72",
    "complete": true, "valid": true,
    "debug_image": "<base64 JPEG of annotated display crop>"
  }

Failure output:
  {"valid": false, "reason": "..."}

Environment variables (all optional):
  BP_CROP_X / BP_CROP_Y / BP_CROP_W / BP_CROP_H  — crop to display region
  BP_SCALE      — upscale factor before OCR (default 3)
  BP_INVERT     — set to "1" if display is bright-on-dark (LED/backlit)
  BP_THRESHOLD  — fixed binarisation threshold 0-255 (default: Otsu auto)
"""

import sys
import os
import json
import base64
import tempfile
import subprocess
import shutil
import signal
import time

import cv2
import numpy as np

try:
    from picamera2 import Picamera2
    PICAMERA2_AVAILABLE = True
except ImportError:
    PICAMERA2_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    import easyocr as _easyocr_mod
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

# EasyOCR Reader is expensive to initialise (~2–4s, model load).
# We cache it at module level so it's only initialised once per process.
_EASYOCR_READER = None

def _get_easyocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None and EASYOCR_AVAILABLE:
        # gpu=False → CPU inference; verbose=False → no progress spam
        _EASYOCR_READER = _easyocr_mod.Reader(['en'], gpu=False, verbose=False)
    return _EASYOCR_READER


# ─── Colours for debug annotations ───────────────────────────────────────────
# BGR colours for OpenCV
BAND_COLOURS = [
    (50,  80,  220),   # red-ish  → SYS
    (50,  180,  50),   # green    → DIA
    (220, 120,  50),   # blue-ish → Pulse
]
BAND_LABELS = ["SYS", "DIA", "PULSE"]

# ─── Custom 7-segment decoder ─────────────────────────────────────────────────
#
# Segment naming (standard):
#        aaa
#       f   b
#       f   b
#        ggg
#       e   c
#       e   c
#        ddd
#
# Each segment zone is expressed as (y0_frac, y1_frac, x0_frac, x1_frac)
# within the normalised bounding box of one digit.  Values are chosen to sit
# well inside each segment bar, away from corners where two bars meet.
_SEG_ORDER = ('a', 'b', 'c', 'd', 'e', 'f', 'g')
_SEG_ZONES = {
    'a': (0.00, 0.18, 0.15, 0.85),   # top bar
    'b': (0.06, 0.44, 0.68, 0.95),   # top-right
    'c': (0.56, 0.94, 0.68, 0.95),   # bottom-right
    'd': (0.82, 1.00, 0.15, 0.85),   # bottom bar
    'e': (0.56, 0.94, 0.05, 0.32),   # bottom-left
    'f': (0.06, 0.44, 0.05, 0.32),   # top-left
    'g': (0.41, 0.59, 0.15, 0.85),   # middle bar
}
# Active-segment pattern → digit (tuple order matches _SEG_ORDER a,b,c,d,e,f,g)
_SEG_DIGITS = {
    (1,1,1,1,1,1,0): '0',
    (0,1,1,0,0,0,0): '1',
    (1,1,0,1,1,0,1): '2',
    (1,1,1,1,0,0,1): '3',
    (0,1,1,0,0,1,1): '4',
    (1,0,1,1,0,1,1): '5',
    (1,0,1,1,1,1,1): '6',
    (1,1,1,0,0,0,0): '7',
    (1,1,1,1,1,1,1): '8',
    (1,1,1,1,0,1,1): '9',
}
_SEG_THRESHOLD = 0.28   # fraction of zone pixels that must be "on" for segment active
# Orientation of each segment: 'h' = horizontal bar, 'v' = vertical bar.
# Used to reject "1"'s vertical bars falsely activating horizontal zones (a, d, g).
_SEG_ORIENTATION = {
    'a': 'h', 'b': 'v', 'c': 'v', 'd': 'h', 'e': 'v', 'f': 'v', 'g': 'h',
}


def _get_digit_mask(band_bgr):
    """
    Build a binary mask (255 = digit segment ON, 0 = background) from a band crop.

    Tries four independent binarisation strategies, scores each by the
    "peakiness" of its column projection (well-separated digit columns produce
    a spiky profile, noise/bad masks produce flat or uniform profiles), and
    returns the best-scoring mask.

    Strategies tried (in order of preference when scores are equal):
      1. HSV background subtraction — removes the LCD's characteristic colour
         and leaves only the dark digit bars.  Best when colour is clean.
      2. Adaptive Gaussian threshold on bilateral-filtered grayscale — handles
         uneven illumination and local contrast variations well.
      3. Otsu global threshold on CLAHE-equalised grayscale — good when the
         display is uniformly lit but has low global contrast.
      4. LAB 'a' channel threshold — isolates red/green colour differences;
         works on greenish-grey LCD panels that defeat grayscale methods.

    Returns (mask uint8 H×W, best_strategy str, bg_coverage float 0-1).
    The bg_coverage value comes from the HSV strategy; 0 when HSV wasn't used.
    """
    gray = cv2.cvtColor(band_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # ── Strategy 1: HSV background subtraction ──────────────────────────────
    h_lo = int(os.environ.get("BP_LCD_H_LOW",  40))
    h_hi = int(os.environ.get("BP_LCD_H_HIGH", 130))
    s_lo = int(os.environ.get("BP_LCD_S_LOW",   5))
    s_hi = int(os.environ.get("BP_LCD_S_HIGH", 120))
    v_lo = int(os.environ.get("BP_LCD_V_LOW",   50))
    v_hi = int(os.environ.get("BP_LCD_V_HIGH", 230))
    hsv  = cv2.cvtColor(band_bgr, cv2.COLOR_BGR2HSV)
    bg   = cv2.inRange(hsv,
                       np.array([h_lo, s_lo, v_lo], dtype=np.uint8),
                       np.array([h_hi, s_hi, v_hi], dtype=np.uint8))
    bg_coverage = float(np.count_nonzero(bg)) / max(bg.size, 1)
    mask_hsv    = cv2.bitwise_not(bg)

    # ── Strategy 2: Adaptive Gaussian on bilateral-filtered grayscale ────────
    bfilt = cv2.bilateralFilter(gray, 9, 75, 75)
    block = max(11, (min(h, w) // 3) | 1)   # block size must be odd; ~1/3 of shorter side
    mask_adap = cv2.adaptiveThreshold(
        bfilt, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        block, 6
    )

    # ── Strategy 3: Otsu on CLAHE-equalised luminance ────────────────────────
    clahe  = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    leq    = clahe.apply(gray)
    _, mask_otsu = cv2.threshold(leq, 0, 255,
                                 cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    # ── Strategy 4: LAB 'a' channel (green–red axis) ─────────────────────────
    lab = cv2.cvtColor(band_bgr, cv2.COLOR_BGR2LAB)
    a_ch = lab[:, :, 1]   # 'a' channel: LCD green bg appears < 127
    _, mask_lab = cv2.threshold(a_ch, 0, 255,
                                cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    candidates = [
        ('hsv',      mask_hsv),
        ('adaptive', mask_adap),
        ('otsu',     mask_otsu),
        ('lab_a',    mask_lab),
    ]

    def _score(mask):
        """
        Score = column-projection peakiness × foreground fill fraction.

        A good mask has:
          - Clear high-density columns (digit bars) separated by near-zero gaps
          - Foreground fill between ~5% and 60% of total pixels
            (too low = mostly empty; too high = mostly noise/inverted)
        """
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        m = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k)
        fill = float(np.count_nonzero(m)) / max(m.size, 1)
        if fill < 0.03 or fill > 0.65:
            return 0.0
        col = m.sum(axis=0).astype(float)
        if col.max() == 0:
            return 0.0
        mean_active = col[col > col.max() * 0.05].mean() if (col > col.max() * 0.05).any() else 1.0
        peakiness = col.max() / max(mean_active, 1.0)
        return peakiness * fill

    best_name, best_mask = max(candidates, key=lambda x: _score(x[1]))

    # ── Final cleanup ────────────────────────────────────────────────────────
    k2 = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    best_mask = cv2.morphologyEx(best_mask, cv2.MORPH_OPEN, k2)
    # Close tiny gaps within segment bars (camera noise can break a bar in two)
    k3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    best_mask = cv2.morphologyEx(best_mask, cv2.MORPH_CLOSE, k3)

    return best_mask, best_name, bg_coverage


def _decode_one_digit(digit_bin):
    """
    Classify a single binary digit image (255=on, 0=off) by measuring pixel
    density in each of the 7 standard segment zones.

    Horizontal zones (a, d, g) also require pixels to span most of the zone
    width — this prevents "1"'s narrow vertical bars from falsely activating
    top/bottom/middle horizontal segments.

    Returns '0'–'9' or '' for unrecognised patterns.
    """
    h, w = digit_bin.shape
    if h < 6 or w < 4:
        return ''

    # "1" fast-path: the segment bars are tall narrow columns.
    # When the split span is tight (span ≈ bar width), the bars fill the full
    # crop width and fool every horizontal zone.  Catch this with aspect ratio.
    if w < h * 0.40:
        return '1'

    def _seg_active(seg, region, thresh):
        if region.size == 0:
            return 0
        raw = float(np.count_nonzero(region)) / region.size
        if raw < thresh:
            return 0
        if _SEG_ORIENTATION[seg] == 'h':
            # Horizontal bar must actually span the zone width.
            # Threshold kept low (0.25) so gapped bars in "7", "2", etc. still pass.
            col_present = float(np.count_nonzero(region.sum(axis=0))) / max(region.shape[1], 1)
            return 1 if col_present >= 0.25 else 0
        else:
            row_present = float(np.count_nonzero(region.sum(axis=1))) / max(region.shape[0], 1)
            return 1 if row_present >= 0.30 else 0

    regions = {}
    for seg in _SEG_ORDER:
        y0f, y1f, x0f, x1f = _SEG_ZONES[seg]
        y0, y1 = int(y0f * h), max(int(y1f * h), 1)
        x0, x1 = int(x0f * w), max(int(x1f * w), 1)
        regions[seg] = digit_bin[y0:y1, x0:x1]

    for thresh in (_SEG_THRESHOLD, 0.20, 0.35, 0.15, 0.40):
        pattern = tuple(_seg_active(seg, regions[seg], thresh) for seg in _SEG_ORDER)
        ch = _SEG_DIGITS.get(pattern)
        if ch is not None:
            return ch
    return ''


def _split_digit_spans(mask):
    """
    Find individual digit column spans via connected-component analysis.

    Connected components are grouped into digit clusters when the horizontal
    gap between them is small (intra-digit segment gaps).  This is more
    robust than a fixed smoothing kernel because it adapts to any digit size
    and avoids accidentally bridging the gap between adjacent digits.

    Returns a list of (x0, x1) tuples, left to right.
    """
    h, w = mask.shape
    if np.count_nonzero(mask) == 0:
        return []

    num_labels, _labels, stats, _ = cv2.connectedComponentsWithStats(
        mask, connectivity=8)

    # Collect components that are tall enough to be actual segment bars
    # (filters tiny noise blobs and very short marks like decimal points)
    min_comp_h = max(4, int(h * 0.12))
    comps = []
    for i in range(1, num_labels):
        if (stats[i, cv2.CC_STAT_AREA] >= 6 and
                stats[i, cv2.CC_STAT_HEIGHT] >= min_comp_h):
            x0 = stats[i, cv2.CC_STAT_LEFT]
            comps.append((x0, x0 + stats[i, cv2.CC_STAT_WIDTH]))

    if not comps:
        return []

    comps.sort()  # left to right

    # gap_lim: merge components within 12 % of digit height.
    # Intra-digit gaps (e.g. between "1"'s top-right and bottom-right bars,
    # or between horizontal and vertical bars of a digit) are typically
    # ≤ 10 % of digit height; inter-digit gaps are usually much larger.
    gap_lim = max(3, int(h * 0.12))

    merged = [list(comps[0])]
    for x0, x1 in comps[1:]:
        if x0 - merged[-1][1] <= gap_lim:
            merged[-1][1] = max(x1, merged[-1][1])
        else:
            merged.append([x0, x1])

    # Drop micro-spans (noise)
    min_w = max(2, int(w * 0.02))
    return [(s[0], s[1]) for s in merged if s[1] - s[0] >= min_w]


def ocr_band_7seg(band_bgr):
    """
    Full custom 7-segment OCR for one horizontal band crop.

    Pipeline:
      1. Build digit mask via HSV background removal (or Otsu fallback).
      2. Upscale so each segment has enough pixels for reliable density checks.
      3. Find individual digit column spans using projection.
      4. Decode each digit by checking its 7 segment zones.

    Returns (text: str, bg_coverage: float).
    Text contains only digit characters (and '?' for unrecognised patterns).
    """
    if band_bgr is None or band_bgr.size == 0:
        return '', 0.0

    mask, _strategy, coverage = _get_digit_mask(band_bgr)

    # Scale up — more pixels per segment bar = more reliable density measurement
    scale = int(os.environ.get("BP_SCALE", 4))
    if scale > 1:
        mask = cv2.resize(mask, None, fx=scale, fy=scale,
                          interpolation=cv2.INTER_NEAREST)

    # Hard cap so we never feed a giant image
    gh, gw = mask.shape
    MAX_DIM = 1200
    if gh > MAX_DIM or gw > MAX_DIM:
        down = MAX_DIM / max(gh, gw)
        mask = cv2.resize(mask,
                          (max(1, int(gw * down)), max(1, int(gh * down))),
                          interpolation=cv2.INTER_NEAREST)
        gh, gw = mask.shape

    # Trim empty rows (vertically centre the digit content)
    row_sum = mask.sum(axis=1)
    active_rows = np.where(row_sum > row_sum.max() * 0.05)[0]
    if len(active_rows) == 0:
        return '', coverage
    r0, r1 = int(active_rows[0]), int(active_rows[-1]) + 1
    mask = mask[r0:r1, :]

    spans = _split_digit_spans(mask)
    if not spans:
        return '', coverage

    result = ''
    for x0, x1 in spans[:5]:   # at most 5 digits per row
        crop = mask[:, x0:x1]
        ch = _decode_one_digit(crop)
        result += ch if ch else '?'

    return result, coverage


def _camera_timeout_handler(signum, frame):
    raise TimeoutError("Camera capture timed out")


def _enhance_frame(frame):
    """
    Post-capture image enhancement to make 7-segment LCD digits stand out.

    Applies CLAHE (adaptive histogram equalisation) to the luminance channel so
    segment bars gain local contrast without blowing out the LCD background.
    Optionally sharpens with an unsharp mask to crisp up segment edges.
    All tunable via env vars so you can disable if it hurts a particular monitor.

    BP_ENHANCE=0   — disable entirely (default on = 1)
    BP_CLAHE_CL    — CLAHE clipLimit     (default 2.5)
    BP_CLAHE_TS    — CLAHE tileGridSize  (default 8)
    BP_SHARP       — unsharp mask strength 0-3 (default 1)
    """
    if os.environ.get("BP_ENHANCE", "1") == "0":
        return frame

    # Work in LAB so equalisation is luminance-only (no colour distortion)
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    cl  = float(os.environ.get("BP_CLAHE_CL", 2.5))
    ts  = int(os.environ.get("BP_CLAHE_TS",   8))
    clahe = cv2.createCLAHE(clipLimit=cl, tileGridSize=(ts, ts))
    l = clahe.apply(l)

    sharp = int(os.environ.get("BP_SHARP", 1))
    if sharp > 0:
        blurred = cv2.GaussianBlur(l, (0, 0), 2)
        l = cv2.addWeighted(l, 1 + 0.4 * sharp, blurred, -0.4 * sharp, 0)

    enhanced = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    return enhanced


def capture_frame():
    """
    Capture one frame from the Pi camera.

    On Pi OS Bookworm, PipeWire/wireplumber holds an exclusive libcamera lock.
    We temporarily stop wireplumber, capture with rpicam-still, then restart it.
    picamera2 is kept as a fallback if rpicam-still is not in PATH.

    Camera tuning is driven by env vars (all optional):
      BP_CAP_W / BP_CAP_H       — capture resolution (default 1280×960)
      BP_BRIGHTNESS              — rpicam-still --brightness  (default  0.1, range -1..1)
      BP_CONTRAST                — rpicam-still --contrast    (default  1.5, range  0..32)
      BP_SHARPNESS               — rpicam-still --sharpness   (default  2.0, range  0..16)
      BP_SATURATION              — rpicam-still --saturation  (default  1.2, range  0..32)
      BP_SETTLE_MS               — settle time in ms          (default 1200)
    """
    w = int(os.environ.get("BP_CAP_W", 640))
    h = int(os.environ.get("BP_CAP_H", 480))

    # Camera tuning knobs
    brightness  = float(os.environ.get("BP_BRIGHTNESS",  0.10))
    contrast    = float(os.environ.get("BP_CONTRAST",    1.50))
    sharpness   = float(os.environ.get("BP_SHARPNESS",   2.00))
    saturation  = float(os.environ.get("BP_SATURATION",  1.20))
    settle_ms   = int(os.environ.get("BP_SETTLE_MS",     400))

    # ── Primary: rpicam-still (stop wireplumber first to release camera lock) ─
    if shutil.which("rpicam-still"):
        tmp = tempfile.mktemp(suffix=".jpg")
        _wireplumber_stop()
        try:
            r = subprocess.run(
                [
                    "rpicam-still", "--nopreview",
                    "-o", tmp,
                    "-t",           str(settle_ms),
                    "--width",      str(w),
                    "--height",     str(h),
                    "--brightness", str(brightness),
                    "--contrast",   str(contrast),
                    "--sharpness",  str(sharpness),
                    "--saturation", str(saturation),
                ],
                capture_output=True, text=True, timeout=20,
            )
            if r.returncode != 0:
                raise RuntimeError(
                    f"rpicam-still failed (rc={r.returncode}): "
                    f"{(r.stderr or r.stdout).strip()[-200:]}"
                )
            frame = cv2.imread(tmp)
            if frame is None:
                raise RuntimeError("rpicam-still wrote no image")
            return frame
        finally:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            _wireplumber_start()

    # ── Fallback: picamera2 ──────────────────────────────────────────────────
    if not PICAMERA2_AVAILABLE:
        raise RuntimeError("Neither rpicam-still nor picamera2 is available")

    old_handler = signal.signal(signal.SIGALRM, _camera_timeout_handler)
    signal.alarm(15)
    try:
        cam = Picamera2()
        cfg = cam.create_preview_configuration(main={"size": (w, h)})
        cam.configure(cfg)
        cam.start()
        time.sleep(1.5)
        frame = cam.capture_array()
        cam.stop()
        cam.close()
        return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def _wireplumber_stop():
    """Pause wireplumber so libcamera can acquire the camera."""
    try:
        subprocess.run(
            ["systemctl", "--user", "stop", "wireplumber"],
            capture_output=True, timeout=5,
        )
        time.sleep(0.3)
    except Exception:
        pass


def _wireplumber_start():
    """Restart wireplumber after camera capture."""
    try:
        subprocess.run(
            ["systemctl", "--user", "start", "wireplumber"],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass


def make_error_image(message: str) -> str:
    """Return a base64 JPEG of a plain error card (shown in the debug panel when camera fails)."""
    img = np.zeros((160, 640, 3), dtype=np.uint8)
    img[:] = (30, 30, 80)   # dark navy background
    cv2.putText(img, "CAMERA ERROR", (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (50, 80, 220), 2, cv2.LINE_AA)
    # Word-wrap the message at ~70 chars
    words = message.split()
    line, y = "", 90
    for w in words:
        if len(line) + len(w) + 1 > 70:
            cv2.putText(img, line, (20, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (160, 180, 255), 1, cv2.LINE_AA)
            line, y = w, y + 22
        else:
            line = (line + " " + w).strip()
    if line:
        cv2.putText(img, line, (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (160, 180, 255), 1, cv2.LINE_AA)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def crop_to_display(frame):
    x = int(os.environ.get("BP_CROP_X", 0))
    y = int(os.environ.get("BP_CROP_Y", 0))
    w = int(os.environ.get("BP_CROP_W", frame.shape[1]))
    h = int(os.environ.get("BP_CROP_H", frame.shape[0]))
    return frame[y:y+h, x:x+w]


def get_manual_band_crop(frame, prefix):
    """
    Return a crop of `frame` using BP_<prefix>_X/Y/W/H env vars.
    prefix is 'SYS' or 'DIA'.  Returns None if any variable is missing.
    Coordinates are clamped to frame bounds.
    """
    try:
        x = int(os.environ[f'BP_{prefix}_X'])
        y = int(os.environ[f'BP_{prefix}_Y'])
        w = int(os.environ[f'BP_{prefix}_W'])
        h = int(os.environ[f'BP_{prefix}_H'])
    except KeyError:
        return None
    fh, fw = frame.shape[:2]
    x = max(0, min(x, fw - 1))
    y = max(0, min(y, fh - 1))
    w = max(1, min(w, fw - x))
    h = max(1, min(h, fh - y))
    return frame[y:y + h, x:x + w]


def preprocess_band(band_bgr):
    """
    Convert a colour band crop to a clean binary image suitable for ssocr/Tesseract.
    Handles both LCD (dark-on-light) and LED (bright-on-dark) displays.
    """
    gray = cv2.cvtColor(band_bgr, cv2.COLOR_BGR2GRAY)

    scale = int(os.environ.get("BP_SCALE", 3))
    if scale > 1:
        gray = cv2.resize(gray, None, fx=scale, fy=scale,
                          interpolation=cv2.INTER_CUBIC)

    # Binarise: use fixed threshold if BP_THRESHOLD is set, else Otsu
    thresh_val = os.environ.get("BP_THRESHOLD", "")
    invert_flag = os.environ.get("BP_INVERT", "0").strip() == "1"

    if thresh_val:
        ttype = cv2.THRESH_BINARY_INV if invert_flag else cv2.THRESH_BINARY
        _, binary = cv2.threshold(gray, int(thresh_val), 255, ttype)
    else:
        ttype = cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU if invert_flag else cv2.THRESH_BINARY | cv2.THRESH_OTSU
        _, binary = cv2.threshold(gray, 0, 255, ttype)

    # Morphological opening removes isolated noise pixels
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    return binary


def ocr_band_ssocr(band_bgr):
    """
    Run ssocr on a single-band image.  Tries multiple threshold percentages
    and returns the first result that looks like a valid 2-3 digit number.
    Falls back to the best non-empty result if none are "valid".
    Returns (text: str, stderr: str).
    """
    gray = cv2.cvtColor(band_bgr, cv2.COLOR_BGR2GRAY)

    # Higher scale → ssocr has more pixels per segment → better detection
    scale = int(os.environ.get("BP_SCALE", 4))
    if scale > 1:
        gray = cv2.resize(gray, None, fx=scale, fy=scale,
                          interpolation=cv2.INTER_CUBIC)

    # Cap image size: ssocr hangs on very large images (e.g. when display
    # detection falls back to the full frame).  Keep it under 900px on any side.
    MAX_DIM = 900
    gh, gw = gray.shape
    if gh > MAX_DIM or gw > MAX_DIM:
        down = MAX_DIM / max(gh, gw)
        gray = cv2.resize(gray, (max(1, int(gw * down)), max(1, int(gh * down))))

    # Bilateral blur reduces camera noise without blurring segment edges
    gray = cv2.bilateralFilter(gray, 9, 75, 75)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        tmp = f.name
    try:
        cv2.imwrite(tmp, gray)
        invert_flag = os.environ.get("BP_INVERT", "0").strip() == "1"

        best_text = ""
        best_stderr = ""

        # Try a range of thresholds; return the first that yields 2–4 digits
        for t in (40, 50, 30, 60, 20, 70):
            cmd = ["ssocr", "-d", "-1"]
            if not invert_flag:
                cmd.append("invert")  # LCD: dark digits on light background
            cmd += ["-t", str(t), tmp]
            try:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                text = r.stdout.strip()
                digits = "".join(c for c in text if c.isdigit())
                # Skip "all same digit" results (e.g. 888, 8888) — ssocr noise
                # unless it's 2 digits (e.g. 88 is a plausible reading)
                if len(digits) >= 3 and len(set(digits)) == 1:
                    if not best_text:
                        best_text = text
                        best_stderr = r.stderr.strip()
                    continue
                if 2 <= len(digits) <= 4:
                    return text, r.stderr.strip()
                # Keep it as a fallback if it has any digits
                if digits and not best_text:
                    best_text = text
                    best_stderr = r.stderr.strip()
            except Exception:
                continue

        return best_text, best_stderr
    except Exception as e:
        return "", str(e)
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass


def ocr_band_tesseract(band_binary):
    """Tesseract fallback when ssocr fails."""
    if not TESSERACT_AVAILABLE:
        return ""
    cfg = r"--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789"
    text = pytesseract.image_to_string(band_binary, config=cfg).strip()
    return "".join(c for c in text if c.isdigit())


def ocr_band(band_bgr):
    """
    Full OCR pipeline for one band. Returns (int|None, raw_str).

    Order of attempts:
      1. Custom 7-segment decoder (multi-strategy mask + segment zone analysis)
      2. Tesseract (last resort — runs on adaptive-threshold binary image)
    ssocr has been removed; it reliably returns garbage on camera-captured LCDs.
    """
    # ── 1. Custom 7-segment decoder ──────────────────────────────────────────
    text7, coverage = ocr_band_7seg(band_bgr)
    digits7 = "".join(c for c in text7 if c.isdigit())
    unknowns = text7.count('?')

    # Accept if we decoded 2-4 digits with no unrecognised characters
    if 2 <= len(digits7) <= 4 and unknowns == 0:
        return int(digits7), text7

    # Accept partial (1 unknown) when we have 2-4 digits total and at least
    # 2 are recognised — handles "P" symbol that shows during measurement
    if len(digits7) >= 2 and unknowns <= 1:
        return (int(digits7) if digits7 else None), text7

    # ── 2. Tesseract last resort ──────────────────────────────────────────────
    if TESSERACT_AVAILABLE:
        binary = preprocess_band(band_bgr)
        digits_t = ocr_band_tesseract(binary)
        if 2 <= len(digits_t) <= 4:
            return int(digits_t), digits_t

    return None, text7 or ""


def find_display(frame):
    """
    Auto-detect the BP monitor's LCD panel using its distinctive green background.

    Most consumer BP monitors have a gray-green or teal-green LCD background,
    clearly different from the white plastic chassis and any room background.
    We threshold in HSV for that specific colour range, find the largest
    qualifying blob, and return it as the display crop.

    HSV defaults are tunable via environment variables:
      BP_LCD_H_LOW / BP_LCD_H_HIGH  (hue,        default 55 / 110)
      BP_LCD_S_LOW / BP_LCD_S_HIGH  (saturation, default 10 / 90)
      BP_LCD_V_LOW / BP_LCD_V_HIGH  (value,      default 60 / 220)

    Returns (roi, rect_on_frame):
      roi           — cropped display (BGR); full frame as fallback
      rect_on_frame — (x, y, w, h) or None if not found
    """
    fh, fw = frame.shape[:2]
    min_area = fh * fw * 0.005   # at least 0.5% of frame

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    def _try_detect(h_lo, h_hi, s_lo, s_hi, v_lo, v_hi):
        mask = cv2.inRange(hsv,
                           np.array([h_lo, s_lo, v_lo], dtype=np.uint8),
                           np.array([h_hi, s_hi, v_hi], dtype=np.uint8))
        # Close small holes (LCD digits create dark patches inside the panel)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.dilate(mask, kernel, iterations=1)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL,
                                       cv2.CHAIN_APPROX_SIMPLE)
        best, best_area = None, 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            if h == 0 or w == 0:
                continue
            if not (1.2 <= w / h <= 8.0):
                continue
            if area > best_area:
                best_area, best = area, (x, y, w, h)
        return best

    # First pass: env-var-tunable range (defaults cover most LCD panels)
    h_lo = int(os.environ.get("BP_LCD_H_LOW",  40))
    h_hi = int(os.environ.get("BP_LCD_H_HIGH", 130))
    s_lo = int(os.environ.get("BP_LCD_S_LOW",   5))
    s_hi = int(os.environ.get("BP_LCD_S_HIGH", 120))
    v_lo = int(os.environ.get("BP_LCD_V_LOW",   50))
    v_hi = int(os.environ.get("BP_LCD_V_HIGH", 230))
    best = _try_detect(h_lo, h_hi, s_lo, s_hi, v_lo, v_hi)

    # Second pass: broader range if first pass found nothing
    if best is None:
        best = _try_detect(0, 180, 0, 80, 80, 240)  # any dull/pastel colour

    if best is None:
        return frame, None

    x, y, w, h = best
    pad_x = int(w * 0.05)
    pad_y = int(h * 0.05)
    mx  = max(0,  x - pad_x)
    my  = max(0,  y - pad_y)
    mx2 = min(fw, x + w + pad_x)
    my2 = min(fh, y + h + pad_y)
    return frame[my:my2, mx:mx2], (mx, my, mx2 - mx, my2 - my)


def find_digit_rows(display_bgr):
    """
    Locate horizontal bands containing 7-segment digits using a projection profile.

    Rather than splitting the display into fixed thirds (which breaks when digits
    vary in size), we threshold the display crop, sum dark pixels per row, and
    find contiguous bands of activity.  Returns a list of up to 3 (y_top, y_bot)
    tuples sorted top-to-bottom, one per reading row (SYS / DIA / Pulse).
    Falls back to equal thirds if the projection finds nothing useful.
    """
    dh, dw = display_bgr.shape[:2]

    # Use the same mask generator as the 7-seg decoder for consistency
    binary, _strategy, coverage = _get_digit_mask(display_bgr)
    if binary is None or binary.max() == 0:
        third = dh // 3
        return [(0, third), (third, third * 2), (third * 2, dh)]

    # Horizontal projection: total bright (digit-segment) pixels per row
    proj = binary.sum(axis=1).astype(float)
    if proj.max() == 0:
        third = dh // 3
        return [(0, third), (third, third * 2), (third * 2, dh)]

    # Smooth to join nearby segments within a single digit row
    kernel_size = max(3, dh // 20)
    kernel = np.ones(kernel_size) / kernel_size
    smooth = np.convolve(proj, kernel, mode='same')

    # Threshold at 8% of peak — anything above is "active" (contains segments)
    active_thresh = smooth.max() * 0.08
    active = smooth > active_thresh

    # Find contiguous active spans
    spans = []
    start = None
    for i in range(dh):
        if active[i] and start is None:
            start = i
        elif not active[i] and start is not None:
            spans.append([start, i])
            start = None
    if start is not None:
        spans.append([start, dh])

    # Merge spans closer than 10% of display height
    gap_thresh = max(4, int(dh * 0.10))
    merged = []
    for span in spans:
        if merged and span[0] - merged[-1][1] < gap_thresh:
            merged[-1][1] = span[1]
        else:
            merged.append(span)

    # Filter tiny spans (noise — must be at least 5% of display height)
    min_span = max(4, int(dh * 0.05))
    merged = [s for s in merged if s[1] - s[0] >= min_span]

    if not merged:
        half = dh // 2
        return [(0, half), (half, dh)]

    # Add small vertical padding so segment tops/bottoms aren't clipped
    pad = max(2, int(dh * 0.02))
    rows = [(max(0, s[0] - pad), min(dh, s[1] + pad)) for s in merged]

    # Only SYS and DIA — pulse row is physically covered
    return rows[:2]


def build_debug_image(full_frame, display_bgr, detected_rect, band_results, bands_bgr, digit_rows=None):
    """
    Build a debug JPEG with two panels side-by-side:
      Left:   full raw camera frame with SYS (red) and DIA (green) crop boxes drawn
      Right:  stacked raw band crops (SYS top, DIA bottom) — no inversion/binarisation
    Returns base64-encoded JPEG string.
    """
    TARGET_H = 320   # height everything is scaled to

    # ── LEFT: raw frame annotated with SYS / DIA boxes ───────────────────────
    fh, fw = full_frame.shape[:2]
    scale_f = TARGET_H / fh
    left = cv2.resize(full_frame, (max(1, int(fw * scale_f)), TARGET_H))

    box_colors = {"SYS": (0, 0, 220), "DIA": (0, 200, 60)}
    for prefix, color in box_colors.items():
        try:
            bx = int(os.environ[f'BP_{prefix}_X'])
            by = int(os.environ[f'BP_{prefix}_Y'])
            bw = int(os.environ[f'BP_{prefix}_W'])
            bh_e = int(os.environ[f'BP_{prefix}_H'])
            x1s = int(bx * scale_f); y1s = int(by * scale_f)
            x2s = int((bx + bw) * scale_f); y2s = int((by + bh_e) * scale_f)
            cv2.rectangle(left, (x1s, y1s), (x2s, y2s), color, 2)
            cv2.putText(left, prefix, (x1s + 4, y1s + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2, cv2.LINE_AA)
        except KeyError:
            pass

    has_manual = 'BP_SYS_X' in os.environ and 'BP_DIA_X' in os.environ
    if not has_manual:
        cv2.putText(left, "No manual boxes", (6, TARGET_H - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (100, 100, 255), 1, cv2.LINE_AA)

    cv2.putText(left, "RAW", (6, 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.50, (220, 220, 220), 1, cv2.LINE_AA)

    # ── RIGHT: stacked raw band crops (no processing) ────────────────────────
    n_bands = len(bands_bgr)
    band_h = TARGET_H // max(n_bands, 1)
    band_labels = [r[0] for r in band_results]
    band_vals   = [r[2] for r in band_results]
    b_colors    = [(0, 0, 220), (0, 200, 60)]  # SYS=red-ish, DIA=green

    right_strips = []
    for i, band in enumerate(bands_bgr):
        bh, bw = band.shape[:2]
        label  = band_labels[i] if i < len(band_labels) else f"band{i}"
        val    = band_vals[i]   if i < len(band_vals)   else None
        bcolor = b_colors[i]    if i < len(b_colors)    else (180, 180, 180)

        if bh == 0 or bw == 0:
            strip = np.zeros((band_h, 200, 3), dtype=np.uint8)
        else:
            # Use raw colour crop — no inversion or binarisation
            scale_b = band_h / bh if bh > 0 else 1.0
            strip = cv2.resize(band, (max(1, int(bw * scale_b)), band_h))

            sh2, sw2 = strip.shape[:2]
            cv2.rectangle(strip, (0, 0), (sw2 - 1, sh2 - 1), bcolor, 2)
            cv2.putText(strip, label, (4, 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.50, bcolor, 2, cv2.LINE_AA)
            result_str = f"{val}" if val is not None else "?"
            cv2.putText(strip, result_str, (4, sh2 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

        right_strips.append(strip)

    if right_strips:
        max_w = max(s.shape[1] for s in right_strips)
        padded = []
        for s in right_strips:
            sh, sw = s.shape[:2]
            if sw < max_w:
                pad = np.zeros((sh, max_w - sw, 3), dtype=np.uint8)
                s = np.hstack([s, pad])
            padded.append(s)
        right = np.vstack(padded)
        if right.shape[0] != TARGET_H:
            right = cv2.resize(right, (right.shape[1], TARGET_H))
    else:
        right = np.zeros((TARGET_H, 200, 3), dtype=np.uint8)

    # ── Combine two panels ────────────────────────────────────────────────────
    combined = np.hstack([left, right])
    ok, buf = cv2.imencode(".jpg", combined, [cv2.IMWRITE_JPEG_QUALITY, 75])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def save_debug_frames(frame, display, bands_bgr, masks_info):
    """
    Write intermediate processing images to /tmp/bp_debug/ for diagnosis.
    Only runs when the env var BP_DEBUG_SAVE=1 is set.

    Saved files:
      01_raw_frame.jpg         — exactly what the camera captured
      02_display_crop.jpg      — what find_display() extracted
      03_band_N_raw.jpg        — the Nth row band (colour)
      03_band_N_mask.jpg       — the Nth band binary mask (white = segment ON)
    """
    if os.environ.get("BP_DEBUG_SAVE", "0") != "1":
        return
    import datetime
    ts = datetime.datetime.now().strftime("%H%M%S")
    out = f"/tmp/bp_debug/{ts}"
    os.makedirs(out, exist_ok=True)

    cv2.imwrite(f"{out}/01_raw_frame.jpg", frame)
    cv2.imwrite(f"{out}/02_display_crop.jpg", display)
    for i, (band, (mask, strat, cov)) in enumerate(zip(bands_bgr, masks_info)):
        cv2.imwrite(f"{out}/03_band{i}_{strat}_raw.jpg", band)
        cv2.imwrite(f"{out}/03_band{i}_{strat}_mask.jpg", mask)
    # Also write a summary text file
    with open(f"{out}/summary.txt", "w") as f:
        for i, (mask, strat, cov) in enumerate(masks_info):
            fill = float(np.count_nonzero(mask)) / max(mask.size, 1)
            f.write(f"band{i}: strategy={strat} bg_coverage={cov:.2f} mask_fill={fill:.2f}\n")


def ocr_display_easyocr(display_bgr):
    """
    Run EasyOCR on the full display crop and split the result into
    (sys_str, dia_str, pulse_str) by matching detected text boxes to
    vertical position (top-third / mid-third / bottom-third).

    EasyOCR returns a list of (bbox, text, confidence) tuples.
    We filter to digit-only strings, sort by vertical centre, and assign
    the top-most to SYS, middle to DIA, bottom to PULSE.

    Returns (sys_str, dia_str, pulse_str) — each is a digit string or ''.
    """
    reader = _get_easyocr_reader()
    if reader is None:
        return '', '', ''

    dh, dw = display_bgr.shape[:2]

    # EasyOCR works best on images ≥ 100px tall per text line.
    # Upscale if the display crop is small.
    scale = 1
    if dh < 150:
        scale = max(1, 150 // dh)
        display_bgr = cv2.resize(display_bgr, None, fx=scale, fy=scale,
                                  interpolation=cv2.INTER_CUBIC)
        dh, dw = display_bgr.shape[:2]

    try:
        results = reader.readtext(
            display_bgr,
            allowlist='0123456789',
            detail=1,
            paragraph=False,
            width_ths=0.7,
            height_ths=0.5,
        )
    except Exception:
        return '', '', ''

    if not results:
        return '', '', ''

    # Each result: (bbox [[x0,y0],[x1,y0],[x1,y1],[x0,y1]], text, conf)
    # Collect (norm_y, norm_x, digits) for every detection with any digit content.
    items = []
    for bbox, text, conf in results:
        digits = ''.join(c for c in text if c.isdigit())
        if not digits or conf < 0.25:
            continue
        xs = [pt[0] for pt in bbox]
        ys = [pt[1] for pt in bbox]
        x_centre = sum(xs) / len(xs)
        y_centre = sum(ys) / len(ys)
        items.append((y_centre / dh, x_centre / dw, digits))

    if not items:
        return '', '', ''

    # Group by slot: top half → SYS (slot 0), bottom half → DIA (slot 1)
    # Within each slot, sort detections left→right and concatenate so that
    # fragments like ['1','19'] in the top half reconstruct the full number '119'.
    slots = [[], []]
    for norm_y, norm_x, digits in items:
        slot = 0 if norm_y < 0.5 else 1
        slots[slot].append((norm_x, digits))

    row_strs = []
    for slot_items in slots:
        slot_items.sort(key=lambda t: t[0])   # left → right
        joined = ''.join(d for _, d in slot_items)
        row_strs.append(joined[:3])            # BP values are at most 3 digits

    return row_strs[0], row_strs[1], ''   # pulse always empty — physically covered


def _parse_bp_digits(s, lo, hi):
    """
    Try to extract a valid integer from digit string *s* that falls in [lo, hi].
    First tries the full string, then progressively shorter prefixes.
    Returns the integer or None.

    Example: '721', lo=40, hi=150 → tries 721 (fail), 72 (✓) → returns 72
             '119', lo=60, hi=250 → tries 119 (✓) → returns 119
    """
    if not s or not s.isdigit():
        return None
    for length in range(len(s), 0, -1):
        v = int(s[:length])
        if lo <= v <= hi:
            return v
    return None


def _capture_only_mode():
    """
    Capture one frame and output it as a JSON payload — no OCR.
    Used by the calibration UI to show a live preview.
    Output: {"mode":"capture","cap_w":W,"cap_h":H,"cap_image":"<base64 JPEG>"}
    """
    try:
        frame = capture_frame()
    except Exception as e:
        print(json.dumps({"mode": "capture", "error": str(e)}))
        sys.exit(0)

    h, w = frame.shape[:2]
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        print(json.dumps({"mode": "capture", "error": "Failed to encode JPEG"}))
        sys.exit(0)
    image_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    # Draw any already-configured manual band boxes so the user sees them
    vis = frame.copy()
    for prefix, color in (("SYS", (0, 0, 220)), ("DIA", (0, 180, 0))):
        try:
            bx = int(os.environ[f'BP_{prefix}_X'])
            by = int(os.environ[f'BP_{prefix}_Y'])
            bw = int(os.environ[f'BP_{prefix}_W'])
            bh = int(os.environ[f'BP_{prefix}_H'])
            cv2.rectangle(vis, (bx, by), (bx + bw, by + bh), color, 2)
            cv2.putText(vis, prefix, (bx + 4, by + 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
        except KeyError:
            pass

    ok2, buf2 = cv2.imencode(".jpg", vis, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if ok2:
        image_b64 = base64.b64encode(buf2.tobytes()).decode("ascii")

    print(json.dumps({
        "mode":      "capture",
        "cap_w":     w,
        "cap_h":     h,
        "cap_image": image_b64,
    }))
    sys.exit(0)


def _seg_sample_rect(gray, rx, ry, rw, rh):
    """Return the mean brightness in a rectangle of a grayscale frame."""
    h, w = gray.shape[:2]
    x1, y1 = max(0, rx), max(0, ry)
    x2, y2 = min(w, rx + rw), min(h, ry + rh)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    return float(gray[y1:y2, x1:x2].mean())


# Standard 7-segment bit patterns (a,b,c,d,e,f,g) → digit
_SEG_PATTERNS = {
    (1,1,1,1,1,1,0): 0,
    (0,1,1,0,0,0,0): 1,
    (1,1,0,1,1,0,1): 2,
    (1,1,1,1,0,0,1): 3,
    (0,1,1,0,0,1,1): 4,
    (1,0,1,1,0,1,1): 5,
    (1,0,1,1,1,1,1): 6,
    (1,1,1,0,0,0,0): 7,
    (1,1,1,1,1,1,1): 8,
    (1,1,1,1,0,1,1): 9,
    (0,0,0,0,0,0,0): None,  # blank / off
}


def _decode_digit(seg_vals, threshold):
    """Given 7 brightness values [a,b,c,d,e,f,g], return (digit_char, on_flags)."""
    on = tuple(1 if v >= threshold else 0 for v in seg_vals)
    d = _SEG_PATTERNS.get(on)
    return (str(d) if d is not None else None, on)


def _run_segment_test(config):
    """
    Capture one frame, sample all 42 rects, return per-segment ON/OFF + annotated image.
    Output JSON: { digits:[{name,segments:{a:bool,...},decoded:str|null}], imageData, capW, capH }
    """
    try:
        frame = capture_frame()
    except Exception as e:
        print(json.dumps({"error": f"Camera error: {e}"}))
        sys.exit(0)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    threshold = config.get("threshold", 120)
    seg_names = ["a", "b", "c", "d", "e", "f", "g"]

    result_digits = []
    vis = frame.copy()

    for dconf in config["digits"]:
        name = dconf["name"]
        segs_rects = dconf["segments"]
        seg_vals = [_seg_sample_rect(gray,
                                     segs_rects[s]["x"], segs_rects[s]["y"],
                                     segs_rects[s]["w"], segs_rects[s]["h"])
                    for s in seg_names]
        decoded, on_flags = _decode_digit(seg_vals, threshold)

        seg_result = {}
        for i, s in enumerate(seg_names):
            seg_result[s] = bool(on_flags[i])
            r = segs_rects[s]
            color = (0, 220, 0) if on_flags[i] else (0, 0, 220)
            cv2.rectangle(vis, (r["x"], r["y"]), (r["x"]+r["w"], r["y"]+r["h"]), color, 1)

        result_digits.append({"name": name, "segments": seg_result, "decoded": decoded})

    h, w = frame.shape[:2]
    ok, buf = cv2.imencode(".jpg", vis, [cv2.IMWRITE_JPEG_QUALITY, 80])
    img_b64 = base64.b64encode(buf.tobytes()).decode("ascii") if ok else ""

    print(json.dumps({
        "digits": result_digits,
        "imageData": img_b64,
        "capW": w, "capH": h,
    }))
    sys.exit(0)


def _run_segment_detection(config):
    """
    Main detection loop using segment config. Requires STABILITY_NEEDED consecutive
    identical SYS+DIA readings before confirming. Outputs same JSON schema as OCR path.
    """
    STABILITY_NEEDED = 4
    TIMEOUT_S = 120
    POLL_INTERVAL_S = 1.5

    threshold = config.get("threshold", 120)
    seg_names = ["a", "b", "c", "d", "e", "f", "g"]
    digit_configs = config["digits"]  # ordered: sys0,sys1,sys2,dia0,dia1,dia2

    stable_sys, stable_dia = None, None
    stable_count = 0
    import time
    start_t = time.time()

    while True:
        if time.time() - start_t > TIMEOUT_S:
            print(json.dumps({"valid": False, "reason": "timeout — no stable reading"}))
            sys.exit(0)

        try:
            frame = capture_frame()
        except Exception as e:
            time.sleep(POLL_INTERVAL_S)
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        digits_decoded = []

        for dconf in digit_configs:
            segs_rects = dconf["segments"]
            seg_vals = [_seg_sample_rect(gray,
                                         segs_rects[s]["x"], segs_rects[s]["y"],
                                         segs_rects[s]["w"], segs_rects[s]["h"])
                        for s in seg_names]
            decoded, _ = _decode_digit(seg_vals, threshold)
            digits_decoded.append(decoded)  # None = blank, str = digit char

        # sys0,sys1,sys2 → SYS value; dia0,dia1,dia2 → DIA value
        def digits_to_int(chars):
            s = "".join(c for c in chars if c is not None)
            if not s:
                return None
            try:
                return int(s)
            except ValueError:
                return None

        sys_val = digits_to_int(digits_decoded[0:3])
        dia_val = digits_to_int(digits_decoded[3:6])

        if sys_val is None or dia_val is None:
            stable_count = 0
            stable_sys, stable_dia = None, None
            time.sleep(POLL_INTERVAL_S)
            continue

        # Plausibility check
        if not (60 <= sys_val <= 250 and 40 <= dia_val <= 150):
            stable_count = 0
            stable_sys, stable_dia = None, None
            # Log to stderr for bridge log
            print(json.dumps({"valid": False, "reason": f"implausible: sys={sys_val} dia={dia_val}",
                               "sys": sys_val, "dia": dia_val}), file=sys.stderr)
            time.sleep(POLL_INTERVAL_S)
            continue

        if sys_val == stable_sys and dia_val == stable_dia:
            stable_count += 1
        else:
            stable_count = 1
            stable_sys, stable_dia = sys_val, dia_val

        if stable_count >= STABILITY_NEEDED:
            # Build annotated debug image
            vis = frame.copy()
            for dconf, dc in zip(digit_configs, digits_decoded):
                segs_rects = dconf["segments"]
                for s in seg_names:
                    r = segs_rects[s]
                    color = (0, 200, 0)
                    cv2.rectangle(vis, (r["x"], r["y"]), (r["x"]+r["w"], r["y"]+r["h"]), color, 1)
            ok, buf = cv2.imencode(".jpg", vis, [cv2.IMWRITE_JPEG_QUALITY, 75])
            dbg = base64.b64encode(buf.tobytes()).decode("ascii") if ok else ""

            print(json.dumps({
                "sys": sys_val, "dia": dia_val, "pulse": 0,
                "raw_sys": str(sys_val), "raw_dia": str(dia_val), "raw_pulse": "",
                "complete": True, "valid": True,
                "debug_image": dbg,
            }))
            sys.exit(0)

        time.sleep(POLL_INTERVAL_S)


def main():
    if "--capture-only" in sys.argv:
        _capture_only_mode()
        return  # never reached — _capture_only_mode exits

    # ── Segment-based detection paths ────────────────────────────────────────
    if "--test" in sys.argv:
        config_path = None
        if "--config" in sys.argv:
            idx = sys.argv.index("--config")
            if idx + 1 < len(sys.argv):
                config_path = sys.argv[idx + 1]
        if not config_path:
            print(json.dumps({"error": "--test requires --config <path>"}))
            sys.exit(1)
        try:
            with open(config_path) as f:
                config = json.load(f)
        except Exception as e:
            print(json.dumps({"error": f"Cannot load config: {e}"}))
            sys.exit(1)
        _run_segment_test(config)
        return

    # Check for seg_config.json alongside this script
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    _seg_config_path = os.path.join(_script_dir, "seg_config.json")
    if os.path.exists(_seg_config_path):
        try:
            with open(_seg_config_path) as f:
                seg_config = json.load(f)
            _run_segment_detection(seg_config)
        except Exception as e:
            # Fall through to OCR path if config is malformed
            print(json.dumps({"valid": False, "reason": f"Segment config error: {e}",
                               "raw_sys": "", "raw_dia": "", "raw_pulse": ""}), file=sys.stderr)
        return

    try:
        frame = capture_frame()
    except Exception as e:
        print(json.dumps({
            "valid": False,
            "reason": f"Camera error: {e}",
            "debug_image": make_error_image(str(e)),
            "raw_sys": "", "raw_dia": "", "raw_pulse": "",
        }))
        sys.exit(0)

    # Apply manual crop override if env vars are set, then auto-detect display
    coarse = crop_to_display(frame)

    # ── Per-band manual crop (BP_SYS_X/Y/W/H and BP_DIA_X/Y/W/H) ────────────
    # When these are set the user has calibrated exact crop regions — bypass
    # display auto-detection and row-splitting entirely.
    sys_manual = get_manual_band_crop(frame, 'SYS')
    dia_manual = get_manual_band_crop(frame, 'DIA')
    use_manual_bands = sys_manual is not None and dia_manual is not None

    if use_manual_bands:
        bands_bgr = [sys_manual, dia_manual]
        display = coarse           # keep coarse for debug image base
        detected_rect = None
        digit_rows = []
    else:
        display, detected_rect = find_display(coarse)

        # Dynamically locate digit rows — only SYS and DIA (pulse row covered)
        digit_rows = find_digit_rows(display)

        # Build exactly 2 band crops (SYS top, DIA bottom)
        dh = display.shape[0]
        bands_bgr = []
        for i in range(2):
            if i < len(digit_rows):
                y0, y1 = digit_rows[i]
            else:
                half = dh // 2
                y0, y1 = (0, half) if i == 0 else (half, dh)
            bands_bgr.append(display[y0:y1, :])

    # Collect masks for debug saving (does nothing unless BP_DEBUG_SAVE=1)
    masks_info = [_get_digit_mask(b) for b in bands_bgr]
    save_debug_frames(coarse, display, bands_bgr, masks_info)

    # ── Primary: EasyOCR on the full display crop ────────────────────────────
    raw_sys, raw_dia = '', ''
    sys_val, dia_val = None, None

    if EASYOCR_AVAILABLE:
        e_sys, e_dia, _ = ocr_display_easyocr(display)
        raw_sys = e_sys or ''
        raw_dia = e_dia or ''
        sys_val = _parse_bp_digits(e_sys, 60, 250)
        dia_val = _parse_bp_digits(e_dia, 40, 150)

    # ── Fallback: per-band custom 7-seg decoder for any slot still missing ───
    if sys_val is None:
        v, raw = ocr_band(bands_bgr[0])
        raw_sys = raw or raw_sys
        sys_val = v
    if dia_val is None and len(bands_bgr) > 1:
        v, raw = ocr_band(bands_bgr[1])
        raw_dia = raw or raw_dia
        dia_val = v

    # Pulse is physically covered — always omitted
    raw_pulse, pulse_val = '', None

    # ── Range validation ─────────────────────────────────────────────────────
    if sys_val is not None and not (60 <= sys_val <= 250):
        sys_val = None
    if dia_val is not None and not (40 <= dia_val <= 150):
        dia_val = None
    if sys_val is not None and dia_val is not None and sys_val <= dia_val:
        sys_val = None  # implausible reading

    band_results = [
        (BAND_LABELS[0], raw_sys,   sys_val),
        (BAND_LABELS[1], raw_dia,   dia_val),
    ]
    debug_image = build_debug_image(coarse, display, detected_rect, band_results, bands_bgr, digit_rows)

    complete = (sys_val is not None and dia_val is not None)

    if dia_val is None:
        print(json.dumps({
            "valid": False,
            "reason": f"OCR: no DIA yet — sys='{raw_sys}' dia='{raw_dia}'",
            "debug_image": debug_image,
            "raw_sys": raw_sys, "raw_dia": raw_dia, "raw_pulse": "",
        }))
        sys.exit(0)

    print(json.dumps({
        "sys":       sys_val,
        "dia":       dia_val,
        "pulse":     None,
        "raw_sys":   raw_sys,
        "raw_dia":   raw_dia,
        "raw_pulse": "",
        "complete":  complete,
        "valid":     True,
        "debug_image": debug_image,
    }))



if __name__ == "__main__":
    main()
