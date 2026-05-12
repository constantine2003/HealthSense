# Load Cell Archive (HX711 + ESP32)

Archived on 2026-05-09. The kiosk switched to the **Eufy Smart Scale C1 (T9146)** via Bluetooth LE.

## What's here

| File | Origin | Description |
|---|---|---|
| `firmware_main.cpp` | `KioskFirmware/src/main.cpp` | Full ESP32 firmware with HX711 load cell support |
| `WeightCalibration.svelte` | `src/lib/pages/WeightCalibration.svelte` | Calibration UI (tare → raw reads → factor → save) |
| `weight_config.json` | `weight_config.json` | Saved scale factor from last calibration |

## Load cell setup (for reference)

- **Hardware:** HX711 amplifier + 4× load cells wired in a Wheatstone bridge
- **Pins (ESP32):** DOUT = GPIO 4, SCK = GPIO 5
- **Library:** `bogde/HX711`
- **Known calibration factor:** Set via `weight_config.json` → `scaleFactor` field
- **Serial protocol:** `{"command":"tare"}` → `{"type":"tare_done"}` | `{"command":"weight_raw"}` → ADC counts | `{"command":"set_weight_scale","value":N}`

## How to restore

1. Copy `WeightCalibration.svelte` back to `src/lib/pages/`
2. Re-add `import WeightCalibration from './WeightCalibration.svelte'` in `checkup.svelte`
3. Re-flash ESP32 firmware from `firmware_main.cpp`
4. Copy `weight_config.json` to the project root (next to `serial-bridge/`)
5. In `server.js`: the `weight_load_config`, `weight_save_config`, `set_weight_scale` handlers are still present
6. Remove the Eufy BLE toggle from `checkup.svelte` if desired
