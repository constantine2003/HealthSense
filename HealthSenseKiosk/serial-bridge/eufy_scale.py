#!/usr/bin/env python3
"""
eufy_scale.py — Eufy Smart Scale C1 (T9146) BLE reader
Outputs newline-delimited JSON to stdout, compatible with the HealthSense
serial-bridge weight message format.

Message types emitted:
  {"type":"progress","sensor":"weight","progress":N}   — 0..90 during scan/connect
  {"type":"reading","sensor":"weight","value":X.XX}    — stable weight in kg
  {"type":"error","sensor":"weight","message":"..."}   — on failure

Usage:
  python3 eufy_scale.py [--mac AA:BB:CC:DD:EE:FF] [--continuous] [--timeout 30]
"""

import asyncio
import argparse
import json
import sys
from datetime import datetime

from bleak import BleakClient, BleakScanner
from bleak.exc import BleakError

# ── BLE UUIDs for Eufy C1 (T9146) / 1byone protocol ─────────────────────────
CHR_FFF1 = "0000fff1-0000-1000-8000-00805f9b34fb"  # WRITE  — commands
CHR_FFF4 = "0000fff4-0000-1000-8000-00805f9b34fb"  # NOTIFY — measurements
CHR_2A19 = "00002a19-0000-1000-8000-00805f9b34fb"  # READ   — battery level

EUFY_NAME_TOKENS = ["t9146", "eufy"]  # match "eufy T9146" or any eufy scale variant
SCAN_TIMEOUT    = 15.0      # seconds to scan for device (give user time to step on it)
CONNECT_TIMEOUT = 20.0      # seconds to wait for GATT connection
MEASURE_TIMEOUT = 40.0      # seconds to wait for a stable weight after connect
MAX_RETRIES     = 3         # GATT connection attempts before giving up


def emit(obj: dict):
    """Write a JSON line to stdout and flush immediately."""
    print(json.dumps(obj), flush=True)


def progress(n: int):
    emit({"type": "progress", "sensor": "weight", "progress": n})


def error(msg: str):
    emit({"type": "error", "sensor": "weight", "message": msg})


def reading(value_kg: float):
    emit({"type": "reading", "sensor": "weight", "value": round(value_kg, 2)})


# ── Command builders ──────────────────────────────────────────────────────────

