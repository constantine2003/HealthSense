<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { onDestroy } from 'svelte';
  import {
    startFingerprintEnroll,
    cancelFingerprint,
    fingerprintEvent,
    bridgeStatus,
  } from '../stores/esp32Store';
  import { isOnline, BRIDGE_BASE } from '../stores/connectivity';
  import { createAccount } from '../db/index';
  import fingerprintIcon from '../../assets/fingerprint-svgrepo-com.svg';

  const bridgeUrl = BRIDGE_BASE;
  const bridgeToken = import.meta.env.VITE_HS_TOKEN ?? '';

  export let onBack: () => void;
  export let onCreated: (user: any) => void;

  // --- FORM STATE ---
  let firstName = "";
  let middleName = "";
  let lastName = "";
  let sex: 'Male' | 'Female' | 'Other' | '' = '';
  let isSubmitting = false;
  let recoveryEmail = "";
  let password = "";
  let confirmPassword = "";
  let showPassword = false;
  let showConfirmPassword = false;

  // --- BIRTHDAY DATE PICKER ---
  let birthDateInput = '1990-01-01';
  let datePickerRef: HTMLInputElement;

  $: age = (() => {
    if (!birthDateInput) return 0;
    const [y, m, d] = birthDateInput.split('-').map(Number);
    const birthDate = new Date(y, m - 1, d);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const mo = today.getMonth() - birthDate.getMonth();
    if (mo < 0 || (mo === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
    return calculatedAge >= 0 ? calculatedAge : 0;
  })();

  $: birthdayDisplay = (() => {
    if (!birthDateInput) return 'Select a date';
    const [y, m, d] = birthDateInput.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[m - 1]} ${d}, ${y}`;
  })();

  // --- SUCCESS MODAL ---
  let createdProfile: any = null;

  // --- BIOMETRIC MODAL STATE ---
  let showBiometricModal = false;
  let scanStatus: 'idle' | 'scanning' | 'lift' | 'again' | 'success' | 'error' = 'idle';
  let scanMessage = "";
  let fingerprintRegistered = false;
  let fingerprintSlot: number | null = null;

  // Explicit store subscription — more reliable than $: reactive blocks
  // because Svelte will never batch-suppress a direct subscriber callback.
  // Clear any stale fingerprint event from a previous user's session so the
  // button does not show "Fingerprint Registered" on fresh mount.
  fingerprintEvent.set(null);

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

    // Determine next free slot via bridge API (no direct Supabase call)
    try {
      const res = await fetch(`${bridgeUrl}/api/profiles/next-fingerprint-slot`, {
        headers: { 'x-hs-token': bridgeToken }
      });
      const data = await res.json();
      var nextSlot = data.slot ?? 1;
    } catch {
      var nextSlot = 1;
    }

    startFingerprintEnroll(nextSlot);
  }

  async function handleSubmit() {
    if (!firstName || !lastName || !sex) {
      alert("Please fill in First Name, Last Name, and Gender.");
      return;
    }
    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (!fingerprintRegistered) {
      alert("Fingerprint registration is required. Please scan your fingerprint to continue.");
      return;
    }

    isSubmitting = true;

    const dbDate = birthDateInput; // already in YYYY-MM-DD format

    try {
      const profile = await createAccount({
        firstName,
        middleName,
        lastName,
        sex,
        birthday: dbDate,
        recoveryEmail,
        fingerprintSlot,
        password,
      });

      if (!$isOnline) {
        alert("Account created in offline mode. It will sync to the cloud when internet is restored.");
      }

      createdProfile = profile;
    } catch (err: any) {
      alert("Registration Error: " + err.message);
    } finally {
      isSubmitting = false;
    }
  }


</script>

<div
  class="relative h-full w-full flex flex-col bg-linear-to-b from-[#f0f7ff] to-[#9fc5f8] overflow-hidden"
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
      <p class="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-sm">Enter your personal health details</p>
    </div>

    <div class="w-full space-y-5">
      <div class="space-y-1">
        <span class="ml-4 text-sm font-black uppercase tracking-widest text-blue-400">First Name</span>
        <input
          type="text"
          bind:value={firstName}
          placeholder="Juan"
          autocomplete="given-name"
          class="w-full h-16 px-8 rounded-2xl bg-white border border-blue-100 shadow-sm text-lg font-bold text-blue-950 placeholder:text-blue-900/20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
      </div>

      <div class="space-y-1">
        <span class="ml-4 text-sm font-black uppercase tracking-widest text-blue-400">Middle Name (Optional)</span>
        <input
          type="text"
          bind:value={middleName}
          placeholder="Dela"
          autocomplete="additional-name"
          class="w-full h-16 px-8 rounded-2xl bg-white border border-blue-100 shadow-sm text-lg font-bold text-blue-950 placeholder:text-blue-900/20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
      </div>

      <div class="space-y-1">
        <span class="ml-4 text-sm font-black uppercase tracking-widest text-blue-400">Last Name</span>
        <input
          type="text"
          bind:value={lastName}
          placeholder="Cruz"
          autocomplete="family-name"
          class="w-full h-16 px-8 rounded-2xl bg-white border border-blue-100 shadow-sm text-lg font-bold text-blue-950 placeholder:text-blue-900/20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
      </div>

      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-sm font-black uppercase tracking-widest text-blue-400">Birthday</span>
          <span class="text-xs font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{age} YEARS OLD</span>
        </div>

        <!-- Hidden native date input — triggered by the button below -->
        <input
          type="date"
          bind:this={datePickerRef}
          bind:value={birthDateInput}
          max={new Date().toISOString().slice(0, 10)}
          min="1900-01-01"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
        />

        <button
          type="button"
          on:click={() => datePickerRef.showPicker?.() ?? datePickerRef.click()}
          class="w-full h-16 px-8 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center justify-between text-blue-950 font-bold active:border-blue-500 transition-all"
        >
          <span class="text-lg">{birthdayDisplay}</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </button>
      </div>

      <div class="w-full space-y-1">
        <span class="ml-4 text-sm font-black uppercase tracking-widest text-blue-400">Sex / Gender</span>
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
            class="flex-1 rounded-xl font-bold text-xs transition-all {sex === 'Other' ? 'bg-purple-500 text-white shadow-lg' : 'text-blue-400 active:bg-purple-50'}"
          >OTHER / PREFER NOT TO SAY</button>
        </div>
      </div>

      <!-- Password -->
      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-sm font-black uppercase tracking-widest text-blue-400">Password</span>
          <span class="text-xs font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full tracking-widest">REQUIRED</span>
        </div>
        <div class="relative w-full h-16">
          <input
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Enter password"
            autocomplete="new-password"
            class="w-full h-full px-8 pr-24 rounded-2xl bg-white border border-blue-100 shadow-sm text-lg font-bold text-blue-950 placeholder:text-blue-900/20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          <button type="button" on:click|stopPropagation={() => showPassword = !showPassword}
            class="absolute right-6 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-black uppercase tracking-widest">
            {showPassword ? 'HIDE' : 'SHOW'}
          </button>
        </div>
      </div>

      <!-- Confirm Password -->
      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-sm font-black uppercase tracking-widest text-blue-400">Confirm Password</span>
          <span class="text-xs font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full tracking-widest">REQUIRED</span>
        </div>
        <div class="relative w-full h-16">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={confirmPassword}
            placeholder="Re-enter password"
            autocomplete="new-password"
            class="w-full h-full px-8 pr-24 rounded-2xl bg-white border shadow-sm text-lg font-bold text-blue-950 placeholder:text-blue-900/20 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all
              {confirmPassword && confirmPassword !== password ? 'border-red-300 focus:border-red-400' : 'border-blue-100 focus:border-blue-500'}"
          />
          <button type="button" on:click|stopPropagation={() => showConfirmPassword = !showConfirmPassword}
            class="absolute right-6 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-black uppercase tracking-widest">
            {showConfirmPassword ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        {#if confirmPassword && confirmPassword !== password}
          <p class="ml-4 text-xs font-bold uppercase tracking-tighter text-red-400">⚠ Passwords do not match</p>
        {:else if confirmPassword && confirmPassword === password}
          <p class="ml-4 text-xs font-bold uppercase tracking-tighter text-green-500">✓ Passwords match</p>
        {/if}
      </div>

      <!-- Recovery Email -->
      <div class="w-full space-y-1">
        <div class="flex justify-between items-center px-4">
          <span class="text-sm font-black uppercase tracking-widest text-blue-400">
            Recovery Email (Personal)
          </span>
          {#if !recoveryEmail}
            <span class="text-xs font-black text-blue-300 bg-blue-50 px-2 py-0.5 rounded-full tracking-widest">OPTIONAL</span>
          {/if}
        </div>

        <input
          type="email"
          bind:value={recoveryEmail}
          placeholder="example@email.com"
          autocomplete="email"
          class="w-full h-16 px-8 rounded-2xl bg-white border border-blue-100 shadow-sm text-lg font-bold text-blue-950 placeholder:text-blue-900/20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />

        <p class="ml-4 text-xs font-bold uppercase tracking-tighter transition-colors {recoveryEmail ? 'text-blue-500' : 'text-red-400/60'}">
          {#if recoveryEmail}
            ✓ Link will be sent here if you forget your password
          {:else}
            ⚠ No email? Password reset will only be possible via Biometrics/Admin
          {/if}
        </p>
      </div>

      <!-- Fingerprint — mandatory -->
      <div class="w-full space-y-3">
        <div class="flex justify-between items-center px-4">
          <span class="text-sm font-black uppercase tracking-widest text-blue-400">Fingerprint Registration</span>
          <span class="text-xs font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full tracking-widest">REQUIRED</span>
        </div>

        <button
          type="button"
          on:click={startFingerprintScan}
          class="w-full h-20 rounded-2xl border-2 transition-all flex items-center justify-center gap-4
          {fingerprintRegistered
            ? 'bg-green-50 border-green-400'
            : 'bg-blue-500 border-blue-500 active:bg-blue-600'}"
        >
          {#if fingerprintRegistered}
            <svg class="w-7 h-7 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
            <div class="text-left">
              <p class="text-green-600 font-black uppercase tracking-widest text-sm">Fingerprint Registered</p>
              <p class="text-green-500/70 text-xs font-semibold mt-0.5">Tap to re-scan</p>
            </div>
          {:else}
            <img src={fingerprintIcon} alt="" class="w-8 h-8" style="filter: invert(1)" />
            <div class="text-left">
              <p class="text-white font-black uppercase tracking-widest text-sm">Scan Fingerprint</p>
              <p class="text-white/70 text-xs font-semibold mt-0.5">Required to complete registration</p>
            </div>
          {/if}
        </button>
      </div>

      <!-- Submit button — at the very bottom -->
      <button
        type="button"
        on:click={handleSubmit}
        disabled={isSubmitting || !fingerprintRegistered}
        class="w-full h-20 bg-blue-950 rounded-3xl text-white font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-900/20 mt-4 active:scale-[0.98] transition-transform disabled:opacity-40"
      >
        {isSubmitting ? 'Processing...' : 'Complete Registration'}
      </button>
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
            <button on:click={startFingerprintScan} class="px-5 py-2 rounded-full bg-blue-600 text-white font-black uppercase text-sm tracking-widest">Retry</button>
            <button on:click={() => { showBiometricModal = false; cancelFingerprint(); }} class="px-5 py-2 rounded-full bg-slate-100 text-slate-400 font-black uppercase text-sm tracking-widest">Cancel</button>
          </div>
        {:else if scanStatus !== 'success'}
          <button on:click={() => { showBiometricModal = false; cancelFingerprint(); }} class="px-5 py-2 rounded-full bg-slate-100 text-slate-400 font-black uppercase text-sm tracking-widest active:bg-red-50 active:text-red-400">
            Cancel
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ── Account Created Success Modal ───────────────────────────────────── -->
  {#if createdProfile}
    <div
      class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      transition:fade={{ duration: 200 }}
    >
      <div
        class="bg-white rounded-3xl shadow-2xl px-10 py-10 flex flex-col items-center gap-5 max-w-sm w-full mx-4"
        transition:scale={{ duration: 250, start: 0.85 }}
      >
        <!-- Check icon -->
        <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-9 h-9 text-green-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight text-center">
          Account Created!
        </h2>

        <p class="text-slate-500 text-sm text-center">
          Welcome, <span class="font-bold text-slate-700">{createdProfile.first_name} {createdProfile.last_name}</span>!
        </p>

        <!-- Username highlight box -->
        <div class="w-full bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4 flex flex-col items-center gap-1">
          <span class="text-xs font-bold uppercase tracking-widest text-blue-400">Your Username</span>
          <span class="text-2xl font-black text-blue-700 tracking-tight">{createdProfile.username}</span>
        </div>

        <p class="text-xs text-slate-400 text-center leading-snug">
          Remember your username — you'll need it to log in.
        </p>

        <button
          on:click={() => { const p = createdProfile; createdProfile = null; onCreated(p); }}
          class="w-full py-3 rounded-full bg-blue-600 text-white font-black uppercase text-sm tracking-widest active:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  {/if}

</div>
