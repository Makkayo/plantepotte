/**
 * Testmodus-simulator — la Markus skru på alt selv og se HVER funksjon spille seg
 * ut før potta er live, uten maskinvare.
 *
 * Ingenting skrives til databasen: sim-state ligger i localStorage per potte, og
 * detalj-visningen bruker SYNTETISKE sensoravlesninger/historikk + en syntetisk
 * plantealder når simulatoren er på. Kun aktiv i testmodus (`i_drift = false`).
 *
 * Syntese-funksjonene er de EKTE inversjonene av visnings-formlene (utils), så det
 * du ser i forhåndsvisningen er nøyaktig det live-data ville gitt.
 */
import { writable } from 'svelte/store';
import type { Potte, PotteSensorData } from './database.types';
import { VANN_TOM_MM, VANN_FULL_MM, JORD_TORR, JORD_VAT } from './utils';

export interface SimState {
  aktiv: boolean;
  plantealderDager: number;
  vannPct: number;
  jordPct: number;
  temp: number;
  rh: number;
  frakoblet: boolean;
}

export const SIM_DEFAULT: SimState = {
  aktiv: false,
  plantealderDager: 14,
  vannPct: 75,
  jordPct: 60,
  temp: 22,
  rh: 55,
  frakoblet: false,
};

const DAG = 86_400_000;
const NOKKEL = 'plantepotte:sim';

function lesLagret(): Record<string, SimState> {
  try {
    const raw = localStorage.getItem(NOKKEL);
    return raw ? (JSON.parse(raw) as Record<string, SimState>) : {};
  } catch {
    return {};
  }
}

export const simStore = writable<Record<string, SimState>>(lesLagret());
simStore.subscribe((v) => {
  try {
    localStorage.setItem(NOKKEL, JSON.stringify(v));
  } catch {
    /* privat modus e.l. — kjør videre uten å lagre */
  }
});

/** Hent sim-state for en potte (fyller inn defaults for manglende felt). */
export function hentSim(map: Record<string, SimState>, potteId: string): SimState {
  return { ...SIM_DEFAULT, ...map[potteId] };
}

/** Oppdater sim-state for en potte. */
export function settSim(potteId: string, patch: Partial<SimState>): void {
  simStore.update((m) => ({ ...m, [potteId]: { ...SIM_DEFAULT, ...m[potteId], ...patch } }));
}

// ───────────────────────── Syntese (rene, testbare) ─────────────────────────

/** Invers av `vannNivaProsent`: nivå% → laser-avstand (mm). */
export function vannAvstandFraPct(pct: number, tomMm = VANN_TOM_MM, fullMm = VANN_FULL_MM): number {
  const p = Math.max(0, Math.min(100, pct));
  return Math.round(tomMm - (p / 100) * (tomMm - fullMm));
}

/** Invers av `jordfuktProsent`: fukt% → rå ADC. */
export function jordAdcFraPct(pct: number, tort = JORD_TORR, vat = JORD_VAT): number {
  const p = Math.max(0, Math.min(100, pct));
  return Math.round(tort - (p / 100) * (tort - vat));
}

/** Syntetisk plantedato (ISO) som gir ønsket alder i dager. */
export function simPlantetAt(sim: SimState, naa = Date.now()): string {
  return new Date(naa - Math.max(0, sim.plantealderDager) * DAG).toISOString();
}

/** Bygg én syntetisk sensoravlesning fra sim-state (frakoblet → gammel avlesning). */
export function simSensor(sim: SimState, potte: Potte, naa = Date.now()): PotteSensorData {
  const tom = potte.vann_tom_mm ?? VANN_TOM_MM;
  const full = potte.vann_full_mm ?? VANN_FULL_MM;
  const adc = jordAdcFraPct(sim.jordPct);
  const alderMs = sim.frakoblet ? 45 * 60_000 : 20_000; // >15 min = offline
  return {
    id: 'sim',
    potte_id: potte.potte_id,
    temperatur: sim.temp,
    luftfuktighet: sim.rh,
    jord1: adc,
    jord2: adc,
    jord3: adc,
    jord4: adc,
    vann_avstand_mm: vannAvstandFraPct(sim.vannPct, tom, full),
    registrert_at: new Date(naa - alderMs).toISOString(),
    owner_id: null,
  };
}

