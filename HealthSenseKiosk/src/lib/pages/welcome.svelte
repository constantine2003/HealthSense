<script lang="ts">
  import { onMount } from 'svelte';
  export let onStart: () => void;

  // Real-time connectivity state
  let isOnline = true; 

  onMount(() => {
    // Check initial status
    isOnline = navigator.onLine;

    const updateStatus = () => {
      isOnline = navigator.onLine;
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      onStart();
    }
  }
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;900&display=swap');

  :global(body) {
    font-family: 'Futura', 'Outfit', sans-serif;
  }

  @keyframes slow-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  .float { animation: slow-float 5s ease-in-out infinite; }
</style>

<div
  class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] select-none text-left cursor-pointer transition-transform duration-150 active:scale-[0.99] outline-none"
  on:click={onStart}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <div class="pt-16 flex justify-center">
    <div class="px-5 py-2 border-b-2 border-blue-900/10">
      <h2 class="text-blue-900/40 font-medium tracking-[0.5em] text-sm uppercase">HealthSense Protocol</h2>
    </div>
  </div>

  <div class="flex-1 flex flex-col items-center justify-center">
    <div class="text-center mb-24">
      <h1 class="text-9xl font-[1000] text-blue-950 tracking-tighter leading-none">WELCOME</h1>
    </div>

    <div class="w-full flex justify-center">
      <div class="relative space-y-16">
        <div class="absolute left-10 top-4 bottom-4 w-px bg-blue-900/10"></div>
        <div class="flex items-center gap-10 relative z-10">
          <div class="w-20 h-20 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">01</div>
          <div class="flex flex-col">
            <span class="text-base font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Step One</span>
            <span class="text-4xl font-bold text-blue-900 leading-tight">Identify</span>
          </div>
        </div>
        <div class="flex items-center gap-10 relative z-10">
          <div class="w-20 h-20 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">02</div>
          <div class="flex flex-col">
            <span class="text-base font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Step Two</span>
            <span class="text-4xl font-bold text-blue-900 leading-tight">Measure</span>
          </div>
        </div>
        <div class="flex items-center gap-10 relative z-10">
          <div class="w-20 h-20 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">03</div>
          <div class="flex flex-col">
            <span class="text-base font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Step Three</span>
            <span class="text-4xl font-bold text-blue-900 leading-tight">Complete</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="pb-28 flex flex-col items-center gap-8 pointer-events-none">
    <div class="float">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-blue-900/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
    <span class="text-blue-900 font-black text-4xl uppercase tracking-[0.25em] opacity-80">Tap to Start</span>
    <div class="w-16 h-1.5 bg-blue-900/10 rounded-full"></div>
  </div>

  <div class="p-10 flex items-center justify-between border-t border-blue-900/5 bg-white/20 backdrop-blur-sm pointer-events-none">
    <div class="flex items-center gap-2 transition-opacity duration-500">
      <div class="w-3 h-3 rounded-full {isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'} transition-colors duration-300"></div>
      
      <span class="text-base font-bold uppercase tracking-widest {isOnline ? 'text-blue-900' : 'text-red-600'}">
        {isOnline ? 'System Ready' : 'Offline Mode'}
      </span>
    </div>
    <span class="text-base font-black uppercase tracking-widest text-blue-900/30">HealthSense v1.0</span>
  </div>
</div>