<script lang="ts">
  import { validateEmail, validateDateOfBirth } from '../utils/validators';

  export let onBack: () => void;
  export let onSignUpSuccess: () => void;

  // Form fields
  let firstName = '';
  let lastName = '';
  let email = '';
  let birthday = '';
  let sex: 'male' | 'female' | 'other' = 'male';
  let language = 'ENGLISH';

  // Error states
  let errors: Record<string, string> = {};
  let isSubmitting = false;

  function validateForm(): boolean {
    errors = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!birthday) {
      errors.birthday = 'Date of birth is required';
    } else if (!validateDateOfBirth(birthday)) {
      errors.birthday = 'Invalid date of birth';
    }

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    isSubmitting = true;

    try {
      // TODO: Replace with actual API call to backend
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        birthday,
        sex,
        language: language.toLowerCase()
      };

      console.log('Sign up payload:', payload);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert(`Welcome, ${firstName}! Account created successfully. Please log in.`);
      onSignUpSuccess();
    } catch (error) {
      console.error('Sign up error:', error);
      alert('Sign up failed. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }

  function handleDateInput(e: Event) {
    const input = e.target as HTMLInputElement;
    birthday = input.value;
    if (errors.birthday) delete errors.birthday;
  }

  function handleTextInput(field: string, value: string) {
    if (errors[field]) delete errors[field];
  }
</script>

<div class="flex flex-col items-center justify-center h-full p-8 overflow-y-auto">
  <button
    on:click={onBack}
    class="absolute top-10 left-10 text-slate-500 hover:text-white flex items-center gap-2 text-lg"
  >
    ← BACK
  </button>

  <div class="w-full max-w-2xl">
    <h2 class="text-4xl font-bold text-white mb-3 text-center">Create Account</h2>
    <p class="text-slate-300 text-center mb-8">Fill in your information to get started</p>

    <div class="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-slate-800">
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">

        <!-- Name Fields -->
        <div class="grid grid-cols-2 gap-4">
          <!-- First Name -->
          <div>
            <label for="firstName" class="block text-sm font-medium text-slate-300 mb-2">
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              bind:value={firstName}
              on:input={() => handleTextInput('firstName', firstName)}
              class="w-full px-4 py-3 bg-slate-800 border rounded-xl text-white text-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     {errors.firstName ? 'border-red-500' : 'border-slate-700'}"
              placeholder="Juan"
            />
            {#if errors.firstName}
              <p class="text-red-400 text-sm mt-1">{errors.firstName}</p>
            {/if}
          </div>

          <!-- Last Name -->
          <div>
            <label for="lastName" class="block text-sm font-medium text-slate-300 mb-2">
              Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              bind:value={lastName}
              on:input={() => handleTextInput('lastName', lastName)}
              class="w-full px-4 py-3 bg-slate-800 border rounded-xl text-white text-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     {errors.lastName ? 'border-red-500' : 'border-slate-700'}"
              placeholder="Dela Cruz"
            />
            {#if errors.lastName}
              <p class="text-red-400 text-sm mt-1">{errors.lastName}</p>
            {/if}
          </div>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-slate-300 mb-2">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            on:input={() => handleTextInput('email', email)}
            class="w-full px-4 py-3 bg-slate-800 border rounded-xl text-white text-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   {errors.email ? 'border-red-500' : 'border-slate-700'}"
            placeholder="juan@example.com"
          />
          {#if errors.email}
            <p class="text-red-400 text-sm mt-1">{errors.email}</p>
          {/if}
        </div>

        <!-- Birthday and Gender -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Birthday -->
          <div>
            <label for="birthday" class="block text-sm font-medium text-slate-300 mb-2">
              Date of Birth *
            </label>
            <input
              id="birthday"
              type="date"
              value={birthday}
              on:change={handleDateInput}
              max={new Date().toISOString().split('T')[0]}
              class="w-full px-4 py-3 bg-slate-800 border rounded-xl text-white text-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     {errors.birthday ? 'border-red-500' : 'border-slate-700'}"
            />
            {#if errors.birthday}
              <p class="text-red-400 text-sm mt-1">{errors.birthday}</p>
            {/if}
          </div>

          <!-- Gender -->
          <div>
            <label for="sex" class="block text-sm font-medium text-slate-300 mb-2">
              Gender *
            </label>
            <select
              id="sex"
              bind:value={sex}
              class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <!-- Language Preference -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Language Preference
          </label>
          <div class="flex gap-3">
            {#each ['ENGLISH', 'FILIPINO', 'BISAYA'] as lang}
              <button
                type="button"
                on:click={() => language = lang}
                class="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all
                       {language === lang
                         ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                         : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
              >
                {lang}
              </button>
            {/each}
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                 text-white text-xl font-bold rounded-xl shadow-lg shadow-blue-900/20
                 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>

        <!-- Login Link -->
        <p class="text-center text-slate-400 text-sm">
          Already have an account?
          <button
            type="button"
            on:click={onBack}
            class="text-blue-400 hover:text-blue-300 font-medium underline"
          >
            Log In
          </button>
        </p>
      </form>
    </div>
  </div>
</div>
