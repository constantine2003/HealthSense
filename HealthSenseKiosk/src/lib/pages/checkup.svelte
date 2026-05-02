<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  import { onDestroy } from 'svelte';
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
    send as wsSend,
    type SensorKey,
  } from '../stores/esp32Store';

  export let onFinish: (data: any) => void;
  export let onCancel: () => void;
  export let user: any; 

  // --- TYPES ---
  interface CheckupResults {
    weight: number;
    height: number;
    temp: number;
    spo2: number;
    heartRate: number;
    bp: string;
  }

  // BP manual entry fallback state
  let bpManualEntry = false;
  let bpManualSys = '';
  let bpManualDia = '';

  // ── BP Segment Calibration state ──────────────────────────────────────────
  type SegRect  = { x: number; y: number; w: number; h: number };
  type DigitSegs = Record<string, SegRect>;           // keys: a b c d e f g
  type AllSegs  = Record<string, DigitSegs>;          // keys: sys0..dia2

  const DIGIT_NAMES = ['sys0', 'sys1', 'sys2', 'dia0', 'dia1', 'dia2'] as const;
  type DigitName = typeof DIGIT_NAMES[number];
  const SEG_NAMES   = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
  const SEG_COLOR: Record<string, string> = {
    sys0: '#ef4444', sys1: '#ef4444', sys2: '#ef4444',
    dia0: '#22c55e', dia1: '#22c55e', dia2: '#22c55e',
  };

  function makeDigitSegs(cx: number, cy: number): DigitSegs {
    // Build a default 7-segment shape centered at (cx, cy) in CSS pixels.
    //      aaa
    //     f   b
    //      ggg
    //     e   c
    //      ddd
    const hw = 22, hh = 6;   // horiz segment: width, height
    const vw = 6,  vh = 28;  // vert  segment: width, height
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
      sys0: makeDigitSegs(xs[0], sysY),
      sys1: makeDigitSegs(xs[1], sysY),
      sys2: makeDigitSegs(xs[2], sysY),
      dia0: makeDigitSegs(xs[0], diaY),
      dia1: makeDigitSegs(xs[1], diaY),
      dia2: makeDigitSegs(xs[2], diaY),
    };
  }

  let segCalibMode = false;
  let activeDigit: DigitName = 'sys0';
  let activeSeg: string | null = null;        // "sys0:a" format
  let allSegs: AllSegs = defaultSegPositions();
  let segThreshold = 120;
  let isTesting = false;

  // Camera settings (shared with segment calibration)
  let camBrightness = 0.10;
  let camContrast   = 1.50;
  let camSharpness  = 2.00;
  let camSaturation = 1.20;

  // DOM ref for the calibration preview image
  let calibPreviewImg: HTMLImageElement | null = null;

  interface SegDragState {
    digit: string; seg: string; mode: 'move' | 'resize';
    startX: number; startY: number; startRect: SegRect;
  }
  let segDragState: SegDragState | null = null;

  function openSegCalib() {
    segCalibMode = true;
    bpTestResult.set(null);
    wsSend({ command: 'bp_calibrate_start' });
  }

  function closeSegCalib() {
    segCalibMode = false;
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
        segs[s] = {
          x: Math.max(0, Math.round(r.x * sx)),
          y: Math.max(0, Math.round(r.y * sy)),
          w: Math.max(4, Math.round(r.w * sx)),
          h: Math.max(2, Math.round(r.h * sy)),
        };
      }
      return { name, segments: segs };
    });

    wsSend({
      command: 'bp_save_segments',
      digits: scaledDigits,
      threshold: segThreshold,
      camera: { brightness: camBrightness, contrast: camContrast, sharpness: camSharpness, saturation: camSaturation },
    });
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

  // Stop spinner when test result arrives
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

  // Derived SYS/DIA from the stored bp string (e.g. "120/80")
  $: bpParts = results.bp !== '0/0' ? results.bp.split('/') : ['0', '0'];
  $: bpSys = parseInt(bpParts[0]) || 0;
  $: bpDia = parseInt(bpParts[1]) || 0;

  type SensorPhase = 'weight' | 'height' | 'temp' | 'spo2' | 'bp';
  type Phase = SensorPhase | 'review';

  // --- LOGIC STATES ---
  let currentPhase: Phase = 'review'; 
  let isScanning = false;
  let isCountingDown = false;
  let hasCaptured = false;
  let isRedoingSpecific = false;
  // 'idle'  → sitting on review/home screen, no active session
  // 'single' → user tapped "Measure" on one sensor; saves only that sensor on completion
  // 'full'   → "Start Full Checkup" was clicked; goes through all sensors sequentially
  let mode: 'idle' | 'single' | 'full' = 'idle';
  let countdown = 3;
  let progress = 0;

  // --- DATA STORAGE ---
  let results: CheckupResults = { 
    weight: 0, 
    height: 0, 
    temp: 0, 
    spo2: 0,
    heartRate: 0,
    bp: "0/0" 
  };

  // --- ESP32 STORE SUBSCRIPTIONS ---
  const unsubProgress = esp32Progress.subscribe((val) => {
    if (isScanning) {
      progress = val;
      if (val >= 100) {
        isScanning = false;
      }
    }
  });

  const unsubReading = latestReading.subscribe((reading) => {
    if (!reading) return;
    const sensor = reading.sensor as SensorKey;
    if (sensor !== currentPhase) return;

    if (sensor === 'bp') {
      results.bp = String(reading.value);
    } else if (sensor === 'spo2') {
      const raw = reading.value as Record<string, unknown>;
      if (raw && typeof raw === 'object') {
        const spo2Val = Number(raw.spo2);
        const hrVal = Number(raw.heartRate ?? raw.hr);
        if (!Number.isNaN(spo2Val)) results.spo2 = spo2Val;
        if (!Number.isNaN(hrVal)) results.heartRate = hrVal;
      } else {
        const spo2Val = Number(reading.value);
        if (!Number.isNaN(spo2Val)) results.spo2 = spo2Val;
      }
    } else {
      (results as any)[sensor] = reading.value;
    }

    hasCaptured = true;
    isScanning = false;
    progress = 100;
  });

  const unsubError = lastError.subscribe((msg) => {
    if (msg && isScanning) {
      isScanning = false;
      isCountingDown = false;
      progress = 0;
      // For BP, show manual entry instead of just stopping
      if (currentPhase === 'bp') {
        bpManualEntry = true;
      }
    }
  });

  // --- LIFECYCLE ---
  onDestroy(() => {
    unsubProgress();
    unsubReading();
    unsubError();
  });

  // --- PHASE CONFIGURATION ---
  const phases = {
    weight: { title: "Weight", desc: "Step onto the platform", icon: "⚖️", duration: 30, unit: "kg" },
    height: { title: "Height", desc: "Stand straight", icon: "📏", duration: 30, unit: "m" },
    temp: { title: "Temperature", desc: "Place forehead near sensor", icon: "🌡️", duration: 40, unit: "°C" },
    spo2: { title: "HR + SpO2", desc: "Place finger on MAX30102 clip", icon: "🫀", duration: 30, unit: "% / bpm" },
    bp: { title: "Blood Pressure", desc: "Turn on the monitor and wrap the cuff around your left arm", icon: "💓", duration: 90, unit: "mmHg" }
  } as const;

  function startSequence() {
    hasCaptured = false;
    progress = 0;
    bpManualEntry = false;
    bpManualSys = '';
    bpManualDia = '';
    isCountingDown = true;
    countdown = 3;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        isCountingDown = false;
        startScan();
      }
    }, 1000);
  }

  function startScan() {
    isScanning = true;
    progress = 0;
    const sensor = currentPhase as SensorKey;

    // Only send to ESP32 when the bridge is live and sensor is confirmed connected.
    // If either is missing, abort and show an error — no mock data.
    const bridgeOnline    = $bridgeStatus === 'esp32Ready';
    const sensorConnected = $sensorStatus[sensor] !== 'disconnected';

    if (bridgeOnline && sensorConnected) {
      const sent = startMeasurement(sensor);
      if (!sent) {
        // WS closed between the check and the send
        isScanning = false;
        lastError.set('Connection lost — please retry');
      }
    } else {
      isScanning = false;
      lastError.set(
        !bridgeOnline
          ? 'Bridge not connected — start the serial bridge and retry'
          : 'Sensor not detected — check wiring and retry'
      );
    }
  }

  function handleSave() {
    const hasWeight = results.weight > 0;
    const hasHeight = results.height > 0;
    const bmiVal = (hasWeight && hasHeight)
      ? parseFloat((results.weight / (results.height * results.height)).toFixed(1))
      : null;

    // Send null for skipped/unmeasured sensors. Keeps history calculations clean.
    const payload = {
      user_id:        user?.id,
      temperature:    results.temp   > 0     ? results.temp   : null,
      spo2:           results.spo2   > 0     ? results.spo2   : null,
      heart_rate:     results.heartRate > 0  ? results.heartRate : null,
      height:         results.height > 0     ? results.height : null,
      weight:         results.weight > 0     ? results.weight : null,
      bmi:            bmiVal,
      blood_pressure: results.bp !== '0/0'   ? results.bp     : null,
      created_at:     new Date().toISOString(),
    };

    onFinish(payload);
    // Reset state after saving
    mode = 'idle';
    isRedoingSpecific = false;
    currentPhase = 'review';
    results = { weight: 0, height: 0, temp: 0, spo2: 0, heartRate: 0, bp: "0/0" };
    hasCaptured = false;
    progress = 0;
  }

  // Start a single-sensor measurement from the review screen.
  // On completion the user will be offered "Save as Reading" (not "Continue").
  function measureSingle(phase: SensorPhase) {
    mode = 'single';
    isRedoingSpecific = false;
    currentPhase = phase;
    hasCaptured = false;
    progress = 0;
  }

  function nextPhase() {
    hasCaptured = false;
    progress = 0;

    // Single-sensor mode or redo-specific: always return to review
    if (mode === 'single' || isRedoingSpecific) {
      isRedoingSpecific = false;
      currentPhase = 'review';
      return;
    }

    // Full checkup: advance through weight → height → temp → HR+SpO2 → bp → review
    const order: Phase[] = ['weight', 'height', 'temp', 'spo2', 'bp', 'review'];
    const currentIndex = order.indexOf(currentPhase);
    currentPhase = currentIndex < order.length - 1 ? order[currentIndex + 1] : 'review';
  }

  function confirmManualBp() {
    const sys = parseInt(bpManualSys);
    const dia = parseInt(bpManualDia);
    if (!sys || !dia || sys < 60 || sys > 250 || dia < 40 || dia > 150 || sys <= dia) return;
    results.bp = `${sys}/${dia}`;
    bpManualEntry = false;
    hasCaptured = true;
    progress = 100;
    lastError.set(null);
  }

  function redoSpecific(phase: SensorPhase) {
    // redoSpecific is only used during a full checkup (from review) to re-take one sensor
    isRedoingSpecific = true;
    currentPhase = phase;
    hasCaptured = false;
    progress = 0;
  }

  function skipPhase() {
    cancelMeasurement();
    isScanning = false;
    isCountingDown = false;
    hasCaptured = false;
    bpManualEntry = false;

    if (mode === 'single') {
      // Cancel individual reading → go straight back to review
      mode = 'idle';
      currentPhase = 'review';
      return;
    }

    // Full checkup: record skip as null then advance
    if (currentPhase === 'bp') {
      results.bp = "0/0";
    } else if (currentPhase === 'spo2') {
      results.spo2 = 0;
      results.heartRate = 0;
    } else if (currentPhase !== 'review') {
      const key = currentPhase as 'weight' | 'height' | 'temp';
      results[key] = 0;
    }
    nextPhase();
  }

  // Friendly label for the ESP32 status badge (used in widget + header)
  $: statusLabel = (() => {
    switch ($bridgeStatus) {
      case 'esp32Ready':   return { text: 'ESP32 Connected',   color: 'bg-green-500' };
      case 'esp32Missing': return { text: 'ESP32 Missing',     color: 'bg-amber-400' };
      case 'connecting':   return { text: 'Bridge Connecting', color: 'bg-blue-400'  };
      case 'connected':    return { text: 'Bridge Open',       color: 'bg-blue-300'  };
      default:             return { text: 'Bridge Offline',    color: 'bg-red-400'   };
    }
  })();

  // Whether the sensor for the current phase is physically connected on the ESP32.
  // Only meaningful when the bridge is online; falls back to true so mock data runs.
  $: currentSensorAvailable = currentPhase === 'review'
    ? true
    : $bridgeStatus !== 'esp32Ready'           // bridge offline → use mock, treat as available
      || $sensorStatus[currentPhase as SensorKey] !== 'disconnected';
