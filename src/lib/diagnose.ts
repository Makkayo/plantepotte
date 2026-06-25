/**
 * Maskinvare-diagnose fra sensorhistorikken — fanger to feil som ellers ser ut
 * som «rare tall»:
 *
 *  1. Probe-helse: en jordfuktsensor som har løsnet eller mistet kontakt gir
 *     enten en railed ADC (ute av jorda) eller en helt fastlåst verdi (ekte
 *     kapasitive sensorer jitrer alltid litt — null variasjon i timevis = død).
 *
 *  2. Veke-helse: i et veke-system er klassikeren at veka mister kontakt med
 *     vannet eller jorda. Da kan du fylle reservoaret uten at jorda blir våtere.
 *     Vi sammenligner jordfukt rett før og etter en påfylling.
 *
 * Begge er BEVISST konservative — en falsk «sjekk maskinvaren»-melding er verre
 * enn å la en ekte feil ligge en dag til, så vi varsler bare på tydelige signaler.
 */

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
