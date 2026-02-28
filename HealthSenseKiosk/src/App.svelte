<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';
  import Home from './lib/pages/home.svelte';
  import History from './lib/pages/history.svelte';
  import Checkup from './lib/pages/checkup.svelte';
  import CreateAccount from './lib/pages/createaccount.svelte'; 
  
  import { supabase } from './lib/pages/supabaseClient';

  type ScreenState = 'welcome' | 'login' | 'signup' | 'home' | 'history' | 'checkup';
  
  let currentScreen: ScreenState = 'welcome';
  let user: any = null;
  let isSaving = false; // New state for loading overlay

  const startKiosk = (): void => { currentScreen = 'login' };
  const goBack = (): void => { currentScreen = 'welcome' };
  const goToSignUp = (): void => { currentScreen = 'signup' }; 
  
  const loginSuccess = (userData: any): void => { 
    user = userData; 
    currentScreen = 'home'; 
  };

  const logout = async (): Promise<void> => { 
    await supabase.auth.signOut();
    user = null; 
    currentScreen = 'welcome'; 
  };

  const showHistory = (): void => { currentScreen = 'history' };
  const closeHistory = (): void => { currentScreen = 'home' };
  const startCheckup = (): void => { currentScreen = 'checkup' };

  // FIX: Async function to handle the database insert
  const finishCheckup = async (data: any): Promise<void> => {
    try {
      isSaving = true;
      console.log("Saving Checkup Data:", data);

      const { error } = await supabase
        .from('health_checkups')
        .insert([data]);

      if (error) throw error;

      // Reset to home after successful save
      currentScreen = 'home'; 
    } catch (err: any) {
      console.error("Database Insert Error:", err.message);
      alert("Failed to save health report. Please try again.");
    } finally {
      isSaving = false;
    }
  };
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