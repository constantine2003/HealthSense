<script lang="ts">
  export let onBack: () => void;
  export let onStart: () => void;
  export let measurementType: 'weight' | 'height' | 'blood-pressure' | 'heart-rate' | 'temperature';

  let selectedLanguage = 'ENGLISH';

  function setLanguage(lang: string) {
    selectedLanguage = lang;
  }

  // Define instructions for each measurement type
  const measurementConfig = {
    'weight': {
      title: 'Measuring Weight:',
      instructions: [
        'Step onto the weighing platform carefully.',
        'Stand still with both feet evenly placed.',
        'Please remain steady until the measurement is complete.'
      ]
    },
    'height': {
      title: 'Measuring Height:',
      instructions: [
        'Please remove footwear and stand straight on the marked area.',
        'Keep your back straight and look forward.',
        'Remain still while your height is being measured.'
      ]
    },
    'blood-pressure': {
      title: 'Measuring Blood Pressure:',
      instructions: [
        'Sit comfortably and relax.',
        'Wrap the cuff snugly around your arm as shown.',
        'Keep your arm supported at heart level.',
        'Do not move or talk during the measurement.'
      ]
    },
    'heart-rate': {
      title: 'Measuring Heart Rate & SpO₂:',
      instructions: [
        'Place your finger gently on the sensor.',
        'Keep your hand still and relaxed.',
        'Please wait while your heart rate and oxygen level are measured.'
      ]
    },
    'temperature': {
      title: 'Measuring Temperature:',
      instructions: [
        'Face the sensor and hold still.',
        'Ensure your forehead is uncovered.',
        'Measurement will be taken automatically.'
      ]
    }
  };

  $: config = measurementConfig[measurementType];
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <header class="flex items-center justify-between px-8 py-6">
    <div class="flex items-center gap-6">
      <button
        on:click={onBack}
        class="text-slate-600 hover:text-slate-900 flex items-center gap-2 text-lg font-medium transition-colors"
      >
        ← Back
      </button>
      <div class="text-2xl font-semibold text-slate-600">
        HealthSense
      </div>
    </div>
    <button
      class="px-6 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
    >
      About Us
    </button>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex items-center justify-center px-8 py-12">
    <div class="bg-white/40 backdrop-blur-sm rounded-3xl shadow-xl p-12 w-full max-w-5xl">
      <h1 class="text-4xl font-bold text-center text-[#0891b2] mb-8">
        {config.title}
      </h1>

      <div class="grid grid-cols-2 gap-12 items-start">
        <!-- Instructions Column -->
        <div class="space-y-4">
          {#each config.instructions as instruction}
            <div class="flex gap-3 items-start">
              <span class="text-[#0891b2] text-2xl mt-1">•</span>
              <p class="text-[#0891b2] text-xl leading-relaxed">
                {instruction}
              </p>
            </div>
          {/each}

          <!-- Start Button -->
          <div class="pt-8">
            <button
              on:click={onStart}
              class="w-full py-6 px-8 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600
                     text-slate-900 text-2xl font-bold rounded-2xl shadow-lg
                     transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Start
            </button>
          </div>
        </div>

        <!-- Image Placeholder Column -->
        <div class="flex items-center justify-center h-full">
          <div class="w-full h-80 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span class="text-4xl font-bold text-slate-900">image here</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="flex items-center justify-between px-8 py-6">
    <div class="flex gap-6">
      {#each ['ENGLISH', 'FILIPINO', 'BISAYA'] as lang}
        <button
          on:click={() => setLanguage(lang)}
          class="text-sm font-medium transition-colors
                 {selectedLanguage === lang
                   ? 'text-slate-900 underline underline-offset-4'
                   : 'text-slate-600 hover:text-slate-800'}"
        >
          {lang}
        </button>
      {/each}
    </div>
  </footer>
</div>
