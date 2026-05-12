#!/usr/bin/env python3
"""
eufy_cloud.py — HealthSense Eufy Cloud API weight reader

Authenticates with the EufyLife cloud API using stored credentials, then
polls /v1/device/data until a reading newer than the invocation time appears.

Protocol:
  All output is newline-delimited JSON to stdout, same format as eufy_scale.py:
    {"type":"progress","value":N}       — 0-100
    {"type":"log","message":"..."}      — human-readable status
    {"type":"reading","value":N,...}    — final weight (+ body composition)
    {"type":"error","message":"..."}    — fatal error, exits non-zero

Credentials are stored in eufy_credentials.json (next to this file):
  {
    "email":         "you@example.com",
    "password":      "yourpassword",
    "access_token":  "",
    "user_id":       "",
    "token_expires_at": 0
  }
"""

import sys
import json
import time
import argparse
import os
from pathlib import Path

import requests

# ── Eufy API constants (from m4ary/eufylife-api-hacs) ─────────────────────────

API_BASE   = "https://api.eufylife.com"
CLIENT_ID  = "eufy-app"
CLIENT_SECRET = "8FHf22gaTKu7MZXqz5zytw"

LOGIN_HEADERS = {
    "Accept":          "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "User-Agent":      "EufyLife-iOS-3.3.7",
    "Category":        "Health",
    "Language":        "en",
    "Timezone":        "UTC",
    "Country":         "US",
    "Content-Type":    "application/json",
}

DATA_UA = "Eufylife-iOS-3.3.7-281"

CREDS_PATH = Path(__file__).parent / "eufy_credentials.json"

# ── Polling config ─────────────────────────────────────────────────────────────

POLL_INTERVAL = 5.0   # seconds between API polls
POLL_TIMEOUT  = 120.0 # give up after 2 minutes


# ── Output helpers ─────────────────────────────────────────────────────────────

def emit(obj: dict):
    print(json.dumps(obj), flush=True)

def progress(pct: int):
    emit({"type": "progress", "value": pct})

def log(msg: str):
    emit({"type": "log", "message": msg})

def error(msg: str):
    emit({"type": "error", "message": msg})
    sys.exit(1)

def reading(weight_kg: float, extras: dict | None = None):
    payload = {"type": "reading", "sensor": "weight", "value": round(weight_kg, 2)}
    if extras:
        payload.update(extras)
    emit(payload)


# ── Credential management ──────────────────────────────────────────────────────

def load_creds() -> dict:
    if CREDS_PATH.exists():
        try:
            return json.loads(CREDS_PATH.read_text())
        except Exception:
            pass
    return {
        "email":            os.environ.get("EUFY_EMAIL", ""),
        "password":         os.environ.get("EUFY_PASSWORD", ""),
        "access_token":     "",
        "user_id":          "",
        "token_expires_at": 0,
    }

def save_creds(creds: dict):
    CREDS_PATH.write_text(json.dumps(creds, indent=2))


# ── Authentication ─────────────────────────────────────────────────────────────

