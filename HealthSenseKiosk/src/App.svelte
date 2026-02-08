<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';

  // State management
  type ScreenState = 'welcome' | 'login' | 'dashboard';
  let currentScreen: ScreenState = 'welcome';

  // Navigation handlers
  const startKiosk = () => currentScreen = 'login';
  const goBack = () => currentScreen = 'welcome';
</script>

<main 
  class="fixed inset-0 h-screen w-screen overflow-hidden select-none flex flex-col text-slate-900 bg-[#9fc5f8]"
>
  
  {#if currentScreen === 'welcome'}
    <div class="flex-1">
       <Welcome onStart={startKiosk} />
    </div>
  
  {:else if currentScreen === 'login'}
    <div class="flex-1">
       <Login onBack={goBack} />
    </div>
    
  {:else if currentScreen === 'dashboard'}
    <div class="flex items-center justify-center h-full flex-1">
      <h1 class="text-4xl font-black tracking-widest animate-pulse text-blue-500">
        DASHBOARD_ACTIVE
      </h1>
    </div>
  {/if}

</main>

<style>
  /* Global reset to ensure the kiosk fills the Pi 5 screen perfectly */
  :global(body, html) {
    margin: 0;
    padding: 0;
    background-color: #020617; /* Matches slate-950 */
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>