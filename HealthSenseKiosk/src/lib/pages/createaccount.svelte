<script lang="ts">
  import { fade, slide, scale } from 'svelte/transition';
  import { onDestroy } from 'svelte';
  import { supabase } from './supabaseClient';
  import {
    startFingerprintEnroll,
    cancelFingerprint,
    fingerprintEvent,
    bridgeStatus,
  } from '../stores/esp32Store';
  import fingerprintIcon from '../../assets/fingerprint-svgrepo-com.svg';

  export let onBack: () => void;
  export let onCreated: (user: any) => void;

  // --- FORM STATE ---
  let firstName = "";
  let middleName = ""; // Added
  let lastName = "";
  let sex: 'Male' | 'Female' | 'Other' | '' = '';
  let focusedField: 'first' | 'middle' | 'last' | 'recoveryEmail' | null = null;
  let isSubmitting = false;
  let recoveryEmail = "";

  // --- BIRTHDAY SCROLLER STATE ---
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const years = Array.from({ length: 100 }, (_, i) => (2026 - i).toString());

  let selM = "JAN", selD = "01", selY = "1990";
  
  $: birthday = `${selM} ${selD}, ${selY}`;
  $: age = (() => {
    const monthIndex = months.indexOf(selM);
    const birthDate = new Date(parseInt(selY), monthIndex, parseInt(selD));
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
    return calculatedAge >= 0 ? calculatedAge : 0;
  })();

  function scrollSelect(node: HTMLElement, type: 'm' | 'd' | 'y') {
    const handleScroll = () => {
      const center = node.scrollTop + node.offsetHeight / 2;
      const items = Array.from(node.children) as HTMLElement[];
      items.forEach((item) => {
        const itemCenter = item.offsetTop + item.offsetHeight / 2;
        if (Math.abs(center - itemCenter) < 25) {
          const val = item.getAttribute('data-value') || "";
          if (type === 'm') selM = val;
          if (type === 'd') selD = val;
          if (type === 'y') selY = val;
        }
      });
    };
    node.addEventListener('scroll', handleScroll, { passive: true });
    return { destroy() { node.removeEventListener('scroll', handleScroll); } };
  }

  // --- BIOMETRIC MODAL STATE ---
  let showBiometricModal = false;
  // 'idle'     → ready to start
  // 'scanning' → waiting for first finger placement
  // 'lift'     → first scan done, waiting for finger to lift
  // 'again'    → waiting for the same finger a second time
  // 'success'  → enrollment complete
  // 'error'    → something went wrong
  let scanStatus: 'idle' | 'scanning' | 'lift' | 'again' | 'success' | 'error' = 'idle';
  let scanMessage = "";
  let fingerprintRegistered = false;
  let fingerprintSlot: number | null = null;   // slot saved during enroll, stored in DB
  let addFingerprint = false;                  // checkbox: user opts in to biometric login

  // Explicit store subscription — more reliable than $: reactive blocks
  // because Svelte will never batch-suppress a direct subscriber callback.
  const unsubFP = fingerprintEvent.subscribe((evt) => {
    if (!evt) return;
    if (evt.type === 'fp_progress') {
      if (evt.step === 'place_finger') {
        scanStatus = 'scanning';
        scanMessage = evt.message ?? 'Place your finger on the sensor';
      } else if (evt.step === 'lift_finger') {
        scanStatus = 'lift';
        scanMessage = evt.message ?? 'Lift your finger';
      } else if (evt.step === 'place_again') {
        scanStatus = 'again';
        scanMessage = evt.message ?? 'Place the same finger again';
      }
    } else if (evt.type === 'fp_enrolled') {
      fingerprintSlot = evt.slot!;
      fingerprintRegistered = true;
      scanStatus = 'success';
      scanMessage = 'Fingerprint registered successfully';
      setTimeout(() => { showBiometricModal = false; }, 1500);
    } else if (evt.type === 'fp_error') {
      scanStatus = 'error';
      scanMessage = evt.message ?? 'Sensor error — please try again';
    }
  });
  onDestroy(unsubFP);

  // --- KEYBOARD CONFIG ---
  const rows = {
    numbers: ['1','2','3','4','5','6','7','8','9','0'],
    letters: [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M']
    ]
  };
  let isCaps = true;

  // --- LOGIC FUNCTIONS ---
  function handleKeyPress(key: string) {
    if (!focusedField) return;
    const char = isCaps ? key.toUpperCase() : key.toLowerCase();
    if (focusedField === 'first') firstName += char;
    if (focusedField === 'middle') middleName += char; // Added
    if (focusedField === 'last') lastName += char;
    if (focusedField === 'recoveryEmail') recoveryEmail += char; // Add this
  }

  function backspace() {
    if (focusedField === 'first') firstName = firstName.slice(0, -1);
    if (focusedField === 'middle') middleName = middleName.slice(0, -1); // Added
    if (focusedField === 'last') lastName = lastName.slice(0, -1);
    if (focusedField === 'recoveryEmail') recoveryEmail = recoveryEmail.slice(0, -1);
  }

  async function startFingerprintScan() {
    // Open the modal immediately regardless of bridge state so the user
    // sees feedback inside the modal rather than a jarring alert().
    scanStatus = 'idle';
    scanMessage = '';
    showBiometricModal = true;

    // Give the modal time to animate in, then check the bridge.
    await new Promise<void>((r) => setTimeout(r, 350));

    if ($bridgeStatus !== 'esp32Ready') {
      scanStatus = 'error';
      scanMessage = 'ESP32 not connected — make sure the bridge and device are running';
      return;
    }

    // Determine next free slot: MAX(fingerprint_id) + 1, or 1 if nobody enrolled yet
    const { data: slotRow } = await supabase
      .from('profiles')
      .select('fingerprint_id')
      .not('fingerprint_id', 'is', null)
      .order('fingerprint_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSlot = slotRow?.fingerprint_id != null ? (slotRow.fingerprint_id as number) + 1 : 1;

    startFingerprintEnroll(nextSlot);
  }

  // --- UPDATED SUBMIT WITH MIDDLE NAME & .COM FIX ---
  async function handleSubmit() {
    // 1. REMOVED recoveryEmail from the required check to allow "No Email" users
    if (firstName && lastName && sex) { 
      isSubmitting = true;
      
      const cleanFirst = firstName.toLowerCase().trim().replace(/\s+/g, '');
      const cleanLast = lastName.toLowerCase().trim().replace(/\s+/g, '');
      const generatedUsername = `${cleanFirst}.${cleanLast}`;
      
      // 2. FALLBACK LOGIC: Use real email if provided, otherwise use kiosk.local
      const hasRealEmail = recoveryEmail && recoveryEmail.trim().length > 0;
      const authEmail = hasRealEmail ? recoveryEmail.trim() : `${generatedUsername}@kiosk.local`; 
      
      const generatedPassword = `${generatedUsername}123`; 

      try {
        // Create Auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password: generatedPassword,
          options: {
            data: { 
              display_name: firstName,
              username: generatedUsername 
            }
          }
        });

        if (authError) throw authError;

        const monthIdx = months.indexOf(selM) + 1;
        const dbDate = `${selY}-${monthIdx.toString().padStart(2, '0')}-${selD}`;

        if (authData.user) {
          const profilePayload = {
            id: authData.user.id,
            first_name: firstName,
            middle_name: middleName || null,
            last_name: lastName,
            username: generatedUsername,
            // Store the real email if they have it, or null/fake if they don't
            recovery_email: hasRealEmail ? authEmail : null, 
            birthday: dbDate,
            sex: sex,
            fingerprint_id: fingerprintSlot,   // null if user skipped enrollment
            created_at: new Date().toISOString()
          };

          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profilePayload);

          if (profileError) throw profileError;

          onCreated(profilePayload); 
        }
      } catch (err: any) {
        alert("Registration Error: " + err.message);
      } finally {
        isSubmitting = false;
      }
    } else {
      // Updated alert to show Email is optional
      alert("Please fill in First Name, Last Name, and Gender.");
    }
  }

  // --- MOUSE DRAG LOGIC ---
  let isDragging = false;
  let startY: number;
  let scrollTop: number;

  function dragScroll(node: HTMLElement) {
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      node.style.cursor = 'grabbing';
      startY = e.pageY - node.offsetTop;
      scrollTop = node.scrollTop;
    };
    const onMouseLeave = () => { isDragging = false; node.style.cursor = 'grab'; };
    const onMouseUp = () => { isDragging = false; node.style.cursor = 'grab'; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const y = e.pageY - node.offsetTop;
      const walk = (y - startY) * 2;
      node.scrollTop = scrollTop - walk;
    };
    node.addEventListener('mousedown', onMouseDown);
    node.addEventListener('mouseleave', onMouseLeave);
    node.addEventListener('mouseup', onMouseUp);
    node.addEventListener('mousemove', onMouseMove);
    return {
      destroy() {
        node.removeEventListener('mousedown', onMouseDown);
        node.removeEventListener('mouseleave', onMouseLeave);
        node.removeEventListener('mouseup', onMouseUp);
        node.removeEventListener('mousemove', onMouseMove);
      }
    };
  }
