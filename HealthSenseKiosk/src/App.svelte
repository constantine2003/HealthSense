<script lang="ts">
  import Welcome from './lib/pages/welcome.svelte';
  import Login from './lib/pages/login.svelte';
  import SignUp from './lib/pages/signup.svelte';
  import Dashboard from './lib/pages/dashboard.svelte';
  import VitalsMenu from './lib/pages/vitals-menu.svelte';
  import Measurement from './lib/pages/measurement.svelte';
  import Measuring from './lib/pages/measuring.svelte';
  import Placeholder from './lib/pages/placeholder.svelte';
  import ConnectionStatus from './lib/components/ConnectionStatus.svelte';
  import type { MeasurementType } from './lib/types/measurement.types';

  // State management
  type ScreenState = 'welcome' | 'login' | 'signup' | 'dashboard' | 'vitals-menu' |
    'measure-weight' | 'measure-height' | 'measure-blood-pressure' |
    'measure-heart-rate' | 'measure-temperature' |
    'measuring' | 'medical-history' | 'personal-info';
  let currentScreen: ScreenState = 'welcome';
  let activeMeasurementType: MeasurementType | null = null;

  // Navigation handlers
  const startKiosk = () => currentScreen = 'login';
  const goBackFromLogin = () => currentScreen = 'welcome';
  const goBackFromDashboard = () => currentScreen = 'login';
  const goToDashboard = () => currentScreen = 'dashboard';
  const logout = () => currentScreen = 'welcome';

  // Sign up handlers
  const goToSignUp = () => currentScreen = 'signup';
  const goBackToLogin = () => currentScreen = 'login';
  const handleSignUpSuccess = () => currentScreen = 'login';

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

  const startMeasurement = (type: MeasurementType) => {
    activeMeasurementType = type;
    currentScreen = 'measuring';
  };

  const handleMeasurementComplete = (result: any) => {
    console.log('Measurement complete:', result);
    // TODO: Save measurement result
    // For now, just go back to vitals menu
    setTimeout(() => {
      currentScreen = 'vitals-menu';
    }, 2000);
  };

  const cancelMeasurement = () => {
    activeMeasurementType = null;
    currentScreen = 'vitals-menu';
  };
</script>

<main
  class="fixed inset-0 h-screen w-screen overflow-hidden select-none flex flex-col text-slate-900 bg-[#9fc5f8]"
>
  <!-- ESP32 Connection Status (Always Visible) -->
  <ConnectionStatus />

  {#if currentScreen === 'welcome'}
    <div class="flex-1">
       <Welcome onStart={startKiosk} />
    </div>
  
  {:else if currentScreen === 'login'}
    <div class="flex-1">
       <Login onBack={goBackFromLogin} onLogin={goToDashboard} onSignUp={goToSignUp} />
    </div>

  {:else if currentScreen === 'signup'}
    <div class="flex-1">
      <SignUp onBack={goBackToLogin} onSignUpSuccess={handleSignUpSuccess} />
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
        onStart={() => startMeasurement('weight')}
      />
    </div>

  {:else if currentScreen === 'measure-height'}
    <div class="flex-1">
      <Measurement
        measurementType="height"
        onBack={backToVitalsMenu}
        onStart={() => startMeasurement('height')}
      />
    </div>

  {:else if currentScreen === 'measure-blood-pressure'}
    <div class="flex-1">
      <Measurement
        measurementType="blood-pressure"
        onBack={backToVitalsMenu}
        onStart={() => startMeasurement('bloodPressure')}
      />
    </div>

  {:else if currentScreen === 'measure-heart-rate'}
    <div class="flex-1">
      <Measurement
        measurementType="heart-rate"
        onBack={backToVitalsMenu}
        onStart={() => startMeasurement('heartRate')}
      />
    </div>

  {:else if currentScreen === 'measure-temperature'}
    <div class="flex-1">
      <Measurement
        measurementType="temperature"
        onBack={backToVitalsMenu}
        onStart={() => startMeasurement('temperature')}
      />
    </div>

  {:else if currentScreen === 'measuring'}
    <div class="flex-1">
      {#if activeMeasurementType}
        <Measuring
          measurementType={activeMeasurementType}
          onComplete={handleMeasurementComplete}
          onCancel={cancelMeasurement}
        />
      {/if}
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