<script lang="ts">
  export let onBack: () => void;
  export let title: string;

  let selectedLanguage = 'ENGLISH';

  function setLanguage(lang: string) {
    selectedLanguage = lang;
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
    >
      About Us
    </button>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex items-center justify-center px-8">
    <div class="bg-white/40 backdrop-blur-sm rounded-3xl shadow-xl p-12 w-full max-w-2xl">
      <h1 class="text-4xl font-bold text-center text-[#0891b2] mb-12">
        {title}
      </h1>
      <p class="text-center text-slate-600 text-xl">
        This section is under development.
      </p>
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
