<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';
  import Home from './lib/pages/home.svelte';
  import History from './lib/pages/history.svelte';
  import Checkup from './lib/pages/checkup.svelte';
  import CreateAccount from './lib/pages/createaccount.svelte'; 
  
  // FIX 1: Import supabase so the logout function works
  import { supabase } from './lib/pages/supabaseClient';

  type ScreenState = 'welcome' | 'login' | 'signup' | 'home' | 'history' | 'checkup';
  
  let currentScreen: ScreenState = 'welcome';
  let user: any = null;

  const startKiosk = (): void => { currentScreen = 'login' };
  const goBack = (): void => { currentScreen = 'welcome' };
  const goToSignUp = (): void => { currentScreen = 'signup' }; 
  
  // FIX 2: Ensure this is correctly typed for props
  const loginSuccess = (userData: any): void => { 
    user = userData; 
    currentScreen = 'home'; 
  };

  // FIX 3: Async functions must return Promise<void>
  const logout = async (): Promise<void> => { 
    await supabase.auth.signOut();
    user = null; 
    currentScreen = 'welcome'; 
  };

  const showHistory = (): void => { currentScreen = 'history' };
  const closeHistory = (): void => { currentScreen = 'home' };
  const startCheckup = (): void => { currentScreen = 'checkup' };

  const finishCheckup = (data: any): void => {
    console.log("Checkup Data Received:", data);
    currentScreen = 'home'; 
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
       <History onBack={closeHistory} />
    </div>

  {:else if currentScreen === 'checkup'}
    <div class="flex-1">
       <Checkup onFinish={finishCheckup} onCancel={closeHistory} />
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