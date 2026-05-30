/**
 * Lys-kompatibilitet og anbefalt innstilling for en gruppe planter i samme potte.
 *
 * Hardware-virkelighet: én LED-strip per potte, én PWM-kanal.
 * Alle planter i potten DELER samme intensitet og samme timer.
 * Vi kan derfor ikke skreddersy lys per plante — bare finne beste kompromiss.
 *
 * Konsepter:
 *  - Lys-familier: planter er gruppert etter dokumenterte DLI-krav (mol/m²/d).
 *  - Nabo-familier: tilstøtende familier er "kompatible" (mindre stress).
 *  - DLI ≈ PPFD (µmol/m²/s) × timer × 3600 / 1 000 000
 *    For vår LED-strip antar vi at intensitet 100 % på vanlig avstand
 *    gir omtrent 200 µmol/m²/s ved kanopi (typisk for en 12V phyto-strip).
 *    Dette er en ANTAGELSE — kalibrér med PAR-måler hvis du har en.
 */

import type { LysFamilieId, Plante, VekeEgnet, VannBehov } from './database.types';

/** Antatt PPFD ved 100 % intensitet, ca. 30 cm fra LED-strip. Konservativt anslag. */
export const ANTATT_PPFD_MAX = 200;

/** Beregn DLI fra intensitet (%) og timer/dag. */
export function beregnDli(intensitetProsent: number, timer: number): number {
  const ppfd = (intensitetProsent / 100) * ANTATT_PPFD_MAX;
  return (ppfd * timer * 3600) / 1_000_000;
}

/** Reverse: hvilken intensitet trengs for ønsket DLI ved gitt antall timer. */
export function intensitetForDli(dli: number, timer: number): number {
  if (timer <= 0) return 0;
  const ppfd = (dli * 1_000_000) / (timer * 3600);
  return Math.round((ppfd / ANTATT_PPFD_MAX) * 100);
}

/**
 * Sortering av familier på "lys-aksen" — fra lavest til høyest DLI-behov.
 * Brukes til å beregne avstand mellom familier (naboer = lite stress).
 * Rekkefølgen følger faktisk DLI-midtpunkt:
 *   mikrogrønt 6–12 < skygge-tolerante 8–14 < salat-blader 12–17
 *   < standard-urter 12–20 < solhungrige 18–30.
 */
const FAMILIE_AKSE: LysFamilieId[] = [
  'mikrogront',
  'skygge-tolerante',
  'salat-blader',
  'standard-urter',
  'solhungrige',
];

export function familieAvstand(a: LysFamilieId, b: LysFamilieId): number {
  return Math.abs(FAMILIE_AKSE.indexOf(a) - FAMILIE_AKSE.indexOf(b));
}

export type Kompatibilitet = 'perfekt' | 'god' | 'risikabel' | 'inkompatibel';

export interface KompatibilitetsRapport {
  niva: Kompatibilitet;
  melding: string;
  detaljer: string[];
}

/** Vurder hvor godt et sett planter passer sammen lys-messig. */
export function vurderLysKompatibilitet(planter: Plante[]): KompatibilitetsRapport {
  if (planter.length === 0) {
    return { niva: 'perfekt', melding: 'Ingen planter ennå', detaljer: [] };
  }
  if (planter.length === 1) {
    return { niva: 'perfekt', melding: 'Én plante — ingen kompromiss', detaljer: [] };
  }

  const familier = new Set(planter.map((p) => p.lys_familie));
  if (familier.size === 1) {
    return {
      niva: 'perfekt',
      melding: 'Alle planter i samme lys-familie',
      detaljer: [],
    };
  }

  // Finn maks avstand mellom noen to familier i settet
  const arr = [...familier];
  let maks = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      maks = Math.max(maks, familieAvstand(arr[i]!, arr[j]!));
    }
  }

  const detaljer = forklarAvvik(planter);

  if (maks === 1) {
    return {
      niva: 'god',
      melding: 'Naboliggende lys-familier — fungerer med kompromiss',
      detaljer,
    };
  }
  if (maks === 2) {
    return {
      niva: 'risikabel',
      melding: 'Stor forskjell i lysbehov — noen planter vil ikke trives optimalt',
      detaljer,
    };
  }
  return {
    niva: 'inkompatibel',
    melding: 'Plantene har grunnleggende ulike lysbehov',
    detaljer,
  };
}

function forklarAvvik(planter: Plante[]): string[] {
  const linjer: string[] = [];
  const dliMin = Math.min(...planter.map((p) => p.dli_min ?? p.dli_optimal ?? 0).filter((x) => x > 0));
  const dliMax = Math.max(...planter.map((p) => p.dli_maks ?? p.dli_optimal ?? 0).filter((x) => x > 0));

  if (dliMin && dliMax && dliMax - dliMin >= 8) {
    linjer.push(`DLI-spenn: ${dliMin.toFixed(0)} – ${dliMax.toFixed(0)} mol/m²/d`);
  }

  const timerVerdier = planter.map((p) => p.timer_optimal ?? 0).filter((x) => x > 0);
  if (timerVerdier.length > 0) {
    const tMin = Math.min(...timerVerdier);
    const tMax = Math.max(...timerVerdier);
    if (tMax - tMin >= 4) {
      linjer.push(`Anbefalte timer: ${tMin} – ${tMax} t`);
    }
  }

  for (const p of planter) {
    const dliOpt = p.dli_optimal ?? 0;
    if (dliOpt >= 18) {
      linjer.push(`${p.navn} trenger MASSE lys (DLI ${dliOpt}) — gir kanskje ikke frukt med kompromiss-innstilling`);
    }
  }

  return linjer;
}