</script>

<div class="h-full w-full bg-[#f8fbff] flex flex-col p-10 select-none overflow-hidden text-slate-900">
  
  <div class="flex items-center justify-between mb-12">
    <button on:click={onCancel} class="text-blue-900/30 font-black uppercase tracking-widest text-xs active:scale-95">Exit</button>
    <div class="flex gap-1">
      {#each ['weight', 'height', 'temp', 'spo2', 'bp', 'review'] as p}
        <div class="h-1.5 w-8 rounded-full {currentPhase === p ? 'bg-blue-600' : 'bg-blue-100'} transition-all duration-500"></div>
      {/each}
    </div>
    <div class="flex flex-col items-end gap-1">
      <span class="text-blue-600 font-black text-[10px] uppercase">
        {currentPhase === 'review'
          ? 'Summary'
          : mode === 'single'
            ? `${phases[currentPhase as keyof typeof phases].title} — Single Reading`
            : `Step ${Object.keys(phases).indexOf(currentPhase) + 1} of 5`}
      </span>
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white {statusLabel.color} transition-colors duration-500">
        <span class="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"></span>
        {statusLabel.text}
      </span>
    </div>
  </div>

  {#if $lastError && isScanning === false}
    <div in:fade out:fade class="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-widest text-center">
      ⚠ Sensor error: {$lastError}
    </div>
  {/if}

  {#if currentPhase !== 'review'}
    <div class="flex-1 flex flex-col items-center justify-center text-center px-4">
      {#if isCountingDown}
        <div in:scale={{start: 0.8}} class="flex flex-col items-center">
          <h2 class="text-2xl font-black text-blue-400 uppercase tracking-widest mb-4">Get Ready</h2>
          <div class="text-[12rem] font-[1000] text-blue-600 leading-none">{countdown}</div>
        </div>
      {:else if isScanning}
        <div class="relative w-72 h-72 mb-12">
          <svg class="w-full h-full -rotate-90">
            <circle cx="144" cy="144" r="120" stroke="#e2e8f0" stroke-width="16" fill="none" />
            <circle cx="144" cy="144" r="120" stroke="#2563eb" stroke-width="16" fill="none" 
              stroke-dasharray="754" stroke-dashoffset={754 - (754 * progress / 100)} 
              class="transition-all duration-200" stroke-linecap="round" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-6xl font-black text-blue-950">{progress}%</span>
          </div>
        </div>
        {#if currentPhase === 'bp'}
          <h2 class="text-3xl font-[1000] text-blue-600 animate-pulse uppercase tracking-tighter">
            Keep Still &amp; Relax…
          </h2>
          <p class="text-sm text-blue-400 font-bold mt-2 uppercase tracking-widest">Reading BP monitor display</p>
          {#if $bpLiveReading}
            <div in:fade class="grid grid-cols-2 gap-4 mt-8">
              <div class="px-5 py-4 rounded-3xl bg-blue-50 min-w-[9rem]">
                <p class="text-[10px] font-black uppercase tracking-widest text-blue-400">Systolic</p>
                <p class="text-4xl font-black text-blue-950 tabular-nums">{$bpLiveReading.sys ?? '--'}</p>
                <p class="text-[10px] text-blue-400 font-bold mt-0.5">mmHg</p>
              </div>
              <div class="px-5 py-4 rounded-3xl bg-blue-50 min-w-[9rem]">
                <p class="text-[10px] font-black uppercase tracking-widest text-blue-400">Diastolic</p>
                <p class="text-4xl font-black text-blue-950 tabular-nums">{$bpLiveReading.dia ?? '--'}</p>
                <p class="text-[10px] text-blue-400 font-bold mt-0.5">mmHg</p>
              </div>
            </div>
            <p class="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-3">Waiting for reading to finish…</p>
          {/if}

          <!-- ── Live camera preview during scanning ── -->
          {#if $bpDebugFrame}
            <div in:fade class="mt-4 rounded-2xl overflow-hidden border border-blue-200 bg-blue-50 max-w-[280px] mx-auto">
              {#if $bpDebugFrame.error}
                <div class="px-3 py-2 text-[11px] font-bold text-red-600 bg-red-50 border-b border-red-200">
                  ⚠ {$bpDebugFrame.error}
                </div>
              {/if}
              {#if $bpDebugFrame.imageData}
                <img
                  src="data:image/jpeg;base64,{$bpDebugFrame.imageData}"
                  alt="BP camera preview"
                  class="w-full max-h-40 object-contain"
                />
              {:else}
                <div class="w-full h-16 flex items-center justify-center text-blue-300 text-xs font-bold uppercase tracking-widest">
                  Waiting for camera…
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <h2 class="text-3xl font-[1000] text-blue-600 animate-pulse uppercase tracking-tighter">
            Capturing {phases[currentPhase as keyof typeof phases].title}
          </h2>
        {/if}
      {:else if hasCaptured}
        <div in:scale class="flex flex-col items-center">
          <div class="w-40 h-40 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-6xl mb-6 shadow-sm">✓</div>
          <h2 class="text-2xl font-black text-blue-900/40 uppercase tracking-widest mb-2">Result</h2>
          {#if currentPhase === 'spo2'}
            <div class="grid grid-cols-2 gap-4 mt-2">
              <div class="px-5 py-4 rounded-3xl bg-blue-50 min-w-[11rem]">
                <p class="text-[10px] font-black uppercase tracking-widest text-blue-400">SpO2</p>
                <p class="text-3xl font-black text-blue-950">{results.spo2 > 0 ? `${results.spo2}%` : '--'}</p>
              </div>
              <div class="px-5 py-4 rounded-3xl bg-blue-50 min-w-[11rem]">
                <p class="text-[10px] font-black uppercase tracking-widest text-blue-400">Heart Rate</p>
                <p class="text-3xl font-black text-blue-950">{results.heartRate > 0 ? `${results.heartRate} bpm` : '--'}</p>
              </div>
            </div>
          {:else if currentPhase === 'bp'}
            <div class="grid grid-cols-2 gap-4 mt-2">
              <div class="px-5 py-4 rounded-3xl bg-blue-50 min-w-[11rem]">
                <p class="text-[10px] font-black uppercase tracking-widest text-blue-400">Systolic</p>
                <p class="text-3xl font-black text-blue-950">{bpSys > 0 ? bpSys : '--'}</p>
                <p class="text-[10px] text-blue-400 font-bold mt-0.5">mmHg</p>
              </div>
              <div class="px-5 py-4 rounded-3xl bg-blue-50 min-w-[11rem]">
                <p class="text-[10px] font-black uppercase tracking-widest text-blue-400">Diastolic</p>
                <p class="text-3xl font-black text-blue-950">{bpDia > 0 ? bpDia : '--'}</p>
                <p class="text-[10px] text-blue-400 font-bold mt-0.5">mmHg</p>
              </div>
            </div>
            <p class="mt-4 text-xs text-blue-900/30 font-bold uppercase tracking-widest">Remove the cuff and set it aside</p>
          {:else}
            <div class="text-7xl font-[1000] text-blue-950 mb-2">
              {results[currentPhase as keyof CheckupResults]}
              <span class="text-2xl">{phases[currentPhase as keyof typeof phases].unit}</span>
            </div>
          {/if}
          {#if currentPhase === 'temp' && typeof results.temp === 'number' && results.temp > 0}
            {@const t = results.temp}
            <div class="mt-3 px-5 py-2 rounded-2xl text-sm font-black uppercase tracking-widest
              {t >= 37.5 ? 'bg-red-50 text-red-500' : t >= 37.0 ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}">
              {t >= 37.5 ? '🔴 Fever' : t >= 37.0 ? '🟡 Slightly elevated' : '🟢 Normal'}
            </div>
          {/if}
        </div>
      {:else if !currentSensorAvailable}
        <!-- Sensor is physically disconnected from the ESP32 -->
        <div in:fade class="flex flex-col items-center">
          <div class="w-48 h-48 bg-slate-50 rounded-[4rem] flex items-center justify-center text-8xl mb-10 shadow-inner opacity-40">
            {phases[currentPhase as keyof typeof phases].icon}
          </div>
          <h1 class="text-4xl font-[1000] text-slate-300 uppercase tracking-tighter mb-4">
            {phases[currentPhase as keyof typeof phases].title}
          </h1>
          <p class="text-sm text-slate-400 font-bold uppercase tracking-widest">
            Sensor not connected
          </p>
        </div>
      {:else if bpManualEntry && currentPhase === 'bp'}
        <!-- BP OCR timed out — manual entry fallback -->
        <div in:fade class="flex flex-col items-center w-full max-w-sm">
          <div class="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6">⚠️</div>
          <h2 class="text-2xl font-[1000] text-blue-950 uppercase tracking-tighter mb-1">Manual Entry</h2>
          <p class="text-sm text-blue-900/40 font-bold uppercase tracking-widest mb-8">OCR timed out — enter reading manually</p>
          <div class="grid grid-cols-2 gap-4 w-full">
            <div class="flex flex-col gap-2">
              <label for="bp-sys" class="text-[10px] font-black uppercase tracking-widest text-blue-400">Systolic (SYS)</label>
              <input
                id="bp-sys"
                type="number" min="60" max="250"
                bind:value={bpManualSys}
                placeholder="e.g. 120"
                class="w-full px-4 py-4 text-2xl font-black text-center bg-blue-50 rounded-2xl border-2 border-blue-100 focus:border-blue-400 outline-none"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="bp-dia" class="text-[10px] font-black uppercase tracking-widest text-blue-400">Diastolic (DIA)</label>
              <input
                id="bp-dia"
                type="number" min="40" max="150"
                bind:value={bpManualDia}
                placeholder="e.g. 80"
                class="w-full px-4 py-4 text-2xl font-black text-center bg-blue-50 rounded-2xl border-2 border-blue-100 focus:border-blue-400 outline-none"
              />
            </div>
          </div>
        </div>
      {:else if currentPhase === 'bp'}
        <!-- BP-specific instruction screen -->
        <div in:fade class="flex flex-col items-center text-center">
          <div class="w-48 h-48 bg-blue-50 rounded-[4rem] flex items-center justify-center text-8xl mb-10 shadow-inner">💓</div>
          <h1 class="text-5xl font-[1000] text-blue-950 uppercase tracking-tighter mb-6">Blood Pressure</h1>
          <div class="text-left space-y-3 w-full max-w-xs">
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">1</span>
              <p class="text-base text-blue-900/60 font-bold">Turn on the BP monitor</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">2</span>
              <p class="text-base text-blue-900/60 font-bold">Wrap the cuff around your left arm</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">3</span>
              <p class="text-base text-blue-900/60 font-bold">Sit still, then press Start</p>
            </div>
          </div>
          <!-- Calibrate shortcut -->
          <button
            on:click={openSegCalib}
            class="mt-8 px-5 py-2.5 rounded-2xl border-2 border-orange-300 bg-orange-50 text-orange-600 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-transform"
          >
            🎯 Calibrate Camera
          </button>
        </div>
      {:else}
        <div in:fade class="flex flex-col items-center">
          <div class="w-48 h-48 bg-blue-50 rounded-[4rem] flex items-center justify-center text-8xl mb-10 shadow-inner">
            {phases[currentPhase as keyof typeof phases].icon}
          </div>
          <h1 class="text-5xl font-[1000] text-blue-950 uppercase tracking-tighter mb-4">
            {phases[currentPhase as keyof typeof phases].title}
          </h1>
          <p class="text-xl text-blue-900/40 font-bold max-w-xs uppercase">
            {phases[currentPhase as keyof typeof phases].desc}
          </p>
        </div>
      {/if}
    </div>

    <div class="space-y-4 pt-10">
      {#if hasCaptured}
        {#if mode === 'single'}
          <!-- Single-sensor mode: offer to save just this reading -->
          <button on:click={handleSave} class="w-full py-8 bg-green-500 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-green-100 active:scale-[0.98] transition-transform">
            Save as Reading
          </button>
          <button on:click={nextPhase} class="w-full py-4 text-blue-900/30 font-black uppercase text-xs tracking-widest active:text-blue-600">
            Back to Summary
          </button>
        {:else}
          <!-- Full checkup / redo mode: advance to next sensor -->
          <button on:click={nextPhase} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-transform">
            Confirm & {isRedoingSpecific ? 'Back to Summary' : 'Continue'}
          </button>
        {/if}
      {:else if bpManualEntry && currentPhase === 'bp'}
        <!-- Manual BP entry confirmation -->
        {@const sysNum = parseInt(bpManualSys)}
        {@const diaNum = parseInt(bpManualDia)}
        {@const manualValid = sysNum >= 60 && sysNum <= 250 && diaNum >= 40 && diaNum <= 150 && sysNum > diaNum}
        <button on:click={confirmManualBp} disabled={!manualValid}
          class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-transform disabled:opacity-40 disabled:scale-100">
          Confirm Reading
        </button>
        <div class="grid grid-cols-2 gap-4">
          <button on:click={startSequence} class="py-6 bg-white border-2 border-blue-50 text-blue-900/40 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-blue-50">
            Retry Camera
          </button>
          <button on:click={skipPhase} class="py-6 bg-red-50 text-red-400 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-red-100">
            {mode === 'single' ? 'Cancel' : 'Skip Step'}
          </button>
        </div>
      {:else if !isScanning && !isCountingDown && currentSensorAvailable}
        <button on:click={startSequence} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-transform">
          Start Reading
        </button>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        {#if hasCaptured}
          <button on:click={startSequence} class="py-6 bg-white border-2 border-blue-50 text-blue-900/40 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-blue-50">
            Retake
          </button>
          <!-- Skip is irrelevant once captured; spacer keeps layout balanced -->
          <div></div>
        {:else if currentSensorAvailable}
          <button on:click={startSequence} disabled={isScanning || isCountingDown} class="py-6 bg-white border-2 border-blue-50 text-blue-900/40 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-blue-50 disabled:opacity-50">
            Retry
          </button>
          <button on:click={skipPhase} disabled={isScanning || isCountingDown} class="py-6 bg-red-50 text-red-400 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-red-100 disabled:opacity-50">
            {mode === 'single' ? 'Cancel' : 'Skip Step'}
          </button>
        {:else}
          <div class="py-6 bg-slate-50 rounded-4xl"></div>
          <button on:click={skipPhase} disabled={isScanning || isCountingDown} class="py-6 bg-red-50 text-red-400 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-red-100 disabled:opacity-50">
            Next →
          </button>
        {/if}
      </div>
    </div>

  {:else}
    <div class="flex-1 flex flex-col" in:slide>
      <h1 class="text-5xl font-[1000] text-blue-950 uppercase tracking-tighter mb-2">Checkup</h1>
      <p class="text-blue-900/30 font-bold uppercase text-sm mb-6 tracking-widest">
        {mode === 'idle' ? 'Tap a sensor to take an individual reading, or start a full session' : 'Review your measurements'}
      </p>
      
      <div class="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {#each Object.entries(phases) as [key, config]}
          {@const k = key as SensorPhase}
          {@const hasResult = k === 'spo2'
            ? (results.spo2 > 0 || results.heartRate > 0)
            : (results[k] !== 0 && results[k] !== "0/0")}
          <div class="p-5 bg-white rounded-4xl border border-blue-50 flex justify-between items-center shadow-sm {!hasResult ? 'opacity-60' : ''}">
            <div class="flex flex-col">
              <span class="font-black text-blue-400 uppercase text-[10px] tracking-widest">{config.title}</span>
              {#if k === 'spo2'}
                <span class="text-xl font-black text-blue-950">
                  {hasResult ? `${results.spo2 || '--'}% / ${results.heartRate || '--'} bpm` : '--'}
                </span>
              {:else}
                <span class="text-2xl font-black text-blue-950">
                  {hasResult ? results[k] : '--'}
                  <span class="text-sm text-blue-900/30 font-black">{config.unit}</span>
                </span>
              {/if}
            </div>

            <div class="flex gap-2">
              {#if mode === 'idle'}
                <!-- Individual reading mode: each sensor has its own Measure button -->
                <button
                  type="button"
                  on:click={() => measureSingle(k)}
                  aria-label="Measure {config.title}"
                  class="px-4 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-90 transition-transform"
                >
                  Measure
                </button>
              {:else}
                <!-- Full-checkup mode: redo individual sensor -->
                <button
                  type="button"
                  on:click={() => redoSpecific(k)}
                  aria-label="Redo {config.title} test"
                  class="p-4 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-transform"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="mt-auto pt-6 space-y-4">
        {#if mode === 'idle'}
          <button
            on:click={() => { mode = 'full'; currentPhase = 'weight'; hasCaptured = false; progress = 0; }}
            class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-all"
          >
            Start Full Checkup
          </button>
        {:else}
          <!-- Full checkup mode: save all measurements -->
          <button on:click={handleSave} class="w-full py-8 bg-green-500 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-green-100 active:scale-[0.98] transition-all">
            Save & Exit
          </button>
          <button on:click={() => {
            results = { weight: 0, height: 0, temp: 0, spo2: 0, heartRate: 0, bp: "0/0" };
            mode = 'idle';
          }} class="w-full py-4 text-blue-900/20 font-black uppercase text-xs tracking-widest active:text-red-400">
            Clear All Data
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- ── BP Segment Calibration Overlay ─────────────────────────────────────── -->
{#if segCalibMode}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 bg-black/95 z-50 flex flex-col overflow-hidden"
    in:fade out:fade
    on:pointermove={onSegPointerMove}
    on:pointerup={onSegPointerUp}
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 flex-shrink-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">📐 Segment Calibration</span>
        <span class="text-white/50 text-[10px] font-bold">Place each segment rect on its display segment</span>
      </div>
      <button on:click={closeSegCalib} class="text-white/50 font-black text-sm uppercase tracking-widest px-3 py-1 rounded-xl active:bg-white/10">✕</button>
    </div>

    <!-- Camera preview with segment overlays -->
    <div
      class="relative flex-1 mx-4 mb-3 touch-none select-none overflow-hidden rounded-xl border border-white/10"
      style="min-height:0"
    >
      {#if $bpDebugFrame?.imageData}
        <img
          bind:this={calibPreviewImg}
          src="data:image/jpeg;base64,{$bpDebugFrame.imageData}"
          alt="BP camera preview"
          class="w-full h-full object-contain block"
          draggable="false"
        />

        <!-- Segment overlays for all 6 digits -->
        {#each DIGIT_NAMES as dname}
          {@const isActive = dname === activeDigit}
          {@const color = SEG_COLOR[dname]}
          {@const testDigit = $bpTestResult?.digits?.find(d => d.name === dname)}
          {#each SEG_NAMES as sname}
            {@const r = allSegs[dname][sname]}
            {@const isSelectedSeg = activeSeg === `${dname}:${sname}`}
            {@const segOn = testDigit?.segments?.[sname]}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="absolute touch-none"
              style="
                left:{r.x}px; top:{r.y}px; width:{r.w}px; height:{r.h}px;
                border: 2px solid {isActive ? (testDigit ? (segOn ? '#22c55e' : '#ef4444') : color) : 'rgba(255,255,255,0.2)'};
                background: {isActive ? (testDigit ? (segOn ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.2)') : color + '33') : 'rgba(255,255,255,0.05)'};
                cursor: {isActive ? 'move' : 'default'};
                box-shadow: {isSelectedSeg ? '0 0 0 2px white' : 'none'};
                z-index: {isActive ? 10 : 5};
              "
              on:pointerdown={(e) => isActive && onSegPointerDown(e, dname, sname, 'move')}
            >
              {#if isActive}
                <span class="absolute top-0 left-0.5 text-[8px] font-black leading-none pointer-events-none" style="color:{color}">{sname.toUpperCase()}</span>
                <!-- resize handle -->
                <div
                  class="absolute bottom-0 right-0 w-3 h-3 touch-none"
                  style="background:{color}; cursor:se-resize; opacity:0.9"
                  on:pointerdown|stopPropagation={(e) => onSegPointerDown(e, dname, sname, 'resize')}
                ></div>
              {/if}
            </div>
          {/each}
        {/each}

        <!-- Test result decoded digit labels -->
        {#if $bpTestResult}
          {#each $bpTestResult.digits as dr}
            {@const segs = allSegs[dr.name]}
            {@const allX = Object.values(segs).flatMap(r => [r.x, r.x + r.w])}
            {@const allY = Object.values(segs).flatMap(r => [r.y, r.y + r.h])}
            {@const lx = Math.min(...allX)}
            {@const ty = Math.min(...allY)}
            <div
              class="absolute pointer-events-none px-1.5 py-0.5 rounded text-[11px] font-black"
              style="left:{lx}px; top:{Math.max(0, ty - 20)}px; background:rgba(0,0,0,0.7); color:{dr.decoded ? '#22c55e' : '#ef4444'}"
            >
              {dr.decoded ?? '?'}
            </div>
          {/each}
        {/if}

      {:else}
        <div class="w-full h-full flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">
          {$bpDebugFrame?.error ? `⚠ ${$bpDebugFrame.error}` : 'Waiting for camera…'}
        </div>
      {/if}
    </div>

    <!-- Digit selector tabs -->
    <div class="flex gap-1.5 px-4 mb-3 flex-shrink-0">
      {#each DIGIT_NAMES as dname}
        {@const isSys = dname.startsWith('sys')}
        <button
          on:click={() => activeDigit = dname}
          class="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
            {activeDigit === dname
              ? (isSys ? 'bg-red-500 text-white' : 'bg-green-500 text-white')
              : 'bg-white/10 text-white/50 active:bg-white/20'}"
        >
          {dname === 'sys0' ? 'S-1' : dname === 'sys1' ? 'S-2' : dname === 'sys2' ? 'S-3' : dname === 'dia0' ? 'D-1' : dname === 'dia1' ? 'D-2' : 'D-3'}
        </button>
      {/each}
      <button
        on:click={copyDigitToNext}
        disabled={(DIGIT_NAMES as readonly string[]).indexOf(activeDigit) >= DIGIT_NAMES.length - 1}
        class="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-30 active:bg-blue-700"
        title="Copy current digit layout to next digit (shifted right)"
      >
        Copy→
      </button>
    </div>

    <!-- Camera sliders + threshold + actions -->
    <div class="px-4 pb-4 flex-shrink-0 space-y-3">
      <div class="grid grid-cols-2 gap-x-5 gap-y-2">
        <div>
          <div class="flex justify-between">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/50">Threshold</span>
            <span class="text-[9px] text-white/40 font-mono">{segThreshold}</span>
          </div>
          <input type="range" min="30" max="220" step="5" bind:value={segThreshold} class="w-full accent-orange-400" />
        </div>
        <div>
          <div class="flex justify-between">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/50">Brightness</span>
            <span class="text-[9px] text-white/40 font-mono">{camBrightness.toFixed(2)}</span>
          </div>
          <input type="range" min="-1" max="1" step="0.05" bind:value={camBrightness} class="w-full accent-blue-500" />
        </div>
        <div>
          <div class="flex justify-between">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/50">Contrast</span>
            <span class="text-[9px] text-white/40 font-mono">{camContrast.toFixed(1)}</span>
          </div>
          <input type="range" min="0" max="10" step="0.1" bind:value={camContrast} class="w-full accent-blue-500" />
        </div>
        <div>
          <div class="flex justify-between">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/50">Sharpness</span>
            <span class="text-[9px] text-white/40 font-mono">{camSharpness.toFixed(1)}</span>
          </div>
          <input type="range" min="0" max="16" step="0.5" bind:value={camSharpness} class="w-full accent-blue-500" />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          on:click={testSegments}
          disabled={isTesting}
          class="flex-1 py-3 rounded-2xl border-2 border-yellow-400 text-yellow-300 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform disabled:opacity-40"
        >
          {isTesting ? '⏳ Testing…' : '🔍 Test Segments'}
        </button>
        <button
          on:click={closeSegCalib}
          class="flex-1 py-3 rounded-2xl border-2 border-white/20 text-white/60 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform"
        >
          Discard
        </button>
        <button
          on:click={saveSegCalib}
          class="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform"
        >
          💾 Save
        </button>
      </div>
    </div>
  </div>
{/if}


<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
</style>