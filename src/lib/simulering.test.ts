import { describe, it, expect } from 'vitest';
import { vannAvstandFraPct, jordAdcFraPct, simSensor, simHistorikk, simPlantetAt, SIM_DEFAULT } from './simulering';
import { vannNivaProsent, jordfuktProsent } from './utils';
import type { Potte } from './database.types';

const potte = { potte_id: 'sim1', vann_tom_mm: null, vann_full_mm: null } as Potte;
const naa = Date.parse('2026-07-01T12:00:00Z');

describe('inversjoner round-tripper med visnings-formlene', () => {
  it('vann: pct → avstand → pct gir samme tall', () => {
    for (const pct of [0, 12, 50, 75, 100]) {
      expect(vannNivaProsent(vannAvstandFraPct(pct))).toBe(pct);
    }
  });

  it('jord: pct → adc → pct gir (nesten) samme tall', () => {
    for (const pct of [0, 20, 60, 100]) {
      expect(jordfuktProsent(jordAdcFraPct(pct))).toBeCloseTo(pct, 0);
    }
  });
});

describe('simSensor', () => {
  it('speiler sim-verdiene og markerer frakoblet som gammel avlesning', () => {
    const sim = { ...SIM_DEFAULT, vannPct: 40, jordPct: 30, temp: 24, rh: 60, frakoblet: false };
    const s = simSensor(sim, potte, naa);
    expect(s.temperatur).toBe(24);
    expect(s.luftfuktighet).toBe(60);
    expect(vannNivaProsent(s.vann_avstand_mm)).toBe(40);
    expect(jordfuktProsent(s.jord1)).toBeCloseTo(30, 0);
    // Tilkoblet: fersk avlesning (< 15 min).
    expect(naa - Date.parse(s.registrert_at!)).toBeLessThan(15 * 60_000);
  });

  it('frakoblet gir en avlesning eldre enn offline-grensa', () => {
    const s = simSensor({ ...SIM_DEFAULT, frakoblet: true }, potte, naa);
    expect(naa - Date.parse(s.registrert_at!)).toBeGreaterThan(15 * 60_000);
  });
});

describe('simHistorikk', () => {
  it('lager en synkende vann-serie (forbruk) over 7 dager', () => {
    const rader = simHistorikk({ ...SIM_DEFAULT, vannPct: 40 }, potte, naa);
    expect(rader.length).toBeGreaterThan(20);
    const forstePct = vannNivaProsent(rader[0]!.vann_avstand_mm)!;
    const sistePct = vannNivaProsent(rader[rader.length - 1]!.vann_avstand_mm)!;
    expect(forstePct).toBeGreaterThan(sistePct); // synker mot nåverdien
    expect(sistePct).toBe(40);
  });

  it('jord jitrer (ikke fastlåst) så diagnose ikke feilflagger', () => {
    const rader = simHistorikk({ ...SIM_DEFAULT, jordPct: 60 }, potte, naa);
    const unike = new Set(rader.map((r) => r.jord1));
    expect(unike.size).toBeGreaterThan(1);
  });
});

describe('simPlantetAt', () => {
  it('gir en dato som tilsvarer ønsket alder', () => {
    const iso = simPlantetAt({ ...SIM_DEFAULT, plantealderDager: 30 }, naa);
    const alderDager = Math.round((naa - Date.parse(iso)) / 86_400_000);
    expect(alderDager).toBe(30);
  });
});
