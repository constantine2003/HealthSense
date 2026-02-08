<script lang="ts">
  export let onStart: () => void;
</script>

<div class="flex flex-col items-center justify-center h-full text-white">
  <h1 class="text-6xl font-bold">HealthSense</h1>
  <button on:click={onStart} class="mt-8 bg-blue-600 px-8 py-4 rounded-xl">
    START ASSESSMENT
  </button>
</div>