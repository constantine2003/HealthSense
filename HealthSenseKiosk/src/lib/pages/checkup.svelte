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
    bp: string;
  }

  type Phase = keyof CheckupResults | 'review';

  // --- LOGIC STATES ---
  let currentPhase: Phase = 'review'; 
  let isScanning = false;
  let isCountingDown = false;
  let hasCaptured = false;
  let isRedoingSpecific = false; 
  let sessionStarted = false; // Tracks if they've begun the process
  let countdown = 3;
  let progress = 0;

  // --- DATA STORAGE ---
  let results: CheckupResults = { 
    weight: 0, 
    height: 0, 
    temp: 0, 
    spo2: 0, 
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
    const sensor = reading.sensor as keyof CheckupResults;
    if (sensor !== currentPhase) return;
    if (sensor === 'bp') {
      results.bp = String(reading.value);
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
    spo2: { title: "SpO2", desc: "Place finger in clip", icon: "🫀", duration: 30, unit: "%" },
    bp: { title: "Blood Pressure", desc: "Remain very still", icon: "💓", duration: 50, unit: "mmHg" }
  } as const;

  function startSequence() {
    hasCaptured = false;
    progress = 0;
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
    const sensorConnected = $sensorStatus[sensor] === 'connected';

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
    const bmiVal = (results.weight > 0 && results.height > 0)
      ? parseFloat((results.weight / (results.height * results.height)).toFixed(1))
      : 0;
    const payload = {
      user_id: user?.id,
      spo2: results.spo2,
      temperature: results.temp,
      height: results.height,
      weight: results.weight,
      bmi: bmiVal,
      blood_pressure: results.bp,
      created_at: new Date().toISOString()
    };
    onFinish(payload);
    sessionStarted = false;
    currentPhase = 'review';
    results = { weight: 0, height: 0, temp: 0, spo2: 0, bp: "0/0" };
    hasCaptured = false;
    progress = 0;
  }

  function nextPhase() {
    hasCaptured = false;
    progress = 0;

    if (isRedoingSpecific) {
      isRedoingSpecific = false;
      currentPhase = 'review';
      return;
    }

    const order: Phase[] = ['weight', 'height', 'temp', 'spo2', 'bp', 'review'];
    const currentIndex = order.indexOf(currentPhase);
    
    // Safely move to the next index or stay at review
    if (currentIndex < order.length - 1) {
        currentPhase = order[currentIndex + 1];
    } else {
        currentPhase = 'review';
    }
  }

  function redoSpecific(phase: Phase) {
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
    if (currentPhase === 'bp') {
      results.bp = "0/0";
    } else if (currentPhase !== 'review') {
      const key = currentPhase as keyof CheckupResults;
      if (key !== 'bp') (results[key] as number) = 0;
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
        {currentPhase === 'review' ? 'Summary' : `Step ${Object.keys(phases).indexOf(currentPhase) + 1} of 5`}
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
        <h2 class="text-3xl font-[1000] text-blue-600 animate-pulse uppercase tracking-tighter">
          Capturing {phases[currentPhase as keyof typeof phases].title}
        </h2>
      {:else if hasCaptured}
        <div in:scale class="flex flex-col items-center">
          <div class="w-40 h-40 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-6xl mb-6 shadow-sm">✓</div>
          <h2 class="text-2xl font-black text-blue-900/40 uppercase tracking-widest mb-2">Result</h2>
          <div class="text-7xl font-[1000] text-blue-950 mb-2">
            {results[currentPhase as keyof CheckupResults]} 
            <span class="text-2xl">{phases[currentPhase as keyof typeof phases].unit}</span>
          </div>
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
        <button on:click={nextPhase} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-transform">
          Confirm & {isRedoingSpecific ? 'Back to Summary' : 'Continue'}
        </button>
      {:else if !isScanning && !isCountingDown && currentSensorAvailable}
        <button on:click={startSequence} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-transform">
          Start Reading
        </button>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        {#if currentSensorAvailable}
          <button on:click={startSequence} disabled={isScanning || isCountingDown} class="py-6 bg-white border-2 border-blue-50 text-blue-900/40 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-blue-50 disabled:opacity-50">
            Retry
          </button>
        {:else}
          <div class="py-6 bg-slate-50 rounded-4xl"></div>
        {/if}
        <button on:click={skipPhase} disabled={isScanning || isCountingDown} class="py-6 bg-red-50 text-red-400 rounded-4xl font-black uppercase text-xs tracking-widest active:bg-red-100 disabled:opacity-50">
          {currentSensorAvailable ? 'Skip Step' : 'Next →'}
        </button>
      </div>
    </div>

  {:else}
    <div class="flex-1 flex flex-col" in:slide>
      <h1 class="text-5xl font-[1000] text-blue-950 uppercase tracking-tighter mb-2">Checkup</h1>
      <p class="text-blue-900/30 font-bold uppercase text-sm mb-6 tracking-widest">
        {!sessionStarted ? 'Ready to begin your session' : 'Review your measurements'}
      </p>
      
      <div class="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {#each Object.entries(phases) as [key, config]}
          {@const k = key as keyof CheckupResults}
          <div class="p-5 bg-white rounded-4xl border border-blue-50 flex justify-between items-center shadow-sm {results[k] === 0 || results[k] === "0/0" ? 'opacity-60' : ''}">
            <div class="flex flex-col">
              <span class="font-black text-blue-400 uppercase text-[10px] tracking-widest">{config.title}</span>
              <span class="text-2xl font-black text-blue-950">
                {results[k] === 0 || results[k] === "0/0" ? '--' : results[k]} 
                <span class="text-sm text-blue-900/30 font-black">{config.unit}</span>
              </span>
            </div>
            
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
          </div>
        {/each}
      </div>

      <div class="mt-auto pt-6 space-y-4">
        {#if !sessionStarted}
          <button on:click={() => { sessionStarted = true; currentPhase = 'weight'; }} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-all">
            Start Full Checkup
          </button>
        {:else}
          <button on:click={handleSave} class="w-full py-8 bg-green-500 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-green-100 active:scale-[0.98] transition-all">
            Save & Exit
          </button>
          <button on:click={() => {
            results = { weight: 0, height: 0, temp: 0, spo2: 0, bp: "0/0" };
            sessionStarted = false; // Reset to start new session
          }} class="w-full py-4 text-blue-900/20 font-black uppercase text-xs tracking-widest active:text-red-400">
            Clear All Data
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
</style>