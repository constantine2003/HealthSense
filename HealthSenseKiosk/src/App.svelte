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
  import { onMount } from 'svelte';

  type ScreenState = 'welcome' | 'login' | 'signup' | 'home' | 'history' | 'checkup';
  
  let currentScreen: ScreenState = 'welcome';
  let user: any = null;
  let isSaving = false;

  // Connect the bridge immediately on app startup so the fingerprint sensor
  // is available on the login and signup screens (not just after login).
  onMount(() => { esp32Connect(); });

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
    await supabase.auth.signOut();
    // Do NOT disconnect the WebSocket here — the bridge must stay alive so the
    // fingerprint sensor remains available on the login/signup screens.
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

      // Verify we have a valid user ID before attempting the insert.
      // user.id comes from supabase.auth.getUser() → data.user.id (UUID string).
      if (!data.user_id) {
        throw new Error('No authenticated user — please log in again.');
      }

      console.log("Saving checkup:", JSON.stringify(data, null, 2));

      const { error } = await supabase
        .from('health_checkups')
        .insert([data]);

      if (error) throw error;

      currentScreen = 'home'; 
    } catch (err: any) {
      console.error("DB insert failed:", err);
      alert(`Failed to save health report:\n${err?.message ?? err}`);
    } finally {
      isSaving = false;
    }
  };

  // Whether the user is logged in (show the ESP32 widget on these screens)
  $: loggedIn = user !== null && ['home', 'history', 'checkup'].includes(currentScreen);
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
</main>

<!-- ESP32 status widget: floating top-right, only when logged in -->
{#if loggedIn}
  <ESP32StatusWidget />
{/if}

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