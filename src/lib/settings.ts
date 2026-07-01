/**
 * Lokale app-innstillinger som lever på enheten (localStorage), ikke i databasen.
 *
 * Foreløpig kun strømprisen som lys-strømoverslaget bruker. Den er personlig,
 * svinger med spot + nettleie, og hører ikke hjemme per kasse — så den lagres
 * globalt per nettleser. Skulle du bytte enhet er default et fornuftig anslag.
 */
import { writable } from 'svelte/store';
import { STROMPRIS_KR_KWH } from './energi';

const STROMPRIS_KEY = 'plantepotte:strompris';

/** Klamp til et rimelig område (0–20 kr/kWh) og avvis søppel. */
function gyldigPris(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
  return Math.round(n * 100) / 100;
}

function lesLagret(): number {
  try {
    const raw = localStorage.getItem(STROMPRIS_KEY);
    return gyldigPris(raw) ?? STROMPRIS_KR_KWH;
  } catch {
    return STROMPRIS_KR_KWH;
  }
}

export const strompris = writable<number>(lesLagret());

strompris.subscribe((v) => {
  try {
    localStorage.setItem(STROMPRIS_KEY, String(v));
  } catch {
    /* privat modus e.l. — kjør videre uten å lagre */
  }
});

/** Sett en ny strømpris hvis den er gyldig; returnerer true ved lagring. */
export function settStrompris(v: unknown): boolean {
  const p = gyldigPris(v);
  if (p === null) return false;
  strompris.set(p);
  return true;
}
