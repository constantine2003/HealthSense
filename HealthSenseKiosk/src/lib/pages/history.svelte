<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  export let onBack: () => void;

  // --- DUMMY DATA ---
  let historyData = [
    { id: 1, date: "Feb 17, 2026", time: "10:30 AM", spo2: 99, temp: 36.5, height: 1.70, weight: 70.5, bp: "120/80" },
    { id: 2, date: "Feb 10, 2026", time: "02:15 PM", spo2: 94, temp: 38.2, height: 1.70, weight: 72.4, bp: "145/95" },
    { id: 3, date: "Jan 25, 2026", time: "09:00 AM", spo2: 97, temp: 35.8, height: 1.70, weight: 68.0, bp: "110/70" }
  ];

  let selectedCheckup: any = null;

  // --- LOGIC FUNCTIONS ---
  const getStatus = (val: any, type: string) => {
    if (type === 'spo2') {
      if (val < 95) return { status: "Low", color: "#EF4444" };
      if (val <= 98) return { status: "Normal", color: "#F97316" };
      return { status: "Excellent", color: "#22c55e" };
    }
    if (type === 'temp') {
      if (val < 35) return { status: "Hypothermia", color: "#EF4444" };
      if (val < 36) return { status: "Low", color: "#F97316" };
      if (val <= 37.5) return { status: "Normal", color: "#22c55e" };
      return { status: "Fever", color: "#EF4444" };
    }
    if (type === 'bp') {
      const s = parseInt(val.split('/')[0]);
      if (s <= 120) return { status: "Ideal", color: "#22c55e" };
      if (s <= 139) return { status: "Elevated", color: "#F97316" };
      return { status: "High", color: "#EF4444" };
    }
    return { status: "Unknown", color: "#94a3b8" };
  };

  const calculateBMI = (w: number, h: number) => {
    const bmi = (w / (h * h)).toFixed(1);
    const b = parseFloat(bmi);
    let status = "Normal", color = "#22c55e";
    if (b < 18.5) { status = "Underweight"; color = "#F97316"; }
    else if (b >= 30) { status = "Obese"; color = "#EF4444"; }
    else if (b >= 25) { status = "Overweight"; color = "#F97316"; }
    return { bmi, status, color };
  };
</script>

<div class="h-full w-full bg-[#f0f7ff] flex flex-col p-10 overflow-hidden select-none">
  
  <div class="flex items-center justify-between mb-10">
    <button on:click={onBack} class="flex items-center gap-2 text-blue-900/40 font-black tracking-widest text-sm uppercase">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <h2 class="text-blue-950 font-black text-2xl uppercase tracking-tighter">Checkup History</h2>
  </div>

  <div class="flex-1 overflow-y-auto space-y-6 pr-2">
    {#each historyData as item}
      <div class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-blue-50 flex flex-col gap-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-2xl font-black text-blue-950">{item.date}</h3>
            <p class="text-blue-400 font-bold text-xs uppercase tracking-widest">{item.time}</p>
          </div>
          <button 
            on:click={() => selectedCheckup = item}
            class="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
          >
            View Details
          </button>
        </div>

        <div class="grid grid-cols-3 gap-y-6 gap-x-2">
            <div class="flex items-center gap-2 grayscale opacity-60">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <span class="font-bold text-sm text-blue-950">{item.spo2}%</span>
            </div>
            <div class="flex items-center gap-2 grayscale opacity-60">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
                <span class="font-bold text-sm text-blue-950">{item.temp}°</span>
            </div>
            <div class="flex items-center gap-2 grayscale opacity-60">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span class="font-bold text-sm text-blue-950">{item.bp}</span>
            </div>
            <div class="flex items-center gap-2 grayscale opacity-60">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 3v18M3 21h18M3 10h10M3 3v18"/></svg>
                <span class="font-bold text-sm text-blue-950">{item.height}m</span>
            </div>
            <div class="flex items-center gap-2 grayscale opacity-60">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <span class="font-bold text-sm text-blue-950">{item.weight}kg</span>
            </div>
            <div class="flex items-center gap-2 grayscale opacity-60">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 12h10M7 8h10M7 16h10"/></svg>
                <span class="font-bold text-sm text-blue-950">{(item.weight / (item.height * item.height)).toFixed(1)}</span>
            </div>
        </div>
      </div>
    {/each}
  </div>

  {#if selectedCheckup}
  {@const s = getStatus(selectedCheckup.spo2, 'spo2')}
  {@const t = getStatus(selectedCheckup.temp, 'temp')}
  {@const b = calculateBMI(selectedCheckup.weight, selectedCheckup.height)}
  {@const bp = getStatus(selectedCheckup.bp, 'bp')}

  <div transition:fade={{duration: 200}} class="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-lg flex items-end">
    <div transition:slide={{axis: 'y'}} class="bg-white w-full rounded-t-[4rem] p-12 max-h-[95vh] overflow-y-auto shadow-2xl">
      
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-4xl font-[1000] text-blue-950 tracking-tighter uppercase">Detailed Result</h2>
        <button on:click={() => selectedCheckup = null} class="p-4 bg-blue-50 rounded-full">
          <svg class="w-8 h-8 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
          <div>
            <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Blood Oxygen (SpO2)</p>
            <h4 class="text-3xl font-black text-blue-950">{selectedCheckup.spo2}%</h4>
          </div>
          <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {s.color}">{s.status}</span>
        </div>

        <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
          <div>
            <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Body Temperature</p>
            <h4 class="text-3xl font-black text-blue-950">{selectedCheckup.temp}°C</h4>
          </div>
          <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {t.color}">{t.status}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div class="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Height</p>
                <h4 class="text-2xl font-black text-blue-950">{selectedCheckup.height} <span class="text-sm">m</span></h4>
            </div>
            <div class="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Weight</p>
                <h4 class="text-2xl font-black text-blue-950">{selectedCheckup.weight} <span class="text-sm">kg</span></h4>
            </div>
        </div>

        <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div>
                <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Body Mass Index (BMI)</p>
                <h4 class="text-3xl font-black text-blue-950">{b.bmi}</h4>
            </div>
            <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {b.color}">
                {b.status}
            </span>
        </div>

        <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
          <div>
            <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Blood Pressure</p>
            <h4 class="text-3xl font-black text-blue-950">{selectedCheckup.bp} <small class="text-sm font-bold text-blue-400">mmHg</small></h4>
          </div>
          <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {bp.color}">{bp.status}</span>
        </div>
      </div>
      
      <button on:click={() => selectedCheckup = null} class="w-full mt-10 py-6 bg-blue-950 text-white rounded-3xl font-black uppercase tracking-widest active:scale-[0.98] transition-all">Close Record</button>
    </div>
  </div>
{/if}

</div>