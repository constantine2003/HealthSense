<script lang="ts">
  export let onStart: () => void;

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
  <div class="pt-12 flex justify-center">
    <div class="px-4 py-1 border-b-2 border-blue-900/10">
      <h2 class="text-blue-900/40 font-medium tracking-[0.5em] text-xs uppercase">HealthSense Protocol</h2>
    </div>
  </div>

  <div class="flex-1 flex flex-col items-center justify-center">
    
    <div class="text-center mb-20">
      <h1 class="text-8xl font-[1000] text-blue-950 tracking-tighter leading-none">
        WELCOME
      </h1>
    </div>

    <div class="w-full flex justify-center">
      <div class="relative space-y-14">
        
        <div class="absolute left-8 top-3 bottom-3 w-px bg-blue-900/10"></div>

        <div class="flex items-center gap-8 relative z-10">
          <div class="w-16 h-16 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-xl font-black text-blue-600 shrink-0">
            01
          </div>
          <div class="flex flex-col">
            <span class="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400 mb-0.5">Step One</span>
            <span class="text-3xl font-bold text-blue-900 leading-tight">Identify</span>
          </div>
        </div>

        <div class="flex items-center gap-8 relative z-10">
          <div class="w-16 h-16 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-xl font-black text-blue-600 shrink-0">
            02
          </div>
          <div class="flex flex-col">
            <span class="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400 mb-0.5">Step Two</span>
            <span class="text-3xl font-bold text-blue-900 leading-tight">Measure</span>
          </div>
        </div>

        <div class="flex items-center gap-8 relative z-10">
          <div class="w-16 h-16 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-xl font-black text-blue-600 shrink-0">
            03
          </div>
          <div class="flex flex-col">
            <span class="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400 mb-0.5">Step Three</span>
            <span class="text-3xl font-bold text-blue-900 leading-tight">Complete</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <div class="pb-24 flex flex-col items-center gap-7 pointer-events-none">
    <div class="float">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-blue-900/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
    
    <span class="text-blue-900 font-black text-3xl uppercase tracking-[0.25em] opacity-80">
      Tap to Start
    </span>
    
    <div class="w-14 h-1 bg-blue-900/10 rounded-full"></div>
  </div>

  <div class="p-8 flex items-center justify-between border-t border-blue-900/5 bg-white/20 backdrop-blur-sm pointer-events-none">
    <div class="flex items-center gap-2 opacity-40">
      <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900">System Ready</span>
    </div>
    <span class="text-[10px] font-black uppercase tracking-widest text-blue-900/30">HealthSense v1.0</span>
  </div>
</div>