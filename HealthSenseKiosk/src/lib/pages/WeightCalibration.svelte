<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import {
    send as wsSend,
    weightRawReading,
    weightLiveReading,
    weightScaleLoaded,
    weightConfigSaved,
    measureProgress,
    latestReading,
  } from '../stores/esp32Store';

  export let onClose: () => void;

  // ── Calibration state machine ─────────────────────────────────────────────
  type Step = 'intro' | 'tare' | 'measure' | 'test' | 'save';
  let step: Step = 'intro';

  let knownWeightKg = 0.5;         // default: 500g platform
  let rawValue: number | null = null;
  let calculatedFactor: number | null = null;
  let savedFactor: number | null = null;
  let testReading: number | null = null;

  let taringBusy = false;
  let readingBusy = false;
  let testBusy = false;
  let saveBusy = false;
  let saved = false;

  let statusMsg = '';

  // ── Load existing saved config ────────────────────────────────────────────
  onMount(() => {
    wsSend({ command: 'weight_load_config' });
  });

  // ── Reactive subscriptions ────────────────────────────────────────────────
  const unsubRaw = weightRawReading.subscribe((v) => {
    if (v !== null && readingBusy) {
      rawValue = v;
      calculatedFactor = Math.round(v / knownWeightKg);
      readingBusy = false;
      statusMsg = '';
    }
  });

  const unsubLoaded = weightScaleLoaded.subscribe((v) => {
    if (v !== null) savedFactor = v;
  });

  const unsubSaved = weightConfigSaved.subscribe((v) => {
    if (v && saveBusy) {
      saveBusy = false;
      saved = true;
      step = 'save';
    }
  });

  const unsubLive = weightLiveReading.subscribe((v) => {
    if (v !== null && testBusy) {
      testReading = v;
    }
  });

  const unsubReading = latestReading.subscribe((r) => {
    if (r?.sensor === 'weight' && testBusy) {
      testReading = Number(r.value);
      testBusy = false;
    }
  });

  onDestroy(() => {
    unsubRaw();
    unsubLoaded();
    unsubSaved();
    unsubLive();
    unsubReading();
    weightConfigSaved.set(false);
    weightRawReading.set(null);
  });

  // ── Step handlers ─────────────────────────────────────────────────────────
  function doTare() {
    taringBusy = true;
    statusMsg = 'Zeroing scale…';
    wsSend({ command: 'tare' });
    setTimeout(() => {
      taringBusy = false;
      statusMsg = 'Scale zeroed ✓';
    }, 2500); // tare(5) takes ~500ms; add buffer for serial round-trip
  }

  function doReadRaw() {
    rawValue = null;
    readingBusy = true;
    statusMsg = 'Reading raw value…';
    weightRawReading.set(null);
    wsSend({ command: 'weight_raw' });
    // Safety timeout
    setTimeout(() => {
      if (readingBusy) {
        readingBusy = false;
        statusMsg = 'No response — check ESP32 connection';
      }
    }, 8000);
  }

  function doTestFactor() {
    if (calculatedFactor === null) return;
    testReading = null;
    testBusy = true;
    statusMsg = 'Applying factor and measuring…';
    wsSend({ command: 'set_weight_scale', value: calculatedFactor });
    setTimeout(() => {
      weightLiveReading.set(null);
      wsSend({ command: 'start', sensor: 'weight' });
    }, 300);
    setTimeout(() => {
      if (testBusy) {
        testBusy = false;
        statusMsg = 'Measurement timed out — try again';
      }
    }, 15000);
  }

  function doSave() {
    if (calculatedFactor === null) return;
    saveBusy = true;
    weightConfigSaved.set(false);
    wsSend({ command: 'weight_save_config', scaleFactor: calculatedFactor });
    setTimeout(() => {
      if (saveBusy) {
        saveBusy = false;
        statusMsg = 'Save timed out — check connection';
      }
    }, 5000);
  }

  $: accuracyPct = (testReading !== null && knownWeightKg > 0)
    ? Math.abs(((testReading - knownWeightKg) / knownWeightKg) * 100).toFixed(1)
    : null;
