<script lang="ts">
  export let onBack: () => void;
  export let onLogin: () => void;
  export let onSignUp: () => void;

  let pin: string = "";
  const maxLength: number = 4;

  function handleKey(num: string) {
    if (pin.length < maxLength) pin += num;
  }

  function clear() {
    pin = "";
  }

  function submit() {
    if (pin === "1234") {
      onLogin();
    } else {
      alert("Wrong PIN");
      pin = "";
    }
  }
</script>

<div class="flex flex-col items-center justify-center h-full p-6">
  <button on:click={onBack} class="absolute top-10 left-10 text-slate-500 hover:text-white flex items-center gap-2">
    ← BACK
  </button>

  <h2 class="text-3xl font-bold text-white mb-8">Enter Access PIN</h2>

  <div class="flex gap-4 mb-12">
    {#each Array(maxLength) as _, i}
      <div class="w-16 h-20 border-2 rounded-2xl flex items-center justify-center text-4xl font-bold
        {pin[i] ? 'border-blue-500 text-white bg-blue-500/10' : 'border-slate-800 text-slate-700'}">
        {pin[i] ? '•' : ''}
      </div>
    {/each}
  </div>

  <div class="grid grid-cols-3 gap-4">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as num}
      <button on:click={() => handleKey(num)}
        class="w-24 h-24 bg-slate-900 border border-slate-800 rounded-2xl text-3xl font-bold hover:bg-slate-800 active:bg-blue-600 transition-colors">
        {num}
      </button>
    {/each}
    <button on:click={clear} class="w-24 h-24 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xl font-bold hover:bg-red-500 hover:text-white">CLR</button>
    <button on:click={() => handleKey('0')} class="w-24 h-24 bg-slate-900 border border-slate-800 rounded-2xl text-3xl font-bold hover:bg-slate-800">0</button>
    <button on:click={submit} class="w-24 h-24 bg-green-600 text-white rounded-2xl text-xl font-bold hover:bg-green-500 shadow-lg shadow-green-900/20">GO</button>
  </div>

  <!-- Sign Up Section -->
  <div class="mt-8 text-center">
    <p class="text-slate-400 mb-3">Don't have an account?</p>
    <button
      on:click={onSignUp}
      class="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
             text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-900/20
             transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
    >
      Sign Up
    </button>
  </div>
</div>