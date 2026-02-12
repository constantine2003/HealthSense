<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { deviceStore, connectionStatus, availableSensors } from '../stores/device.store';
  import { ESP32_BASE_URL } from '../utils/constants';

  let showDetails = false;
  let isExpanded = false;

  // Auto-connect on mount
  onMount(async () => {
    console.log('ESP32 Connection Status mounted');
    // Attempt initial connection
    await deviceStore.connect();
  });

  onDestroy(() => {
    // Clean up if needed
  });

  async function handleConnect() {
    await deviceStore.connect();
  }

  async function handleDisconnect() {
    deviceStore.disconnect();
  }

  async function handleRetry() {
    await deviceStore.retry();
  }

  function toggleDetails() {
    showDetails = !showDetails;
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  // Status colors and icons
  $: statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500'
  }[$connectionStatus];

  $: statusText = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Error'
  }[$connectionStatus];

  $: statusIcon = {
    connected: '✓',
    connecting: '⟳',
    disconnected: '○',
    error: '✕'
  }[$connectionStatus];
</script>

<div class="fixed top-4 right-4 z-50">
  <!-- Compact Status Indicator -->
  <div class="bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
    <!-- Header -->
    <button
      on:click={toggleExpanded}
      class="flex items-center gap-3 px-4 py-3 w-full hover:bg-slate-800/50 transition-colors"
    >
      <!-- Status Dot -->
      <div class="relative">
        <div class="{statusColor} w-3 h-3 rounded-full"></div>
        {#if $connectionStatus === 'connected'}
          <div class="{statusColor} w-3 h-3 rounded-full absolute top-0 left-0 animate-ping opacity-75"></div>
        {/if}
      </div>

      <!-- Status Text -->
      <div class="flex-1 text-left">
        <div class="text-white text-sm font-medium">ESP32</div>
        <div class="text-slate-400 text-xs">{statusText}</div>
      </div>

      <!-- Expand/Collapse Icon -->
      <div class="text-slate-400 text-sm transform transition-transform {isExpanded ? 'rotate-180' : ''}">
        ▼
      </div>
    </button>

    <!-- Expanded Details -->
    {#if isExpanded}
      <div class="border-t border-slate-700 p-4 space-y-3">
        {#if $deviceStore.connected && $deviceStore.deviceInfo}
          <!-- Device Info -->
          <div class="space-y-2 text-xs">
            <div class="text-slate-400">Device ID:</div>
            <div class="text-white font-mono text-xs truncate">{$deviceStore.deviceInfo.deviceId}</div>

            <div class="text-slate-400 mt-2">Firmware:</div>
            <div class="text-white font-mono text-xs">{$deviceStore.deviceInfo.firmwareVersion}</div>

            <div class="text-slate-400 mt-2">Available Sensors:</div>
            <div class="flex flex-wrap gap-1 mt-1">
              {#if $availableSensors.length > 0}
                {#each $availableSensors as sensor}
                  <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    {sensor === 'heartRate' ? 'Heart Rate' :
                     sensor === 'spO2' ? 'SpO₂' :
                     sensor === 'bloodPressure' ? 'Blood Pressure' :
                     sensor === 'temperature' ? 'Temperature' :
                     sensor === 'weight' ? 'Weight' :
                     sensor === 'height' ? 'Height' :
                     sensor}
                  </span>
                {/each}
              {:else}
                <span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  No sensors detected
                </span>
              {/if}
            </div>

            {#if $deviceStore.lastPing}
              <div class="text-slate-400 mt-2">Last Ping:</div>
              <div class="text-white text-xs">
                {new Date($deviceStore.lastPing).toLocaleTimeString()}
              </div>
            {/if}
          </div>

          <!-- Disconnect Button -->
          <button
            on:click={handleDisconnect}
            class="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors"
          >
            Disconnect
          </button>
        {:else if $connectionStatus === 'error'}
          <!-- Error Info -->
          <div class="text-xs">
            <div class="text-red-400 mb-2">
              {$deviceStore.error || 'Connection failed'}
            </div>
            <div class="text-slate-400 mb-2">
              URL: <span class="font-mono text-xs">{ESP32_BASE_URL}</span>
            </div>
            <button
              on:click={handleRetry}
              class="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors"
            >
              Retry Connection
            </button>
          </div>
        {:else if $connectionStatus === 'connecting'}
          <!-- Connecting State -->
          <div class="text-center text-slate-400 text-xs py-2">
            <div class="animate-spin inline-block w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full mb-2"></div>
            <div>Connecting to ESP32...</div>
          </div>
        {:else}
          <!-- Disconnected State -->
          <div class="text-xs">
            <div class="text-slate-400 mb-2">
              URL: <span class="font-mono text-xs">{ESP32_BASE_URL}</span>
            </div>
            <button
              on:click={handleConnect}
              class="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors"
            >
              Connect to Device
            </button>
          </div>
        {/if}

        <!-- Debug Toggle -->
        <button
          on:click={toggleDetails}
          class="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded transition-colors"
        >
          {showDetails ? 'Hide' : 'Show'} Debug Info
        </button>

        {#if showDetails}
          <div class="bg-slate-950 rounded p-2 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto">
            <pre>{JSON.stringify($deviceStore, null, 2)}</pre>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Custom scrollbar for debug info */
  pre::-webkit-scrollbar {
    width: 4px;
  }

  pre::-webkit-scrollbar-track {
    background: #0f172a;
  }

  pre::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 2px;
  }
</style>
