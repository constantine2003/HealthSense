<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  import fingerprintIcon from '../../assets/fingerprint-svgrepo-com.svg';

  export let onBack: () => void;
  export let onCreated: () => void;

  // --- FORM STATE ---
  let firstName = "";
  let lastName = "";
  let sex: 'Male' | 'Female' | 'Other' | '' = '';
  let focusedField: 'first' | 'last' | null = null;

  // --- BIRTHDAY SCROLLER STATE ---
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const years = Array.from({ length: 100 }, (_, i) => (2026 - i).toString());

  let selM = "JAN", selD = "01", selY = "1990";
  
  // Reactive birthday string and age calculation
  $: birthday = `${selM} ${selD}, ${selY}`;
  $: age = (() => {
    const monthIndex = months.indexOf(selM);
    const birthDate = new Date(parseInt(selY), monthIndex, parseInt(selD));
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
    return calculatedAge >= 0 ? calculatedAge : 0;
  })();

  function scrollSelect(node: HTMLElement, type: 'm' | 'd' | 'y') {
    const handleScroll = () => {
      const center = node.scrollTop + node.offsetHeight / 2;
      const items = Array.from(node.children) as HTMLElement[];
      items.forEach((item) => {
        const itemCenter = item.offsetTop + item.offsetHeight / 2;
        if (Math.abs(center - itemCenter) < 25) {
          const val = item.getAttribute('data-value') || "";
          if (type === 'm') selM = val;
          if (type === 'd') selD = val;
          if (type === 'y') selY = val;
        }
      });
    };
    node.addEventListener('scroll', handleScroll, { passive: true });
    return { destroy() { node.removeEventListener('scroll', handleScroll); } };
  }

  // --- BIOMETRIC MODAL STATE ---
  let showBiometricModal = false;
  let scanStatus: 'idle' | 'scanning' | 'success' | 'error' = 'idle';
  let fingerprintRegistered = false;

  // --- KEYBOARD CONFIG ---
  const rows = {
    numbers: ['1','2','3','4','5','6','7','8','9','0'],
    letters: [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M']
    ]
  };
  let isCaps = true;

  // --- LOGIC FUNCTIONS ---
  function handleKeyPress(key: string) {
    if (!focusedField) return;
    const char = isCaps ? key.toUpperCase() : key.toLowerCase();
    if (focusedField === 'first') firstName += char;
    if (focusedField === 'last') lastName += char;
  }

  function backspace() {
    if (focusedField === 'first') firstName = firstName.slice(0, -1);
    if (focusedField === 'last') lastName = lastName.slice(0, -1);
  }

  function startFingerprintScan() {
    showBiometricModal = true;
    scanStatus = 'scanning';
    setTimeout(() => {
      if (Math.random() > 0.2) {
        scanStatus = 'success';
        fingerprintRegistered = true;
        setTimeout(() => { showBiometricModal = false; }, 1500);
      } else {
        scanStatus = 'error';
      }
    }, 2500);
  }

  const handleSubmit = () => {
    if (firstName && lastName && birthday && sex) {
      onCreated();
    } else {
      alert("Please fill in all fields (Biometrics optional)");
    }
  };
</script>

<div
  class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] select-none overflow-hidden"
  on:click={() => focusedField = null}
  role="presentation"
