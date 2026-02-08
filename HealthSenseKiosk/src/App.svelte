<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';
  import Dashboard from './lib/pages/dashboard.svelte';
  import VitalsMenu from './lib/pages/vitals-menu.svelte';
  import Measurement from './lib/pages/measurement.svelte';
  import Placeholder from './lib/pages/placeholder.svelte';

  // State management
  type ScreenState = 'welcome' | 'login' | 'dashboard' | 'vitals-menu' |
    'measure-weight' | 'measure-height' | 'measure-blood-pressure' |
    'measure-heart-rate' | 'measure-temperature' |
    'medical-history' | 'personal-info';
  let currentScreen: ScreenState = 'welcome';

  // Navigation handlers
  const startKiosk = () => currentScreen = 'login';
  const goBackFromLogin = () => currentScreen = 'welcome';
  const goBackFromDashboard = () => currentScreen = 'login';
  const goToDashboard = () => currentScreen = 'dashboard';
  const logout = () => currentScreen = 'welcome';

  // Dashboard option handlers
  const goToVitals = () => currentScreen = 'vitals-menu';
  const goToMedicalHistory = () => currentScreen = 'medical-history';
  const goToPersonalInfo = () => currentScreen = 'personal-info';

  // Vitals measurement handlers
  const selectMeasurement = (type: string) => {
    const screenMap: Record<string, ScreenState> = {
      'weight': 'measure-weight',
      'height': 'measure-height',
      'blood-pressure': 'measure-blood-pressure',
      'heart-rate': 'measure-heart-rate',
      'temperature': 'measure-temperature'
    };
    currentScreen = screenMap[type] || 'vitals-menu';
  };

  const backToVitalsMenu = () => currentScreen = 'vitals-menu';
  const backToDashboard = () => currentScreen = 'dashboard';

  const startMeasurement = () => {
    // This will be implemented when we add the actual measurement logic
    alert('Starting measurement...');
  };
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
       <Login onBack={goBackFromLogin} onLogin={goToDashboard} />
    </div>

  {:else if currentScreen === 'dashboard'}
    <div class="flex-1">
      <Dashboard
        onBack={goBackFromDashboard}
        onLogout={logout}
        onVitalsMeasurement={goToVitals}
        onMedicalHistory={goToMedicalHistory}
        onPersonalInfo={goToPersonalInfo}
      />
    </div>

  {:else if currentScreen === 'vitals-menu'}
    <div class="flex-1">
      <VitalsMenu
        onBack={backToDashboard}
        onLogout={logout}
        onSelectMeasurement={selectMeasurement}
      />
    </div>

  {:else if currentScreen === 'measure-weight'}
    <div class="flex-1">
      <Measurement
        measurementType="weight"
        onBack={backToVitalsMenu}
        onStart={startMeasurement}
      />
    </div>

  {:else if currentScreen === 'measure-height'}
    <div class="flex-1">
      <Measurement
        measurementType="height"
        onBack={backToVitalsMenu}
        onStart={startMeasurement}
      />
    </div>

  {:else if currentScreen === 'measure-blood-pressure'}
    <div class="flex-1">
      <Measurement
        measurementType="blood-pressure"
        onBack={backToVitalsMenu}
        onStart={startMeasurement}
      />
    </div>

  {:else if currentScreen === 'measure-heart-rate'}
    <div class="flex-1">
      <Measurement
        measurementType="heart-rate"
        onBack={backToVitalsMenu}
        onStart={startMeasurement}
      />
    </div>

  {:else if currentScreen === 'measure-temperature'}
    <div class="flex-1">
      <Measurement
        measurementType="temperature"
        onBack={backToVitalsMenu}
        onStart={startMeasurement}
      />
    </div>

  {:else if currentScreen === 'medical-history'}
    <div class="flex-1">
      <Placeholder
        title="Medical Record History"
        onBack={backToDashboard}
      />
    </div>

  {:else if currentScreen === 'personal-info'}
    <div class="flex-1">
      <Placeholder
        title="Personal Information"
        onBack={backToDashboard}
      />
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