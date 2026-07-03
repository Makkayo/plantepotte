/**
 * Maskinvare- og jordhelse-diagnose fra sensorhistorikken — fanger feil som
 * ellers ser ut som «rare tall»:
 *
 *  1. Probe-helse: en jordfuktsensor som har løsnet eller mistet kontakt gir
 *     enten en railed ADC (kortslutning/brudd) eller en helt fastlåst verdi
 *     (ekte kapasitive sensorer jitrer alltid litt — null variasjon i timevis
 *     = død).
 *
 *  2. Probe i lufta: en probe som har falt/blitt dratt ut av jorda leser ~samme
 *     ADC som kalibreringens tørrpunkt (målt ~3190 i luft) — den railer IKKE,
 *     så den ser ut som «0 % — trenger vann» og lurer deg til å vanne i øst og
 *     vest. Avsløres ved at den ligger stabilt i luft-båndet i timevis MENS en
 *     annen probe i samme kasse er våt (delt reservoar → alle veker får vann).
 *
 *  3. Veke-helse: i et veke-system er klassikeren at veka mister kontakt med
 *     vannet eller jorda. Da kan du fylle reservoaret uten at jorda blir våtere.
 *     Vi sammenligner jordfukt rett før og etter en påfylling.
 *
 *  4. Overvåt jord: motsatt feilmodus av tørke — veka overfôrer, drenering
 *     tetter seg, eller planten drikker mindre enn veka leverer. Kort tid på
 *     >85 % er normalt (rett etter påfyll); DAGEVIS uten pause er rotråte-
 *     territorium, spesielt for planter som bare «tåler» veke.
 *
 * Alle er BEVISST konservative — en falsk «sjekk maskinvaren»-melding er verre
 * enn å la en ekte feil ligge en dag til, så vi varsler bare på tydelige signaler.
 */

import { FRISK_GRENSE, VAAT_GRENSE, jordfuktProsent } from './utils';

// ───────────────────────── Probe-helse (per jordkanal) ─────────────────────────

export type ProbeStatus = 'ok' | 'frakoblet' | 'fastlast' | 'lite-data';
export interface ProbeFunn {
  status: ProbeStatus;
  melding: string | null;
}

const RAIL_LAV = 100; // ADC ≤ dette = mistenkelig lavt (kortslutning/løs ledning)
const RAIL_HOY = 4000; // ADC ≥ dette = over tørreste reelle avlesning (probe i lufta)
const MIN_PUNKTER = 6;
const FASTLAST_TIMER = 12;

/** Diagnostiser én jordkanal ut fra rå ADC over tid. */
export function probeHelse(punkter: { t: number; raw: number | null }[]): ProbeFunn {
  const g = punkter
    .filter((p): p is { t: number; raw: number } => typeof p.raw === 'number')
    .sort((a, b) => a.t - b.t);
  if (g.length < MIN_PUNKTER) return { status: 'lite-data', melding: null };

  // Frakoblet: de siste avlesningene ligger fast i ytterkanten av ADC-området.
  const siste = g.slice(-6);
  if (siste.every((p) => p.raw <= RAIL_LAV) || siste.every((p) => p.raw >= RAIL_HOY)) {
    return {
      status: 'frakoblet',
      melding: 'gir ekstremverdi — sjekk at proben står i jorda og at ledningen sitter',
    };
  }

  // Fastlåst: helt identisk råverdi over lang tid (ekte sensorer jitrer).
  const spennT = (g[g.length - 1]!.t - g[0]!.t) / 3_600_000;
  const raws = g.map((p) => p.raw);
  if (spennT >= FASTLAST_TIMER && Math.max(...raws) === Math.min(...raws)) {
    return {
      status: 'fastlast',
      melding: `har stått helt stille i ~${Math.round(spennT)} t — proben kan ha løsnet`,
    };
  }
  return { status: 'ok', melding: null };
}

// ─────────────────────────────── Probe i lufta ─────────────────────────────────

/**
 * ADC-bånd rundt målt luft-avlesning (~3190 på breadboard 2026-06-10). En probe
 * som står i knusktørr jord kan så vidt tangere båndet — derfor krever vi i
 * tillegg at en ANNEN probe i kassa er våt: med felles reservoar og fungerende
 * veker er «én probe leser luft i 12+ timer mens naboen er våt» langt mer
 * sannsynlig som «proben står ikke i jorda» enn som ekte, ekstremt skjev fukt.
 */
export const LUFT_ADC_MIN = 3050;
export const LUFT_ADC_MAX = 3350;
const LUFT_TIMER = 12;
const LUFT_MIN_PUNKTER = 6;

export interface LuftFunn {
  /** 1-basert kanal (jord1–4) som ser ut til å stå i lufta. */
  kanal: number;
  melding: string;
}

/**
 * Finn prober som trolig står i lufta. `kanaler` er rå ADC-serier per kanal
 * (indeks 0 = jord1); inaktive kanaler har bare null-verdier og hoppes over.
 */