</script>

<!-- ── Full-screen overlay ──────────────────────────────────────────────────── -->
<div
  class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col overflow-hidden"
  transition:fade={{ duration: 150 }}
>
  <!-- Header -->
  <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
    <div class="flex items-center gap-3">
      <span class="text-2xl">⚖️</span>
      <div>
        <span class="text-white font-black text-base uppercase tracking-widest">Scale Calibration</span>
        {#if savedFactor !== null}
          <p class="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
            Current factor: {savedFactor.toLocaleString()}
          </p>
        {/if}
      </div>
      <span class="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white ml-2">
        ⚙️ Admin
      </span>
    </div>
    <button
      on:click={onClose}
      class="text-white/50 font-black text-sm uppercase tracking-widest px-3 py-1 rounded-xl active:bg-white/10"
    >✕</button>
  </div>

  <!-- Body -->
  <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">

    <!-- ── Step 1: Tare ── -->
    <div class="bg-white/5 rounded-3xl p-5">
      <div class="flex items-center gap-3 mb-4">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
          {step === 'intro' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'}">1</span>
        <p class="text-white font-black uppercase tracking-widest text-sm">Tare (Empty Scale)</p>
      </div>
      <p class="text-white/50 text-sm font-bold mb-4">
        Remove <strong class="text-white/70">everything</strong> from the scale platform, then tap Tare to zero it.
      </p>
      <button
        on:click={doTare}
        disabled={taringBusy}
        class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
          {taringBusy
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-blue-500 text-white active:scale-95'}"
      >
        {#if taringBusy}
          <span class="animate-pulse">Taring…</span>
        {:else}
          ↩ Tare Scale
        {/if}
      </button>
      {#if statusMsg && step === 'intro'}
        <p class="text-center text-xs text-white/50 font-bold mt-2">{statusMsg}</p>
      {/if}
    </div>

    <!-- ── Step 2: Known weight + raw read ── -->
    <div class="bg-white/5 rounded-3xl p-5">
      <div class="flex items-center gap-3 mb-4">
        <span class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-black">2</span>
        <p class="text-white font-black uppercase tracking-widest text-sm">Place Known Weight</p>
      </div>
      <p class="text-white/50 text-sm font-bold mb-4">
        Put a weight of known mass onto the platform (e.g. 500g platform = 0.5 kg), then read the raw value.
      </p>

      <label for="known-weight" class="block mb-1 text-[10px] font-black uppercase tracking-widest text-white/40">Known Mass (kg)</label>
      <input
        id="known-weight"
        type="number"
        min="0.01"
        step="0.01"
        bind:value={knownWeightKg}
        class="w-full bg-white/10 text-white font-black text-xl rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-blue-400 mb-4 tabular-nums"
        placeholder="0.50"
      />

      <button
        on:click={doReadRaw}
        disabled={readingBusy || knownWeightKg <= 0}
        class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
          {readingBusy || knownWeightKg <= 0
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-indigo-500 text-white active:scale-95'}"
      >
        {#if readingBusy}
          <span class="animate-pulse">Reading…</span>
        {:else}
          📡 Read Raw ADC Value
        {/if}
      </button>

      {#if rawValue !== null}
        <div class="mt-4 bg-white/5 rounded-2xl p-4 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Raw ADC Value</span>
            <span class="text-white font-black tabular-nums text-lg">{rawValue.toLocaleString()}</span>
          </div>
          {#if calculatedFactor !== null}
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Calculated Factor</span>
              <span class="text-blue-300 font-black tabular-nums text-lg">{calculatedFactor.toLocaleString()}</span>
            </div>
            <p class="text-[10px] text-white/30 font-bold">{rawValue.toLocaleString()} ÷ {knownWeightKg} kg</p>
          {/if}
        </div>
      {:else if statusMsg && readingBusy === false && step !== 'intro'}
        <p class="text-center text-xs text-orange-400 font-bold mt-2">{statusMsg}</p>
      {/if}
    </div>

    <!-- ── Step 3: Test ── -->
    {#if calculatedFactor !== null}
      <div class="bg-white/5 rounded-3xl p-5">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-black">3</span>
          <p class="text-white font-black uppercase tracking-widest text-sm">Test Reading</p>
        </div>
        <p class="text-white/50 text-sm font-bold mb-4">
          Keep the <strong class="text-white/70">{knownWeightKg} kg</strong> weight on the scale, then tap Test to verify the factor gives an accurate reading.
        </p>

        <button
          on:click={doTestFactor}
          disabled={testBusy}
          class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
            {testBusy
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-violet-500 text-white active:scale-95'}"
        >
          {#if testBusy}
            <span class="animate-pulse">Measuring…</span>
          {:else}
            🧪 Test Factor
          {/if}
        </button>

        {#if testReading !== null}
          <div class="mt-4 bg-white/5 rounded-2xl p-4 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Measured Weight</span>
              <span class="text-white font-black tabular-nums text-2xl">{testReading.toFixed(2)} kg</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Expected</span>
              <span class="text-white/50 font-black tabular-nums">{knownWeightKg.toFixed(2)} kg</span>
            </div>
            {#if accuracyPct !== null}
              <div class="flex justify-between items-center">
                <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Error</span>
                <span class="font-black tabular-nums {Number(accuracyPct) < 5 ? 'text-green-400' : 'text-orange-400'}">
                  {accuracyPct}%
                  {Number(accuracyPct) < 5 ? '✓ Good' : '⚠ Adjust known weight'}
                </span>
              </div>
            {/if}
          </div>

          {#if $weightLiveReading !== null && testBusy}
            <p class="text-center text-xs text-white/40 font-bold mt-2 tabular-nums">
              Live: {$weightLiveReading.toFixed(2)} kg
            </p>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- ── Step 4: Save ── -->
    {#if calculatedFactor !== null}
      <div class="bg-white/5 rounded-3xl p-5">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-8 h-8 rounded-full {saved ? 'bg-green-500' : 'bg-blue-500'} text-white flex items-center justify-center text-sm font-black">
            {saved ? '✓' : '4'}
          </span>
          <p class="text-white font-black uppercase tracking-widest text-sm">
            {saved ? 'Saved!' : 'Save Calibration'}
          </p>
        </div>

        {#if saved}
          <div class="bg-green-500/10 rounded-2xl p-4 text-center">
            <p class="text-green-400 font-black text-lg">✅ Calibration Saved</p>
            <p class="text-white/50 text-sm font-bold mt-1">
              Factor <span class="text-white font-black">{calculatedFactor.toLocaleString()}</span> applied and persisted.
            </p>
            <p class="text-white/30 text-xs font-bold mt-1">Will auto-apply on every ESP32 boot.</p>
          </div>
        {:else}
          <p class="text-white/50 text-sm font-bold mb-4">
            Save factor <strong class="text-white font-black">{calculatedFactor.toLocaleString()}</strong> — it will be applied automatically every time the ESP32 connects.
          </p>
          <button
            on:click={doSave}
            disabled={saveBusy}
            class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
              {saveBusy
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-green-500 text-white active:scale-95'}"
          >
            {#if saveBusy}
              <span class="animate-pulse">Saving…</span>
            {:else}
              💾 Save Calibration
            {/if}
          </button>
        {/if}
      </div>
    {/if}

  </div>

  <!-- Footer -->
  <div class="flex-shrink-0 px-6 pb-6 pt-2 border-t border-white/10">
    <button
      on:click={onClose}
      class="w-full py-4 rounded-2xl text-white/40 font-black uppercase tracking-widest text-sm active:text-white/70"
    >
      {saved ? '✓ Done' : 'Close Without Saving'}
    </button>
  </div>
</div>
