<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { supabase } from './supabaseClient'; 
  
  export let onBack: () => void;
  export let user: any; 

  let historyData: any[] = [];
  let isLoading = true;
  let selectedCheckup: any = null;

  async function fetchHistory() {
    const userId = user?.id;
    if (!userId) return;

    try {
      isLoading = true;
      const { data, error } = await supabase
        .from('health_checkups')
        .select('*')
        .eq('user_id', userId) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      historyData = data || [];
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      isLoading = false;
    }
  }

  $: if (user?.id) fetchHistory();

  const getStatus = (val: any, type: string) => {
    if (val === undefined || val === null) return { status: "N/A", color: "#94a3b8" };
    if (type === 'spo2') {
      if (val < 95) return { status: "Low", color: "#EF4444" };
      if (val <= 98) return { status: "Normal", color: "#F97316" };
      return { status: "Excellent", color: "#22c55e" };
    }
    if (type === 'temp') {
      const t = parseFloat(val);
      if (t < 35) return { status: "Hypothermia", color: "#EF4444" };
      if (t <= 37.5) return { status: "Normal", color: "#22c55e" };
      return { status: "Fever", color: "#EF4444" };
    }
    if (type === 'bp') {
      const s = parseInt(val.toString().split('/')[0]);
      if (s <= 120) return { status: "Ideal", color: "#22c55e" };
      if (s <= 139) return { status: "Elevated", color: "#F97316" };
      return { status: "High", color: "#EF4444" };
    }
    return { status: "Normal", color: "#22c55e" };
  };

  const getBMIInfo = (item: any) => {
    if (!item.weight || !item.height) return { bmi: "N/A", status: "N/A", color: "#94a3b8" };
    const bmiVal = (item.weight / (item.height * item.height)).toFixed(1);
    const b = parseFloat(bmiVal);
    let status = "Normal", color = "#22c55e";
    if (b < 18.5) { status = "Underweight"; color = "#F97316"; }
    else if (b >= 30) { status = "Obese"; color = "#EF4444"; }
    else if (b >= 25) { status = "Overweight"; color = "#F97316"; }
    return { bmi: bmiVal, status, color };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return { date: "Unknown", time: "--:--" };
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
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
    <h2 class="text-blue-950 font-black text-2xl uppercase tracking-tighter text-right">Medical History</h2>
  </div>

  <div class="flex-1 overflow-y-auto space-y-6 pr-2">
    {#if isLoading}
      <div class="h-full flex flex-col items-center justify-center gap-4 opacity-50">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="font-bold text-blue-900 uppercase tracking-widest text-xs">Loading Archive...</p>
      </div>
    {:else if historyData.length === 0}
      <div class="h-full flex flex-col items-center justify-center opacity-30 text-center">
        <p class="font-black uppercase tracking-[0.3em] text-blue-900">No Records Found</p>
      </div>
    {:else}
      {#each historyData as item}
        {@const timeInfo = formatDate(item.created_at)}
        {@const bmi = getBMIInfo(item)}
        <div class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-blue-50 flex flex-col gap-6" in:fade>
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-2xl font-black text-blue-950">{timeInfo.date}</h3>
              <p class="text-blue-400 font-bold text-[10px] uppercase tracking-[0.2em]">{timeInfo.time}</p>
            </div>
            <button on:click={() => selectedCheckup = item} class="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">
              Details
            </button>
          </div>

          <div class="grid grid-cols-3 gap-4 border-t border-blue-50 pt-6">
              <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-blue-400 uppercase">SpO2</span>
                  <span class="font-black text-lg text-blue-950">{item.spo2}%</span>
              </div>
              <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-blue-400 uppercase">Temp</span>
                  <span class="font-black text-lg text-blue-950">{item.temperature}°</span>
              </div>
              <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-blue-400 uppercase">BP</span>
                  <span class="font-black text-lg text-blue-950">{item.blood_pressure}</span>
              </div>
          </div>

          <div class="grid grid-cols-3 gap-4 pt-2">
              <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-blue-300 uppercase">Height</span>
                  <span class="font-bold text-md text-blue-900">{item.height}m</span>
              </div>
              <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-blue-300 uppercase">Weight</span>
                  <span class="font-bold text-md text-blue-900">{item.weight}kg</span>
              </div>
              <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-blue-300 uppercase">BMI</span>
                  <span class="font-bold text-md text-blue-600">{bmi.bmi}</span>
              </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#if selectedCheckup}
    {@const s = getStatus(selectedCheckup.spo2, 'spo2')}
    {@const t = getStatus(selectedCheckup.temperature, 'temp')}
    {@const bmi = getBMIInfo(selectedCheckup)}
    {@const bp = getStatus(selectedCheckup.blood_pressure, 'bp')}

    <div transition:fade={{duration: 200}} class="fixed inset-0 z-50 bg-blue-950/80 backdrop-blur-md flex items-end">
      <div transition:slide={{axis: 'y'}} class="bg-white w-full rounded-t-[4rem] p-10 max-h-[95vh] overflow-y-auto shadow-2xl">
        
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-3xl font-[1000] text-blue-950 tracking-tighter uppercase leading-none">Health Report</h2>
            <p class="text-blue-400 font-bold text-xs uppercase mt-2 tracking-widest">{formatDate(selectedCheckup.created_at).date}</p>
          </div>
          <button on:click={() => selectedCheckup = null} class="p-4 bg-blue-50 rounded-full active:scale-90 transition-transform">
            <svg class="w-6 h-6 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div><p class="text-[10px] font-black text-blue-400 uppercase mb-1">Blood Oxygen</p><h4 class="text-3xl font-black text-blue-950">{selectedCheckup.spo2}%</h4></div>
            <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {s.color}">{s.status}</span>
          </div>

          <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div><p class="text-[10px] font-black text-blue-400 uppercase mb-1">Temperature</p><h4 class="text-3xl font-black text-blue-950">{selectedCheckup.temperature}°C</h4></div>
            <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {t.color}">{t.status}</span>
          </div>

          <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div><p class="text-[10px] font-black text-blue-400 uppercase mb-1">Blood Pressure</p><h4 class="text-3xl font-black text-blue-950">{selectedCheckup.blood_pressure}</h4></div>
            <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {bp.color}">{bp.status}</span>
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div class="p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
                <p class="text-[10px] font-black text-blue-400 uppercase mb-1 text-center">Height</p>
                <h4 class="text-2xl font-black text-blue-950 text-center">{selectedCheckup.height} m</h4>
             </div>
             <div class="p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
                <p class="text-[10px] font-black text-blue-400 uppercase mb-1 text-center">Weight</p>
                <h4 class="text-2xl font-black text-blue-950 text-center">{selectedCheckup.weight} kg</h4>
             </div>
          </div>

          <div class="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-200">
            <div><p class="text-[10px] font-black text-blue-400 uppercase mb-1">BMI Score</p><h4 class="text-3xl font-black text-blue-950">{bmi.bmi}</h4></div>
            <span class="px-4 py-2 rounded-xl text-white font-black text-[10px] uppercase" style="background: {bmi.color}">{bmi.status}</span>
          </div>
        </div>
        
        <button on:click={() => selectedCheckup = null} class="w-full mt-8 py-6 bg-blue-950 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all">Close Report</button>
      </div>
    </div>
  {/if}
</div>