<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';
  import {
    startMeasurement,
    cancelMeasurement,
    bridgeStatus,
    measureProgress as esp32Progress,
    latestReading,
    lastError,
    sensorStatus,
    bpLiveReading,
    bpDebugFrame,
    bpTestResult,
    bpSegmentsLoaded,
    weightLiveReading,
    send as wsSend,
    type SensorKey,
    eufyCredentialsConfigured,
    eufyBodyComposition,
  } from '../stores/esp32Store';

  export let onFinish: (data: any) => void;
  export let onCancel: () => void;
  export let user: any;

  interface CheckupResults {
    weight: number;
    height: number;
    temp: number;
    spo2: number;
    heartRate: number;
    bp: string;
  }

  let bpManualEntry = false;
  let bpManualSys = '';
  let bpManualDia = '';

  type SegRect  = { x: number; y: number; w: number; h: number };
  type DigitSegs = Record<string, SegRect>;
  type AllSegs  = Record<string, DigitSegs>;

  const DIGIT_NAMES = ['sys0', 'sys1', 'sys2', 'dia0', 'dia1', 'dia2'] as const;
  type DigitName = typeof DIGIT_NAMES[number];
  const SEG_NAMES   = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
  const SEG_COLOR: Record<string, string> = {
    sys0: '#ef4444', sys1: '#ef4444', sys2: '#ef4444',
    dia0: '#22c55e', dia1: '#22c55e', dia2: '#22c55e',
  };

  function makeDigitSegs(cx: number, cy: number): DigitSegs {
    const hw = 22, hh = 6;
    const vw = 6,  vh = 28;
    return {
      a: { x: Math.round(cx - hw/2), y: Math.round(cy - 38),         w: hw, h: hh },
      b: { x: Math.round(cx + 12),   y: Math.round(cy - 38 + hh + 1), w: vw, h: vh },
      c: { x: Math.round(cx + 12),   y: Math.round(cy + 3),           w: vw, h: vh },
      d: { x: Math.round(cx - hw/2), y: Math.round(cy + 32),          w: hw, h: hh },
      e: { x: Math.round(cx - 18),   y: Math.round(cy + 3),           w: vw, h: vh },
      f: { x: Math.round(cx - 18),   y: Math.round(cy - 38 + hh + 1), w: vw, h: vh },
      g: { x: Math.round(cx - hw/2), y: Math.round(cy - hh/2),        w: hw, h: hh },
    };
  }

  function defaultSegPositions(): AllSegs {
    const sysY = 80, diaY = 220;
    const xs = [65, 125, 185];
    return {
      sys0: makeDigitSegs(xs[0], sysY), sys1: makeDigitSegs(xs[1], sysY), sys2: makeDigitSegs(xs[2], sysY),
      dia0: makeDigitSegs(xs[0], diaY), dia1: makeDigitSegs(xs[1], diaY), dia2: makeDigitSegs(xs[2], diaY),
    };
  }

  let segCalibMode = false;
  let activeDigit: DigitName = 'sys0';
  let activeSeg: string | null = null;
  let allSegs: AllSegs = defaultSegPositions();
  let segThreshold = 40;
  let isTesting = false;

  let camBrightness = 0.10;
  let camContrast   = 1.50;
  let camSharpness  = 2.00;
  let camSaturation = 1.20;

  let calibPreviewImg: HTMLImageElement | null = null;
  let calibPreviewContainer: HTMLDivElement | null = null;

  interface SegDragState {
    digit: string; seg: string; mode: 'move' | 'resize';
    startX: number; startY: number; startRect: SegRect;
  }
  let segDragState: SegDragState | null = null;

  function openSegCalib() {
    segCalibMode = true;
    bpTestResult.set(null);
    bpSegmentsLoaded.set(null);
    _segConfigApplied = false;
    eyedropperActive = null;
    isDraggingSel = false;
    selStart = selCurrent = null;
    wsSend({ command: 'bp_calibrate_start' });
    wsSend({ command: 'bp_load_segments' });
  }

  let _segConfigApplied = false;

  function _applyLoadedConfig(cfg: any) {
    if (_segConfigApplied) return;
    if (!cfg?.digits || !Array.isArray(cfg.digits)) return;
    const img = calibPreviewImg;
    if (!img) return;
    const capW = $bpDebugFrame?.capW || 640;
    const capH = $bpDebugFrame?.capH || 480;
    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    if (displayW <= 0 || displayH <= 0) return;
    const sx = displayW / capW;
    const sy = displayH / capH;

    const loaded: AllSegs = { ...defaultSegPositions() };
    for (const d of cfg.digits as any[]) {
      if (!d.name || !d.segments) continue;
      const segs: DigitSegs = {};
      for (const s of SEG_NAMES) {
        const r = d.segments[s];
        if (!r) continue;
        segs[s] = { x: Math.round(r.x * sx), y: Math.round(r.y * sy), w: Math.max(4, Math.round(r.w * sx)), h: Math.max(2, Math.round(r.h * sy)) };
      }
      if (Object.keys(segs).length === SEG_NAMES.length) loaded[d.name] = segs;
    }
    allSegs = loaded;
    if (cfg.threshold !== undefined) segThreshold = cfg.threshold;
    if (cfg.camera) {
      const cam = cfg.camera;
      if (cam.brightness !== undefined) camBrightness = cam.brightness;
      if (cam.contrast   !== undefined) camContrast   = cam.contrast;
      if (cam.sharpness  !== undefined) camSharpness  = cam.sharpness;
      if (cam.saturation !== undefined) camSaturation = cam.saturation;
    }
    _segConfigApplied = true;
  }

  $: if ($bpSegmentsLoaded && segCalibMode && $bpDebugFrame) _applyLoadedConfig($bpSegmentsLoaded);

  function closeSegCalib() {
    segCalibMode = false;
    _segConfigApplied = false;
    eyedropperActive = null;
    isDraggingSel = false;
    selStart = selCurrent = null;
    bpSegmentsLoaded.set(null);
    wsSend({ command: 'bp_calibrate_stop' });
  }

  function saveSegCalib() {
    const img = calibPreviewImg;
    const capW = $bpDebugFrame?.capW || 640;
    const capH = $bpDebugFrame?.capH || 480;
    const displayW = img?.clientWidth  || capW;
    const displayH = img?.clientHeight || capH;
    const sx = capW / displayW;
    const sy = capH / displayH;

    const scaledDigits = DIGIT_NAMES.map((name) => {
      const segs: Record<string, { x: number; y: number; w: number; h: number }> = {};
      for (const s of SEG_NAMES) {
        const r = allSegs[name][s];
        segs[s] = { x: Math.max(0, Math.round(r.x * sx)), y: Math.max(0, Math.round(r.y * sy)), w: Math.max(4, Math.round(r.w * sx)), h: Math.max(2, Math.round(r.h * sy)) };
      }
      return { name, segments: segs };
    });

    wsSend({ command: 'bp_save_segments', digits: scaledDigits, threshold: segThreshold, camera: { brightness: camBrightness, contrast: camContrast, sharpness: camSharpness, saturation: camSaturation } });
    closeSegCalib();
  }

  function copyDigitToNext() {
    const idx = (DIGIT_NAMES as readonly string[]).indexOf(activeDigit);
    if (idx < 0 || idx >= DIGIT_NAMES.length - 1) return;
    const nextName = DIGIT_NAMES[idx + 1] as DigitName;
    const src = allSegs[activeDigit];
    const allX = SEG_NAMES.flatMap((s) => [src[s].x, src[s].x + src[s].w]);
    const digitW = Math.max(...allX) - Math.min(...allX);
    const shiftX = Math.round(digitW * 1.25);
    const newSegs: DigitSegs = {};
    for (const s of SEG_NAMES) newSegs[s] = { ...src[s], x: src[s].x + shiftX };
    allSegs = { ...allSegs, [nextName]: newSegs };
    activeDigit = nextName;
  }

  function resetActiveDigit() {
    allSegs = { ...allSegs, [activeDigit]: defaultSegPositions()[activeDigit] };
  }

  type EyedropperTarget = 'background' | 'segment' | null;
  let eyedropperActive: EyedropperTarget = null;
  let sampledBg: number | null = null;
  let sampledSeg: number | null = null;

  let selStart:   { clientX: number; clientY: number } | null = null;
  let selCurrent: { clientX: number; clientY: number } | null = null;
  let isDraggingSel = false;

  function sampleAreaGray(imgEl: HTMLImageElement, containerEl: HTMLElement, dispX: number, dispY: number, dispW: number, dispH: number): number | null {
    try {
      const cRect = containerEl.getBoundingClientRect();
      const iRect = imgEl.getBoundingClientRect();
      const natW  = imgEl.naturalWidth  || iRect.width;
      const natH  = imgEl.naturalHeight || iRect.height;
      const scale   = Math.min(iRect.width / natW, iRect.height / natH);
      const offsetX = (iRect.width  - natW * scale) / 2 + (iRect.left - cRect.left);
      const offsetY = (iRect.height - natH * scale) / 2 + (iRect.top  - cRect.top);
      const nx1 = Math.max(0,    Math.round((dispX          - offsetX) / scale));
      const ny1 = Math.max(0,    Math.round((dispY          - offsetY) / scale));
      const nx2 = Math.min(natW, Math.round((dispX + dispW  - offsetX) / scale));
      const ny2 = Math.min(natH, Math.round((dispY + dispH  - offsetY) / scale));
      if (nx2 <= nx1 || ny2 <= ny1) return null;
      const canvas = document.createElement('canvas');
      canvas.width = natW; canvas.height = natH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(imgEl, 0, 0, natW, natH);
      const data = ctx.getImageData(nx1, ny1, nx2 - nx1, ny2 - ny1).data;
      let sum = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) sum += 0.114 * data[i] + 0.587 * data[i + 1] + 0.299 * data[i + 2];
      return Math.round(sum / n);
    } catch { return null; }
  }

  function samplePixelGray(imgEl: HTMLImageElement, clientX: number, clientY: number): number | null {
    try {
      const rect = imgEl.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const natW = imgEl.naturalWidth  || rect.width;
      const natH = imgEl.naturalHeight || rect.height;
      const scale = Math.min(rect.width / natW, rect.height / natH);
      const renderW = natW * scale;
      const renderH = natH * scale;
      const offsetX = (rect.width  - renderW) / 2;
      const offsetY = (rect.height - renderH) / 2;
      const nx = Math.round((px - offsetX) / scale);
      const ny = Math.round((py - offsetY) / scale);
      if (nx < 0 || ny < 0 || nx >= natW || ny >= natH) return null;
      const canvas = document.createElement('canvas');
      canvas.width = natW; canvas.height = natH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(imgEl, 0, 0, natW, natH);
      const [r, g, b] = ctx.getImageData(nx, ny, 1, 1).data;
      return Math.round(0.114 * r + 0.587 * g + 0.299 * b);
    } catch { return null; }
  }

  function onSelPointerDown(e: PointerEvent) {
    if (!eyedropperActive || !calibPreviewContainer) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    selStart   = { clientX: e.clientX, clientY: e.clientY };
    selCurrent = { clientX: e.clientX, clientY: e.clientY };
    isDraggingSel = true;
  }

  function onSelPointerMove(e: PointerEvent) {
    if (!isDraggingSel) return;
    e.preventDefault();
    selCurrent = { clientX: e.clientX, clientY: e.clientY };
  }

  function onSelPointerUp(e: PointerEvent) {
    if (!isDraggingSel || !calibPreviewImg || !calibPreviewContainer) return;
    e.preventDefault();
    isDraggingSel = false;
    let gray: number | null = null;
    if (selStart && selCurrent) {
      const cRect = calibPreviewContainer.getBoundingClientRect();
      const x1 = Math.min(selStart.clientX, selCurrent.clientX) - cRect.left;
      const y1 = Math.min(selStart.clientY, selCurrent.clientY) - cRect.top;
      const x2 = Math.max(selStart.clientX, selCurrent.clientX) - cRect.left;
      const y2 = Math.max(selStart.clientY, selCurrent.clientY) - cRect.top;
      const w  = x2 - x1, h = y2 - y1;
      if (w >= 4 && h >= 4) gray = sampleAreaGray(calibPreviewImg, calibPreviewContainer, x1, y1, w, h);
      else gray = samplePixelGray(calibPreviewImg, selStart.clientX, selStart.clientY);
    }
    selStart = selCurrent = null;
    if (gray === null) return;
    if (eyedropperActive === 'background') sampledBg = gray;
    else sampledSeg = gray;
    eyedropperActive = null;
    if (sampledBg !== null && sampledSeg !== null) segThreshold = Math.round((sampledBg + sampledSeg) / 2);
  }

  function onSelPointerCancel() { isDraggingSel = false; selStart = selCurrent = null; }

  function testSegments() {
    const img = calibPreviewImg;
    if (!img) return;
    isTesting = true;
    const capW = $bpDebugFrame?.capW || 640;
    const capH = $bpDebugFrame?.capH || 480;
    const displayW = img.clientWidth || capW;
    const displayH = img.clientHeight || capH;
    const sx = capW / displayW, sy = capH / displayH;
    const scaledDigits = DIGIT_NAMES.map((name) => {
      const segs: Record<string, { x: number; y: number; w: number; h: number }> = {};
      for (const s of SEG_NAMES) {
        const r = allSegs[name][s];
        segs[s] = { x: Math.max(0,Math.round(r.x*sx)), y: Math.max(0,Math.round(r.y*sy)), w: Math.max(4,Math.round(r.w*sx)), h: Math.max(2,Math.round(r.h*sy)) };
      }
      return { name, segments: segs };
    });
    wsSend({ command: 'bp_test_segments', digits: scaledDigits, threshold: segThreshold });
  }

  $: if ($bpTestResult) isTesting = false;

  function onSegPointerDown(e: PointerEvent, digit: string, seg: string, mode: 'move' | 'resize') {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activeDigit = digit as DigitName;
    activeSeg = `${digit}:${seg}`;
    segDragState = { digit, seg, mode, startX: e.clientX, startY: e.clientY, startRect: { ...allSegs[digit][seg] } };
  }

  function onSegPointerMove(e: PointerEvent) {
    if (!segDragState) return;
    const dx = e.clientX - segDragState.startX;
    const dy = e.clientY - segDragState.startY;
    const r = { ...segDragState.startRect };
    if (segDragState.mode === 'move') { r.x = Math.round(r.x + dx); r.y = Math.round(r.y + dy); }
    else { r.w = Math.max(6, Math.round(r.w + dx)); r.h = Math.max(4, Math.round(r.h + dy)); }
    allSegs = { ...allSegs, [segDragState.digit]: { ...allSegs[segDragState.digit], [segDragState.seg]: r } };
  }

  function onSegPointerUp() { segDragState = null; }

  $: bpParts = results.bp !== '0/0' ? results.bp.split('/') : ['0', '0'];
  $: bpSys = parseInt(bpParts[0]) || 0;
  $: bpDia = parseInt(bpParts[1]) || 0;

  type SensorPhase = 'weight' | 'height' | 'temp' | 'spo2' | 'bp';
  type Phase = SensorPhase | 'review';

  let currentPhase: Phase = 'review';
  let isScanning = false;
  let isCountingDown = false;
  let hasCaptured = false;
  let isRedoingSpecific = false;
  let mode: 'idle' | 'single' | 'full' = 'idle';
  let countdown = 3;
  let progress = 0;

  let results: CheckupResults = { weight: 0, height: 0, temp: 0, spo2: 0, heartRate: 0, bp: "0/0" };

  const unsubProgress = esp32Progress.subscribe((val) => {
    if (!isScanning) return;
    progress = val;
    if (val >= 100) {
      isScanning = false;
      // Fallback for SpO2: if scan expired before stability was reached, use last valid reading
      if (currentPhase === 'spo2' && !hasCaptured && spo2Buffer.length > 0) {
        const last = spo2Buffer[spo2Buffer.length - 1];
        results.spo2      = last.spo2;
        results.heartRate = last.hr;
        hasCaptured = true;
        progress    = 100;
      }
    }
  });

  const unsubReading = latestReading.subscribe((reading) => {
    if (!reading) return;
    const sensor = reading.sensor as SensorKey;
    if (sensor !== currentPhase) return;
    if (sensor === 'bp') {
      results.bp = String(reading.value);
      hasCaptured = true;
      isScanning = false;
      progress = 100;
    } else if (sensor === 'spo2') {
      // Parse incoming value
      let spo2Val = 0, hrVal = 0;
      const raw = reading.value as Record<string, unknown>;
      if (raw && typeof raw === 'object') {
        spo2Val = Number(raw.spo2);
        hrVal   = Number(raw.heartRate ?? raw.hr);
      } else {
        spo2Val = Number(reading.value);
      }

      // Error filter — discard sensor noise / bad reads
      const validSpo2 = !Number.isNaN(spo2Val) && spo2Val >= 70 && spo2Val <= 100;
      const validHr   = !Number.isNaN(hrVal)   && hrVal   >= 40 && hrVal   <= 200;
      if (!validSpo2 || !validHr) return; // ignore this reading

      // Add to buffer and prune entries older than 6 seconds
      const now = Date.now();
      spo2Buffer.push({ spo2: spo2Val, hr: hrVal, ts: now });
      spo2Buffer = spo2Buffer.filter(s => now - s.ts <= 6000);

      // Stability check: need ≥ 5 samples, spo2 spread ≤ 2, HR spread ≤ 10
      if (spo2Buffer.length >= 5) {
        const spo2s = spo2Buffer.map(s => s.spo2);
        const hrs   = spo2Buffer.map(s => s.hr);
        const spo2Spread = Math.max(...spo2s) - Math.min(...spo2s);
        const hrSpread   = Math.max(...hrs)   - Math.min(...hrs);
        if (spo2Spread <= 2 && hrSpread <= 10) {
          // Stable — use the average of buffered readings as the final value
          const avgSpo2 = Math.round(spo2s.reduce((a, b) => a + b, 0) / spo2s.length);
          const avgHr   = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
          results.spo2      = avgSpo2;
          results.heartRate = avgHr;
          hasCaptured = true;
          isScanning  = false;
          progress    = 100;
        }
        // else: not stable yet — keep scanning, don't capture
      }

      // Fallback: scan already ended (progress hit 100 before this reading was processed)
      // — accept the latest valid reading immediately rather than reverting to instructions page
      if (!hasCaptured && !isScanning && spo2Buffer.length > 0) {
        const last = spo2Buffer[spo2Buffer.length - 1];
        results.spo2      = last.spo2;
        results.heartRate = last.hr;
        hasCaptured = true;
        progress    = 100;
      }
    } else if (sensor === 'temp') {
      // Apply +1.5 °C hardware offset correction
      const raw = Number(reading.value);
      (results as any).temp = Number.isNaN(raw) ? reading.value : parseFloat((raw + 1.5).toFixed(1));
      hasCaptured = true;
      isScanning = false;
      progress = 100;
    } else {
      (results as any)[sensor] = reading.value;
      hasCaptured = true;
      isScanning = false;
      progress = 100;
    }
  });

  const unsubError = lastError.subscribe((msg) => {
    if (msg && isScanning) {
      isScanning = false;
      isCountingDown = false;
      progress = 0;
      if (currentPhase === 'bp') bpManualEntry = true;
    }
  });

  onDestroy(() => { unsubProgress(); unsubReading(); unsubError(); });

  // ── Eufy Smart Scale mode ─────────────────────────────────────────────────
  // 'cloud' = Eufy cloud API, 'ble' = Eufy BLE
  type EufyMode = 'cloud' | 'ble';
  let eufyMode: EufyMode = (typeof localStorage !== 'undefined')
    ? (() => {
        const stored = localStorage.getItem('eufyMode');
        // Migrate old 'none' (load cell) and legacy BLE flag to 'ble'
        if (!stored || stored === 'none') return 'ble';
        return stored as EufyMode;
      })()
    : 'ble';
  if (typeof localStorage !== 'undefined') localStorage.setItem('eufyMode', eufyMode);

  function setEufyMode(m: EufyMode) {
    eufyMode = m;
    if (typeof localStorage !== 'undefined') localStorage.setItem('eufyMode', m);
    if (m === 'cloud') wsSend({ command: 'eufy_credentials_status' });
  }

  // Eufy cloud credential form
  let eufyEmailInput   = '';
  let eufyPasswordInput = '';
  let eufySaveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let showEufyCredForm = false;
  let showDebug = false; // toggles debug/calibration panels
  let hideResults = false; // "Conceal" privacy toggle — hides result values from display

  // SpO2/HR stability buffer — only accept reading after values settle for ~5 seconds
  interface Spo2Sample { spo2: number; hr: number; ts: number; }
  let spo2Buffer: Spo2Sample[] = [];

  function saveEufyCredentials() {
    if (!eufyEmailInput.trim() || !eufyPasswordInput.trim()) return;
    eufySaveStatus = 'saving';
    wsSend({ command: 'eufy_save_credentials', email: eufyEmailInput.trim(), password: eufyPasswordInput.trim() });
    // Optimistically mark saved after 1.5s (server confirms via eufy_credentials_saved msg)
    setTimeout(() => {
      eufySaveStatus = 'saved';
      showEufyCredForm = false;
      eufyEmailInput = '';
      eufyPasswordInput = '';
    }, 1500);
  }

  // Keep credential status in sync
  onMount(() => {
    if (eufyMode === 'cloud') wsSend({ command: 'eufy_credentials_status' });
  });

  function iconSvg(name: string, size = 28) {
    const base = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (name) {
      case 'weight':
        return `<svg ${base}><path d="M4 7h16"/><path d="M7 7l-3 6h6l-3-6"/><path d="M17 7l-3 6h6l-3-6"/><path d="M12 7v9"/><rect x="8" y="16" width="8" height="5" rx="2"/></svg>`;
      case 'height':
        return `<svg ${base}><rect x="4" y="3" width="6" height="18" rx="1.5"/><path d="M7 6H5"/><path d="M7 9H4"/><path d="M7 12H5"/><path d="M7 15H4"/><path d="M7 18H5"/><path d="M15 6v12"/><path d="M15 6h5"/></svg>`;
      case 'temp':
        return `<svg ${base}><path d="M10 14a4 4 0 108 0"/><path d="M14 4v10"/><rect x="12" y="3" width="4" height="11" rx="2"/></svg>`;
      case 'spo2':
        return `<svg ${base}><path d="M12 20s-7-4.6-7-10a4 4 0 017-2.3A4 4 0 0119 10c0 5.4-7 10-7 10z"/><path d="M6 12h3l2-3 2 6 2-3h3"/></svg>`;
      case 'bp':
        return `<svg ${base}><rect x="3" y="7" width="10" height="8" rx="2"/><path d="M13 11h5"/><circle cx="20" cy="11" r="1.5"/></svg>`;
      default:
        return `<svg ${base}><circle cx="12" cy="12" r="9"/></svg>`;
    }
  }

  const phases = {
    weight: { title: "Weight",      desc: "Step onto the platform",          icon: "weight", duration: 30, unit: "kg"    },
    height: { title: "Height",      desc: "Stand straight",                  icon: "height", duration: 30, unit: "m"     },
    temp:   { title: "Temperature", desc: "Place forehead near sensor",       icon: "temp", duration: 80, unit: "°C"   },
    spo2:   { title: "HR + SpO2",   desc: "Place finger on MAX30102 clip",   icon: "spo2", duration: 60, unit: "% / bpm" },
    bp:     { title: "Blood Pressure", desc: "Wrap cuff around your left arm", icon: "bp", duration: 90, unit: "mmHg" }
  } as const;

  function startSequence() {
    hasCaptured = false; progress = 0; bpManualEntry = false; bpManualSys = ''; bpManualDia = '';
    isCountingDown = true; countdown = 3;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) { clearInterval(timer); isCountingDown = false; startScan(); }
    }, 1000);
  }

  function startScan() {
    isScanning = true; progress = 0; spo2Buffer = [];
    const sensor = currentPhase as SensorKey;
    const bridgeOnline    = $bridgeStatus === 'esp32Ready' || $bridgeStatus === 'esp32Missing' || $bridgeStatus === 'connected';
    const sensorConnected = $sensorStatus[sensor] !== 'disconnected';

    // Eufy Cloud scale path — bypasses ESP32 sensor-status check
    if (sensor === 'weight' && eufyMode === 'cloud') {
      if ($bridgeStatus === 'disconnected') {
        isScanning = false;
        lastError.set('Bridge not connected — start the serial bridge and retry');
        return;
      }
      weightLiveReading.set(null);
      wsSend({ command: 'start', sensor: 'eufy_cloud_weight' });
      return;
    }

    // Eufy BLE scale path — bypasses ESP32 sensor-status check
    if (sensor === 'weight' && eufyMode === 'ble') {
      if ($bridgeStatus === 'disconnected') {
        isScanning = false;
        lastError.set('Bridge not connected — start the serial bridge and retry');
        return;
      }
      weightLiveReading.set(null);
      wsSend({ command: 'start', sensor: 'eufy_weight' });
      return;
    }

    if (bridgeOnline && sensorConnected) {
      const sent = startMeasurement(sensor);
      if (!sent) { isScanning = false; lastError.set('Connection lost — please retry'); }
    } else {
      isScanning = false;
      lastError.set(!bridgeOnline ? 'Bridge not connected — start the serial bridge and retry' : 'Sensor not detected — check wiring and retry');
    }
  }

  function handleSave() {
    const hasWeight = results.weight > 0;
    const hasHeight = results.height > 0;
    const bmiVal = (hasWeight && hasHeight) ? parseFloat((results.weight / (results.height * results.height)).toFixed(1)) : null;
    const payload = {
      user_id:        user?.id,
      temperature:    results.temp      > 0     ? results.temp      : null,
      spo2:           results.spo2      > 0     ? results.spo2      : null,
      heart_rate:     results.heartRate > 0     ? results.heartRate : null,
      height:         results.height    > 0     ? results.height    : null,
      weight:         results.weight    > 0     ? results.weight    : null,
      bmi:            bmiVal,
      blood_pressure: results.bp !== '0/0'      ? results.bp        : null,
      created_at:     new Date().toISOString(),
    };
    onFinish(payload);
    mode = 'idle'; isRedoingSpecific = false; currentPhase = 'review';
    results = { weight: 0, height: 0, temp: 0, spo2: 0, heartRate: 0, bp: "0/0" };
    hasCaptured = false; progress = 0;
  }

  function measureSingle(phase: SensorPhase) {
    hideResults = false; spo2Buffer = [];
    mode = 'single'; isRedoingSpecific = false; currentPhase = phase; hasCaptured = false; progress = 0;
  }

  function nextPhase() {
    hideResults = false; spo2Buffer = []; hasCaptured = false; progress = 0;
    if (mode === 'single' || isRedoingSpecific) { isRedoingSpecific = false; currentPhase = 'review'; return; }
    const order: Phase[] = ['weight', 'height', 'temp', 'spo2', 'bp', 'review'];
    const currentIndex = order.indexOf(currentPhase);
    currentPhase = currentIndex < order.length - 1 ? order[currentIndex + 1] : 'review';
  }

  function confirmManualBp() {
    const sys = parseInt(bpManualSys);
    const dia = parseInt(bpManualDia);
    if (!sys || !dia || sys < 60 || sys > 250 || dia < 40 || dia > 150 || sys <= dia) return;
    results.bp = `${sys}/${dia}`; bpManualEntry = false; hasCaptured = true; progress = 100; lastError.set(null);
  }

  function goBack() {
    hideResults = false; spo2Buffer = [];
    cancelMeasurement();
    isScanning = false; isCountingDown = false; hasCaptured = false; bpManualEntry = false; progress = 0;
    if (mode === 'single' || isRedoingSpecific) { isRedoingSpecific = false; mode = 'idle'; currentPhase = 'review'; return; }
    const order: Phase[] = ['weight', 'height', 'temp', 'spo2', 'bp', 'review'];
    const idx = order.indexOf(currentPhase);
    currentPhase = idx > 0 ? order[idx - 1] : 'review';
  }

  function redoSpecific(phase: SensorPhase) {
    isRedoingSpecific = true; currentPhase = phase; hasCaptured = false; progress = 0;
  }

  function skipPhase() {
    hideResults = false; spo2Buffer = [];
    cancelMeasurement(); isScanning = false; isCountingDown = false; hasCaptured = false; bpManualEntry = false;
    if (mode === 'single') { mode = 'idle'; currentPhase = 'review'; return; }
    if (currentPhase === 'bp') results.bp = "0/0";
    else if (currentPhase === 'spo2') { results.spo2 = 0; results.heartRate = 0; }
    else if (currentPhase !== 'review') { const key = currentPhase as 'weight' | 'height' | 'temp'; results[key] = 0; }
    nextPhase();
  }

  $: statusLabel = (() => {
    // On the weight phase we use the Eufy scale, not the ESP32 — show a relevant label
    if (currentPhase === 'weight') {
      if ($bridgeStatus === 'disconnected') return { text: 'Bridge Offline', color: 'bg-red-400' };
      return { text: eufyMode === 'cloud' ? 'Eufy Cloud' : 'Eufy BLE', color: 'bg-blue-400' };
    }
    switch ($bridgeStatus) {
      case 'esp32Ready':   return { text: 'ESP32 Connected',   color: 'bg-green-500' };
      case 'esp32Missing': return { text: 'ESP32 Missing',     color: 'bg-amber-400' };
      case 'connecting':   return { text: 'Bridge Connecting', color: 'bg-blue-400'  };
      case 'connected':    return { text: 'Bridge Open',       color: 'bg-blue-300'  };
      default:             return { text: 'Bridge Offline',    color: 'bg-red-400'   };
    }
  })();

  // Weight phase uses Eufy scale — only needs the bridge WS online, not the ESP32 serial.
  // Other phases still require ESP32 connected + sensor wired.
  $: currentSensorAvailable = currentPhase === 'review'
    ? true
    : currentPhase === 'weight'
      ? $bridgeStatus !== 'disconnected'
      : ($bridgeStatus !== 'esp32Ready' || $sensorStatus[currentPhase as SensorKey] !== 'disconnected');
