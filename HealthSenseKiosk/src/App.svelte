<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';
  import Home from './lib/pages/home.svelte';
  import History from './lib/pages/history.svelte';

  // State management
  type ScreenState = 'welcome' | 'login' | 'home' | 'history';
  let currentScreen: ScreenState = 'welcome';

  // Navigation handlers
  const startKiosk = () => currentScreen = 'login';
  const goBack = () => currentScreen = 'welcome';
  const loginSuccess = () => currentScreen = 'home';
  const logout = () => currentScreen = 'welcome';
  
  // New handlers for history
  const showHistory = () => currentScreen = 'history';
  const closeHistory = () => currentScreen = 'home';
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
       <Login onBack={goBack} onLogin={loginSuccess} />
    </div>
    
  {:else if currentScreen === 'home'}
    <div class="flex-1">
       <Home onLogout={logout} onViewHistory={showHistory} />
    </div>
  
  {:else if currentScreen === 'history'}
    <div class="flex-1">
       <History onBack={closeHistory} />
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