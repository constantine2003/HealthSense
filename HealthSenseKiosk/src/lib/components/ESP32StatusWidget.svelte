<script lang="ts">
  import { slide, fade } from 'svelte/transition';
  import {
    bridgeStatus,
    sensorStatus,
    type SensorState,
  } from '../stores/esp32Store';

  let expanded = false;

  // ── Sensor definitions ────────────────────────────────────────────────────
  const SENSORS = [
    { key: 'weight', label: 'Weight',      icon: '⚖️' },
    { key: 'height', label: 'Height',      icon: '📏' },
    { key: 'temp',   label: 'Temperature', icon: '🌡️' },
    { key: 'spo2',   label: 'HR + SpO₂',  icon: '🫀' },
    { key: 'bp',     label: 'Blood Press.',icon: '💓' },
  ] as const;

  // ── Derived display for overall bridge status ──────────────────────────────
  $: overallDot = (() => {
    switch ($bridgeStatus) {
      case 'esp32Ready':   return { color: 'bg-emerald-400', pulse: true  };
      case 'esp32Missing': return { color: 'bg-amber-400',   pulse: true  };
      case 'connecting':   return { color: 'bg-blue-400',    pulse: true  };
      case 'connected':    return { color: 'bg-blue-300',    pulse: false };
      default:             return { color: 'bg-red-400',     pulse: false };
    }
  })();

  $: overallLabel = (() => {
    switch ($bridgeStatus) {
      case 'esp32Ready':   return 'ESP32 Ready';
      case 'esp32Missing': return 'ESP32 Missing';
      case 'connecting':   return 'Connecting…';
      case 'connected':    return 'Bridge Open';
      default:             return 'Offline';
    }
  })();

  // ── Per-sensor state helpers ──────────────────────────────────────────────
  function sensorDot(state: SensorState): string {
    switch (state) {
      case 'connected':    return 'bg-emerald-400';
      case 'disconnected': return 'bg-red-400';
      case 'error':        return 'bg-amber-400';
      default:             return 'bg-slate-300';
    }
  }

  function sensorLabel(state: SensorState): string {
    switch (state) {
      case 'connected':    return 'Connected';
      case 'disconnected': return 'Not detected';
      case 'error':        return 'Error';
      default:             return 'Unknown';
    }
  }

  function sensorTextColor(state: SensorState): string {
    switch (state) {
      case 'connected':    return 'text-emerald-600';
      case 'disconnected': return 'text-red-400';
      case 'error':        return 'text-amber-500';
      default:             return 'text-slate-400';
    }
  }
</script>

<!-- Fixed container: top-right, above everything -->
<div class="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">

  <!-- ── Pill toggle button ── -->
  <button
    on:click={() => (expanded = !expanded)}
    class="flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg
           bg-white/90 backdrop-blur-sm border border-slate-100
           text-slate-700 active:scale-95 transition-transform duration-100
           select-none"
    aria-label="Toggle ESP32 status"
    aria-expanded={expanded}
  >
    <!-- Status dot -->
    <span
      class="w-2.5 h-2.5 rounded-full flex-shrink-0 {overallDot.color}
             {overallDot.pulse ? 'animate-pulse' : ''}"
    ></span>

    <span class="text-[11px] font-black uppercase tracking-widest leading-none">
      {overallLabel}
    </span>

    <!-- Chevron -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-3 h-3 text-slate-400 transition-transform duration-200
             {expanded ? 'rotate-180' : ''}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- ── Expanded sensor panel ── -->
  {#if expanded}
    <div
      in:slide={{ duration: 180 }}
      out:slide={{ duration: 140 }}
      class="w-56 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl
             border border-slate-100 overflow-hidden p-4 flex flex-col gap-1"
    >
      <!-- Header -->
      <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
        Sensor Status
      </p>

      {#each SENSORS as sensor}
        {@const state = $sensorStatus[sensor.key]}
        <div
          class="flex items-center gap-3 px-3 py-2.5 rounded-2xl
                 {state === 'connected' ? 'bg-emerald-50' :
                  state === 'error'     ? 'bg-amber-50'   :
                  state === 'disconnected' ? 'bg-red-50'  : 'bg-slate-50'}"
        >
          <!-- Icon -->
          <span class="text-base leading-none">{sensor.icon}</span>

          <!-- Label + status -->
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-black text-slate-700 leading-none">{sensor.label}</p>
            <p class="text-[9px] font-bold {sensorTextColor(state)} uppercase tracking-wide mt-0.5">
              {sensorLabel(state)}
            </p>
          </div>

          <!-- Dot indicator -->
          <span class="w-2 h-2 rounded-full flex-shrink-0 {sensorDot(state)}
                       {state === 'connected' ? 'animate-pulse' : ''}"></span>
        </div>
      {/each}

      <!-- Bridge note when ESP32 is missing -->
      {#if $bridgeStatus !== 'esp32Ready'}
        <div in:fade class="mt-2 px-3 py-2 rounded-2xl bg-slate-50 text-center">
          <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
            {$bridgeStatus === 'disconnected' || $bridgeStatus === 'connecting'
              ? 'Bridge not reachable'
              : 'ESP32 not detected on serial'}
          </p>
        </div>
      {/if}
    </div>
  {/if}
</div>