// ─────────────────── Delt «effektiv»-utleding (ÉN implementasjon) ───────────────────
//
// Både PotteDetalj (detaljvisning) og PotteOversikt (kort + handlingsfeed) må
// gate-flippe (i_drift+har_sensorer) og injisere syntetiske data på nøyaktig
// samme måte når simulatoren er på — ellers kan de to visningene se ULIKE ut
// for samme kasse. Denne fantes tidligere som to nesten-like kopier, og det
// var akkurat den type duplisering som lot «🧪 Testmodus»-badgen forsvinne
// uten et eget «simulert»-merke på det ene stedet (fikset 1. juli). Nå er det
// ETT sted å endre gate-flip-oppførsel.

export interface EffektivKasse<P extends { plantet_at: string }> {
  /** Original kasse hvis sim er av; ellers gate-flippet (i_drift+har_sensorer = true). */
  potte: Potte;
  /** Ekte siste avlesning hvis sim er av; ellers syntetisk fra sim-state. */
  sensor: PotteSensorData | undefined;
  /** Ekte planter hvis sim er av; ellers samme planter med syntetisk plantet_at. */
  planter: P[];
  /** True når denne kassa faktisk viser syntetiske data akkurat nå. */
  simAktiv: boolean;
}

/**
 * Bygg «effektiv» kasse-tilstand for én potte: ekte data, eller — hvis
 * simulatoren er skrudd på for en testmodus-kasse — syntetisk forhåndsvisning.
 * `simAktiv` MÅ brukes til å vise et eget «🧪 Simulert»-merke der resultatet
 * rendres — gate-flippen alene ser ut som ekte drift.
 */
export function effektivKasse<P extends { plantet_at: string }>(
  potte: Potte,
  planter: P[],
  sensor: PotteSensorData | undefined,
  simMap: Record<string, SimState>,
): EffektivKasse<P> {
  const sim = hentSim(simMap, potte.potte_id);
  const simAktiv = sim.aktiv && !potte.i_drift;
  return {
    potte: simAktiv ? { ...potte, i_drift: true, har_sensorer: true } : potte,
    sensor: simAktiv ? simSensor(sim, potte) : sensor,
    planter: simAktiv ? planter.map((p) => ({ ...p, plantet_at: simPlantetAt(sim) })) : planter,
    simAktiv,
  };
}

export interface SimHistorikkRad {
  registrert_at: string;
  vann_avstand_mm: number;
  jord1: number;
  jord2: number;
  jord3: number;
  jord4: number;
}

/**
 * Syntetisk 7-dagers historikk: vann synker jevnt fra «nylig fylt» ned mot
 * nåverdien (gir en forbrukstrend + «holder ~X dager»), jord ligger rundt sim-
 * verdien med bittelitt jitter (så diagnose ikke feilflagger «fastlåst»).
 */
export function simHistorikk(sim: SimState, potte: Potte, naa = Date.now()): SimHistorikkRad[] {
  const tom = potte.vann_tom_mm ?? VANN_TOM_MM;
  const full = potte.vann_full_mm ?? VANN_FULL_MM;
  const startPct = Math.min(100, sim.vannPct + 35); // «fylt» for 7 dager siden
  const punkter = 7 * 4; // ~4 avlesninger/døgn
  const ut: SimHistorikkRad[] = [];
  for (let i = 0; i <= punkter; i++) {
    const frac = i / punkter;
    const t = naa - (1 - frac) * 7 * DAG;
    const vannPct = startPct + (sim.vannPct - startPct) * frac;
    const jitter = (i % 2 === 0 ? 1 : -1) * 1.5; // liten variasjon → «levende» probe
    const adc = jordAdcFraPct(Math.max(0, Math.min(100, sim.jordPct + jitter)));
    ut.push({
      registrert_at: new Date(t).toISOString(),
      vann_avstand_mm: vannAvstandFraPct(vannPct, tom, full),
      jord1: adc,
      jord2: adc,
      jord3: adc,
      jord4: adc,
    });
  }
  return ut;
}
