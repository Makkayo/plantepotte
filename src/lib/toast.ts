import { writable } from 'svelte/store';

/**
 * Enkelt toast-system for brukervendt tilbakemelding. Mange skrive-operasjoner
 * (lys av/på, fjern plante, kalibrering …) feilet før stille (kun console.error)
 * — nå får brukeren en synlig melding via `visFeil()` / `visOk()`.
 */
export type ToastType = 'feil' | 'ok';
export interface Toast {
  id: number;
  type: ToastType;
  melding: string;
}

export const toasts = writable<Toast[]>([]);
let nesteId = 1;

function vis(type: ToastType, melding: string, varighetMs: number): void {
  const id = nesteId++;
  toasts.update((t) => [...t, { id, type, melding }]);
  setTimeout(() => lukkToast(id), varighetMs);
}

export const visFeil = (melding: string): void => vis('feil', melding, 5500);
export const visOk = (melding: string): void => vis('ok', melding, 2800);

export function lukkToast(id: number): void {
  toasts.update((t) => t.filter((x) => x.id !== id));
}
