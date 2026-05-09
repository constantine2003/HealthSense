<script lang="ts">
  export let onLogout: () => void;
  export let onViewHistory: () => void;
  export let onStartCheckup: () => void;
  
  // 1. Accept the user object from the Login component
  export let user: any;

  // 2. Logic to format the name for the Kiosk UI
  // We use the raw profile data to ensure "Daniel M. Montesclaros" format
  $: firstName = user?.first_name || "Guest";
  $: middleInitial = user?.middle_name ? `${user.middle_name.trim().charAt(0)}.` : "";
  $: lastName = user?.last_name || "";

  const startCheckup = () => {
    console.log("Navigating to Checkup...");
    onStartCheckup();
  };

  const viewHistory = () => {
    console.log("Navigating to History...");
    onViewHistory();
  };
</script>

<div class="relative h-full w-full flex flex-col bg-[#f0f7ff] select-none px-12 py-12">
  
  <div class="flex justify-between items-center mb-14">
    <div class="flex flex-col">
      <h2 class="text-blue-900/40 font-black tracking-[0.3em] text-base uppercase mb-1">HealthSense Protocol</h2>
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
        <span class="text-blue-900 font-bold text-sm uppercase tracking-widest">Active Session</span>
      </div>
    </div>
    
    <button 
      on:click={onLogout}
      class="px-7 py-3.5 bg-white border border-blue-100 text-blue-400 font-black text-base uppercase tracking-widest rounded-2xl shadow-sm active:scale-95 transition-transform"
    >
      Logout
    </button>
  </div>

  <div class="mb-12">
    <p class="text-4xl font-medium text-blue-900/60 mb-2">Hello,</p>
    
    <div class="flex flex-col">
      <h1 class="text-7xl font-[1000] text-blue-950 tracking-tighter leading-none uppercase">
        {firstName} {middleInitial}
      </h1>
      
      <h1 class="text-7xl font-[1000] text-blue-600 tracking-tighter leading-tight uppercase">
        {lastName}
      </h1>
    </div>
  </div>

  <div class="flex-1 flex flex-col gap-10 justify-center">
    
    <button 
      on:click={startCheckup}
      class="group relative w-full h-72 bg-blue-600 rounded-[3rem] p-12 flex flex-col justify-end text-left shadow-2xl shadow-blue-900/30 active:scale-[0.98] transition-all overflow-hidden"
    >
      <div class="absolute top-8 right-8 text-white/10 group-active:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-44 h-44" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      
      <span class="relative z-10 text-blue-200 font-black uppercase tracking-[0.3em] text-sm mb-2">Phase 01</span>
      <h2 class="relative z-10 text-white text-6xl font-black tracking-tight leading-none">Start<br/>Checkup</h2>
    </button>

    <button 
      on:click={viewHistory}
      class="group relative w-full h-72 bg-white border-2 border-blue-100 rounded-[3rem] p-12 flex flex-col justify-end text-left shadow-sm active:bg-blue-50 active:scale-[0.98] transition-all overflow-hidden"
    >
      <div class="absolute top-8 right-8 text-blue-900/5 group-active:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-44 h-44" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <span class="relative z-10 text-blue-400 font-black uppercase tracking-[0.3em] text-sm mb-2">Records</span>
      <h2 class="relative z-10 text-blue-950 text-6xl font-black tracking-tight leading-none">View<br/>History</h2>
    </button>

  </div>

  <div class="pt-10 flex justify-center opacity-30">
    <span class="text-base font-black uppercase tracking-[0.5em] text-blue-900">HealthSense v1.0</span>
  </div>

</div>