def login(creds: dict) -> dict:
    """Perform email/password login. Returns updated creds dict with token."""
    email    = creds.get("email", "").strip()
    password = creds.get("password", "").strip()
    if not email or not password:
        error(
            "Eufy credentials not set. "
            "Open the bridge settings and enter your EufyLife email and password."
        )

    log(f"Logging into EufyLife cloud as {email}…")
    try:
        resp = requests.post(
            f"{API_BASE}/v1/user/v2/email/login",
            json={
                "client_id":     CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "email":         email,
                "password":      password,
            },
            headers=LOGIN_HEADERS,
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        error(f"Login request failed: {e}")

    if data.get("res_code") != 1:
        error(f"Login error from Eufy: {data.get('message', 'unknown error')}")

    creds["access_token"]     = data["access_token"]
    creds["user_id"]          = data["user_id"]
    creds["token_expires_at"] = time.time() + data.get("expires_in", 2_592_000)
    save_creds(creds)
    log("Login successful ✓")
    return creds


def ensure_token(creds: dict) -> dict:
    """Return valid creds, re-logging in if token is missing or expiring soon."""
    expires_at = creds.get("token_expires_at", 0)
    if not creds.get("access_token") or time.time() > expires_at - 300:
        creds = login(creds)
    return creds


# ── Data fetching ──────────────────────────────────────────────────────────────

def data_headers(creds: dict) -> dict:
    return {
        "Host":            "api.eufylife.com",
        "Accept":          "*/*",
        "Uid":             creds["user_id"],
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent":      DATA_UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Token":           creds["access_token"],
    }


def fetch_records(creds: dict, after_ts: int | None = None) -> list[dict]:
    url = f"{API_BASE}/v1/device/data"
    if after_ts:
        url += f"?after={after_ts}"
    try:
        resp = requests.get(url, headers=data_headers(creds), timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        raise RuntimeError(f"API request failed: {e}")

    if data.get("res_code") != 1:
        raise RuntimeError(f"API error: {data.get('message', 'unknown')}")

    return data.get("data", [])


def parse_record(record: dict) -> dict | None:
    """
    Parse a raw device_data record.
    Returns a dict with weight_kg and optional body composition fields,
    or None if no valid weight is present.
    """
    scale = record.get("scale_data") or {}

    raw_weight = scale.get("weight")
    if not raw_weight:
        return None

    # Weight is in decigrams → kg
    weight_kg = round(raw_weight / 10.0, 2)
    if weight_kg <= 0:
        return None

    result = {"weight_kg": weight_kg}

    # Optional body composition fields (all direct floats)
    for field in ("body_fat", "muscle_mass", "bmi", "water",
                  "bone_mass", "bmr", "body_age", "visceral_fat", "protein_ratio"):
        val = scale.get(field)
        if val is not None:
            result[field] = val

    result["measured_at"] = record.get("update_time") or record.get("create_time")
    result["customer_id"] = record.get("customer_id", "")
    result["product_code"] = record.get("product_code", "")

    return result


# ── Main polling loop ──────────────────────────────────────────────────────────

def main(poll_only: bool, customer_id_filter: str | None):
    """
    Poll the Eufy cloud API until a reading newer than `start_ts` arrives.

    poll_only: if True, just fetch and print whatever the API has right now
               (used for testing credentials / checking last reading).
    """
    start_ts = int(time.time())

    progress(0)
    log("Connecting to EufyLife cloud…")

    creds = load_creds()
    creds = ensure_token(creds)
    progress(20)

    if poll_only:
        # Fetch most recent record (no after filter)
        log("Fetching latest reading from cloud…")
        try:
            records = fetch_records(creds)
        except RuntimeError as e:
            error(str(e))

        if not records:
            error("No records found in EufyLife account.")

        # Sort by newest first
        records.sort(key=lambda r: r.get("update_time") or 0, reverse=True)
        parsed = None
        for rec in records:
            parsed = parse_record(rec)
            if parsed:
                break

        if not parsed:
            error("No valid weight readings in cloud history.")

        reading(parsed["weight_kg"], {k: v for k, v in parsed.items() if k != "weight_kg"})
        progress(100)
        return

    # ── Live mode: wait for a NEW reading ─────────────────────────────────────
    log("Waiting for a new reading… Open the EufyLife app and step on the scale.")
    progress(30)

    elapsed   = 0.0
    poll_num  = 0

    while elapsed < POLL_TIMEOUT:
        time.sleep(POLL_INTERVAL)
        elapsed  += POLL_INTERVAL
        poll_num += 1

        pct = min(90, 30 + int((elapsed / POLL_TIMEOUT) * 60))
        progress(pct)

        try:
            records = fetch_records(creds, after_ts=start_ts - 30)
        except RuntimeError as e:
            log(f"Poll error (will retry): {e}")
            continue

        if not records:
            log(f"No new readings yet… ({int(elapsed)}s elapsed)")
            continue

        # Find the most recent record newer than start_ts
        records.sort(key=lambda r: r.get("update_time") or 0, reverse=True)
        for rec in records:
            rec_ts = rec.get("update_time") or 0
            if rec_ts < start_ts - 60:
                # Skip readings that are older than 1 min before we started
                continue
            if customer_id_filter and not rec.get("customer_id", "").startswith(customer_id_filter):
                continue
            parsed = parse_record(rec)
            if parsed:
                log(f"New reading received: {parsed['weight_kg']} kg")
                progress(100)
                reading(parsed["weight_kg"], {k: v for k, v in parsed.items() if k != "weight_kg"})
                return

        log(f"Syncing… ({int(elapsed)}s)")

    error(f"Timeout: no new reading appeared after {int(POLL_TIMEOUT)}s. "
          "Make sure the EufyLife app is open on your phone while stepping on the scale.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch weight from EufyLife cloud API.")
    parser.add_argument("--poll-only",  action="store_true",
                        help="Fetch the latest stored reading without waiting for a new one")
    parser.add_argument("--customer",   default=None,
                        help="Filter by customer_id prefix (first 8 chars)")
    args = parser.parse_args()

    try:
        main(poll_only=args.poll_only, customer_id_filter=args.customer)
    except KeyboardInterrupt:
        pass
