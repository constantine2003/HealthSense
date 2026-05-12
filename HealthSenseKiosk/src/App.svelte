<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';
  import Home from './lib/pages/home.svelte';
  import History from './lib/pages/history.svelte';
  import Checkup from './lib/pages/checkup.svelte';
  import CreateAccount from './lib/pages/createaccount.svelte'; 
  import ESP32StatusWidget from './lib/components/ESP32StatusWidget.svelte';
  
  import { supabase } from './lib/pages/supabaseClient';
  import { connect as esp32Connect } from './lib/stores/esp32Store';
  import { isOnline } from './lib/stores/connectivity';
  import { saveCheckup, signOut as dbSignOut } from './lib/db/index';
  import { onMount } from 'svelte';

  type ScreenState = 'welcome' | 'login' | 'signup' | 'home' | 'history' | 'checkup';
  
  let currentScreen: ScreenState = 'welcome';
  let user: any = null;
  let isSaving = false;

  // Connect the bridge immediately on app startup so the fingerprint sensor
  // is available on the login and signup screens (not just after login).
  onMount(() => {
    esp32Connect();

    // ── On-screen keyboard: open when an <input> receives focus ──────────
    const openKb = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (
        el instanceof HTMLInputElement &&
        el.type !== 'hidden' &&
        !el.readOnly &&
        !el.disabled &&
        el.getAttribute('aria-hidden') !== 'true'
      ) {
        kbTarget.set(el);
      }
    };

    // Close keyboard when user taps outside any input and outside the keyboard
    const closeKb = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement) return; // focusin will handle it
      if (t.closest('[data-osk]')) return;        // tap inside keyboard panel
      kbTarget.set(null);
    };

    document.addEventListener('focusin', openKb);
    document.addEventListener('pointerdown', closeKb);
    return () => {
      document.removeEventListener('focusin', openKb);
      document.removeEventListener('pointerdown', closeKb);
    };
  });

  const startKiosk = (): void => { currentScreen = 'login' };
  const goBack = (): void => { currentScreen = 'welcome' };
  const goToSignUp = (): void => { currentScreen = 'signup' }; 
  
  const loginSuccess = (userData: any): void => { 
    user = userData; 
    currentScreen = 'home';
    // Bridge is already running; esp32Connect() is idempotent so calling it here
    // is safe, but not required.
  };

  const logout = async (): Promise<void> => { 
    await dbSignOut();
    user = null; 
    currentScreen = 'welcome'; 
  };

  const showHistory = (): void => { currentScreen = 'history' };
  const closeHistory = (): void => { currentScreen = 'home' };
  const startCheckup = (): void => { currentScreen = 'checkup' };

  // Async function to handle the database insert
  const finishCheckup = async (data: any): Promise<void> => {
    try {
      isSaving = true;

      if (!data.user_id) {
        throw new Error('No authenticated user — please log in again.');
      }

      console.log("Saving checkup:", JSON.stringify(data, null, 2));

      await saveCheckup(data);

      currentScreen = 'home'; 
    } catch (err: any) {
      console.error("DB insert failed:", err);
      alert(`Failed to save health report:\n${err?.message ?? err}`);
    } finally {
      isSaving = false;
    }
  };

  import { BRIDGE_BASE } from './lib/stores/connectivity';
  import { kbTarget } from './lib/stores/keyboard';
  import OSKeyboard from './lib/components/OSKeyboard.svelte';

  // Whether the user is logged in (show the ESP32 widget on these screens)
  $: loggedIn = user !== null && ['home', 'history', 'checkup'].includes(currentScreen);

  let isRestarting = false;

  async function restartAll() {
    if (isRestarting) return;
    isRestarting = true;
    try {
      await fetch(`${BRIDGE_BASE}/api/restart`, {
        method: 'POST',
        headers: { 'x-hs-token': import.meta.env.VITE_HS_TOKEN ?? '' },
      }).catch(() => {});
    } finally {
      // Reload the page after a short delay to let the bridge restart
      setTimeout(() => window.location.reload(), 1200);
    }
  }
</script>

<main 
  on:contextmenu|preventDefault
  class="fixed inset-0 h-screen w-screen overflow-hidden select-none flex flex-col text-slate-900 bg-[#9fc5f8]"
>
  
  {#if currentScreen === 'welcome'}
    <div class="flex-1">
       <Welcome onStart={startKiosk} />
    </div>
  
  {:else if currentScreen === 'login'}
    <div class="flex-1">
       <Login 
         onBack={goBack} 
         onLogin={(data) => loginSuccess(data)} 
         onCreateAccount={goToSignUp} 
       />
    </div>

  {:else if currentScreen === 'signup'}
    <div class="flex-1">
       <CreateAccount 
          onBack={() => currentScreen = 'login'} 
          onCreated={(data) => loginSuccess(data)} 
        />
    </div>
    
  {:else if currentScreen === 'home'}
    <div class="flex-1">
       <Home 
         {user}
         onLogout={logout} 
         onViewHistory={showHistory} 
         onStartCheckup={startCheckup} 
       />
    </div>
  
  {:else if currentScreen === 'history'}
  <div class="flex-1">
     <History {user} onBack={closeHistory} />
  </div>

  {:else if currentScreen === 'checkup'}
    <div class="flex-1">
       <Checkup 
          {user} 
          onFinish={finishCheckup} 
          onCancel={closeHistory} 
        />
    </div>
  {/if}

  {#if isSaving}
    <div class="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-100 flex flex-col items-center justify-center text-white">
      <div class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
      <p class="font-black uppercase tracking-[0.3em] text-sm">Uploading Report...</p>
    </div>
  {/if}

  {#if !$isOnline}
    <div class="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-sm font-black uppercase tracking-[0.2em] py-1 pointer-events-none">
      <span>📶</span><span>Offline Mode — data will sync when connected</span>
    </div>
  {/if}

  <!-- Refresh button — top-left, always visible -->
  <button
    on:click={restartAll}
    disabled={isRestarting}
    class="fixed top-3 left-3 z-[200] w-10 h-10 rounded-full flex items-center justify-center
           bg-white/20 hover:bg-white/40 active:bg-white/60 backdrop-blur-sm
           transition-all duration-150 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
    title="Restart kiosk"
    aria-label="Restart kiosk"
  >
    {#if isRestarting}
      <svg class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10z"/>
      </svg>
    {:else}
      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 104.582 9H4"/>
      </svg>
    {/if}
  </button>
</main>

<!-- ESP32 status widget: floating top-right, only when logged in -->
{#if loggedIn}
  <ESP32StatusWidget />
{/if}

<!-- Global on-screen keyboard — renders as a fixed overlay above everything -->
<OSKeyboard />

<style>
  :global(body, html) {
    margin: 0;
    padding: 0;
    background-color: #020617; 
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    -webkit-touch-callout: none; 
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior: none;
    touch-action: none;
  }

  :global(button) {
    touch-action: manipulation;
  }
</style>