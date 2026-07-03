/**
 * Lokale app-innstillinger som lever på enheten (localStorage), ikke i databasen.
 *
 * To verdier foreløpig:
 *  - Strømprisen som lys-strømoverslaget bruker. Personlig, svinger med spot +
 *    nettleie, og hører ikke hjemme per kasse — lagres globalt per nettleser.
 *  - Målt PPFD ved 100 % intensitet. Alle DLI-tall i appen hviler på denne;
 *    standarden (200 µmol/m²/s) er et ANSLAG til du faktisk måler med
 *    PAR-meter/Photone og kalibrerer i lys-arket. Riggen er lik for alle
 *    kassene (samme strip, samme avstand), så én global verdi holder.
 *
 * Skulle du bytte enhet er defaultene fornuftige anslag.
 */
import { writable } from 'svelte/store';
import { STROMPRIS_KR_KWH } from './energi';
import { ANTATT_PPFD_MAX } from './lys';

const STROMPRIS_KEY = 'plantepotte:strompris';
const PPFD_KEY = 'plantepotte:ppfd';

/** Klamp til et rimelig område (0–20 kr/kWh) og avvis søppel. */
function gyldigPris(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Gyldig PPFD-måling: 20–1500 µmol/m²/s. Under 20 er ikke et vekstlys, over
 * 1500 er sterkere enn sol i sør — begge er nesten sikkert tastefeil.
 */
function gyldigPpfd(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  if (!Number.isFinite(n) || n < 20 || n > 1500) return null;
  return Math.round(n);
}

function lesLagret<T>(key: string, valider: (v: unknown) => T | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return (raw !== null ? valider(raw) : null) ?? fallback;
  } catch {
    return fallback;
  }
}

export const strompris = writable<number>(lesLagret(STROMPRIS_KEY, gyldigPris, STROMPRIS_KR_KWH));

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

/** Målt/antatt PPFD (µmol/m²/s) ved 100 % intensitet — grunnlaget for all DLI. */
export const ppfdMaks = writable<number>(lesLagret(PPFD_KEY, gyldigPpfd, ANTATT_PPFD_MAX));

ppfdMaks.subscribe((v) => {
  try {
    localStorage.setItem(PPFD_KEY, String(v));
  } catch {
    /* privat modus e.l. — kjør videre uten å lagre */
  }
});

/** Sett målt PPFD hvis verdien er gyldig; returnerer true ved lagring. */
export function settPpfdMaks(v: unknown): boolean {
  const p = gyldigPpfd(v);
  if (p === null) return false;
  ppfdMaks.set(p);
  return true;
}