export function luftFunn(kanaler: { t: number; raw: number | null }[][]): LuftFunn[] {
  // Er minst én kanal våt akkurat nå? (siste gyldige avlesning per kanal)
  const sisteFukt = kanaler.map((serie) => {
    for (let i = serie.length - 1; i >= 0; i--) {
      const pct = jordfuktProsent(serie[i]!.raw);
      if (pct !== null) return pct;
    }
    return null;
  });

  const ut: LuftFunn[] = [];
  kanaler.forEach((serie, idx) => {
    const g = serie
      .filter((p): p is { t: number; raw: number } => typeof p.raw === 'number')
      .sort((a, b) => a.t - b.t);
    if (g.length < LUFT_MIN_PUNKTER) return;

    // Alle avlesninger de siste LUFT_TIMER timene må ligge i luft-båndet …
    const grense = g[g.length - 1]!.t - LUFT_TIMER * 3_600_000;
    const vindu = g.filter((p) => p.t >= grense);
    if (vindu.length < LUFT_MIN_PUNKTER) return;
    if (!vindu.every((p) => p.raw >= LUFT_ADC_MIN && p.raw <= LUFT_ADC_MAX)) return;
    // … og vinduet må faktisk dekke timene (ikke 6 punkter på 30 min).
    if ((vindu[vindu.length - 1]!.t - vindu[0]!.t) / 3_600_000 < LUFT_TIMER * 0.75) return;

    // Kryssjekk: en annen kanal er våt → veke-systemet leverer vann, denne gjør ikke.
    const annenVaat = sisteFukt.some((pct, i) => i !== idx && pct !== null && pct >= FRISK_GRENSE);
    if (!annenVaat) return;

    ut.push({
      kanal: idx + 1,
      melding:
        'leser som luft (~3200 ADC) i timevis mens en annen probe er våt — sjekk at proben faktisk står i jorda',
    });
  });
  return ut;
}

// ──────────────────────────────── Veke-helse ───────────────────────────────────

export interface VekeFunn {
  advar: boolean;
  melding: string | null;
}

const VEKE_TORR_FOR = 55; // bare relevant hvis jorda var i tørreste laget før påfyll
const VEKE_FORVENTET_STIGNING = 8; // pp jorda burde stige etter en påfylling
const VEKE_VINDU_TIMER = 36; // se etter stigning innen ~1,5 døgn
const VEKE_MIN_MODNING_TIMER = 12; // veka må ha fått tid til å virke

/**
 * Sjekk om en påfylling faktisk fuktet jorda. Krever en detektert påfylling
 * (`sistFyltAt`, fra vanntrenden) og jordfukt-serie i %.
 */
export function vekeHelse(
  jordSerie: { t: number; pct: number }[],
  sistFyltAt: Date | null,
): VekeFunn {
  if (!sistFyltAt) return { advar: false, melding: null };
  const fyltMs = sistFyltAt.getTime();
  const serie = jordSerie.filter((p) => Number.isFinite(p.pct)).sort((a, b) => a.t - b.t);

  // Jord rett FØR påfyll, og ETTER innen vinduet.
  const for_ = [...serie].reverse().find((p) => p.t <= fyltMs);
  const etter = serie.filter((p) => p.t > fyltMs && p.t <= fyltMs + VEKE_VINDU_TIMER * 3_600_000);
  if (!for_ || etter.length < 3) return { advar: false, melding: null };

  // Nok tid må ha gått til at veka rakk å virke.
  const sisteEtter = etter[etter.length - 1]!;
  if ((sisteEtter.t - fyltMs) / 3_600_000 < VEKE_MIN_MODNING_TIMER) {
    return { advar: false, melding: null };
  }
  // Bare relevant hvis jorda var tørr nok til at den BURDE stige.
  if (for_.pct >= VEKE_TORR_FOR) return { advar: false, melding: null };

  const maksEtter = Math.max(...etter.map((p) => p.pct));
  if (maksEtter - for_.pct < VEKE_FORVENTET_STIGNING) {
    return {
      advar: true,
      melding:
        'Du fylte reservoaret, men jorda ble ikke merkbart våtere. Sjekk at veka når ned i vannet og har god kontakt med jorda.',
    };
  }
  return { advar: false, melding: null };
}

// ─────────────────────────────── Overvåt jord ──────────────────────────────────

/** Så lenge må jorda ha ligget over VAAT_GRENSE uten pause før vi sier fra. */
export const OVERVAAT_TIMER = 72;
const OVERVAAT_MIN_PUNKTER = 12;

export interface OvervaatFunn {
  advar: boolean;
  melding: string | null;
}

/**
 * Har jorda stått svært våt (> VAAT_GRENSE %) sammenhengende i ≥ OVERVAAT_TIMER?
 * Krever dekning i hele vinduet (eldste punkt ≥ ~90 % av vinduet bak oss, siste
 * punkt ferskt) så et datahull ikke feiltolkes som «vått hele tiden».
 */
export function overvaatHelse(
  jordSerie: { t: number; pct: number }[],
  naa = Date.now(),
): OvervaatFunn {
  const vinduMs = OVERVAAT_TIMER * 3_600_000;
  const serie = jordSerie
    .filter((p) => Number.isFinite(p.pct) && p.t >= naa - vinduMs)
    .sort((a, b) => a.t - b.t);
  if (serie.length < OVERVAAT_MIN_PUNKTER) return { advar: false, melding: null };

  const forste = serie[0]!;
  const siste = serie[serie.length - 1]!;
  const dekkerVindu = forste.t <= naa - vinduMs * 0.9 && naa - siste.t <= 3 * 3_600_000;
  if (!dekkerVindu) return { advar: false, melding: null };

  if (serie.every((p) => p.pct > VAAT_GRENSE)) {
    return {
      advar: true,
      melding: `har stått over ${VAAT_GRENSE} % fukt i ~${Math.round(OVERVAAT_TIMER / 24)} døgn — sjekk at veka ikke overfôrer, og se/lukt etter råte`,
    };
  }
  return { advar: false, melding: null };
}
