<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  import { supabase } from './supabaseClient'; // Ensure this path is correct
  import fingerprintIcon from '../../assets/fingerprint-svgrepo-com.svg';

  export let onBack: () => void;
  export let onLogin: (user: any) => void; // Pass the user data back
  export let onCreateAccount: () => void;

  let username = ""; // User types: joy.arenas
  let password = "";
  let focusedField: 'username' | 'password' | null = null;
  let showFingerprintModal = false;
  let showPassword = false;
  let isCaps = true;
  let isSubmitting = false; 

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

  function toggleFingerprint() { showFingerprintModal = true; }
  function closeFingerprint() { 
    showFingerprintModal = false; 
    scanStatus = 'idle';
  }

  // --- BIOMETRIC SCAN SIMULATION ---
  let scanStatus: 'scanning' | 'success' | 'idle' = 'idle';

  function simulateScan() {
    if (scanStatus !== 'idle') return;
    scanStatus = 'scanning';
    
    setTimeout(() => {
      scanStatus = 'success';
      setTimeout(() => {
        showFingerprintModal = false;
        scanStatus = 'idle';
        // Note: For a real thesis, you'd fetch the last registered user here
        onLogin({ first_name: "Biometric", last_name: "User" }); 
      }, 1000);
    }, 1500);
  }
  
  // --- ACTUAL LOGIN LOGIC ---
  async function handleSignIn() {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    isSubmitting = true;

    // 1. Construct the email automatically
    const cleanUser = username.toLowerCase().trim();
    const fullEmail = `${cleanUser}@kiosk.local`; // Matches registration logic

    try {
      // 2. Auth Sign In
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password: password,
      });

      if (authError) throw authError;

      // 3. Fetch Profile Data (to get names for the Dashboard)
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        // 4. Success! Pass profile to the Dashboard
        onLogin(profile); 
      }
    } catch (err: any) {
      alert("Login Failed: " + err.message);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div 
  class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] select-none overflow-hidden"
  on:click={() => focusedField = null}
  role="presentation"
