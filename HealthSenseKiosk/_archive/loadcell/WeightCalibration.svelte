<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import {
    send as wsSend,
    weightRawReading,
    weightLiveReading,
    weightScaleLoaded,
    weightConfigSaved,
    tareDone,
    latestReading,
  } from '../stores/esp32Store';

  export let onClose: () => void;

  // ── Calibration state machine ─────────────────────────────────────────────
  type Step = 'intro' | 'tare' | 'measure' | 'test' | 'save';
  let step: Step = 'intro';

  let knownWeightKg = 0.5;

  // Tare
  let taringBusy = false;
  let tareDoneConfirmed = false;

  // Raw reads — collect 3, average them
  const RAW_READS = 3;
  let rawReadings: number[] = [];
  let rawReadBusy = false;
  let rawReadIndex = 0;   // which of the 3 reads we're waiting for
  let rawAvg: number | null = null;
  let rawMin: number | null = null;
  let rawMax: number | null = null;
  let calculatedFactor: number | null = null;

  // Test
  let testReading: number | null = null;
  let testBusy = false;

  // Manual override
  let manualFactorInput: number | null = null;
  let manualApplied = false;

  function applyManualFactor() {
    if (!manualFactorInput || manualFactorInput <= 0) return;
    calculatedFactor = Math.round(manualFactorInput);
    manualApplied = true;
    rawAvg = null; rawMin = null; rawMax = null;
    step = 'test';
  }

  // Save
  let savedFactor: number | null = null;
  let saveBusy = false;
  let saved = false;

  let statusMsg = '';

  // ── Load existing saved config ────────────────────────────────────────────
  onMount(() => {
    wsSend({ command: 'weight_load_config' });
  });

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const unsubTare = tareDone.subscribe((v) => {
    if (v && taringBusy) {
      taringBusy = false;
      tareDoneConfirmed = true;
      statusMsg = 'Scale zeroed ✓  — now place your known weight';
      step = 'measure';
      tareDone.set(false);
    }
  });

  const unsubRaw = weightRawReading.subscribe((v) => {
    if (v !== null && rawReadBusy) {
      rawReadings = [...rawReadings, v];
      weightRawReading.set(null);

      if (rawReadings.length < RAW_READS) {
        // Fire the next read after 500ms gap
        rawReadIndex++;
        statusMsg = `Reading ${rawReadings.length + 1} of ${RAW_READS}…`;
        setTimeout(() => {
          wsSend({ command: 'weight_raw' });
        }, 500);
      } else {
        // All 3 done — compute stats
        rawAvg  = rawReadings.reduce((a, b) => a + b, 0) / RAW_READS;
        rawMin  = Math.min(...rawReadings);
        rawMax  = Math.max(...rawReadings);
        calculatedFactor = Math.round(rawAvg / knownWeightKg);
        rawReadBusy = false;
        statusMsg = '';
      }
    }
  });

  const unsubLoaded = weightScaleLoaded.subscribe((v) => {
    if (v !== null) savedFactor = v;
  });

  const unsubSaved = weightConfigSaved.subscribe((v) => {
    if (v && saveBusy) {
      saveBusy = false;
      saved = true;
    }
  });

  const unsubReading = latestReading.subscribe((r) => {
    if (r?.sensor === 'weight' && testBusy) {
      testReading = Number(r.value);
      testBusy = false;
      statusMsg = '';
    }
  });

  onDestroy(() => {
    unsubTare();
    unsubRaw();
    unsubLoaded();
    unsubSaved();
    unsubReading();
    weightConfigSaved.set(false);
    weightRawReading.set(null);
    tareDone.set(false);
  });

  // ── Step handlers ─────────────────────────────────────────────────────────
  function doTare() {
    taringBusy = true;
    tareDoneConfirmed = false;
    statusMsg = 'Zeroing scale… (~2 s)';
    tareDone.set(false);
    wsSend({ command: 'tare' });
    // Safety fallback: if no tare_done arrives within 6s, unblock anyway
    setTimeout(() => {
      if (taringBusy) {
        taringBusy = false;
        tareDoneConfirmed = true;
        step = 'measure';
        statusMsg = 'Tare timeout — proceed carefully';
      }
    }, 6000);
  }

  function doReadRaw() {
    rawReadings = [];
    rawReadIndex = 0;
    rawAvg = null;
    rawMin = null;
    rawMax = null;
    calculatedFactor = null;
    rawReadBusy = true;
    statusMsg = `Reading 1 of ${RAW_READS}…`;
    weightRawReading.set(null);
    wsSend({ command: 'weight_raw' });
    // Safety timeout: each weight_raw takes ~4s (40 samples × 100ms); 3 reads = ~15s max
    setTimeout(() => {
      if (rawReadBusy) {
        rawReadBusy = false;
        if (rawReadings.length > 0) {
          // Partial — use what we have
          rawAvg = rawReadings.reduce((a, b) => a + b, 0) / rawReadings.length;
          rawMin = Math.min(...rawReadings);
          rawMax = Math.max(...rawReadings);
          calculatedFactor = Math.round(rawAvg / knownWeightKg);
          statusMsg = `Only ${rawReadings.length}/${RAW_READS} reads completed`;
        } else {
          statusMsg = 'No response — check ESP32 connection';
        }
      }
    }, 20000);
  }

  function doTestFactor() {
    if (calculatedFactor === null) return;
    testReading = null;
    testBusy = true;
    statusMsg = 'Applying factor and measuring…';
    wsSend({ command: 'set_weight_scale', value: calculatedFactor });
    setTimeout(() => {
      wsSend({ command: 'start', sensor: 'weight' });
    }, 400);
    setTimeout(() => {
      if (testBusy) {
        testBusy = false;
        statusMsg = 'Measurement timed out — try again';
      }
    }, 20000);
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
  $: rawVariancePct = (rawMin !== null && rawMax !== null && rawAvg !== null && rawAvg > 0)
    ? (((rawMax - rawMin) / rawAvg) * 100).toFixed(1)
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
          <p class="text-xs text-white/40 font-bold uppercase tracking-widest mt-0.5">
            Current factor: {savedFactor.toLocaleString()}
          </p>
        {/if}
      </div>
      <span class="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-white ml-2">
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
      <div class="flex items-center gap-3 mb-3">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
          {tareDoneConfirmed ? 'bg-green-500 text-white' : taringBusy ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}">
          {tareDoneConfirmed ? '✓' : '1'}
        </span>
        <p class="text-white font-black uppercase tracking-widest text-sm">Tare (Empty Scale)</p>
      </div>
      <p class="text-white/50 text-sm font-bold mb-4">
        Remove <strong class="text-white/70">everything</strong> from the scale platform, then tap Tare. Wait for confirmation before placing a weight.
      </p>
      <button
        on:click={doTare}
        disabled={taringBusy}
        class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
          {taringBusy
            ? 'bg-yellow-500/20 text-yellow-300 cursor-not-allowed'
            : tareDoneConfirmed
              ? 'bg-green-500/20 text-green-300 active:scale-95'
              : 'bg-blue-500 text-white active:scale-95'}"
      >
        {#if taringBusy}
          <span class="animate-pulse">⏳ Zeroing… (~2 s)</span>
        {:else if tareDoneConfirmed}
          ✓ Zeroed — Tap to Re-tare
        {:else}
          ↩ Tare Scale
        {/if}
      </button>
      {#if statusMsg && (taringBusy || tareDoneConfirmed)}
        <p class="text-center text-xs font-bold mt-2 {tareDoneConfirmed ? 'text-green-400' : 'text-yellow-300'}">{statusMsg}</p>
      {/if}
    </div>

    <!-- ── Step 2: Known weight + raw reads ── -->
    <div class="bg-white/5 rounded-3xl p-5 {!tareDoneConfirmed ? 'opacity-40 pointer-events-none' : ''}">
      <div class="flex items-center gap-3 mb-3">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
          {calculatedFactor !== null ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}">
          {calculatedFactor !== null ? '✓' : '2'}
        </span>
        <p class="text-white font-black uppercase tracking-widest text-sm">Place Known Weight</p>
      </div>
      <p class="text-white/50 text-sm font-bold mb-4">
        Place a weight of known mass on the platform. The system will take <strong class="text-white/70">{RAW_READS} readings</strong> and average them for a stable factor.
      </p>

      <label for="known-weight" class="block mb-1 text-xs font-black uppercase tracking-widest text-white/40">Known Mass (kg)</label>
      <input
        id="known-weight"
        type="number"
        min="0.01"
        step="0.01"
        bind:value={knownWeightKg}
        class="w-full bg-white/10 text-white font-black text-xl rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-blue-400 mb-4 tabular-nums"
        placeholder="0.50"
      />

      <!-- Progress dots for 3 reads -->
      {#if rawReadBusy || rawReadings.length > 0}
        <div class="flex gap-2 mb-3 justify-center">
          {#each Array(RAW_READS) as _, i}
            <div class="w-3 h-3 rounded-full transition-all {
              i < rawReadings.length ? 'bg-green-400' :
              i === rawReadings.length && rawReadBusy ? 'bg-yellow-400 animate-pulse' :
              'bg-white/10'
            }"></div>
          {/each}
        </div>
      {/if}

      <button
        on:click={doReadRaw}
        disabled={rawReadBusy || knownWeightKg <= 0}
        class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
          {rawReadBusy || knownWeightKg <= 0
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : calculatedFactor !== null
              ? 'bg-indigo-500/40 text-indigo-200 active:scale-95'
              : 'bg-indigo-500 text-white active:scale-95'}"
      >
        {#if rawReadBusy}
          <span class="animate-pulse">{statusMsg || 'Reading…'} (~{RAW_READS * 4}s total)</span>
        {:else if calculatedFactor !== null}
          🔄 Re-read (Redo {RAW_READS} reads)
        {:else}
          📡 Read Raw ADC ({RAW_READS}× averaged)
        {/if}
      </button>

      {#if rawAvg !== null && calculatedFactor !== null}
        <div class="mt-4 bg-white/5 rounded-2xl p-4 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs font-black uppercase tracking-widest text-white/40">Average Raw ADC</span>
            <span class="text-white font-black tabular-nums text-lg">{Math.round(rawAvg).toLocaleString()}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-black uppercase tracking-widest text-white/40">Min / Max</span>
            <span class="text-white/50 font-black tabular-nums text-sm">
              {Math.round(rawMin!).toLocaleString()} / {Math.round(rawMax!).toLocaleString()}
            </span>
          </div>
          {#if rawVariancePct !== null}
            <div class="flex justify-between items-center">
              <span class="text-xs font-black uppercase tracking-widest text-white/40">Spread</span>
              <span class="font-black tabular-nums text-sm {Number(rawVariancePct) < 3 ? 'text-green-400' : Number(rawVariancePct) < 8 ? 'text-yellow-400' : 'text-red-400'}">
                {rawVariancePct}%
                {Number(rawVariancePct) < 3 ? '✓ Stable' : Number(rawVariancePct) < 8 ? '⚠ Moderate' : '✗ Unstable — re-read'}
              </span>
            </div>
          {/if}
          <div class="flex justify-between items-center pt-1 border-t border-white/10">
            <span class="text-xs font-black uppercase tracking-widest text-white/40">Calculated Factor</span>
            <span class="text-blue-300 font-black tabular-nums text-lg">{calculatedFactor.toLocaleString()}</span>
          </div>
          <p class="text-xs text-white/30 font-bold">{Math.round(rawAvg!).toLocaleString()} ÷ {knownWeightKg} kg</p>
        </div>
      {:else if statusMsg && !rawReadBusy}
        <p class="text-center text-xs text-orange-400 font-bold mt-2">{statusMsg}</p>
      {/if}
    </div>

    <!-- ── Manual Override ── -->
    <div class="bg-white/5 rounded-3xl p-5">
      <div class="flex items-center gap-3 mb-3">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
          {manualApplied && calculatedFactor !== null ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}">
          {manualApplied && calculatedFactor !== null ? '✓' : '✎'}
        </span>
        <p class="text-white font-black uppercase tracking-widest text-sm">Manual Factor Override</p>
      </div>
      <p class="text-white/50 text-sm font-bold mb-4">
        Already know your scale factor? Enter it directly to skip the tare + ADC read steps.
        {#if savedFactor !== null}
          <span class="text-white/30"> (Current saved: <span class="text-white/50 font-black">{savedFactor.toLocaleString()}</span>)</span>
        {/if}
      </p>

      <label for="manual-factor" class="block mb-1 text-xs font-black uppercase tracking-widest text-white/40">Scale Factor (integer ADC counts / kg)</label>
      <input
        id="manual-factor"
        type="number"
        min="1"
        step="1"
        bind:value={manualFactorInput}
        class="w-full bg-white/10 text-white font-black text-xl rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-orange-400 mb-4 tabular-nums"
        placeholder="e.g. 20"
      />

      <button
        on:click={applyManualFactor}
        disabled={!manualFactorInput || manualFactorInput <= 0}
        class="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all
          {!manualFactorInput || manualFactorInput <= 0
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-orange-500 text-white active:scale-95'}"
      >
        ✎ Apply Manual Factor
      </button>

      {#if manualApplied && calculatedFactor !== null}
        <p class="text-center text-xs text-green-400 font-bold mt-2">
          Factor {calculatedFactor.toLocaleString()} applied — use Step 3 &amp; 4 below to test and save.
        </p>
      {/if}
    </div>

    <!-- ── Step 3: Test ── -->
    {#if calculatedFactor !== null}
      <div class="bg-white/5 rounded-3xl p-5">
        <div class="flex items-center gap-3 mb-3">
          <span class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-black">3</span>
          <p class="text-white font-black uppercase tracking-widest text-sm">Test Reading</p>
        </div>
        <p class="text-white/50 text-sm font-bold mb-4">
          Keep the <strong class="text-white/70">{knownWeightKg} kg</strong> weight on the scale, then tap Test to verify accuracy.
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
              <span class="text-xs font-black uppercase tracking-widest text-white/40">Measured</span>
              <span class="text-white font-black tabular-nums text-2xl">{testReading.toFixed(2)} kg</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-black uppercase tracking-widest text-white/40">Expected</span>
              <span class="text-white/50 font-black tabular-nums">{knownWeightKg.toFixed(2)} kg</span>
            </div>
            {#if accuracyPct !== null}
              <div class="flex justify-between items-center">
                <span class="text-xs font-black uppercase tracking-widest text-white/40">Error</span>
                <span class="font-black tabular-nums {Number(accuracyPct) < 5 ? 'text-green-400' : 'text-orange-400'}">
                  {accuracyPct}%
                  {Number(accuracyPct) < 5 ? '✓ Good' : '⚠ Try re-reading raw'}
                </span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- ── Step 4: Save ── -->
    {#if calculatedFactor !== null}
      <div class="bg-white/5 rounded-3xl p-5">
        <div class="flex items-center gap-3 mb-3">
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
            <p class="text-white/30 text-xs font-bold mt-1">Auto-applies on every ESP32 boot.</p>
          </div>
        {:else}
          <p class="text-white/50 text-sm font-bold mb-4">
            Save factor <strong class="text-white font-black">{calculatedFactor.toLocaleString()}</strong> — will be applied automatically on every ESP32 connect.
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
