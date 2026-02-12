<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { deviceStore } from '../stores/device.store';
  import { startMeasurement, getMeasurementStatus, pollMeasurementStatus } from '../services/esp32.service';
  import type { MeasurementType } from '../types/measurement.types';

  export let measurementType: MeasurementType;
  export let onComplete: (result: any) => void;
  export let onCancel: () => void;

  let status: 'starting' | 'measuring' | 'completed' | 'error' = 'starting';
  let progress = 0;
  let currentValue: any = null;
  let errorMessage = '';
  let measurementId = '';

  // Stop polling function
  let stopPolling: (() => void) | null = null;

  onMount(async () => {
    // Check if device is connected
    if (!$deviceStore.connected) {
      status = 'error';
      errorMessage = 'Device not connected. Please check the connection status.';
      return;
    }

    // Start measurement
    try {
      const response = await startMeasurement(measurementType);

      if (response.success) {
        measurementId = response.measurementId;
        status = 'measuring';

        // Start polling for updates
        stopPolling = pollMeasurementStatus(
          measurementType,
          (statusResponse) => {
            progress = statusResponse.progress;
            currentValue = statusResponse.currentValue;

            if (statusResponse.status === 'completed') {
              status = 'completed';
              setTimeout(() => {
                onComplete({
                  type: measurementType,
                  value: currentValue,
                  timestamp: new Date()
                });
              }, 1000);
            } else if (statusResponse.status === 'error') {
              status = 'error';
              errorMessage = statusResponse.error || 'Measurement failed';
            }
          }
        );
      } else {
        status = 'error';
        errorMessage = response.error || 'Failed to start measurement';
      }
    } catch (error) {
      status = 'error';
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    }
  });

  onDestroy(() => {
    // Clean up polling
    if (stopPolling) {
      stopPolling();
    }
  });

  function handleCancel() {
    if (stopPolling) {
      stopPolling();
    }
    onCancel();
  }

  // Format value based on measurement type
  function formatValue(value: any): string {
    if (value === null || value === undefined) return '--';

    if (measurementType === 'heart-rate' && typeof value === 'object') {
      // Combined HR + SpO2
      return `${value.heartRate || 0} BPM / ${value.spO2 || 0}%`;
    } else if (measurementType === 'blood-pressure' && typeof value === 'object') {
      return `${value.systolic || 0}/${value.diastolic || 0} mmHg`;
    } else if (measurementType === 'temperature') {
      return `${Number(value).toFixed(1)}°C`;
    } else if (measurementType === 'weight') {
      return `${Number(value).toFixed(1)} kg`;
    } else if (measurementType === 'height') {
      return `${Number(value).toFixed(0)} cm`;
    }

    return String(value);
  }

  // Get measurement title
  function getTitle(): string {
    const titles = {
      'height': 'Measuring Height',
      'weight': 'Measuring Weight',
      'temperature': 'Measuring Temperature',
      'heartRate': 'Measuring Heart Rate & SpO₂',
      'heart-rate': 'Measuring Heart Rate & SpO₂',
      'spO2': 'Measuring SpO₂',
      'bloodPressure': 'Measuring Blood Pressure',
      'blood-pressure': 'Measuring Blood Pressure'
    };
    return titles[measurementType] || 'Measuring...';
  }
</script>

