<script lang="ts">
  export let onBack: () => void;
  export let onLogout: () => void;
  export let onVitalsMeasurement: () => void;
  export let onMedicalHistory: () => void;
  export let onPersonalInfo: () => void;

  let selectedLanguage = 'ENGLISH';

  function setLanguage(lang: string) {
    selectedLanguage = lang;
    // Language switching logic can be implemented later
  }
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
      on:click={() => {/* About Us modal logic */}}
    >
      About Us
    </button>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex items-center justify-center px-8">
    <div class="bg-white/40 backdrop-blur-sm rounded-3xl shadow-xl p-12 w-full max-w-2xl">
      <h1 class="text-4xl font-bold text-center text-[#0891b2] mb-12">
        Choose option:
      </h1>

      <div class="space-y-6">
        <button
          on:click={onVitalsMeasurement}
          class="w-full py-6 px-8 bg-gradient-to-r from-cyan-300 to-cyan-400 hover:from-cyan-400 hover:to-cyan-500
                 text-slate-900 text-xl font-bold rounded-2xl shadow-lg
                 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          Vitals Measurement Routine
        </button>

        <button
          on:click={onMedicalHistory}
          class="w-full py-6 px-8 bg-gradient-to-r from-cyan-300 to-cyan-400 hover:from-cyan-400 hover:to-cyan-500
                 text-slate-900 text-xl font-bold rounded-2xl shadow-lg
                 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          Medical Record History
        </button>

        <button
          on:click={onPersonalInfo}
          class="w-full py-6 px-8 bg-gradient-to-r from-cyan-300 to-cyan-400 hover:from-cyan-400 hover:to-cyan-500
                 text-slate-900 text-xl font-bold rounded-2xl shadow-lg
                 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          Personal Information
        </button>
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

    <button
      on:click={onLogout}
      class="px-8 py-3 bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600
             text-white text-lg font-bold rounded-xl shadow-lg
             transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
    >
      Log Out
    </button>
  </footer>
</div>
