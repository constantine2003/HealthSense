<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  import fingerprintIcon from '../../assets/fingerprint-svgrepo-com.svg';

  export let onBack: () => void;
  export let onLogin: () => void; // <--- Add this line

  let username = "";
  let password = "";
  let focusedField: 'username' | 'password' | null = null;
  let showFingerprintModal = false;
  let showPassword = false;
  let isCaps = true; // Defaults to Caps automatically
  
  const rows = {
    numbers: ['1','2','3','4','5','6','7','8','9','0'],
    letters: [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M']
    ]
  };

  function handleKeyPress(key: string) {
    if (!focusedField) return;
    const char = isCaps ? key.toUpperCase() : key.toLowerCase();
    if (focusedField === 'username') username += char;
    if (focusedField === 'password') password += char;
  }

  function backspace() {
    if (focusedField === 'username') username = username.slice(0, -1);
    if (focusedField === 'password') password = password.slice(0, -1);
  }

  function handleBackgroundKey(e: KeyboardEvent) {
    if (e.key === 'Escape') focusedField = null;
  }

  function toggleFingerprint() { showFingerprintModal = true; }
  function closeFingerprint() { showFingerprintModal = false; }

  function handleSignIn() {
    console.log("Sign In triggered");
    onLogin(); 
  }
</script>

<div 
  class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] select-none overflow-hidden"
  on:click={() => focusedField = null}
  on:keydown={handleBackgroundKey}
  role="presentation"
