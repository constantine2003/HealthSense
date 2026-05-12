import { writable, derived } from 'svelte/store';

export const kbTarget = writable<HTMLInputElement | null>(null);
export const kbVisible = derived(kbTarget, ($t) => !!$t);