>
  <div class="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-6" on:click|stopPropagation role="presentation">
    
    <button on:click={onBack} class="absolute top-16 left-12 text-blue-900/40 font-black tracking-widest text-sm flex items-center gap-2 z-20">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
      </svg>
      BACK
    </button>

    <div class="text-center mb-16">
      <h1 class="text-8xl font-[1000] tracking-tighter leading-none mb-4 uppercase">
        <span class="text-blue-950">LOG</span><span class="text-blue-500">IN</span>
      </h1>
      <p class="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-xs">Access HealthSense Portal</p>
    </div>

    <div class="w-full space-y-6">
      <div class="space-y-2">
        <div class="space-y-2">
          <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Username</span>
          <button 
            type="button"
            on:click|stopPropagation={() => focusedField = 'username'}
            class="relative w-full h-20 px-8 rounded-3xl bg-white border flex items-center text-xl font-bold transition-all outline-none text-left
            {focusedField === 'username' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
          >
            <div class="flex items-baseline overflow-hidden w-full">
              <span class="text-blue-900 whitespace-nowrap">{username}</span>
              
              {#if focusedField === 'username'}
                <div class="ml-1 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
              {/if}
              
              {#if !username && focusedField !== 'username'}
                <span class="text-blue-900/20">firstname.lastname</span>
              {/if}
              
              <!-- <span class="ml-1 text-blue-300 font-medium select-none">@kiosk.local</span> -->
            </div>
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Password</span>
        
        <div 
          on:click|stopPropagation={() => focusedField = 'password'}
          on:keydown={(e) => e.key === 'Enter' && (focusedField = 'password')}
          role="button"
          tabindex="0"
          class="relative w-full h-20 px-8 rounded-3xl bg-white border flex items-center justify-between text-xl font-bold transition-all outline-none cursor-pointer
          {focusedField === 'password' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center flex-1 h-full pointer-events-none">
            <span class="text-blue-900">
              {password ? (showPassword ? password : '•'.repeat(password.length)) : ''}
              {#if !password && focusedField !== 'password'}
                <span class="text-blue-900/20">••••••••</span>
              {/if}
            </span>
            {#if focusedField === 'password'}
              <div class="ml-1 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {/if}
          </div>
          
          <button 
            type="button"
            on:click|stopPropagation={() => showPassword = !showPassword} 
            class="text-blue-900/30 p-2 z-10 hover:text-blue-600 active:scale-90 transition-all"
          >
            {#if showPassword}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.956 9.956 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <button 
        on:click|stopPropagation={handleSignIn} 
        disabled={isSubmitting}
        class="w-full h-20 bg-blue-950 rounded-3xl text-white font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {isSubmitting ? "Verifying..." : "Sign In"}
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
      <img src={fingerprintIcon} alt="Fingerprint" class="w-10 h-10 opacity-80" style="filter: invert(33%) sepia(87%) saturate(1915%) hue-rotate(202deg) brightness(91%) contrast(92%);" />
      <span class="text-blue-900 font-bold uppercase tracking-widest">Use Fingerprint</span>
    </button>

    <div class="mt-16 flex flex-col items-center gap-4">
      <p class="text-blue-900/40 font-bold text-sm">Don't have an account?</p>
      <button on:click={onCreateAccount} class="text-blue-600 font-black uppercase tracking-[0.2em] text-lg hover:underline">
        Create Account
      </button>
    </div>
  </div>

  {#if focusedField}
    <div 
      on:click|stopPropagation
      on:keydown={(e) => e.key === 'Escape' && (focusedField = null)}
      role="dialog"
      aria-label="Virtual Keyboard"
      tabindex="-1" 
      transition:slide={{ axis: 'y', duration: 400 }} 
      class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-blue-100 p-6 pb-12 z-40 outline-none"
    >
      <div class="max-w-4xl mx-auto space-y-3">
        <div class="flex justify-center gap-2">
          {#each rows.numbers as num}
            <button 
              type="button"
              on:mousedown|preventDefault={() => handleKeyPress(num)} 
              class="h-14 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 shadow-xs active:bg-blue-500 active:text-white transition-colors text-xl"
            >
              {num}
            </button>
          {/each}
        </div>

        {#each rows.letters as row, i}
          <div class="flex justify-center gap-2">
            {#if i === 2}
              <button 
                type="button"
                on:mousedown|preventDefault={() => isCaps = !isCaps} 
                class="w-20 h-16 {isCaps ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} border border-blue-100 rounded-xl font-black text-xs"
              >
                CAPS
              </button>
            {/if}

            {#each row as key}
              <button 
                type="button"
                on:mousedown|preventDefault={() => handleKeyPress(key)} 
                class="h-16 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 shadow-xs active:bg-blue-500 active:text-white transition-colors text-xl"
              >
                {isCaps ? key : key.toLowerCase()}
              </button>
            {/each}

            {#if i === 2}
              <button 
                type="button"
                on:mousedown|preventDefault={backspace} 
                aria-label="Backspace"
                class="w-20 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold flex items-center justify-center"
              >
                ⌫
              </button>
            {/if}
          </div>
        {/each}

        <div class="flex justify-center mt-4 gap-4">
          <button 
            type="button"
            on:mousedown|preventDefault={() => handleKeyPress('.')} 
            class="w-16 h-14 bg-white border border-blue-100 rounded-xl font-black text-blue-900 text-xl"
          >
            .
          </button>

          <button 
            type="button"
            aria-label="Space"
            on:mousedown|preventDefault={() => handleKeyPress(' ')} 
            class="w-64 h-14 bg-white border border-blue-100 rounded-xl active:bg-blue-50"
          ></button>

          <button 
            type="button"
            on:click={() => focusedField = null} 
            class="px-12 py-3 bg-blue-900/5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showFingerprintModal}
    <div 
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/60 backdrop-blur-md p-10"
      on:click|stopPropagation={closeFingerprint}
      role="presentation"
    >
      <div 
        transition:scale={{ start: 0.9, duration: 300 }}
        class="bg-white w-full max-w-sm rounded-[3rem] p-12 flex flex-col items-center text-center shadow-2xl border border-blue-100/20"
        on:click|stopPropagation
        role="presentation"
      >
        <button 
          on:click={simulateScan}
          class="relative w-48 h-48 rounded-full flex items-center justify-center mb-10 transition-all duration-500 overflow-hidden bg-slate-50 border border-blue-50 shadow-inner group"
        >
          {#if scanStatus === 'success'}
            <div class="absolute inset-0 bg-green-500 flex items-center justify-center z-50" in:fade>
              <svg in:scale xmlns="http://www.w3.org/2000/svg" class="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          {:else}
            {#if scanStatus === 'scanning'}
              <div 
                class="absolute inset-3 border-[3px] border-slate-200 rounded-full z-10"
              ></div>
              <div 
                class="absolute inset-3 border-[3px] border-transparent border-t-blue-500 rounded-full animate-spin z-20"
                style="transform: rotate(15deg);" 
              ></div>
            {/if}

            <div class="relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center">
              <img 
                src={fingerprintIcon} 
                alt="Scanning" 
                class="w-20 h-20 z-10 transition-all duration-500 {scanStatus === 'scanning' ? 'opacity-100 scale-105' : 'opacity-20'}" 
                style="filter: {scanStatus === 'scanning' ? 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2500%) hue-rotate(200deg) brightness(100%) contrast(105%)' : 'grayscale(100%)'};"
              />
              
              {#if scanStatus === 'scanning'}
                <div class="absolute inset-0 z-20 pointer-events-none" style="clip-path: circle(50% at 50% 50%);">
                  <div class="w-full h-0.75 bg-blue-400 shadow-[0_0_20px_#3b82f6] animate-[scan_2s_linear_infinite] opacity-0"></div>
                </div>
                
                <div class="absolute inset-0 bg-blue-500/10 animate-pulse z-0"></div>
              {/if}
            </div>
          {/if}
        </button>

        <h3 class="text-3xl font-[1000] uppercase tracking-tighter mb-2 
          {scanStatus === 'success' ? 'text-green-600' : 'text-blue-950'}">
          {#if scanStatus === 'idle'} Tap To Scan
          {:else if scanStatus === 'scanning'} Verifying...
          {:else} Success
          {/if}
        </h3>

        <p class="text-blue-900/40 font-bold text-[10px] uppercase tracking-[0.2em] mb-10">
          HealthSense Biometric Auth
        </p>

        {#if scanStatus !== 'success'}
          <button on:click={closeFingerprint} class="px-6 py-2 rounded-full bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest active:bg-red-50 active:text-red-400 transition-colors">
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes scan {
    0% { transform: translateY(-10px); opacity: 0; }
    15% { opacity: 1; }
    85% { opacity: 1; }
    100% { transform: translateY(140px); opacity: 0; }
  }
</style>