</script>

<div
  class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] select-none overflow-hidden"
  on:click={() => focusedField = null}
  role="presentation"
>
  <button
    type="button"
    on:click={onBack}
    class="absolute top-16 left-12 text-blue-900/40 font-black tracking-widest text-sm flex items-center gap-2 z-20"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
    </svg>
    BACK TO LOGIN
  </button>

  <div class="flex-1 flex flex-col items-center justify-start pt-32 max-w-lg mx-auto w-full px-6 overflow-y-auto pb-40">

    <div class="text-center mb-12">
      <h1 class="text-6xl font-[1000] tracking-tighter leading-none mb-4 text-blue-950 uppercase">
        Create <span class="text-blue-500">Profile</span>
      </h1>
      <p class="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-[10px]">Enter your personal health details</p>
    </div>

    <div class="w-full space-y-5">
      <div class="space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">First Name</span>
        <button
          type="button"
          on:click|stopPropagation={() => focusedField = 'first'}
          class="w-full h-16 px-8 rounded-2xl bg-white border flex items-center text-lg font-bold transition-all {focusedField === 'first' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center">
            {#if focusedField === 'first'}
              <span class="text-blue-950">{firstName}</span>
              <div class="ml-0.5 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {:else}
              <span class={firstName ? 'text-blue-950' : 'text-blue-900/20'}>
                {firstName || 'Juan'}
              </span>
            {/if}
          </div>
        </button>
      </div>

      <div class="space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Middle Name (Optional)</span>
        <button type="button" on:click|stopPropagation={() => focusedField = 'middle'}
          class="w-full h-16 px-8 rounded-2xl bg-white border flex items-center text-lg font-bold transition-all {focusedField === 'middle' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}">
          <div class="flex items-center">
            {#if focusedField === 'middle'}
              <span class="text-blue-950">{middleName}</span>
              <div class="ml-0.5 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {:else}
              <span class={middleName ? 'text-blue-950' : 'text-blue-900/20'}>{middleName || 'Dela'}</span>
            {/if}
          </div>
        </button>
      </div>

      <div class="space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Last Name</span>
        <button
          type="button"
          on:click|stopPropagation={() => focusedField = 'last'}
          class="w-full h-16 px-8 rounded-2xl bg-white border flex items-center text-lg font-bold transition-all {focusedField === 'last' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center">
            {#if focusedField === 'last'}
              <span class="text-blue-950">{lastName}</span>
              <div class="ml-0.5 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {:else}
              <span class={lastName ? 'text-blue-950' : 'text-blue-900/20'}>
                {lastName || 'Cruz'}
              </span>
            {/if}
          </div>
        </button>
      </div>

      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">Birthday</span>
          <span class="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{age} YEARS OLD</span>
        </div>
        
        <div class="relative h-40 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden flex p-1 cursor-grab">
          <div class="absolute inset-y-2 left-1 right-1 bg-blue-500/5 rounded-xl pointer-events-none border border-blue-500/10 z-20"></div>
          
          <div 
            class="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-14 z-10 touch-pan-y" 
            use:scrollSelect={'m'} 
            use:dragScroll
          >
            {#each months as m}
              <div data-value={m} class="h-10 snap-center flex items-center justify-center text-xs font-black transition-all {selM === m ? 'text-blue-600 scale-125' : 'text-blue-950/20'} pointer-events-none">{m}</div>
            {/each}
          </div>

          <div 
            class="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-14 z-10 touch-pan-y" 
            use:scrollSelect={'d'} 
            use:dragScroll
          >
            {#each days as d}
              <div data-value={d} class="h-10 snap-center flex items-center justify-center text-xs font-black transition-all {selD === d ? 'text-blue-600 scale-125' : 'text-blue-950/20'} pointer-events-none">{d}</div>
            {/each}
          </div>

          <div 
            class="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide py-14 z-10 touch-pan-y" 
            use:scrollSelect={'y'} 
            use:dragScroll
          >
            {#each years as y}
              <div data-value={y} class="h-10 snap-center flex items-center justify-center text-xs font-black transition-all {selY === y ? 'text-blue-600 scale-110' : 'text-blue-950/20'} pointer-events-none">{y}</div>
            {/each}
          </div>
        </div>
      </div>

      <div class="w-full space-y-1">
        <span class="ml-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Sex / Gender</span>
        <div class="flex h-16 bg-white rounded-2xl border border-blue-100 p-1 shadow-sm gap-1">
          <button
            type="button"
            on:click={() => sex = 'Male'}
            class="flex-1 rounded-xl font-bold text-xs transition-all {sex === 'Male' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400 active:bg-blue-50'}"
          >MALE</button>
          <button
            type="button"
            on:click={() => sex = 'Female'}
            class="flex-1 rounded-xl font-bold text-xs transition-all {sex === 'Female' ? 'bg-pink-500 text-white shadow-lg' : 'text-blue-400 active:bg-pink-50'}"
          >FEMALE</button>
          <button
            type="button"
            on:click={() => sex = 'Other'}
            class="flex-1 rounded-xl font-bold text-[9px] transition-all {sex === 'Other' ? 'bg-purple-500 text-white shadow-lg' : 'text-blue-400 active:bg-purple-50'}"
          >OTHER / PREFER NOT TO SAY</button>
        </div>
      </div>

      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-400">
            Recovery Email (Personal)
          </span>
          {#if !recoveryEmail}
            <span class="text-[8px] font-black text-blue-300 bg-blue-50 px-2 py-0.5 rounded-full tracking-widest">OPTIONAL</span>
          {/if}
        </div>

        <button
          type="button"
          on:click|stopPropagation={() => focusedField = 'recoveryEmail'}
          class="w-full h-16 px-8 rounded-2xl bg-white border flex items-center text-lg font-bold transition-all {focusedField === 'recoveryEmail' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-blue-100 shadow-sm'}"
        >
          <div class="flex items-center">
            {#if focusedField === 'recoveryEmail'}
              <span class="text-blue-950">{recoveryEmail}</span>
              <div class="ml-0.5 w-0.5 h-6 bg-blue-500 animate-pulse"></div>
            {:else}
              <span class={recoveryEmail ? 'text-blue-950' : 'text-blue-900/20'}>
                {recoveryEmail || 'example@email.com'}
              </span>
            {/if}
          </div>
        </button>

        <p class="ml-4 text-[9px] font-bold uppercase tracking-tighter transition-colors {recoveryEmail ? 'text-blue-500' : 'text-red-400/60'}">
          {#if recoveryEmail}
            ✓ Link will be sent here if you forget your password
          {:else}
            ⚠ No email? Password reset will only be possible via Biometrics/Admin
          {/if}
        </p>
      </div>

      <button
        type="button"
        on:click={handleSubmit}
        disabled={isSubmitting}
        class="w-full h-20 bg-blue-950 rounded-3xl text-white font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-900/20 mt-4 active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {isSubmitting ? 'Processing...' : 'Complete Registration'}
      </button>

      <!-- Fingerprint opt-in checkbox card -->
      <button
        type="button"
        on:click={() => { addFingerprint = !addFingerprint; if (!addFingerprint) { fingerprintRegistered = false; fingerprintSlot = null; } }}
        class="w-full rounded-2xl border-2 px-5 py-4 flex items-center gap-4 text-left transition-all
          {addFingerprint ? 'bg-blue-50 border-blue-400' : 'bg-white/50 border-blue-100 active:bg-white/80'}"
      >
        <!-- Checkbox indicator -->
        <div class="w-7 h-7 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all
          {addFingerprint ? 'bg-blue-500 border-blue-500' : 'bg-white border-blue-200'}">
          {#if addFingerprint}
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"/></svg>
          {/if}
        </div>
        <!-- Label -->
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-black text-blue-950 uppercase tracking-widest leading-tight">Register Fingerprint Login</p>
          <p class="text-[10px] text-blue-900/40 font-semibold mt-0.5">Log in instantly with your fingerprint instead of a password</p>
        </div>
        <!-- Fingerprint icon -->
        <img src={fingerprintIcon} alt="" class="w-8 h-8 flex-shrink-0 transition-all
          {addFingerprint ? 'opacity-70' : 'opacity-20'}" style="filter: grayscale(100%)" />
      </button>

      <!-- Scan button — only visible when opted in -->
      {#if addFingerprint}
        <button
          type="button"
          on:click={startFingerprintScan}
          class="w-full h-16 rounded-2xl border-2 transition-all flex items-center justify-center gap-3
          {fingerprintRegistered
            ? 'bg-green-50 border-green-400'
            : 'bg-blue-500 border-blue-500 active:bg-blue-600'}"
        >
          {#if fingerprintRegistered}
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
            <span class="text-green-600 font-black uppercase tracking-widest text-[10px]">Fingerprint Linked</span>
          {:else}
            <img src={fingerprintIcon} alt="" class="w-6 h-6" style="filter: invert(1)" />
            <span class="text-white font-black uppercase tracking-widest text-[10px]">Scan Fingerprint Now</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  {#if showBiometricModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-8 bg-blue-950/40 backdrop-blur-md" transition:fade>
      <div class="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl flex flex-col items-center text-center space-y-8" transition:scale>
        <div class="relative">
          <div class="w-32 h-32 rounded-full border-4 {scanStatus === 'error' ? 'border-red-100' : 'border-blue-50'} flex items-center justify-center">
            <img 
              src={fingerprintIcon} 
              alt="" 
              class="w-16 h-16 transition-all duration-500 
              {['scanning','lift','again'].includes(scanStatus) ? 'opacity-100 scale-110 animate-pulse' : ''}
              {scanStatus === 'success' ? 'opacity-100 scale-100' : ''}
              {scanStatus === 'idle' || scanStatus === 'error' ? 'opacity-20' : ''}"
              style={scanStatus === 'success' ? 'filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%);' : 
                     ['scanning','lift','again'].includes(scanStatus) ? 'filter: brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2500%) hue-rotate(200deg) brightness(100%) contrast(105%);' : ''}
            />
          </div>
          {#if ['scanning','lift','again'].includes(scanStatus)}
            <div class="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          {/if}
        </div>
        <div class="space-y-2">
          {#if scanStatus === 'idle'}
            <h2 class="text-2xl font-black text-blue-950 uppercase tracking-tight">Starting…</h2>
            <p class="text-blue-900/40 font-bold text-xs uppercase tracking-widest">Contacting fingerprint sensor</p>
          {:else if scanStatus === 'scanning'}
            <h2 class="text-2xl font-black text-blue-950 uppercase tracking-tight">Scan 1 of 2</h2>
            <p class="text-blue-900/40 font-bold text-xs uppercase tracking-widest">{scanMessage}</p>
          {:else if scanStatus === 'lift'}
            <h2 class="text-2xl font-black text-blue-600 uppercase tracking-tight">First Scan Done</h2>
            <p class="text-blue-900/40 font-bold text-xs uppercase tracking-widest">{scanMessage}</p>
          {:else if scanStatus === 'again'}
            <h2 class="text-2xl font-black text-blue-950 uppercase tracking-tight">Scan 2 of 2</h2>
            <p class="text-blue-900/40 font-bold text-xs uppercase tracking-widest">{scanMessage}</p>
          {:else if scanStatus === 'success'}
            <h2 class="text-2xl font-black text-green-600 uppercase tracking-tight">Success!</h2>
            <p class="text-green-900/40 font-bold text-xs uppercase tracking-widest">Biometric Linked</p>
          {:else if scanStatus === 'error'}
            <h2 class="text-2xl font-black text-red-600 uppercase tracking-tight">Scan Failed</h2>
            <p class="text-red-400 font-bold text-xs uppercase tracking-widest">{scanMessage}</p>
          {/if}
        </div>
        {#if scanStatus === 'error'}
          <div class="flex gap-3">
            <button on:click={startFingerprintScan} class="px-5 py-2 rounded-full bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest">Retry</button>
            <button on:click={() => { showBiometricModal = false; cancelFingerprint(); }} class="px-5 py-2 rounded-full bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
          </div>
        {:else if scanStatus !== 'success'}
          <button on:click={() => { showBiometricModal = false; cancelFingerprint(); }} class="px-5 py-2 rounded-full bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest active:bg-red-50 active:text-red-400">
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if focusedField}
    <div
      transition:slide={{ axis: 'y', duration: 400 }}
      class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-blue-100 p-6 pb-12 z-40"
      on:click|stopPropagation
      role="none"
      on:keydown|stopPropagation={() => {}}
    >
      <div class="max-w-4xl mx-auto space-y-3">
        <div class="flex justify-center gap-2">
          {#each rows.numbers as num}
            <button type="button" on:mousedown|preventDefault={() => handleKeyPress(num)} class="h-14 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 active:bg-blue-500 active:text-white text-xl">{num}</button>
          {/each}
        </div>
        {#each rows.letters as row, i}
          <div class="flex justify-center gap-2">
            {#if i === 2}
              <button type="button" on:mousedown|preventDefault={() => isCaps = !isCaps} class="w-20 h-16 {isCaps ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} border border-blue-100 rounded-xl font-black text-xs">CAPS</button>
            {/if}
            {#each row as key}
              <button type="button" on:mousedown|preventDefault={() => handleKeyPress(key)} class="h-16 flex-1 bg-white border border-blue-50 rounded-xl font-bold text-blue-950 active:bg-blue-500 active:text-white text-xl">{isCaps ? key : key.toLowerCase()}</button>
            {/each}
            {#if i === 2}
              <button type="button" aria-label="Backspace" on:mousedown|preventDefault={backspace} class="w-20 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold flex items-center justify-center">⌫</button>
            {/if}
          </div>
        {/each}
        <div class="flex justify-center mt-4 gap-4">
          <button 
            type="button" 
            on:mousedown|preventDefault={() => handleKeyPress('@')} 
            class="w-20 h-14 bg-blue-600 text-white rounded-xl font-black text-xl shadow-lg active:scale-95 transition-transform"
          >
            @
          </button>
          <button 
            type="button" 
            on:mousedown|preventDefault={() => handleKeyPress('.')} 
            class="w-20 h-14 bg-blue-100 text-blue-600 rounded-xl font-black text-2xl active:scale-95 transition-transform"
           >
            .
          </button>

          <button 
            type="button" 
            aria-label="Spacebar" 
            on:mousedown|preventDefault={() => handleKeyPress(' ')} 
            class="{focusedField === 'recoveryEmail' ? 'w-44' : 'w-64'} h-14 bg-white border border-blue-100 rounded-xl active:bg-blue-50 transition-all"
          >
          </button>

          <button 
            type="button" 
            on:click={() => focusedField = null} 
            class="px-12 py-3 bg-blue-950 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-white shadow-md active:scale-95 transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent);
  }
  .snap-center {
    user-select: none;
    -webkit-user-select: none;
  }
</style>