<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  export let onBack: () => void;

  let username = "";
  let password = "";
  let focusedField: 'username' | 'password' | null = null;
  let showFingerprintModal = false;

  const keys = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M', '⌫']
  ];

  function handleKeyPress(key: string) {
    if (!focusedField) return;
    
    if (key === '⌫') {
      if (focusedField === 'username') username = username.slice(0, -1);
      if (focusedField === 'password') password = password.slice(0, -1);
    } else {
      if (focusedField === 'username') username += key;
      if (focusedField === 'password') password += key;
    }
  }

  function toggleFingerprint() { showFingerprintModal = true; }
  function closeFingerprint() { showFingerprintModal = false; }
</script>

<div class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] select-none overflow-hidden">
  
  <button on:click={onBack} class="absolute top-16 left-12 text-blue-900/40 font-black tracking-widest text-sm flex items-center gap-2 hover:text-blue-600 transition-colors z-20">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
    </svg>
    BACK
  </button>

  <div class="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-6">
    
    <div class="text-center mb-16">
      <h1 class="text-6xl font-[1000] text-blue-950 tracking-tighter mb-4">LOG-IN</h1>
      <p class="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-xs">Access HealthSense Portal</p>
    </div>

    <div class="w-full space-y-6">
      <div class="space-y-2">
        <label class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Username</label>
        <div 
          role="button"
          tabindex="0"
          on:click={() => focusedField = 'username'}
          on:keydown={(e) => e.key === 'Enter' && (focusedField = 'username')}
          class="w-full h-20 px-8 rounded-3xl bg-white border flex items-center text-xl font-bold transition-all
          {focusedField === 'username' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <span class={username ? 'text-blue-900' : 'text-blue-900/20'}>
            {username || 'Enter username'}
          </span>
          {#if focusedField === 'username'}
            <div class="ml-1 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
          {/if}
        </div>
      </div>

      <div class="space-y-2">
        <label class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Password</label>
        <div 
          role="button"
          tabindex="0"
          on:click={() => focusedField = 'password'}
          on:keydown={(e) => e.key === 'Enter' && (focusedField = 'password')}
          class="w-full h-20 px-8 rounded-3xl bg-white border flex items-center text-xl font-bold transition-all
          {focusedField === 'password' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <span class={password ? 'text-blue-900' : 'text-blue-900/20'}>
            {password ? '•'.repeat(password.length) : '••••••••'}
          </span>
          {#if focusedField === 'password'}
            <div class="ml-1 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
          {/if}
        </div>
      </div>

      <button class="w-full h-20 bg-blue-950 rounded-3xl text-white font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform">
        Sign In
      </button>
    </div>

    <div class="flex items-center gap-4 w-full my-12">
      <div class="h-px flex-1 bg-blue-900/10"></div>
      <span class="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">OR</span>
      <div class="h-px flex-1 bg-blue-900/10"></div>
    </div>

    <button 
      on:click={toggleFingerprint}
      class="w-full h-24 rounded-3xl bg-white/50 border-2 border-dashed border-blue-200 flex items-center justify-center gap-4 group active:bg-white transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-8.212-4.33l-.054-.09m14.282 2.04Q21 15.75 21 12c0-5.523-4.477-10-10-10a10 10 0 00-6.712 2.583" />
      </svg>
      <span class="text-blue-900 font-bold uppercase tracking-widest">Use Fingerprint</span>
    </button>

    <div class="mt-16 flex flex-col items-center gap-4">
      <p class="text-blue-900/40 font-bold text-sm">Don't have an account?</p>
      <button class="text-blue-600 font-black uppercase tracking-[0.2em] text-lg hover:underline">
        Create Account
      </button>
    </div>
  </div>

  {#if focusedField}
    <div transition:slide={{ axis: 'y', duration: 400 }} class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-blue-100 p-6 pb-12 z-40">
      <div class="max-w-4xl mx-auto space-y-3">
        {#each keys as row}
          <div class="flex justify-center gap-2">
            {#each row as key}
              <button 
                on:mousedown|preventDefault={() => handleKeyPress(key)}
                class="h-16 {key === '⌫' ? 'w-24 bg-blue-100 text-blue-600' : 'flex-1 bg-white'} border border-blue-50 rounded-2xl font-bold text-blue-950 shadow-xs active:bg-blue-500 active:text-white transition-colors text-xl"
              >
                {key}
              </button>
            {/each}
          </div>
        {/each}
        <div class="flex justify-center mt-4">
          <button on:click={() => focusedField = null} class="px-12 py-3 bg-blue-900/5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 active:bg-blue-100">
            Close Keyboard
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showFingerprintModal}
    <div 
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 backdrop-blur-md p-10"
    >
      <div 
        transition:scale={{ start: 0.9, duration: 300 }}
        class="bg-white w-full max-w-sm rounded-[3rem] p-12 flex flex-col items-center text-center shadow-2xl"
      >
        <div class="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-8.212-4.33l-.054-.09m14.282 2.04Q21 15.75 21 12c0-5.523-4.477-10-10-10a10 10 0 00-6.712 2.583" />
          </svg>
        </div>
        
        <h3 class="text-2xl font-black text-blue-950 uppercase tracking-tighter mb-2">Scanning...</h3>
        <p class="text-blue-900/50 font-bold text-sm leading-relaxed mb-10">Please place your finger on the biometric scanner below the screen.</p>
        
        <button 
          on:click={closeFingerprint}
          class="px-8 py-4 border-2 border-blue-100 rounded-2xl text-blue-400 font-black uppercase tracking-widest text-xs active:bg-blue-50"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>