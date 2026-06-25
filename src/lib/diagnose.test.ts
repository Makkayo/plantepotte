import { describe, it, expect } from 'vitest';
import { probeHelse, vekeHelse } from './diagnose';

const T0 = Date.UTC(2026, 5, 20, 8, 0, 0);
const time = 3_600_000; // 1 t

describe('probeHelse', () => {
  it('lite-data under 6 punkter', () => {
    const p = [0, 1, 2].map((i) => ({ t: T0 + i * time, raw: 2000 }));
    expect(probeHelse(p).status).toBe('lite-data');
  });

  it('frakoblet når de siste avlesningene er railed høyt', () => {
    const p = Array.from({ length: 8 }, (_, i) => ({ t: T0 + i * time, raw: 4095 }));
    expect(probeHelse(p).status).toBe('frakoblet');
  });

  it('frakoblet når railed lavt', () => {
    const p = Array.from({ length: 8 }, (_, i) => ({ t: T0 + i * time, raw: 5 }));
    expect(probeHelse(p).status).toBe('frakoblet');
  });

  it('fastlast når råverdien står helt stille i ≥12 t', () => {
    const p = Array.from({ length: 14 }, (_, i) => ({ t: T0 + i * time, raw: 2000 }));
    const f = probeHelse(p);
    expect(f.status).toBe('fastlast');
    expect(f.melding).toMatch(/stille/);
  });

  it('ok når sensoren jitrer normalt', () => {
    const p = Array.from({ length: 14 }, (_, i) => ({ t: T0 + i * time, raw: 2000 + ((i * 7) % 40) }));
    expect(probeHelse(p).status).toBe('ok');
  });

  it('hopper over null-avlesninger', () => {
    const p = [
      ...Array.from({ length: 3 }, (_, i) => ({ t: T0 + i * time, raw: null })),
      ...Array.from({ length: 14 }, (_, i) => ({ t: T0 + (i + 3) * time, raw: 2000 })),
    ];
    expect(probeHelse(p).status).toBe('fastlast');
  });
});

describe('vekeHelse', () => {
  const fylt = new Date(T0 + 10 * time);
  // jord-serie: tørr (40 %) før påfyll, og enten stiger eller ikke etter.
  function serie(etterPct: number) {
    return [
      { t: T0, pct: 42 },
      { t: T0 + 5 * time, pct: 40 }, // rett før påfyll (kl +10)
      { t: T0 + 16 * time, pct: etterPct },
      { t: T0 + 22 * time, pct: etterPct },
      { t: T0 + 28 * time, pct: etterPct },
    ];
  }

  it('ingen påfylling → ingen advarsel', () => {
    expect(vekeHelse(serie(40), null).advar).toBe(false);
  });

  it('advarer når jorda IKKE ble våtere etter påfyll', () => {
    const f = vekeHelse(serie(41), fylt);
    expect(f.advar).toBe(true);
    expect(f.melding).toMatch(/veka/);
  });

  it('ingen advarsel når jorda steg som forventet', () => {
    expect(vekeHelse(serie(72), fylt).advar).toBe(false);
  });

  it('ingen advarsel når jorda alt var fuktig før påfyll', () => {
    const vaat = [
      { t: T0, pct: 70 },
      { t: T0 + 5 * time, pct: 68 },
      { t: T0 + 16 * time, pct: 69 },
      { t: T0 + 22 * time, pct: 70 },
      { t: T0 + 28 * time, pct: 70 },
    ];
    expect(vekeHelse(vaat, fylt).advar).toBe(false);
  });

  it('ingen advarsel før veka har fått tid (for tidlig etter påfyll)', () => {
    const ferskt = [
      { t: T0, pct: 42 },
      { t: T0 + 5 * time, pct: 40 },
      { t: T0 + 12 * time, pct: 40 }, // bare ~2 t etter påfyll
      { t: T0 + 13 * time, pct: 40 },
      { t: T0 + 14 * time, pct: 40 },
    ];
    expect(vekeHelse(ferskt, fylt).advar).toBe(false);
  });
});