/** Beregn anbefalt felles innstilling for et sett planter. */
export interface AnbefaltInnstilling {
  intensitet: number;
  timer: number;
  timer_on: string;
  timer_off: string;
  dli: number;
}

export function anbefaltInnstilling(planter: Plante[]): AnbefaltInnstilling {
  if (planter.length === 0) {
    return { intensitet: 70, timer: 14, timer_on: '07:00', timer_off: '21:00', dli: beregnDli(70, 14) };
  }

  // Bruk medianen av optimale DLI-verdier — robust mot utliggere
  const dliVerdier = planter
    .map((p) => p.dli_optimal ?? null)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const targetDli = dliVerdier.length > 0 ? medianAv(dliVerdier) : 14;

  // Bruk median av optimale timer
  const timerVerdier = planter
    .map((p) => p.timer_optimal ?? null)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const targetTimer = Math.round(timerVerdier.length > 0 ? medianAv(timerVerdier) : 14);

  let intensitet = intensitetForDli(targetDli, targetTimer);
  intensitet = Math.max(20, Math.min(100, intensitet));

  // Symmetrisk dag rundt 14:00
  const start = 14 - targetTimer / 2;
  const stopp = 14 + targetTimer / 2;
  const fmt = (h: number) => {
    const justert = ((Math.round(h * 60) % (24 * 60)) + 24 * 60) % (24 * 60);
    const t = Math.floor(justert / 60);
    const m = justert % 60;
    return `${pad(t)}:${pad(m)}`;
  };

  return {
    intensitet,
    timer: targetTimer,
    timer_on: fmt(start),
    timer_off: fmt(stopp),
    dli: beregnDli(intensitet, targetTimer),
  };
}

function medianAv(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[(n - 1) / 2]!;
  return (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// ============= VANN-KOMPATIBILITET =============

const VANN_AKSE: VannBehov[] = ['lav', 'medium', 'hoy'];

export function vannAvstand(a: VannBehov, b: VannBehov): number {
  return Math.abs(VANN_AKSE.indexOf(a) - VANN_AKSE.indexOf(b));
}

export interface VannRapport {
  niva: 'ok' | 'forsiktig' | 'inkompatibel';
  melding: string;
  detaljer: string[];
}

export function vurderVannKompatibilitet(planter: Plante[]): VannRapport {
  if (planter.length <= 1) {
    return { niva: 'ok', melding: 'OK', detaljer: [] };
  }

  const detaljer: string[] = [];
  const ikkeAnbefalt = planter.filter((p) => p.veke_egnet === 'ikke_anbefalt');
  for (const p of ikkeAnbefalt) {
    detaljer.push(`${p.navn} er ikke anbefalt for veke-system (vil sannsynligvis råtne)`);
  }

  const forsiktig = planter.filter((p) => p.veke_egnet === 'forsiktig');
  for (const p of forsiktig) {
    detaljer.push(`${p.navn} foretrekker drenert jord — kan slite med konstant fukt`);
  }

  const vannSet = new Set(planter.map((p) => p.vann_behov));
  const arr = [...vannSet];
  let maksAvstand = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      maksAvstand = Math.max(maksAvstand, vannAvstand(arr[i]!, arr[j]!));
    }
  }

  if (ikkeAnbefalt.length > 0 || maksAvstand >= 2) {
    return {
      niva: 'inkompatibel',
      melding: 'Plantene har for ulike vannbehov for samme veke-potte',
      detaljer,
    };
  }
  if (forsiktig.length > 0 || maksAvstand === 1) {
    return {
      niva: 'forsiktig',
      melding: 'Litt forskjell i vannbehov — fungerer som regel, men hold øye med fuktsensorer',
      detaljer,
    };
  }
  return { niva: 'ok', melding: 'Samme vannbehov — fungerer godt sammen', detaljer };
}

// ============= ENKLE UTILS =============

export function vekeEgnetTekst(v: VekeEgnet): string {
  switch (v) {
    case 'utmerket':
      return 'Trives i selvvannende potte';
    case 'bra':
      return 'Fungerer bra';
    case 'forsiktig':
      return 'Tåler det, men ikke ideelt';
    case 'ikke_anbefalt':
      return 'Vil sannsynligvis råtne';
  }
}

export function vekeEgnetFarge(v: VekeEgnet): string {
  switch (v) {
    case 'utmerket':
      return 'text-leaf';
    case 'bra':
      return 'text-leaf';
    case 'forsiktig':
      return 'text-sun';
    case 'ikke_anbefalt':
      return 'text-rose';
  }
}

export function vannBehovTekst(v: VannBehov): string {
  switch (v) {
    case 'hoy':
      return 'Mye vann';
    case 'medium':
      return 'Moderat';
    case 'lav':
      return 'Lite vann';
  }
}
