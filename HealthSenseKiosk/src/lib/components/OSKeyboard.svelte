<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { kbTarget } from '../stores/keyboard';

  type Mode = 'alpha' | 'num' | 'sym';
  let mode: Mode = 'alpha';
  let shifted = false;
  let capsLock = false;

  // Track previous target so we can reset state on new input focus
  let prevTarget: HTMLInputElement | null = null;
  $: if ($kbTarget && $kbTarget !== prevTarget) {
    prevTarget = $kbTarget;
    const isNumeric = $kbTarget.inputmode === 'numeric' || $kbTarget.type === 'number';
    mode = isNumeric ? 'num' : 'alpha';
    shifted = false;
    capsLock = false;
    // Scroll input into view after keyboard slides up
    setTimeout(() => $kbTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }

  // ── Key action helpers ────────────────────────────────────────────────────

  function insertChar(ch: string) {
    const el = $kbTarget;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    el.value = el.value.slice(0, start) + ch + el.value.slice(end);
    const pos = start + ch.length;
    el.setSelectionRange(pos, pos);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (shifted && !capsLock) shifted = false;
  }

  function backspace() {
    const el = $kbTarget;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    if (start !== end) {
      el.value = el.value.slice(0, start) + el.value.slice(end);
      el.setSelectionRange(start, start);
    } else if (start > 0) {
      el.value = el.value.slice(0, start - 1) + el.value.slice(start);
      el.setSelectionRange(start - 1, start - 1);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function done() {
    const el = $kbTarget;
    kbTarget.set(null);
    if (el) {
      el.blur();
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function toggleShift() {
    if (!shifted && !capsLock)        { shifted = true; }
    else if (shifted && !capsLock)    { capsLock = true; shifted = false; }
    else                               { capsLock = false; shifted = false; }
  }

  function ltr(ch: string) {
    return (shifted || capsLock) ? ch.toUpperCase() : ch.toLowerCase();
  }

  // ── Key layout data ───────────────────────────────────────────────────────

  const QWERTY1 = ['q','w','e','r','t','y','u','i','o','p'];
  const QWERTY2 = ['a','s','d','f','g','h','j','k','l'];
  const QWERTY3 = ['z','x','c','v','b','n','m'];

  const NUM1 = ['1','2','3','4','5','6','7','8','9','0'];
  const NUM2 = ['-','/','.',',','?','!','@','#','(',')'];
  const NUM3 = ["'",'"',':',';','_','&','%','$'];

  const SYM1 = ['[',']','{','}','^','*','=','\\','|','~'];
  const SYM2 = ['<','>','€','£','¥','±','×','÷','`','_'];
  const SYM3 = ['.',',','?','!','\'','"',':',';'];

  // Numpad (numeric inputmode)
  const PAD_DIGITS = ['1','2','3','4','5','6','7','8','9'];

  $: isNumericPad = $kbTarget && ($kbTarget.inputmode === 'numeric' || $kbTarget.type === 'number');

  // ── Shared key classes ────────────────────────────────────────────────────
  const kChar = "flex-1 h-[5rem] rounded-xl bg-white shadow-sm text-[1.6rem] font-black text-slate-800 active:bg-blue-100 active:scale-95 transition-transform select-none";
  const kAction = "h-[5rem] rounded-xl bg-[#aeb4bb] shadow-sm font-black text-slate-700 active:bg-slate-400 active:scale-95 transition-transform select-none";
  const kDone = "h-[5rem] rounded-xl bg-blue-600 shadow-sm text-[1.1rem] font-black text-white active:bg-blue-700 active:scale-95 transition-transform select-none";
</script>

{#if $kbTarget}
  <!-- Keyboard panel — pointerdown|stopPropagation prevents any tap from
       propagating to the document "close on outside tap" listener in App.svelte -->
  <div
    data-osk="true"
    class="fixed bottom-0 inset-x-0 z-[1000] bg-[#d1d5db] shadow-2xl px-2 pt-3 pb-6 select-none"
    transition:fly={{ y: 480, duration: 260, easing: quintOut }}
    on:pointerdown|stopPropagation
    role="presentation"
  >

    {#if isNumericPad}
      <!-- ── NUMPAD (for numeric / date fields) ─────────────────────────── -->
      <div class="grid grid-cols-3 gap-2 max-w-[360px] mx-auto">
        {#each PAD_DIGITS as k}
          <button class="h-24 rounded-2xl bg-white shadow-sm text-4xl font-black text-slate-800 active:bg-blue-100 active:scale-95 transition-transform"
            on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
        {/each}
        <button class="h-24 rounded-2xl {kAction} text-2xl"
          on:pointerdown|preventDefault={backspace}>⌫</button>
        <button class="h-24 rounded-2xl bg-white shadow-sm text-4xl font-black text-slate-800 active:bg-blue-100 active:scale-95 transition-transform"
          on:pointerdown|preventDefault={() => insertChar('0')}>0</button>
        <button class="h-24 rounded-2xl bg-blue-600 text-white font-black text-2xl active:bg-blue-700 active:scale-95 transition-transform"
          on:pointerdown|preventDefault={done}>Done</button>
      </div>

    {:else if mode === 'alpha'}
      <!-- ── QWERTY ─────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1.5">
        <!-- Row 1: q–p -->
        <div class="flex gap-1.5">
          {#each QWERTY1 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(ltr(k))}>{ltr(k)}</button>
          {/each}
        </div>
        <!-- Row 2: a–l (slightly indented) -->
        <div class="flex gap-1.5 mx-[2.6%]">
          {#each QWERTY2 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(ltr(k))}>{ltr(k)}</button>
          {/each}
        </div>
        <!-- Row 3: shift + z–m + backspace -->
        <div class="flex gap-1.5">
          <button class="w-[9%] {kAction} text-2xl {shifted || capsLock ? '!bg-blue-600 !text-white' : ''}"
            on:pointerdown|preventDefault={toggleShift}>{capsLock ? '⇪' : '⇧'}</button>
          {#each QWERTY3 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(ltr(k))}>{ltr(k)}</button>
          {/each}
          <button class="w-[12%] {kAction} text-2xl"
            on:pointerdown|preventDefault={backspace}>⌫</button>
        </div>
        <!-- Row 4: mode + space + done -->
        <div class="flex gap-1.5">
          <button class="w-[11%] {kAction} text-lg" on:pointerdown|preventDefault={() => mode = 'num'}>123</button>
          <button class="w-[8%] {kAction} text-2xl"  on:pointerdown|preventDefault={() => insertChar(',')}>，</button>
          <button class="flex-1 {kChar} text-xl"    on:pointerdown|preventDefault={() => insertChar(' ')}>SPACE</button>
          <button class="w-[8%] {kAction} text-2xl"  on:pointerdown|preventDefault={() => insertChar('.')}>.</button>
          <button class="w-[14%] {kDone} text-[1.1rem]" on:pointerdown|preventDefault={done}>Done ✓</button>
        </div>
      </div>

    {:else if mode === 'num'}
      <!-- ── NUMBER / SYMBOL LAYOUT ─────────────────────────────────────── -->
      <div class="flex flex-col gap-1.5">
        <div class="flex gap-1.5">
          {#each NUM1 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
          {/each}
        </div>
        <div class="flex gap-1.5">
          {#each NUM2 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
          {/each}
        </div>
        <div class="flex gap-1.5">
          <button class="w-[11%] {kAction} text-lg" on:pointerdown|preventDefault={() => mode = 'sym'}>#+=</button>
          {#each NUM3 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
          {/each}
          <button class="w-[12%] {kAction} text-2xl" on:pointerdown|preventDefault={backspace}>⌫</button>
        </div>
        <div class="flex gap-1.5">
          <button class="w-[11%] {kAction} text-lg" on:pointerdown|preventDefault={() => mode = 'alpha'}>ABC</button>
          <button class="flex-1 {kChar} text-xl" on:pointerdown|preventDefault={() => insertChar(' ')}>SPACE</button>
          <button class="w-[14%] {kDone} text-[1.1rem]" on:pointerdown|preventDefault={done}>Done ✓</button>
        </div>
      </div>

    {:else if mode === 'sym'}
      <!-- ── SYMBOLS ────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1.5">
        <div class="flex gap-1.5">
          {#each SYM1 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
          {/each}
        </div>
        <div class="flex gap-1.5">
          {#each SYM2 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
          {/each}
        </div>
        <div class="flex gap-1.5">
          <button class="w-[11%] {kAction} text-lg" on:pointerdown|preventDefault={() => mode = 'num'}>123</button>
          {#each SYM3 as k}
            <button class={kChar} on:pointerdown|preventDefault={() => insertChar(k)}>{k}</button>
          {/each}
          <button class="w-[12%] {kAction} text-2xl" on:pointerdown|preventDefault={backspace}>⌫</button>
        </div>
        <div class="flex gap-1.5">
          <button class="w-[11%] {kAction} text-lg" on:pointerdown|preventDefault={() => mode = 'alpha'}>ABC</button>
          <button class="flex-1 {kChar} text-xl" on:pointerdown|preventDefault={() => insertChar(' ')}>SPACE</button>
          <button class="w-[14%] {kDone} text-[1.1rem]" on:pointerdown|preventDefault={done}>Done ✓</button>
        </div>
      </div>
    {/if}

  </div>
{/if}
