<script lang="ts">
  export let onStart: () => void;
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
  class="relative h-full w-full flex flex-col cursor-pointer bg-gradient-to-b from-[#f0f7ff] to-[#9fc5f8] select-none"
  on:click={onStart}
>
  <div class="pt-12 flex justify-center">
    <div class="px-4 py-1 border-b-2 border-blue-900/10">
      <h2 class="text-blue-900/40 font-medium tracking-[0.5em] text-xs uppercase">HealthSense Protocol</h2>
    </div>
  </div>

  <div class="flex-1 flex flex-col items-center justify-center">
    
    <div class="text-center mb-16">
      <h1 class="text-7xl font-black text-blue-950 tracking-tight leading-none">
        Welcome.
      </h1>
    </div>

    <div class="w-full max-w-sm space-y-12 relative">
      <div class="absolute left-6 top-2 bottom-2 w-[1px] bg-blue-900/10"></div>

      <div class="flex items-start gap-8 relative z-10">
        <div class="w-12 h-12 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center font-bold text-blue-600">01</div>
        <div class="flex flex-col">
          <span class="text-xs font-black uppercase tracking-widest text-blue-400">Step One</span>
          <span class="text-2xl font-bold text-blue-900">Identify</span>
        </div>
      </div>

      <div class="flex items-start gap-8 relative z-10">
        <div class="w-12 h-12 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center font-bold text-blue-600">02</div>
        <div class="flex flex-col">
          <span class="text-xs font-black uppercase tracking-widest text-blue-400">Step Two</span>
          <span class="text-2xl font-bold text-blue-900">Measure</span>
        </div>
      </div>

      <div class="flex items-start gap-8 relative z-10">
        <div class="w-12 h-12 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center font-bold text-blue-600">03</div>
        <div class="flex flex-col">
          <span class="text-xs font-black uppercase tracking-widest text-blue-400">Step Three</span>
          <span class="text-2xl font-bold text-blue-900">Complete</span>
        </div>
      </div>
    </div>
  </div>

  <div class="pb-20 flex flex-col items-center gap-6">
    <div class="float">
       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-900/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
       </svg>
    </div>
    
    <button class="text-blue-900 font-black text-2xl uppercase tracking-[0.2em] opacity-80">
      Tap to Start
    </button>
    
    <div class="w-12 h-1 bg-blue-900/10 rounded-full"></div>
  </div>

  <div class="p-8 flex items-center justify-between border-t border-blue-900/5 bg-white/20 backdrop-blur-sm">
    <div class="flex items-center gap-2 opacity-40">
      <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-blue-900">System Ready</span>
    </div>
    <span class="text-[10px] font-black uppercase tracking-widest text-blue-900/30">ArchiveStream Health v1.0</span>
  </div>
</div>