>
  <button
    type="button"
    on:click={onBack}
    class="absolute top-16 left-12 text-blue-900/40 font-black tracking-widest text-sm flex items-center gap-2 z-20"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
    </svg>
    BACK TO LOGIN
  </button>

  <div class="flex-1 flex flex-col items-center justify-start pt-32 max-w-lg mx-auto w-full px-6 overflow-y-auto pb-40">

    <div class="text-center mb-12">
      <h1 class="text-6xl font-[1000] tracking-tighter leading-none mb-4 text-blue-950 uppercase">
        Create <span class="text-blue-500">Profile</span>
      </h1>
      <p class="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-[10px]">Enter your personal health details</p>
    </div>

    <div class="w-full space-y-5">
      <div class="space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">First Name</span>
        <button
          type="button"
          on:click|stopPropagation={() => focusedField = 'first'}
          class="w-full h-16 px-8 rounded-2xl bg-white border flex items-center text-lg font-bold transition-all {focusedField === 'first' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center">
            {#if focusedField === 'first'}
              <span class="text-blue-950">{firstName}</span>
              <div class="ml-0.5 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {:else}
              <span class={firstName ? 'text-blue-950' : 'text-blue-900/20'}>
                {firstName || 'John'}
              </span>
            {/if}
          </div>
        </button>
      </div>

      <div class="space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Last Name</span>
        <button
          type="button"
          on:click|stopPropagation={() => focusedField = 'last'}
          class="w-full h-16 px-8 rounded-2xl bg-white border flex items-center text-lg font-bold transition-all {focusedField === 'last' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center">
            {#if focusedField === 'last'}
              <span class="text-blue-950">{lastName}</span>
              <div class="ml-0.5 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {:else}
              <span class={lastName ? 'text-blue-950' : 'text-blue-900/20'}>
                {lastName || 'Doe'}
              </span>
            {/if}
          </div>
        </button>
      </div>

      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">Birthday</span>
          <span class="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{age} YEARS OLD</span>
        </div>
        <div class="relative h-32 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden flex p-1">
          <div class="absolute inset-y-2 left-1 right-1 bg-blue-500/5 rounded-xl pointer-events-none border use:scrollSelect={'m'} border-blue-500/10"></div>
          
          <div class="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-10" use:scrollSelect={'m'}>
            {#each months as m}
              <div data-value={m} class="h-10 snap-center flex items-center justify-center text-xs font-black transition-all {selM === m ? 'text-blue-600 scale-125' : 'text-blue-950/20'}">{m}</div>
            {/each}
          </div>
          <div class="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-10" use:scrollSelect={'d'}>
            {#each days as d}
              <div data-value={d} class="h-10 snap-center flex items-center justify-center text-xs font-black transition-all {selD === d ? 'text-blue-600 scale-125' : 'text-blue-950/20'}">{d}</div>
            {/each}
          </div>
          <div class="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-10" use:scrollSelect={'y'}>
            {#each years as y}
              <div data-value={y} class="h-10 snap-center flex items-center justify-center text-xs font-black transition-all {selY === y ? 'text-blue-600 scale-110' : 'text-blue-950/20'}">{y}</div>
            {/each}
          </div>
        </div>
      </div>

      <div class="w-full space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Sex / Gender</span>
        <div class="flex h-16 bg-white rounded-2xl border border-blue-100 p-1 shadow-sm gap-1">
          <button
            type="button"
            on:click={() => sex = 'Male'}
            class="flex-1 rounded-xl font-bold text-xs transition-all {sex === 'Male' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400 active:bg-blue-50'}"
          >MALE</button>
          <button
            type="button"
            on:click={() => sex = 'Female'}
            class="flex-1 rounded-xl font-bold text-xs transition-all {sex === 'Female' ? 'bg-pink-500 text-white shadow-lg' : 'text-blue-400 active:bg-pink-50'}"
          >FEMALE</button>
          <button
            type="button"
            on:click={() => sex = 'Other'}
            class="flex-1 rounded-xl font-bold text-[9px] transition-all {sex === 'Other' ? 'bg-purple-500 text-white shadow-lg' : 'text-blue-400 active:bg-purple-50'}"
          >OTHER / PREFER NOT TO SAY</button>
        </div>
      </div>

      <button
        type="button"
        on:click={handleSubmit}
        class="w-full h-20 bg-blue-950 rounded-3xl text-white font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-900/20 mt-4 active:scale-[0.98] transition-transform"
      >
        Complete Registration
      </button>

      <div class="flex items-center gap-4 w-full pt-2">
        <div class="h-px flex-1 bg-blue-900/10"></div>
        <span class="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">Biometric Option</span>
        <div class="h-px flex-1 bg-blue-900/10"></div>
      </div>

      <button
        type="button"
        on:click={startFingerprintScan}
        class="w-full h-20 rounded-2xl border-2 transition-all flex items-center justify-center gap-4 
        {fingerprintRegistered ? 'bg-green-50 border-green-500' : 'bg-white/50 border-dashed border-blue-200 active:bg-white'}"
      >
        {#if fingerprintRegistered}
          <div class="flex items-center gap-2" in:scale>
              <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
              <span class="text-green-600 font-bold uppercase tracking-widest text-[10px]">Fingerprint Linked</span>
          </div>
        {:else}
          <img src={fingerprintIcon} alt="" class="w-8 h-8 opacity-40" style="filter: grayscale(100%)" />
          <span class="text-blue-900/40 font-bold uppercase tracking-widest text-[10px]">Register Fingerprint</span>
        {/if}
      </button>
    </div>
  </div>

  {#if showBiometricModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-8 bg-blue-950/40 backdrop-blur-md" transition:fade>
      <div class="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl flex flex-col items-center text-center space-y-8" transition:scale>
        <div class="relative">
          <div class="w-32 h-32 rounded-full border-4 {scanStatus === 'error' ? 'border-red-100' : 'border-blue-50'} flex items-center justify-center">
            <img 
              src={fingerprintIcon} 
              alt="" 
              class="w-16 h-16 transition-all duration-500 
              {scanStatus === 'scanning' ? 'opacity-100 scale-110 animate-pulse hue-rotate-180' : ''}
              {scanStatus === 'success' ? 'opacity-100 scale-100' : 'opacity-20'}"
              style={scanStatus === 'success' ? 'filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%);' : ''}
            />
          </div>
          {#if scanStatus === 'scanning'}
            <div class="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          {/if}
        </div>
        <div class="space-y-2">
          {#if scanStatus === 'scanning'}
            <h2 class="text-2xl font-black text-blue-950 uppercase tracking-tight">Scanning...</h2>
            <p class="text-blue-900/40 font-bold text-xs uppercase tracking-widest">Place finger on the scanner</p>
          {:else if scanStatus === 'success'}
            <h2 class="text-2xl font-black text-green-600 uppercase tracking-tight">Success!</h2>
            <p class="text-green-900/40 font-bold text-xs uppercase tracking-widest">Biometric Linked</p>
          {:else if scanStatus === 'error'}
            <h2 class="text-2xl font-black text-red-600 uppercase tracking-tight">Scan Failed</h2>
            <p class="text-red-900/40 font-bold text-xs uppercase tracking-widest">Sensor error or movement</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if focusedField}
    <div
      transition:slide={{ axis: 'y', duration: 400 }}
      class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-blue-100 p-6 pb-12 z-40"
      on:click|stopPropagation
      role="none"
      on:keydown|stopPropagation={() => {}}
    >
      <div class="max-w-4xl mx-auto space-y-3">
        <div class="flex justify-center gap-2">
          {#each rows.numbers as num}
            <button type="button" on:mousedown|preventDefault={() => handleKeyPress(num)} class="h-14 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 active:bg-blue-500 active:text-white text-xl">{num}</button>
          {/each}
        </div>
        {#each rows.letters as row, i}
          <div class="flex justify-center gap-2">
            {#if i === 2}
              <button type="button" on:mousedown|preventDefault={() => isCaps = !isCaps} class="w-20 h-16 {isCaps ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} border border-blue-100 rounded-xl font-black text-xs">CAPS</button>
            {/if}
            {#each row as key}
              <button type="button" on:mousedown|preventDefault={() => handleKeyPress(key)} class="h-16 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 active:bg-blue-500 active:text-white text-xl">{isCaps ? key : key.toLowerCase()}</button>
            {/each}
            {#if i === 2}
              <button type="button" aria-label="Backspace" on:mousedown|preventDefault={backspace} class="w-20 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold flex items-center justify-center">⌫</button>
            {/if}
          </div>
        {/each}
        <div class="flex justify-center mt-4 gap-4">
          <button type="button" aria-label="Spacebar" on:mousedown|preventDefault={() => handleKeyPress(' ')} class="w-64 h-14 bg-white border border-blue-100 rounded-xl active:bg-blue-50"></button>
          <button type="button" on:click={() => focusedField = null} class="px-12 py-3 bg-blue-900/5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Done</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .scrollbar-hide { 
    -ms-overflow-style: none; 
    scrollbar-width: none; 
    /* This is the secret sauce for touchscreens */
    -webkit-overflow-scrolling: touch; 
    overscroll-behavior-y: contain;
  }
  
  .scrollbar-hide::-webkit-scrollbar { 
    display: none; 
  }

  /* Ensure the container and items don't try to "select" text while dragging */
  .snap-center {
    scroll-snap-align: center;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>