>
  <div class="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-6" on:click|stopPropagation role="presentation">
    
    <button on:click={onBack} class="absolute top-16 left-12 text-blue-900/40 font-black tracking-widest text-sm flex items-center gap-2 hover:text-blue-600 transition-colors z-20">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
      </svg>
      BACK
    </button>

    <div class="text-center mb-16">
      <h1 class="text-6xl font-[1000] text-blue-950 tracking-tighter mb-4">LOG-IN</h1>
      <p class="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-xs">Access HealthSense Portal</p>
    </div>

    <div class="w-full space-y-6">
      <div class="space-y-2">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Username</span>
        <div 
          on:click={() => focusedField = 'username'}
          on:keydown={(e) => e.key === 'Enter' && (focusedField = 'username')}
          role="button"
          tabindex="0"
          class="relative w-full h-20 px-8 rounded-3xl bg-white border flex items-center text-xl font-bold transition-all outline-none
          {focusedField === 'username' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          {#if !username && focusedField !== 'username'}
            <span class="absolute left-8 text-blue-900/20 pointer-events-none">Enter username</span>
          {/if}
          
          <span class="text-blue-900">{username}</span>
          
          {#if focusedField === 'username'}
            <div class="ml-1 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
          {/if}
        </div>
      </div>

      <div class="space-y-2">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Password</span>
        <div 
          on:click={() => focusedField = 'password'}
          on:keydown={(e) => e.key === 'Enter' && (focusedField = 'password')}
          role="button"
          tabindex="0"
          class="relative w-full h-20 px-8 rounded-3xl bg-white border flex items-center justify-between text-xl font-bold transition-all outline-none
          {focusedField === 'password' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center flex-1 h-full">
             {#if !password && focusedField !== 'password'}
              <span class="absolute left-8 text-blue-900/20 pointer-events-none">••••••••</span>
            {/if}
            
            <span class="text-blue-900">
              {password ? (showPassword ? password : '•'.repeat(password.length)) : ''}
            </span>

            {#if focusedField === 'password'}
              <div class="ml-1 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {/if}
          </div>
          
          <button 
            on:click|stopPropagation={() => showPassword = !showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            class="text-blue-900/30 hover:text-blue-600 transition-colors p-2"
          >
            {#if showPassword}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.956 9.956 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <button 
        on:click|stopPropagation={onLogin} 
        class="w-full h-20 bg-blue-950 rounded-3xl text-white font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform"
      >
        Sign In
      </button>
    </div>

    <div class="flex items-center gap-4 w-full my-12">
      <div class="h-px flex-1 bg-blue-900/10"></div>
      <span class="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">OR</span>
      <div class="h-px flex-1 bg-blue-900/10"></div>
    </div>

    <button 
      on:click|stopPropagation={toggleFingerprint}
      class="w-full h-24 rounded-3xl bg-white/50 border-2 border-dashed border-blue-200 flex items-center justify-center gap-4 group active:bg-white transition-colors"
    >
      <img 
        src={fingerprintIcon} 
        alt="Fingerprint" 
        class="w-10 h-10 opacity-80 group-active:opacity-100 transition-opacity"
        style="filter: invert(33%) sepia(87%) saturate(1915%) hue-rotate(202deg) brightness(91%) contrast(92%);"
      />
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
    <div 
      on:click|stopPropagation
      on:keydown={handleBackgroundKey}
      transition:slide={{ axis: 'y', duration: 400 }} 
      class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-blue-100 p-6 pb-12 z-40"
      role="presentation"
    >
      <div class="max-w-4xl mx-auto space-y-3">
        <div class="flex justify-center gap-2">
          {#each rows.numbers as num}
            <button on:mousedown|preventDefault={() => handleKeyPress(num)} class="h-14 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 shadow-xs active:bg-blue-500 active:text-white transition-colors text-xl">{num}</button>
          {/each}
        </div>
        {#each rows.letters as row, i}
          <div class="flex justify-center gap-2">
            {#if i === 2}
              <button 
                on:mousedown|preventDefault={() => isCaps = !isCaps} 
                class="w-20 h-16 {isCaps ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} border border-blue-100 rounded-xl font-black text-xs uppercase"
              >
                CAPS
              </button>
            {/if}
            {#each row as key}
              <button on:mousedown|preventDefault={() => handleKeyPress(key)} class="h-16 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 shadow-xs active:bg-blue-500 active:text-white transition-colors text-xl">
                {isCaps ? key : key.toLowerCase()}
              </button>
            {/each}
            {#if i === 2}
              <button on:mousedown|preventDefault={backspace} class="w-20 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold flex items-center justify-center">⌫</button>
            {/if}
          </div>
        {/each}
        
        <div class="flex justify-center mt-4 gap-4">
          <button on:mousedown|preventDefault={() => handleKeyPress(' ')} aria-label="space" class="w-64 h-14 bg-white border border-blue-100 rounded-xl shadow-xs active:bg-blue-50"></button>
          <button on:click={() => focusedField = null} class="px-12 py-3 bg-blue-900/5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 active:bg-blue-100">Done</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showFingerprintModal}
    <div 
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 backdrop-blur-md p-10"
      on:click|stopPropagation={closeFingerprint}
      on:keydown={(e) => e.key === 'Escape' && closeFingerprint()}
      role="presentation"
    >
      <div 
        transition:scale={{ start: 0.9, duration: 300 }}
        class="bg-white w-full max-w-sm rounded-[3rem] p-12 flex flex-col items-center text-center shadow-2xl"
        on:click|stopPropagation
        role="presentation"
      >
        <div class="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <div class="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-8 overflow-hidden">
            <img 
              src={fingerprintIcon} 
              alt="Scanning" 
              class="w-16 h-16 animate-pulse pointer-events-none" 
              style="filter: brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(2053%) hue-rotate(205deg) brightness(96%) contrast(92%);"
            />
          </div>
        </div>
        <h3 class="text-2xl font-black text-blue-950 uppercase tracking-tighter mb-2">Scanning...</h3>
        <p class="text-blue-900/50 font-bold text-sm leading-relaxed mb-10">Please place your finger on the biometric scanner below the screen.</p>
        <button on:click={closeFingerprint} class="px-8 py-4 border-2 border-blue-100 rounded-2xl text-blue-400 font-black uppercase tracking-widest text-xs active:bg-blue-50">Cancel</button>
      </div>
    </div>
  {/if}
</div>