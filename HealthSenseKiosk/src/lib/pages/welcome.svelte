<script lang="ts">
  export let onStart: () => void;
</script>

<div 
  class="relative h-full w-full flex flex-col cursor-pointer overflow-hidden animate-fade-in"
  on:click={onStart}
>
  <div class="h-[15%] w-full bg-[#bae1ff] flex items-center justify-center border-b border-white/40">
    <h2 class="text-blue-900/60 font-black uppercase tracking-[0.4em] text-xl">HealthSense Kiosk</h2>
  </div>

  <div class="flex-1 w-full flex flex-col items-center justify-center px-10 space-y-12">
    <h1 class="text-6xl font-[1000] text-blue-950 tracking-tighter mb-4">Assessment Process</h1>

    <div class="flex flex-col items-center space-y-0 w-full max-w-lg">
      
      <div class="flex flex-col items-center text-center">
        <div class="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-black shadow-lg">1</div>
        <h3 class="text-4xl font-black text-blue-900 mt-4">Identify</h3>
        <p class="text-blue-800/60 font-bold mt-1">Scan your ID or enter PIN</p>
      </div>

      <div class="h-16 w-1 border-l-4 border-dotted border-blue-400/50 my-2"></div>

      <div class="flex flex-col items-center text-center">
        <div class="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-black shadow-lg">2</div>
        <h3 class="text-4xl font-black text-blue-900 mt-4">Measure</h3>
        <p class="text-blue-800/60 font-bold mt-1">Follow the on-screen vitals guide</p>
      </div>

      <div class="h-16 w-1 border-l-4 border-dotted border-blue-400/50 my-2"></div>

      <div class="flex flex-col items-center text-center">
        <div class="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-black shadow-lg">3</div>
        <h3 class="text-4xl font-black text-blue-900 mt-4">Results</h3>
        <p class="text-blue-800/60 font-bold mt-1">Collect your digital health report</p>
      </div>
    </div>
  </div>

  <div class="h-[12%] w-full bg-[#e63946] flex items-center justify-center gap-4 animate-pulse">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
    </svg>
    <span class="text-4xl font-black text-white uppercase tracking-tighter">Tap anywhere to begin</span>
  </div>

  <div class="h-[8%] w-full bg-white flex items-center justify-between px-12">
    <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        </div>
        <span class="font-bold text-blue-900">Touchscreen Enabled</span>
    </div>
    <div class="flex gap-6 opacity-40 grayscale">
        <span class="font-black text-blue-950 italic">HEALTHSENSE</span>
    </div>
  </div>
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.6s ease-out forwards;
  }
</style>