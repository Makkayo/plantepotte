/**
 * Lokale app-innstillinger som lever på enheten (localStorage), ikke i databasen.
 *
 *  - Strømprisen som lys-strømoverslaget bruker. Personlig, svinger med spot +
 *    nettleie, og hører ikke hjemme per kasse — lagres globalt per nettleser.
 *  - Lysvariant: hvilken lys-maskinvare som henger over potta. Riggen bygges
 *    først med 12V-stripa som eies, og byttes til 24V Samsung-barene når de
 *    kommer (bestilt juli 2026). Watt (strømoverslag) og PPFD-kalibrering
 *    følger varianten, så byttet er ett trykk i lys-arket.
 *  - Målt PPFD ved 100 % intensitet, per lysvariant. Alle DLI-tall i appen
 *    hviler på denne; standarden per variant er et ANSLAG til du faktisk
 *    måler med PAR-meter/Photone og kalibrerer i lys-arket. Riggen er lik for
 *    alle kassene (samme lys, samme avstand), så én verdi per variant holder.
 *
 * Skulle du bytte enhet er defaultene fornuftige anslag.
 */
import { writable, derived } from 'svelte/store';
import { STROMPRIS_KR_KWH } from './energi';

const STROMPRIS_KEY = 'plantepotte:strompris';
const VARIANT_KEY = 'plantepotte:lysvariant';

export type LysVariant = 'strip12' | 'bar24';

export interface LysVariantInfo {
  /** Kort etikett til velger-knappen i lys-arket. */
  kortNavn: string;
  navn: string;
  /** Effekt (W) per kasse ved 100 % intensitet — driver strømoverslaget. */
  watt: number;
  /** Antatt PPFD (µmol/m²/s) ved 100 % til brukeren måler og kalibrerer. */
  standardPpfd: number;
}

export const LYS_VARIANTER: Record<LysVariant, LysVariantInfo> = {
  strip12: {
    kortNavn: '12V-strip',
    navn: '12V phyto-strip (magenta)',
    // 6×40 cm à målt 0,36 A × 12 V (potte 1 doblet juli 2026) ⇒ ~22,6 W.
    watt: 22.6,
    // Photone-måling 5. juli 2026 (rød/blå-modus + papir-diffusor) @10 cm.
    standardPpfd: 30,
  },
  bar24: {
    kortNavn: '24V-barer',
    navn: '24V Samsung LM281B-barer (hvit)',
    // 2× 25 W-barer per kasse.
    watt: 50,
    // Produsent-spec 250–350 PPFD — midtpunkt-konservativt til Photone-måling.
    standardPpfd: 250,
  },
};

/**
 * PPFD lagres per variant slik at kalibreringen for stripa overlever byttet
 * til barene (og tilbake). strip12 gjenbruker den gamle nøkkelen, så en
 * eksisterende måling fra før variant-systemet blir med videre.
 */
const PPFD_KEYS: Record<LysVariant, string> = {
  strip12: 'plantepotte:ppfd',
  bar24: 'plantepotte:ppfd:bar24',
};

function gyldigVariant(v: unknown): LysVariant | null {
  return v === 'strip12' || v === 'bar24' ? v : null;
}

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

// Modul-lokal speiling av aktiv variant — MÅ oppdateres FØR ppfdMaks settes
// ved variantbytte, ellers persisteres den nye verdien under feil nøkkel.
let aktivVariant: LysVariant = lesLagret(VARIANT_KEY, gyldigVariant, 'strip12');

/** Hvilken lys-maskinvare som er montert nå. */
export const lysVariant = writable<LysVariant>(aktivVariant);

/** Målt/antatt PPFD (µmol/m²/s) ved 100 % intensitet — grunnlaget for all DLI. */
export const ppfdMaks = writable<number>(
  lesLagret(PPFD_KEYS[aktivVariant], gyldigPpfd, LYS_VARIANTER[aktivVariant].standardPpfd),
);

ppfdMaks.subscribe((v) => {
  try {
    localStorage.setItem(PPFD_KEYS[aktivVariant], String(v));
  } catch {
    /* privat modus e.l. — kjør videre uten å lagre */
  }
});

lysVariant.subscribe((variant) => {
  const forrige = aktivVariant;
  aktivVariant = variant;
  try {
    localStorage.setItem(VARIANT_KEY, variant);
  } catch {
    /* privat modus e.l. — kjør videre uten å lagre */
  }
  // Hent variantens egen kalibrering (eller anslaget) når brukeren bytter.
  if (variant !== forrige) {
    ppfdMaks.set(lesLagret(PPFD_KEYS[variant], gyldigPpfd, LYS_VARIANTER[variant].standardPpfd));
  }
});

/** Bytt lysvariant — PPFD-kalibrering og watt følger med. */
export function settLysVariant(v: LysVariant) {
  lysVariant.set(v);
}

/** Effekt (W) ved 100 % for aktiv variant — mates inn i strømoverslaget. */
export const lysWatt = derived(lysVariant, (v) => LYS_VARIANTER[v].watt);

/** Variantens anslags-PPFD — brukes til å vise «antatt vs din måling». */
export const ppfdStandard = derived(lysVariant, (v) => LYS_VARIANTER[v].standardPpfd);

/** Sett målt PPFD hvis verdien er gyldig; returnerer true ved lagring. */
export function settPpfdMaks(v: unknown): boolean {
  const p = gyldigPpfd(v);
  if (p === null) return false;
  ppfdMaks.set(p);
  return true;
}