def _build_unit_cmd(unit_kg: bool = True) -> bytes:
    """FD 37 [unit 00=kg/01=lb] 01 00 00 00 00 00 00 [XOR]"""
    unit = 0x00 if unit_kg else 0x01
    payload = bytearray([0xFD, 0x37, unit, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    xor = 0
    for b in payload[:-1]:
        xor ^= b
    payload[-1] = xor & 0xFF
    return bytes(payload)


def _build_clock_cmd() -> bytes:
    """F1 [YYYY BE high] [YYYY BE low] [MM] [DD] [HH] [mm] [SS]"""
    now = datetime.now()
    return bytes([
        0xF1,
        (now.year >> 8) & 0xFF, now.year & 0xFF,
        now.month, now.day,
        now.hour, now.minute, now.second,
    ])


# ── CF-frame parser ───────────────────────────────────────────────────────────

def _parse_cf_frame(data: bytes):
    """
    Parse a 0xCF measurement frame from characteristic FFF4.
    Returns (weight_kg: float, impedance_ohm: float | None) or None if not a CF frame.

    Frame layout (11+ bytes):
      [0]    = 0xCF  (header)
      [1..2] = impedance LE uint16 × 0.1 Ω
      [3..4] = weight   LE uint16 / 100.0 kg
      [5..8] = unknown / padding
      [9]    = 0x01 means impedance absent/invalid
      [10]   = unknown
    """
    if len(data) < 11 or data[0] != 0xCF:
        return None

    weight_raw = (data[4] << 8) | data[3]   # LE uint16
    imp_raw    = (data[2] << 8) | data[1]   # LE uint16

    weight_kg     = weight_raw / 100.0
    impedance_ohm = imp_raw * 0.1
    imp_valid     = (data[9] != 1) and (impedance_ohm != 0.0)

    return weight_kg, (impedance_ohm if imp_valid else None)


# ── Scanner ───────────────────────────────────────────────────────────────────

async def find_device(mac_override: str | None):
    """
    Scan for Eufy C1 and return a BLEDevice object (or the mac_override string).
    Returning the BLEDevice is important: bleak uses the internal D-Bus object
    path rather than the MAC address, which is stable even for random/rotating MACs.
    """
    if mac_override:
        return mac_override

    progress(5)
    emit({"type": "log", "message": "Scanning for Eufy Scale C1 (T9146)…"})

    found_device = None

    def detection_callback(device, advertisement_data):
        nonlocal found_device
        if found_device:
            return
        name = (device.name or "").lower()
        if any(tok in name for tok in EUFY_NAME_TOKENS):
            found_device = device
            emit({"type": "log", "message": f"Found: {device.name} @ {device.address}"})

    scanner = BleakScanner(detection_callback=detection_callback)
    await scanner.start()

    elapsed = 0.0
    while elapsed < SCAN_TIMEOUT:
        if found_device:
            break
        await asyncio.sleep(0.5)
        elapsed += 0.5
        pct = min(30, int((elapsed / SCAN_TIMEOUT) * 30))
        progress(5 + pct)

    await scanner.stop()
    return found_device


# ── GATT connection + measurement ─────────────────────────────────────────────

async def connect_and_read(device, continuous: bool):
    """
    Connect to the scale via GATT and wait for a weight reading.
    `device` should be a BLEDevice from find_device() so bleak uses the
    internal D-Bus path (immune to rotating random MACs).
    Retries up to MAX_RETRIES times on connection failures.
    """
    addr_str = device if isinstance(device, str) else device.address

    for attempt in range(1, MAX_RETRIES + 1):
        progress(35)
        emit({"type": "log", "message":
              f"Connecting to {addr_str} (attempt {attempt}/{MAX_RETRIES})…"})

        got_reading = asyncio.Event()
        last_weight: list[float] = []

        def on_disconnect(client):
            emit({"type": "log", "message": "Scale disconnected unexpectedly."})

        def notification_handler(sender, data: bytearray):
            data = bytes(data)

            # Short ACK frames (2 bytes)
            if len(data) == 2:
                if data[0] == 0xF1:
                    emit({"type": "log", "message": "Clock sync acknowledged."})
                elif data[0] == 0xF2 and data[1] == 0x00:
                    emit({"type": "log", "message": "End of history."})
                return

            result = _parse_cf_frame(data)
            if result is None:
                return

            weight_kg, imp = result
            if weight_kg <= 0:
                return

            last_weight.clear()
            last_weight.append(weight_kg)
            progress(85)
            emit({"type": "log", "message":
                  f"Weight: {weight_kg:.2f} kg" + (f", Impedance: {imp:.1f} Ω" if imp else "")})

            if not continuous:
                got_reading.set()

        try:
            async with BleakClient(device, disconnected_callback=on_disconnect,
                                   timeout=CONNECT_TIMEOUT, pair=True) as client:
                # Allow BlueZ to finish service discovery + HID negotiation before commands
                await asyncio.sleep(2.0)

                if not client.is_connected:
                    emit({"type": "log", "message": "Link dropped right after connect — retrying…"})
                    await asyncio.sleep(2.0)
                    continue

                progress(50)
                emit({"type": "log", "message": "Connected. Setting up notifications…"})

                # Battery level (optional)
                try:
                    batt = await client.read_gatt_char(CHR_2A19)
                    emit({"type": "log", "message": f"Battery: {batt[0]}%"})
                except Exception:
                    pass

                await client.start_notify(CHR_FFF4, notification_handler)
                progress(60)

                # Send unit (kg) + clock sync commands
                await client.write_gatt_char(CHR_FFF1, _build_unit_cmd(unit_kg=True),
                                             response=False)
                await asyncio.sleep(0.3)
                await client.write_gatt_char(CHR_FFF1, _build_clock_cmd(), response=False)
                progress(70)

                emit({"type": "log", "message": "Step on the scale…"})
                progress(75)

                if continuous:
                    try:
                        await asyncio.sleep(MEASURE_TIMEOUT)
                    except asyncio.CancelledError:
                        pass
                    if last_weight:
                        reading(last_weight[-1])
                    else:
                        error("No weight reading received in continuous mode.")
                    return
                else:
                    try:
                        await asyncio.wait_for(got_reading.wait(), timeout=MEASURE_TIMEOUT)
                        progress(95)
                        if last_weight:
                            reading(last_weight[0])
                        else:
                            error("Parsing failed — no valid weight in frame.")
                    except asyncio.TimeoutError:
                        if last_weight:
                            # Use last partial reading if we got one
                            reading(last_weight[-1])
                        else:
                            error("Timeout: no weight reading received. "
                                  "Is the scale on and stepped on?")

                try:
                    await client.stop_notify(CHR_FFF4)
                except Exception:
                    pass
                return  # success

        except (BleakError, OSError) as exc:
            emit({"type": "log", "message": f"Attempt {attempt}/{MAX_RETRIES} failed: {exc}"})
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2.0)
            else:
                error(f"BLE error after {MAX_RETRIES} attempts: {exc}")


# ── Entry point ───────────────────────────────────────────────────────────────

async def main(mac_override: str | None, continuous: bool):
    progress(0)

    device = await find_device(mac_override)
    if not device:
        error(f"Eufy Scale C1 not found after {SCAN_TIMEOUT:.0f}s scan. "
              "Make sure the scale is awake (step on it briefly) and Bluetooth is enabled.")
        return

    try:
        await connect_and_read(device, continuous)
    except asyncio.TimeoutError:
        error("Overall connection+measurement timeout exceeded.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read weight from Eufy Smart Scale C1 via BLE.")
    parser.add_argument("--mac",        default=None,  help="Override BLE MAC address (skip scan)")
    parser.add_argument("--continuous", action="store_true",
                        help="Keep streaming; emit last reading on timeout")
    parser.add_argument("--timeout",    type=float, default=40.0,
                        help="Measurement timeout in seconds")
    args = parser.parse_args()
    MEASURE_TIMEOUT = args.timeout  # noqa: F841 (module-level var used in closures)

    try:
        asyncio.run(main(args.mac, args.continuous))
    except KeyboardInterrupt:
        pass
