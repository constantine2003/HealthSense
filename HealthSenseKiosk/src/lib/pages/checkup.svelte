<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  export let onFinish: (data: any) => void;
  export let onCancel: () => void;

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
  let countdown = 3;
  let progress = 0;
  let scanInterval: any;

  // --- DATA STORAGE ---
  let results: CheckupResults = { 
    weight: 0, 
    height: 0, 
    temp: 0, 
    spo2: 0, 
    bp: "0/0" 
  };

  // --- PHASE CONFIGURATION ---
  const phases = {
    weight: { title: "Weight", desc: "Step onto the platform and stand still", icon: "⚖️", duration: 50, unit: "kg" },
    height: { title: "Height", desc: "Stand straight against the back sensor", icon: "📏", duration: 50, unit: "m" },
    temp: { title: "Temperature", desc: "Place your hand/forehead near the sensor", icon: "🌡️", duration: 40, unit: "°C" },
    spo2: { title: "SpO2", desc: "Place your finger firmly in the clip", icon: "🫀", duration: 60, unit: "%" },
    bp: { title: "Blood Pressure", desc: "Insert arm into cuff and remain very still", icon: "💓", duration: 100, unit: "mmHg" }
  } as const; // Added 'as const' for stricter typing

  function startSequence() {
    clearInterval(scanInterval);
    isScanning = false;
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
    // CurrentPhase is guaranteed to be a key of phases here because of the 'if' block in HTML
    const activePhase = currentPhase as keyof typeof phases;
    const speed = phases[activePhase].duration;

    scanInterval = setInterval(() => {
      progress += 2;
      if (progress >= 100) {
        clearInterval(scanInterval);
        isScanning = false;
        hasCaptured = true;
        injectMockData();
      }
    }, speed); 
  }

  function injectMockData() {
    if (currentPhase === 'weight') results.weight = 72.4;
    else if (currentPhase === 'height') results.height = 1.75;
    else if (currentPhase === 'temp') results.temp = 36.6;
    else if (currentPhase === 'spo2') results.spo2 = 98;
    else if (currentPhase === 'bp') results.bp = "120/80";
  }

  function nextPhase() {
    hasCaptured = false;
    progress = 0;
    
    if (isRedoingSpecific) {
      isRedoingSpecific = false;
      currentPhase = 'review';
      return;
    }

    if (currentPhase === 'weight') currentPhase = 'height';
    else if (currentPhase === 'height') currentPhase = 'temp';
    else if (currentPhase === 'temp') currentPhase = 'spo2';
    else if (currentPhase === 'spo2') currentPhase = 'bp';
    else if (currentPhase === 'bp') currentPhase = 'review';
  }

  function redoSpecific(phase: Phase) {
    isRedoingSpecific = true;
    currentPhase = phase;
    hasCaptured = false;
    progress = 0;
  }

  function skipPhase() {
    clearInterval(scanInterval);
    isScanning = false;
    isCountingDown = false;
    hasCaptured = false;
    nextPhase();
  }

  $: isNewSession = results.weight === 0 && results.bp === "0/0";
</script>

<div class="h-full w-full bg-[#f8fbff] flex flex-col p-10 select-none overflow-hidden text-slate-900">
  
  <div class="flex items-center justify-between mb-12">
    <button on:click={onCancel} class="text-blue-900/30 font-black uppercase tracking-widest text-xs">Exit</button>
    <div class="flex gap-1">
      {#each ['weight', 'height', 'temp', 'spo2', 'bp', 'review'] as p}
        <div class="h-1.5 w-8 rounded-full {currentPhase === p ? 'bg-blue-600' : 'bg-blue-100'} transition-all duration-500"></div>
      {/each}
    </div>
    <span class="text-blue-600 font-black text-[10px] uppercase">
        {currentPhase === 'review' ? 'Summary' : `Step ${Object.keys(phases).indexOf(currentPhase) + 1} of 5`}
    </span>
  </div>

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
          <div class="w-40 h-40 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-6xl mb-6">✓</div>
          <h2 class="text-2xl font-black text-blue-900/40 uppercase tracking-widest mb-2">Result</h2>
          <div class="text-7xl font-[1000] text-blue-950 mb-2">
            {results[currentPhase as keyof CheckupResults]} 
            <span class="text-2xl">{phases[currentPhase as keyof typeof phases].unit}</span>
          </div>
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
        <button on:click={nextPhase} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl">
          Confirm & {isRedoingSpecific ? 'Back to Summary' : 'Continue'}
        </button>
      {:else if !isScanning && !isCountingDown}
        <button on:click={startSequence} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl">
          Start Reading
        </button>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <button on:click={startSequence} disabled={isScanning || isCountingDown} class="py-6 bg-white border-2 border-blue-50 text-blue-900/40 rounded-4xl font-black uppercase text-xs tracking-widest">
          Retry
        </button>
        <button on:click={skipPhase} disabled={isScanning || isCountingDown} class="py-6 bg-red-50 text-red-400 rounded-4xl font-black uppercase text-xs tracking-widest">
          Done
        </button>
      </div>
    </div>

  {:else}
    <div class="flex-1 flex flex-col" in:slide>
      <h1 class="text-5xl font-[1000] text-blue-950 uppercase tracking-tighter mb-2">Checkup</h1>
      <p class="text-blue-900/30 font-bold uppercase text-sm mb-6 tracking-widest">
        {isNewSession ? 'Ready to begin your session' : 'Review your measurements'}
      </p>
      
      <div class="grid grid-cols-1 gap-3 overflow-y-auto pr-2">
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
        {#if isNewSession}
          <button on:click={() => currentPhase = 'weight'} class="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl">
            Start Full Checkup
          </button>
        {:else}
          <button on:click={() => onFinish(results)} class="w-full py-8 bg-green-500 text-white rounded-[2.5rem] text-2xl font-black uppercase shadow-xl shadow-green-100">
            Save & Exit
          </button>
          <button on:click={() => {results = { weight: 0, height: 0, temp: 0, spo2: 0, bp: "0/0" };}} class="w-full py-4 text-blue-900/20 font-black uppercase text-xs tracking-widest">
            Clear All Data
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>