<div class="flex flex-col h-full bg-[#9fc5f8]">
  <!-- Main Content -->
  <div class="flex-1 flex items-center justify-center px-8">
    <div class="bg-white/40 backdrop-blur-sm rounded-3xl shadow-xl p-12 w-full max-w-3xl">

      {#if status === 'starting' || status === 'measuring'}
        <!-- Measuring State -->
        <div class="text-center space-y-8">
          <h1 class="text-4xl font-bold text-[#0891b2]">
            {getTitle()}
          </h1>

          <!-- Progress Circle -->
          <div class="flex justify-center py-8">
            <div class="relative w-48 h-48">
              <!-- Background circle -->
              <svg class="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#cbd5e1"
                  stroke-width="12"
                  fill="none"
                />
                <!-- Progress circle -->
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#06b6d4"
                  stroke-width="12"
                  fill="none"
                  stroke-dasharray="{2 * Math.PI * 80}"
                  stroke-dashoffset="{2 * Math.PI * 80 * (1 - progress / 100)}"
                  class="transition-all duration-300"
                  stroke-linecap="round"
                />
              </svg>

              <!-- Center text -->
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="text-5xl font-bold text-[#0891b2]">{progress}%</div>
                {#if status === 'starting'}
                  <div class="text-slate-600 text-sm mt-2">Initializing...</div>
                {:else}
                  <div class="text-slate-600 text-sm mt-2">Measuring...</div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Current Value Display -->
          {#if currentValue !== null}
            <div class="bg-white/60 rounded-2xl p-6">
              <div class="text-slate-600 text-sm mb-2">Current Reading:</div>
              <div class="text-4xl font-bold text-[#0891b2]">
                {formatValue(currentValue)}
              </div>

              {#if measurementType === 'heart-rate' && typeof currentValue === 'object'}
                <div class="mt-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div class="text-slate-600 text-xs">Heart Rate</div>
                    <div class="text-2xl font-bold text-red-500">♥ {currentValue.heartRate || 0}</div>
                    <div class="text-xs text-slate-500">BPM</div>
                  </div>
                  <div>
                    <div class="text-slate-600 text-xs">Blood Oxygen</div>
                    <div class="text-2xl font-bold text-blue-500">O₂ {currentValue.spO2 || 0}</div>
                    <div class="text-xs text-slate-500">%</div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Instructions -->
          <div class="text-slate-700 text-lg">
            {#if measurementType === 'heart-rate'}
              Keep your finger on the sensor...
            {:else if measurementType === 'temperature'}
              Hold still while measuring...
            {:else if measurementType === 'blood-pressure'}
              Remain calm and still...
            {:else}
              Please remain still...
            {/if}
          </div>

          <!-- Cancel Button -->
          <button
            on:click={handleCancel}
            class="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-600 font-medium rounded-xl transition-colors"
          >
            Cancel Measurement
          </button>
        </div>

      {:else if status === 'completed'}
        <!-- Completed State -->
        <div class="text-center space-y-8">
          <div class="text-green-500 text-6xl">✓</div>
          <h1 class="text-4xl font-bold text-[#0891b2]">
            Measurement Complete!
          </h1>

          <div class="bg-white/60 rounded-2xl p-8">
            <div class="text-slate-600 text-sm mb-2">Final Reading:</div>
            <div class="text-5xl font-bold text-[#0891b2]">
              {formatValue(currentValue)}
            </div>

            {#if measurementType === 'heart-rate' && typeof currentValue === 'object'}
              <div class="mt-6 grid grid-cols-2 gap-6 text-center">
                <div>
                  <div class="text-slate-600 text-sm">Heart Rate</div>
                  <div class="text-3xl font-bold text-red-500">♥ {currentValue.heartRate || 0}</div>
                  <div class="text-sm text-slate-500">BPM</div>
                  <div class="text-xs text-slate-500 mt-1">
                    {currentValue.heartRate >= 60 && currentValue.heartRate <= 100 ? '✓ Normal' : '⚠ Check range'}
                  </div>
                </div>
                <div>
                  <div class="text-slate-600 text-sm">Blood Oxygen</div>
                  <div class="text-3xl font-bold text-blue-500">O₂ {currentValue.spO2 || 0}</div>
                  <div class="text-sm text-slate-500">%</div>
                  <div class="text-xs text-slate-500 mt-1">
                    {currentValue.spO2 >= 95 ? '✓ Normal' : '⚠ Low'}
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <div class="text-slate-600 text-sm">
            Redirecting...
          </div>
        </div>

      {:else if status === 'error'}
        <!-- Error State -->
        <div class="text-center space-y-8">
          <div class="text-red-500 text-6xl">✕</div>
          <h1 class="text-4xl font-bold text-red-600">
            Measurement Failed
          </h1>

          <div class="bg-red-50 rounded-2xl p-6">
            <div class="text-red-700 text-lg">
              {errorMessage}
            </div>
          </div>

          <div class="space-y-4">
            <button
              on:click={handleCancel}
              class="w-full px-8 py-4 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
            >
              Go Back
            </button>

            {#if !$deviceStore.connected}
              <div class="text-slate-600 text-sm">
                Check the connection status in the top-right corner
              </div>
            {/if}
          </div>
        </div>
      {/if}

    </div>
  </div>
</div>

<style>
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