</script>

<!-- ── MAIN SHELL ─────────────────────────────────────────────────────────── -->
<div class="h-full w-full bg-[#f0f7ff] flex flex-col select-none overflow-hidden text-slate-900">

  <!-- ── HEADER ── -->
  <div class="relative flex items-center justify-between px-8 pt-8 pb-5 shrink-0">
    <button
      on:click={onCancel}
      class="px-5 py-2.5 bg-white border border-blue-100 text-blue-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm active:scale-95 transition-transform"
    >
      ← Exit
    </button>

    <!-- Step dots -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="flex gap-2">
        {#each ['weight', 'height', 'temp', 'spo2', 'bp', 'review'] as p}
          <div class="h-3 w-3 rounded-full transition-all duration-500 {currentPhase === p ? 'bg-blue-600 scale-125' : 'bg-blue-200'}"></div>
        {/each}
      </div>
    </div>

    <!-- Status badge -->
    <div class="flex flex-col items-end gap-1">
      <span class="text-blue-600 font-black text-xs uppercase tracking-widest">
        {currentPhase === 'review'
          ? 'Summary'
          : mode === 'single'
            ? phases[currentPhase as keyof typeof phases].title
            : `Step ${Object.keys(phases).indexOf(currentPhase) + 1} of 5`}
      </span>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest text-white {statusLabel.color}">
        <span class="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"></span>
        {statusLabel.text}
      </span>
    </div>
  </div>

  <!-- ── ERROR BANNER ── -->
  {#if $lastError && !isScanning}
    <div in:fade out:fade class="mx-8 mb-4 px-5 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm font-bold uppercase tracking-widest text-center shrink-0">
      Warning: {$lastError}
    </div>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════════════
       SENSOR PHASES
  ═══════════════════════════════════════════════════════════════════════════ -->
  {#if currentPhase !== 'review'}
    <div class="flex-1 flex flex-col px-8 overflow-hidden">

      <!-- ── CONTENT AREA (scrollable if needed) ── -->
      <div class="flex-1 flex flex-col items-center justify-center text-center min-h-0">

        {#if isCountingDown}
          <!-- COUNTDOWN -->
          <div in:scale={{start: 0.8}} class="flex flex-col items-center gap-4">
            <h2 class="text-lg font-black text-blue-400 uppercase tracking-[0.3em]">Get Ready</h2>
            <div class="text-[11rem] font-[1000] text-blue-600 leading-none">{countdown}</div>
          </div>

        {:else if isScanning}
          <!-- SCANNING -->
          <div class="flex flex-col items-center gap-6 w-full">
            <!-- Progress ring -->
            <div class="relative w-60 h-60">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 240 240">
                <circle cx="120" cy="120" r="100" stroke="#dbeafe" stroke-width="14" fill="none" />
                <circle cx="120" cy="120" r="100" stroke="#2563eb" stroke-width="14" fill="none"
                  stroke-dasharray="628" stroke-dashoffset={628 - (628 * progress / 100)}
                  class="transition-all duration-200" stroke-linecap="round" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-5xl font-black text-blue-950">{progress}%</span>
              </div>
            </div>

            {#if currentPhase === 'bp'}
              <h2 class="text-2xl font-[1000] text-blue-600 animate-pulse uppercase tracking-tight">Keep Still &amp; Relax…</h2>
              <p class="text-sm font-bold text-blue-400 uppercase tracking-widest">Reading BP monitor display</p>
              {#if $bpLiveReading}
                <div in:fade class="grid grid-cols-2 gap-4 w-full max-w-xs">
                  <div class="py-5 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1">
                    <p class="text-xs font-black uppercase tracking-widest text-blue-400">Systolic</p>
                    <p class="text-4xl font-black text-blue-950 tabular-nums">{$bpLiveReading.sys ?? '--'}</p>
                    <p class="text-xs font-bold text-blue-300">mmHg</p>
                  </div>
                  <div class="py-5 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1">
                    <p class="text-xs font-black uppercase tracking-widest text-blue-400">Diastolic</p>
                    <p class="text-4xl font-black text-blue-950 tabular-nums">{$bpLiveReading.dia ?? '--'}</p>
                    <p class="text-xs font-bold text-blue-300">mmHg</p>
                  </div>
                </div>
              {/if}
              {#if $bpDebugFrame}
                <div in:fade class="rounded-2xl overflow-hidden border border-blue-200 bg-blue-50 w-full max-w-xs">
                  {#if $bpDebugFrame.error}
                    <div class="px-3 py-2 text-sm font-bold text-red-600 bg-red-50 border-b border-red-200">Error: {$bpDebugFrame.error}</div>
                  {/if}
                  {#if $bpDebugFrame.imageData}
                    <img src="data:image/jpeg;base64,{$bpDebugFrame.imageData}" alt="BP camera preview" class="w-full max-h-36 object-contain" />
                  {:else}
                    <div class="w-full h-14 flex items-center justify-center text-blue-300 text-xs font-bold uppercase tracking-widest">Waiting for camera…</div>
                  {/if}
                </div>
              {/if}

            {:else if currentPhase === 'weight'}
              <h2 class="text-2xl font-[1000] text-blue-600 animate-pulse uppercase tracking-tight">Measuring Weight…</h2>
              <p class="text-sm font-bold text-blue-400 uppercase tracking-widest">Stand still on the platform</p>
              {#if $weightLiveReading !== null}
                {@const lbs = ($weightLiveReading * 2.20462).toFixed(1)}
                <div in:fade class="py-6 px-10 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1 w-full max-w-xs">
                  <p class="text-xs font-black uppercase tracking-widest text-blue-400">Live Reading</p>
                  <p class="text-6xl font-[1000] text-blue-950 tabular-nums leading-none transition-all {hideResults ? 'blur-2xl select-none' : ''}">{$weightLiveReading.toFixed(1)}</p>
                  <p class="text-lg font-black text-blue-400">kg</p>
                  {#if !hideResults}<p class="text-sm font-bold text-blue-900/30">{lbs} lbs</p>{/if}
                </div>
              {:else}
                <p class="text-sm text-blue-900/30 font-bold uppercase tracking-widest animate-pulse">Waiting for scale…</p>
              {/if}

            {:else}
              <h2 class="text-2xl font-[1000] text-blue-600 animate-pulse uppercase tracking-tight">
                Capturing {phases[currentPhase as keyof typeof phases].title}…
              </h2>
            {/if}
          </div>

        {:else if hasCaptured}
          <!-- RESULT -->
          <div in:scale class="flex flex-col items-center gap-4 w-full">

            <!-- Conceal / Reveal toggle -->
            <button
              on:click={() => hideResults = !hideResults}
              class="flex items-center gap-2 px-5 py-2 rounded-full border-2
                {hideResults
                  ? 'border-amber-300 bg-amber-50 text-amber-600'
                  : 'border-slate-200 bg-white/60 text-slate-400'}
                text-xs font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {#if hideResults}
                <!-- eye-off icon -->
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
                </svg>
                Reveal
              {:else}
                <!-- eye icon -->
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Conceal
              {/if}
            </button>

            {#if currentPhase === 'spo2'}
              <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div class="py-6 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1">
                  <p class="text-xs font-black uppercase tracking-widest text-blue-400">SpO2</p>
                  <p class="text-[5rem] font-[1000] text-blue-950 tabular-nums leading-none transition-all
                    {hideResults ? 'blur-2xl select-none' : ''}">
                    {results.spo2 > 0 ? `${results.spo2}` : '--'}
                  </p>
                  <p class="text-lg font-black text-blue-400">%</p>
                </div>
                <div class="py-6 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1">
                  <p class="text-xs font-black uppercase tracking-widest text-blue-400">Heart Rate</p>
                  <p class="text-[5rem] font-[1000] text-blue-950 tabular-nums leading-none transition-all
                    {hideResults ? 'blur-2xl select-none' : ''}">
                    {results.heartRate > 0 ? `${results.heartRate}` : '--'}
                  </p>
                  <p class="text-lg font-black text-blue-400">bpm</p>
                </div>
              </div>

            {:else if currentPhase === 'bp'}
              <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div class="py-6 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1">
                  <p class="text-xs font-black uppercase tracking-widest text-blue-400">Systolic</p>
                  <p class="text-[5rem] font-[1000] text-blue-950 tabular-nums leading-none transition-all
                    {hideResults ? 'blur-2xl select-none' : ''}">
                    {bpSys > 0 ? bpSys : '--'}
                  </p>
                  <p class="text-lg font-black text-blue-400">mmHg</p>
                </div>
                <div class="py-6 rounded-3xl bg-white border border-blue-100 flex flex-col items-center gap-1">
                  <p class="text-xs font-black uppercase tracking-widest text-blue-400">Diastolic</p>
                  <p class="text-[5rem] font-[1000] text-blue-950 tabular-nums leading-none transition-all
                    {hideResults ? 'blur-2xl select-none' : ''}">
                    {bpDia > 0 ? bpDia : '--'}
                  </p>
                  <p class="text-lg font-black text-blue-400">mmHg</p>
                </div>
              </div>
              <p class="text-xs text-blue-900/30 font-bold uppercase tracking-widest">Remove the cuff and set it aside</p>

            {:else if currentPhase === 'weight'}
              {@const wKg = results.weight}
              {@const wLbs = (wKg * 2.20462).toFixed(1)}
              <div class="flex flex-col items-center gap-1">
                <p class="text-sm font-black uppercase tracking-widest text-blue-400">Weight</p>
                <p class="text-[11rem] font-[1000] text-blue-950 tabular-nums leading-none transition-all
                  {hideResults ? 'blur-2xl select-none' : ''}">
                  {wKg > 0 ? wKg.toFixed(1) : '--'}
                </p>
                <p class="text-3xl font-black text-blue-400">kg</p>
                {#if wKg > 0 && !hideResults}
                  <p class="text-lg font-bold text-blue-900/30">{wLbs} lbs</p>
                {/if}
              </div>

            {:else}
              <!-- height / temp -->
              <div class="flex flex-col items-center gap-1">
                <p class="text-sm font-black uppercase tracking-widest text-blue-400">{phases[currentPhase as keyof typeof phases].title}</p>
                <p class="text-[11rem] font-[1000] text-blue-950 tabular-nums leading-none transition-all
                  {hideResults ? 'blur-2xl select-none' : ''}">
                  {results[currentPhase as keyof CheckupResults]}
                </p>
                <p class="text-3xl font-black text-blue-400">{phases[currentPhase as keyof typeof phases].unit}</p>
              </div>
            {/if}

            {#if currentPhase === 'temp' && typeof results.temp === 'number' && results.temp > 0 && !hideResults}
              {@const t = results.temp}
              <div class="px-6 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest
                {t >= 37.5 ? 'bg-red-50 text-red-500' : t >= 37.0 ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}">
                {#if t >= 37.5}
                  <span class="inline-flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>Fever</span>
                {:else if t >= 37.0}
                  <span class="inline-flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Slightly elevated</span>
                {:else}
                  <span class="inline-flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>Normal</span>
                {/if}
              </div>
            {/if}
          </div>

        {:else if !currentSensorAvailable}
          <!-- SENSOR DISCONNECTED -->
          <div in:fade class="flex flex-col items-center gap-5">
            <div class="w-40 h-40 bg-slate-100 rounded-[3rem] flex items-center justify-center text-blue-400 opacity-40">
              {@html iconSvg(phases[currentPhase as keyof typeof phases].icon, 96)}
            </div>
            <h1 class="text-4xl font-[1000] text-slate-300 uppercase tracking-tight">{phases[currentPhase as keyof typeof phases].title}</h1>
            <p class="text-sm text-slate-400 font-bold uppercase tracking-widest">Sensor not connected</p>
          </div>

        {:else if bpManualEntry && currentPhase === 'bp'}
          <!-- BP MANUAL ENTRY -->
          <div in:fade class="flex flex-col items-center gap-5 w-full max-w-sm">
            <div class="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center">
              <span class="text-4xl font-black text-amber-500">!</span>
            </div>
            <div>
              <h2 class="text-2xl font-[1000] text-blue-950 uppercase tracking-tight">Manual Entry</h2>
              <p class="text-sm text-blue-900/40 font-bold uppercase tracking-widest mt-1">OCR timed out — enter reading manually</p>
            </div>
            <div class="grid grid-cols-2 gap-4 w-full">
              <div class="flex flex-col gap-2">
                <label for="bp-sys" class="text-sm font-black uppercase tracking-widest text-blue-400">Systolic</label>
                <input id="bp-sys" type="number" min="60" max="250" bind:value={bpManualSys} placeholder="120"
                  class="w-full px-4 py-4 text-2xl font-black text-center bg-white rounded-2xl border-2 border-blue-100 focus:border-blue-400 outline-none" />
              </div>
              <div class="flex flex-col gap-2">
                <label for="bp-dia" class="text-sm font-black uppercase tracking-widest text-blue-400">Diastolic</label>
                <input id="bp-dia" type="number" min="40" max="150" bind:value={bpManualDia} placeholder="80"
                  class="w-full px-4 py-4 text-2xl font-black text-center bg-white rounded-2xl border-2 border-blue-100 focus:border-blue-400 outline-none" />
              </div>
            </div>
          </div>

        {:else if currentPhase === 'bp'}
          <!-- BP INSTRUCTION -->
          <div in:fade class="flex flex-col items-center gap-5 w-full overflow-y-auto">
            <div class="w-28 h-28 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-600 shrink-0">
              {@html iconSvg('bp', 72)}
            </div>
            <h1 class="text-3xl font-[1000] text-blue-950 uppercase tracking-tight shrink-0">Blood Pressure</h1>

            <!-- Preparation box -->
            <div class="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-left shrink-0">
              <p class="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">⚠ Preparation</p>
              <ul class="space-y-1 text-sm font-bold text-amber-800/70">
                <li>• Do not smoke, exercise, or drink caffeinated beverages.</li>
                <li>• Empty your bladder.</li>
                <li>• Rest quietly for 5 minutes before measurement.</li>
              </ul>
            </div>

            <!-- Numbered steps -->
            <div class="text-left space-y-3 w-full max-w-xs shrink-0">
              {#each [
                'Have yourself seated. Sit straight.',
                'Remove restrictive clothing from your upper arm.',
                'Place the cuff on the upper arm, about 1 inch (2 cm) above the elbow. Ensure the cuff\'s artery marker/tube sits over the inner arm, lined up with the middle finger.',
                'The cuff should be tight, but you should only be able to fit two fingertips between the top edge and your arm.',
                'While the reading is ongoing, stay still & silent.',
              ] as step, i}
                <div class="flex items-start gap-3">
                  <span class="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5">{i + 1}</span>
                  <p class="text-sm text-blue-900/60 font-bold leading-snug">{step}</p>
                </div>
              {/each}
            </div>

            <!-- Debug toggle -->
            <button on:click={() => showDebug = !showDebug}
              class="px-5 py-2 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform shrink-0">
              ⚙ {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
            {#if showDebug}
              <button on:click={openSegCalib}
                class="px-6 py-3 rounded-2xl border-2 border-orange-200 bg-orange-50 text-orange-500 text-sm font-black uppercase tracking-widest active:scale-95 transition-transform shrink-0">
                Calibrate Camera
              </button>
            {/if}
          </div>

        {:else if currentPhase === 'weight'}
          <!-- WEIGHT INSTRUCTION -->
          <div in:fade class="flex flex-col items-center gap-5 w-full overflow-y-auto">
            <div class="w-28 h-28 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-600 shrink-0">
              {@html iconSvg('weight', 72)}
            </div>
            <h1 class="text-3xl font-[1000] text-blue-950 uppercase tracking-tight shrink-0">Weight</h1>

            <!-- Steps -->
            <div class="text-left space-y-3 w-full max-w-xs shrink-0">
              {#each [
                'Step on the scale and keep steady.',
                'Once the scale\'s display shows a steady reading, hop off the scale.',
              ] as step, i}
                <div class="flex items-start gap-3">
                  <span class="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5">{i + 1}</span>
                  <p class="text-sm text-blue-900/60 font-bold leading-snug">{step}</p>
                </div>
              {/each}
            </div>

            <!-- Debug toggle — hides Eufy mode & credential controls -->
            <button on:click={() => showDebug = !showDebug}
              class="px-5 py-2 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform shrink-0">
              ⚙ {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
            {#if showDebug}
              <!-- Eufy mode selector -->
              <div class="w-full max-w-xs grid grid-cols-2 gap-2 shrink-0">
                {#each [
                  { id: 'cloud', label: 'Eufy Cloud', icon: '☁️' },
                  { id: 'ble',   label: 'Eufy BLE',   icon: '📡' },
                ] as opt}
                  <button
                    on:click={() => setEufyMode(opt.id as 'cloud' | 'ble')}
                    class="py-3 rounded-2xl border-2 font-black uppercase tracking-widest text-xs transition-all
                      {eufyMode === opt.id
                        ? (opt.id === 'cloud' ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-blue-400 bg-blue-50 text-blue-600')
                        : 'border-blue-100 bg-white text-blue-300'}"
                  >
                    <span class="block text-base">{opt.icon}</span>
                    {opt.label}
                  </button>
                {/each}
              </div>

              <!-- Eufy Cloud credential status / setup -->
              {#if eufyMode === 'cloud'}
                <div class="w-full max-w-xs shrink-0">
                  {#if $eufyCredentialsConfigured === false}
                    <div class="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700 font-bold text-center">
                      ⚠️ EufyLife account not set up yet
                    </div>
                  {:else if $eufyCredentialsConfigured === true}
                    <div class="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-700 font-bold text-center">
                      ✓ EufyLife account connected
                    </div>
                  {/if}
                  <button
                    on:click={() => { showEufyCredForm = !showEufyCredForm; }}
                    class="w-full py-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 text-indigo-500 text-xs font-black uppercase tracking-widest"
                  >
                    {showEufyCredForm ? '✕ Cancel' : '🔑 Set EufyLife Account'}
                  </button>
                  {#if showEufyCredForm}
                    <div class="mt-3 flex flex-col gap-3">
                      <input
                        type="email" bind:value={eufyEmailInput} placeholder="EufyLife email"
                        class="w-full px-4 py-3 text-sm font-bold bg-white rounded-2xl border-2 border-blue-100 focus:border-indigo-400 outline-none"
                      />
                      <input
                        type="password" bind:value={eufyPasswordInput} placeholder="EufyLife password"
                        class="w-full px-4 py-3 text-sm font-bold bg-white rounded-2xl border-2 border-blue-100 focus:border-indigo-400 outline-none"
                      />
                      <button
                        on:click={saveEufyCredentials}
                        disabled={eufySaveStatus === 'saving'}
                        class="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {eufySaveStatus === 'saving' ? 'Saving…' : eufySaveStatus === 'saved' ? '✓ Saved!' : 'Save'}
                      </button>
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>

        {:else if currentPhase === 'height'}
          <!-- HEIGHT INSTRUCTION -->
          <div in:fade class="flex flex-col items-center gap-5 w-full overflow-y-auto">
            <div class="w-28 h-28 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-600 shrink-0">
              {@html iconSvg('height', 72)}
            </div>
            <h1 class="text-3xl font-[1000] text-blue-950 uppercase tracking-tight shrink-0">Height</h1>
            <!-- Tip box -->
            <div class="w-full max-w-xs bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-left shrink-0">
              <p class="text-sm font-bold text-blue-700/80">💡 <span class="font-black">Note:</span> For more accurate results, have a flat object on top of your head.</p>
            </div>
            <div class="text-left space-y-3 w-full max-w-xs shrink-0">
              {#each [
                'Remove shoes.',
                'Stand on the scale platform and align yourself with the sensor above.',
                'Remain on the platform. Once your height is displayed, step off.',
              ] as step, i}
                <div class="flex items-start gap-3">
                  <span class="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5">{i + 1}</span>
                  <p class="text-sm text-blue-900/60 font-bold leading-snug">{step}</p>
                </div>
              {/each}
            </div>
          </div>

        {:else if currentPhase === 'temp'}
          <!-- TEMPERATURE INSTRUCTION -->
          <div in:fade class="flex flex-col items-center gap-5 w-full">
            <div class="w-28 h-28 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-600 shrink-0">
              {@html iconSvg('temp', 72)}
            </div>
            <h1 class="text-3xl font-[1000] text-blue-950 uppercase tracking-tight">Temperature</h1>
            <div class="text-left space-y-3 w-full max-w-xs">
              {#each [
                'Point the non-contact thermometer at your forehead.',
                'Wait for results. Once the reading is displayed, return the thermometer.',
              ] as step, i}
                <div class="flex items-start gap-3">
                  <span class="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5">{i + 1}</span>
                  <p class="text-sm text-blue-900/60 font-bold leading-snug">{step}</p>
                </div>
              {/each}
            </div>
          </div>

        {:else if currentPhase === 'spo2'}
          <!-- HR + SPO2 INSTRUCTION -->
          <div in:fade class="flex flex-col items-center gap-5 w-full">
            <div class="w-28 h-28 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-600 shrink-0">
              {@html iconSvg('spo2', 72)}
            </div>
            <h1 class="text-3xl font-[1000] text-blue-950 uppercase tracking-tight">HR + SpO2</h1>
            <div class="text-left space-y-3 w-full max-w-xs">
              {#each [
                'Lay your index/pointer finger flat on the sensor. Make sure it remains flat on the surface.',
                'Refrain from moving your finger.',
                'Wait for results.',
              ] as step, i}
                <div class="flex items-start gap-3">
                  <span class="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5">{i + 1}</span>
                  <p class="text-sm text-blue-900/60 font-bold leading-snug">{step}</p>
                </div>
              {/each}
            </div>
          </div>

        {:else}
          <!-- GENERIC INSTRUCTION (fallback) -->
          <div in:fade class="flex flex-col items-center gap-6">
            <div class="w-36 h-36 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-600">
              {@html iconSvg(phases[currentPhase as keyof typeof phases].icon, 80)}
            </div>
            <h1 class="text-4xl font-[1000] text-blue-950 uppercase tracking-tight">
              {phases[currentPhase as keyof typeof phases].title}
            </h1>
            <p class="text-lg text-blue-900/40 font-bold uppercase tracking-wide max-w-xs">
              {phases[currentPhase as keyof typeof phases].desc}
            </p>
          </div>
        {/if}

        <!-- Tare button for weight scanning -->
        {#if currentPhase === 'weight' && isScanning}
          <button on:click={() => wsSend({ command: 'tare', sensor: 'weight' })}
            class="mt-6 px-6 py-3 rounded-2xl border-2 border-blue-200 bg-white text-blue-400 text-sm font-black uppercase tracking-widest active:bg-blue-50 transition-colors">
            Tare / Zero Scale
          </button>
        {/if}
      </div>

      <!-- ── ACTION BUTTONS ── -->
      <div class="shrink-0 pb-8 pt-4 space-y-3">

        {#if hasCaptured}
          {#if mode === 'single'}
            <button on:click={handleSave}
              class="w-full py-7 bg-green-500 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-green-900/20 active:scale-[0.98] transition-transform">
              Save as Reading
            </button>
          {:else}
            <button on:click={nextPhase}
              class="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform">
              Confirm &amp; {isRedoingSpecific ? 'Back' : 'Continue'}
            </button>
          {/if}
          <button on:click={startSequence}
            class="w-full py-5 bg-white border-2 border-blue-100 text-blue-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-blue-50 transition-colors">
            Retake
          </button>
          {#if mode !== 'single'}
            <button on:click={handleSave}
              class="w-full py-5 bg-green-50 border-2 border-green-200 text-green-600 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-green-100 transition-colors">
              💾 Save &amp; Exit
            </button>
          {/if}

        {:else if bpManualEntry && currentPhase === 'bp'}
          {@const sysNum = parseInt(bpManualSys)}
          {@const diaNum = parseInt(bpManualDia)}
          {@const manualValid = sysNum >= 60 && sysNum <= 250 && diaNum >= 40 && diaNum <= 150 && sysNum > diaNum}
          <button on:click={confirmManualBp} disabled={!manualValid}
            class="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:scale-100">
            Confirm Reading
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button on:click={startSequence}
              class="py-5 bg-white border-2 border-blue-100 text-blue-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-blue-50">
              Retry Camera
            </button>
            <button on:click={skipPhase}
              class="py-5 bg-red-50 text-red-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-red-100">
              {mode === 'single' ? 'Cancel' : 'Skip Step'}
            </button>
          </div>
          <button on:click={goBack}
            class="w-full py-5 bg-white border-2 border-blue-100 text-blue-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-blue-50 transition-colors">
            ← Back
          </button>

        {:else if !isScanning && !isCountingDown && currentSensorAvailable}
          <button on:click={startSequence}
            class="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform">
            Start Reading
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button on:click={goBack}
              class="py-5 bg-white border-2 border-blue-100 text-blue-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-blue-50 transition-colors">
              ← Back
            </button>
            <button on:click={skipPhase}
              class="py-5 bg-red-50 text-red-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-red-100">
              {mode === 'single' ? 'Cancel' : 'Skip Step'}
            </button>
          </div>

        {:else if !currentSensorAvailable}
          <button on:click={skipPhase}
            class="w-full py-7 bg-blue-100 text-blue-400 rounded-[2.5rem] text-2xl font-black uppercase active:scale-[0.98] transition-transform">
            Next →
          </button>
          <button on:click={goBack}
            class="w-full py-5 bg-white border-2 border-blue-100 text-blue-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-blue-50 transition-colors">
            ← Back
          </button>

        {:else}
          <!-- scanning / countdown — no CTA, but keep skip and back visible -->
          <div class="grid grid-cols-2 gap-3">
            <button on:click={goBack} disabled={isScanning || isCountingDown}
              class="py-5 bg-white border-2 border-blue-100 text-blue-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-blue-50 transition-colors disabled:opacity-40">
              ← Back
            </button>
            <button on:click={skipPhase} disabled={isScanning || isCountingDown}
              class="py-5 bg-red-50 text-red-400 rounded-[2rem] font-black uppercase text-sm tracking-widest active:bg-red-100 disabled:opacity-40">
              {mode === 'single' ? 'Cancel' : 'Skip Step'}
            </button>
          </div>
        {/if}
      </div>
    </div>

  <!-- ════════════════════════════════════════════════════════════════════════
       REVIEW / SUMMARY SCREEN
  ═══════════════════════════════════════════════════════════════════════════ -->
  {:else}
    <div class="flex-1 flex flex-col px-8 pb-8 overflow-hidden" in:slide>

      <!-- Title -->
      <div class="mb-5 shrink-0">
        <h1 class="text-5xl font-[1000] text-blue-950 uppercase tracking-tighter leading-none">Checkup</h1>
        <p class="text-sm text-blue-900/30 font-bold uppercase tracking-widest mt-1">
          {mode === 'idle' ? 'Tap a sensor to take an individual reading' : 'Review your measurements below'}
        </p>
      </div>

      <!-- Sensor grid -->
      <div class="flex-1 grid grid-cols-2 gap-5 overflow-y-auto pr-1 custom-scrollbar min-h-0">
        {#each Object.entries(phases) as [key, config]}
          {@const k = key as SensorPhase}
          {@const hasResult = k === 'spo2'
            ? (results.spo2 > 0 || results.heartRate > 0)
            : (results[k] !== 0 && results[k] !== "0/0")}

          <div class="flex flex-col justify-between p-6 bg-white rounded-[2rem] border border-blue-100 shadow-sm min-h-[190px] text-center
            last:col-span-2 last:justify-self-center last:w-[calc((100%-1.25rem)/2)]
            {!hasResult ? 'opacity-55' : ''}">

            <!-- Top -->
            <div class="flex justify-center items-center gap-2">
              <span class="text-blue-500">{@html iconSvg(config.icon, 26)}</span>
              <span class="font-black text-blue-400 uppercase text-xl tracking-widest">{config.title}</span>
              {#if hasResult}
                <span class="w-6 h-6 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-sm font-black">✓</span>
              {/if}
            </div>

            <!-- Value -->
            <div class="flex-1 flex flex-col justify-center py-2">
              {#if k === 'spo2'}
                <span class="text-5xl font-black text-blue-950 leading-tight">{hasResult ? `${results.spo2 || '--'}%` : '--'}</span>
                <span class="text-xl font-black text-blue-900/40">{hasResult ? `${results.heartRate || '--'} bpm` : ''}</span>
              {:else if k === 'weight'}
                {@const wKg = results.weight as number}
                {@const bmiRaw = (results.height > 0 && wKg > 0) ? wKg / (results.height * results.height) : null}
                {@const bmiDisplay = bmiRaw ? bmiRaw.toFixed(1) : null}
                {@const bmiLabel = bmiRaw
                  ? bmiRaw < 18.5 ? { text: 'Underweight', cls: 'text-amber-500' }
                  : bmiRaw < 23.0 ? { text: 'Normal',      cls: 'text-green-500' }
                  : bmiRaw < 27.5 ? { text: 'Overweight',  cls: 'text-orange-500' }
                  :                 { text: 'Obese',        cls: 'text-red-500' }
                  : null}
                <span class="text-5xl font-black text-blue-950 leading-tight">
                  {hasResult ? wKg.toFixed(1) : '--'}<span class="text-xl text-blue-900/30 font-bold"> kg</span>
                </span>
                {#if bmiDisplay}
                  <span class="text-base font-black text-blue-900/40 mt-0.5">BMI {bmiDisplay}</span>
                  {#if bmiLabel}
                    <span class="text-sm font-black uppercase tracking-wider mt-0.5 {bmiLabel.cls}">{bmiLabel.text}</span>
                  {/if}
                {/if}
              {:else}
                <span class="text-5xl font-black text-blue-950 leading-tight">
                  {hasResult ? results[k] : '--'}<span class="text-xxl text-blue-900/30 font-bold"> {config.unit}</span>
                </span>
              {/if}
            </div>

            <!-- Action -->
            {#if mode === 'idle'}
              <button type="button" on:click={() => measureSingle(k)}
                class="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase text-base tracking-widest active:scale-90 transition-transform">
                Measure
              </button>
            {:else}
              <button type="button" on:click={() => redoSpecific(k)}
                class="w-full py-3.5 bg-blue-50 text-blue-500 rounded-2xl font-black uppercase text-base tracking-widest active:scale-90 transition-transform flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Redo
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Bottom CTA -->
      <div class="shrink-0 pt-5 space-y-3">
        {#if mode === 'idle'}
          <button
            on:click={() => { mode = 'full'; currentPhase = 'weight'; hasCaptured = false; progress = 0; }}
            class="w-full py-7 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all">
            Start Full Checkup
          </button>
        {:else}
          <button on:click={handleSave}
            class="w-full py-7 bg-green-500 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-green-900/20 active:scale-[0.98] transition-all">
            Save &amp; Exit
          </button>
          <button on:click={() => { results = { weight: 0, height: 0, temp: 0, spo2: 0, heartRate: 0, bp: "0/0" }; mode = 'idle'; }}
            class="w-full py-4 text-blue-900/20 font-black uppercase text-xs tracking-widest active:text-red-400 transition-colors">
            Clear All Data
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- ── BP SEGMENT CALIBRATION OVERLAY ─────────────────────────────────────── -->
{#if segCalibMode}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 bg-black/95 z-50 flex flex-col overflow-hidden" in:fade out:fade
    on:pointermove={onSegPointerMove} on:pointerup={onSegPointerUp}>

    <div class="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="rounded-full bg-orange-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">Segment Calibration</span>
        <span class="text-white/40 text-xs font-bold">Place each rect on its display segment</span>
      </div>
      <button on:click={closeSegCalib} class="text-white/50 font-black text-sm uppercase px-3 py-1 rounded-xl active:bg-white/10">✕</button>
    </div>

    <div bind:this={calibPreviewContainer}
      class="relative flex-1 mx-4 mb-3 touch-none select-none overflow-hidden rounded-xl border border-white/10"
      style="min-height:0"
      on:pointerdown={onSelPointerDown} on:pointermove={onSelPointerMove}
      on:pointerup={onSelPointerUp} on:pointercancel={onSelPointerCancel}>

      {#if $bpDebugFrame?.imageData}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img bind:this={calibPreviewImg} src="data:image/jpeg;base64,{$bpDebugFrame.imageData}" alt="BP camera preview"
          class="w-full h-full object-contain block {eyedropperActive ? 'cursor-crosshair' : ''}" draggable="false" />

        {#if isDraggingSel && selStart && selCurrent && calibPreviewContainer}
          {@const cRect = calibPreviewContainer.getBoundingClientRect()}
          {@const sx = Math.min(selStart.clientX, selCurrent.clientX) - cRect.left}
          {@const sy = Math.min(selStart.clientY, selCurrent.clientY) - cRect.top}
          {@const sw = Math.abs(selCurrent.clientX - selStart.clientX)}
          {@const sh = Math.abs(selCurrent.clientY - selStart.clientY)}
          <div class="absolute pointer-events-none border-2 rounded"
            style="left:{sx}px; top:{sy}px; width:{sw}px; height:{sh}px;
              border-color:{eyedropperActive === 'background' ? '#34d399' : '#f97316'};
              background:{eyedropperActive === 'background' ? 'rgba(52,211,153,0.15)' : 'rgba(249,115,22,0.15)'};">
          </div>
        {/if}

        {#each DIGIT_NAMES as dname}
          {@const isActive = dname === activeDigit}
          {@const color = SEG_COLOR[dname]}
          {@const testDigit = $bpTestResult?.digits?.find(d => d.name === dname)}
          {@const liveDigit = $bpDebugFrame?.segStatus?.find(d => d.name === dname)}
          {#each SEG_NAMES as sname}
            {@const r = allSegs[dname][sname]}
            {@const isSelectedSeg = activeSeg === `${dname}:${sname}`}
            {@const segOnTest = testDigit?.segments?.[sname]}
            {@const segOnLive = liveDigit?.on?.[sname]}
            {@const hasLiveData = !!liveDigit}
            {@const segOn = testDigit ? segOnTest : (hasLiveData ? segOnLive : undefined)}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="absolute touch-none"
              style="left:{r.x}px; top:{r.y}px; width:{r.w}px; height:{r.h}px;
                border:2px solid {isActive ? (segOn !== undefined ? (segOn ? '#22c55e' : '#ef4444') : color) : 'rgba(255,255,255,0.2)'};
                background:{isActive ? (segOn !== undefined ? (segOn ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.2)') : color + '33') : 'rgba(255,255,255,0.05)'};
                cursor:{isActive ? 'move' : 'default'};
                box-shadow:{isSelectedSeg ? '0 0 0 2px white' : 'none'};
                z-index:{isActive ? 10 : 5};"
              on:pointerdown={(e) => isActive && onSegPointerDown(e, dname, sname, 'move')}>
              {#if isActive}
                <span class="absolute top-0 left-0.5 text-[8px] font-black leading-none pointer-events-none" style="color:{color}">{sname.toUpperCase()}</span>
                <div class="absolute bottom-0 right-0 w-3 h-3 touch-none" style="background:{color}; cursor:se-resize; opacity:0.9"
                  on:pointerdown|stopPropagation={(e) => onSegPointerDown(e, dname, sname, 'resize')}></div>
              {/if}
            </div>
          {/each}
        {/each}

        {#if $bpTestResult}
          {#each $bpTestResult.digits as dr}
            {@const segs = allSegs[dr.name]}
            {@const allX = Object.values(segs).flatMap(r => [r.x, r.x + r.w])}
            {@const allY = Object.values(segs).flatMap(r => [r.y, r.y + r.h])}
            {@const lx = Math.min(...allX)}
            {@const ty = Math.min(...allY)}
            <div class="absolute pointer-events-none px-1.5 py-0.5 rounded text-xs font-black"
              style="left:{lx}px; top:{Math.max(0, ty - 20)}px; background:rgba(0,0,0,0.7); color:{dr.decoded ? '#22c55e' : '#ef4444'}">
              {dr.decoded ?? '?'}
            </div>
          {/each}
        {/if}
      {:else}
        <div class="w-full h-full flex items-center justify-center text-white/30 text-sm font-bold uppercase tracking-widest">
          {$bpDebugFrame?.error ? `Error: ${$bpDebugFrame.error}` : 'Waiting for camera…'}
        </div>
      {/if}
    </div>

    {#if $bpDebugFrame?.segStatus && $bpDebugFrame.segStatus.length > 0}
      {@const ss = $bpDebugFrame.segStatus}
      {@const sysDigits = ss.filter(d => d.name.startsWith('sys'))}
      {@const diaDigits = ss.filter(d => d.name.startsWith('dia'))}
      {@const sysReading = sysDigits.map(d => d.decoded ?? '').join('').replace(/^0+(?=\d)/, '') || '---'}
      {@const diaReading = diaDigits.map(d => d.decoded ?? '').join('').replace(/^0+(?=\d)/, '') || '---'}
      <div class="mx-4 mb-3 shrink-0 bg-black/60 border border-white/10 rounded-xl p-2">
        <div class="flex justify-around mb-2">
          <div class="text-center">
            <span class="text-[9px] font-black uppercase tracking-widest text-red-400 block">SYS</span>
            <span class="text-xl font-black font-mono {sysReading === '---' ? 'text-white/30' : 'text-green-400'}">{sysReading}</span>
          </div>
          <div class="text-center">
            <span class="text-[9px] font-black uppercase tracking-widest text-green-400 block">DIA</span>
            <span class="text-xl font-black font-mono {diaReading === '---' ? 'text-white/30' : 'text-green-400'}">{diaReading}</span>
          </div>
        </div>
        <div class="grid grid-cols-6 gap-1">
          {#each ss as digSt}
            {@const isSys = digSt.name.startsWith('sys')}
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-[7px] font-black uppercase tracking-widest {isSys ? 'text-red-400' : 'text-green-400'} mb-0.5">
                {digSt.name === 'sys0' ? 'S1' : digSt.name === 'sys1' ? 'S2' : digSt.name === 'sys2' ? 'S3' : digSt.name === 'dia0' ? 'D1' : digSt.name === 'dia1' ? 'D2' : 'D3'}
              </span>
              {#each ['a','b','c','d','e','f','g'] as seg}
                <div class="flex items-center gap-0.5 w-full justify-between px-0.5">
                  <span class="text-[6px] text-white/30 font-mono">{seg}</span>
                  <div class="w-3 h-1.5 rounded-sm {digSt.on[seg] ? 'bg-green-400' : 'bg-white/10'}"></div>
                </div>
              {/each}
              <div class="mt-0.5 text-sm font-black font-mono {digSt.decoded !== null ? 'text-green-400' : 'text-white/20'}">{digSt.decoded ?? '?'}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex gap-1.5 px-4 mb-3 shrink-0">
      {#each DIGIT_NAMES as dname}
        {@const isSys = dname.startsWith('sys')}
        <button on:click={() => activeDigit = dname}
          class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
            {activeDigit === dname ? (isSys ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'bg-white/10 text-white/50 active:bg-white/20'}">
          {dname === 'sys0' ? 'S-1' : dname === 'sys1' ? 'S-2' : dname === 'sys2' ? 'S-3' : dname === 'dia0' ? 'D-1' : dname === 'dia1' ? 'D-2' : 'D-3'}
        </button>
      {/each}
      <button on:click={copyDigitToNext} disabled={(DIGIT_NAMES as readonly string[]).indexOf(activeDigit) >= DIGIT_NAMES.length - 1}
        class="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-30 active:bg-blue-700">
        Copy→
      </button>
      <button on:click={resetActiveDigit} class="px-3 py-2 rounded-xl bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-wider active:bg-white/20">↺</button>
    </div>

    <div class="px-4 pb-4 shrink-0 space-y-3">
      <div class="flex items-center gap-2">
        <span class="text-[9px] font-black uppercase tracking-widest text-white/50 shrink-0">Eyedropper</span>
        <button on:click={() => eyedropperActive = eyedropperActive === 'background' ? null : 'background'}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
            {eyedropperActive === 'background' ? 'bg-emerald-500 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/60'}">
          BG {#if sampledBg !== null}<span class="font-mono opacity-70">{sampledBg}</span>{/if}
        </button>
        <button on:click={() => eyedropperActive = eyedropperActive === 'segment' ? null : 'segment'}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
            {eyedropperActive === 'segment' ? 'bg-orange-500 text-white ring-2 ring-white/40' : 'bg-white/10 text-white/60'}">
          Seg {#if sampledSeg !== null}<span class="font-mono opacity-70">{sampledSeg}</span>{/if}
        </button>
        {#if eyedropperActive}<span class="text-[8px] text-yellow-300 font-bold animate-pulse">← drag on preview</span>{/if}
        {#if sampledBg !== null && sampledSeg !== null}
          <button on:click={() => { sampledBg = null; sampledSeg = null; }} class="ml-auto text-[8px] text-white/30 font-bold uppercase active:text-white/60">Clear</button>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-x-5 gap-y-2">
        {#each [
          { label: 'Threshold', bind: 'segThreshold', min: 5, max: 220, step: 1, val: segThreshold, color: 'accent-orange-400' },
          { label: 'Brightness', bind: 'camBrightness', min: -1, max: 1, step: 0.05, val: camBrightness, color: 'accent-blue-500' },
          { label: 'Contrast', bind: 'camContrast', min: 0, max: 10, step: 0.1, val: camContrast, color: 'accent-blue-500' },
          { label: 'Sharpness', bind: 'camSharpness', min: 0, max: 16, step: 0.5, val: camSharpness, color: 'accent-blue-500' },
        ] as sl}
          <div>
            <div class="flex justify-between">
              <span class="text-[9px] font-black uppercase tracking-widest text-white/50">{sl.label}</span>
              <span class="text-[9px] text-white/40 font-mono">{sl.val}</span>
            </div>
            {#if sl.label === 'Threshold'}
              <input type="range" min={sl.min} max={sl.max} step={sl.step} bind:value={segThreshold} class="w-full {sl.color}" />
            {:else if sl.label === 'Brightness'}
              <input type="range" min={sl.min} max={sl.max} step={sl.step} bind:value={camBrightness} class="w-full {sl.color}" />
            {:else if sl.label === 'Contrast'}
              <input type="range" min={sl.min} max={sl.max} step={sl.step} bind:value={camContrast} class="w-full {sl.color}" />
            {:else}
              <input type="range" min={sl.min} max={sl.max} step={sl.step} bind:value={camSharpness} class="w-full {sl.color}" />
            {/if}
          </div>
        {/each}
      </div>

      <div class="flex gap-2">
        <button on:click={testSegments} disabled={isTesting}
          class="flex-1 py-3 rounded-2xl border-2 border-yellow-400 text-yellow-300 font-black uppercase text-xs tracking-widest active:scale-95 disabled:opacity-40">
          {isTesting ? 'Testing…' : 'Test'}
        </button>
        <button on:click={closeSegCalib}
          class="flex-1 py-3 rounded-2xl border-2 border-white/20 text-white/60 font-black uppercase text-xs tracking-widest active:scale-95">
          Discard
        </button>
        <button on:click={saveSegCalib}
          class="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest active:scale-95">
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #dbeafe; border-radius: 10px; }
</style>