import { describe, it, expect } from 'vitest';
import { probeHelse, vekeHelse, luftFunn, overvaatHelse, OVERVAAT_TIMER } from './diagnose';

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

describe('luftFunn — probe ute av jorda', () => {
  /** Serie med `n` punkter, én per time bakover fra T0+14t, rundt gitt ADC. */
  function serie(adcRundt: number, n = 15): { t: number; raw: number | null }[] {
    return Array.from({ length: n }, (_, i) => ({
      t: T0 + i * time,
      raw: adcRundt + (i % 2 === 0 ? 15 : -15), // jitrer litt (ikke fastlåst)
    }));
  }
  const tom: { t: number; raw: number | null }[] = [];

  it('flagger probe i luft-båndet når en annen probe er våt', () => {
    const funn = luftFunn([serie(3190), serie(1400), tom, tom]); // kanal 2 ≈ 87 % våt
    expect(funn).toHaveLength(1);
    expect(funn[0]!.kanal).toBe(1);
    expect(funn[0]!.melding).toMatch(/luft/);
  });

  it('flagger IKKE når ingen annen probe er våt (kan være ekte knusktørr jord)', () => {
    expect(luftFunn([serie(3190), serie(3150), tom, tom])).toEqual([]);
  });

  it('flagger IKKE verdier utenfor luft-båndet', () => {
    expect(luftFunn([serie(2500), serie(1400), tom, tom])).toEqual([]);
  });

  it('flagger IKKE på kort vindu (nettopp tatt ut for omplanting)', () => {
    const kort = Array.from({ length: 6 }, (_, i) => ({
      t: T0 + i * 20 * 60_000, // 6 punkter på 2 timer
      raw: 3190,
    }));
    expect(luftFunn([kort, serie(1400), tom, tom])).toEqual([]);
  });
});

describe('overvaatHelse — vedvarende svært våt jord', () => {
  const naa = T0 + 100 * time;
  /** Full dekning i overvåt-vinduet: punkt annenhver time, fast fukt. */
  function vaatSerie(pct: number | ((i: number) => number)) {
    const punkter: { t: number; pct: number }[] = [];
    for (let t = OVERVAAT_TIMER; t >= 0; t -= 2) {
      const i = (OVERVAAT_TIMER - t) / 2;
      punkter.push({ t: naa - t * time, pct: typeof pct === 'function' ? pct(i) : pct });
    }
    return punkter;
  }

  it('advarer når jorda står over grensa hele vinduet', () => {
    const f = overvaatHelse(vaatSerie(91), naa);
    expect(f.advar).toBe(true);
    expect(f.melding).toMatch(/veka/);
  });

  it('advarer IKKE når fukten dupper under grensa underveis', () => {
    expect(overvaatHelse(vaatSerie((i) => (i === 10 ? 80 : 91)), naa).advar).toBe(false);
  });

  it('advarer IKKE uten dekning i hele vinduet (hull i dataene)', () => {
    const bareSiste = vaatSerie(91).filter((p) => p.t > naa - 24 * time);
    expect(overvaatHelse(bareSiste, naa).advar).toBe(false);
  });

  it('advarer IKKE på tynn serie', () => {
    expect(overvaatHelse([{ t: naa - time, pct: 95 }], naa).advar).toBe(false);
  });
});
