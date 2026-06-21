import { describe, it, expect } from 'vitest';
import { beregnVannTrend, dagligForbruk, type VannPunkt } from './trend';

// Standardkalibrering: tom=200mm, full=40mm → spenn 160mm. avstand = full + (1-pct/100)*spenn.
function mm(pct: number): number {
  return Math.round(40 + (1 - pct / 100) * 160);
}
function rad(dagerSiden: number, pct: number) {
  return {
    registrert_at: new Date(Date.now() - dagerSiden * 86_400_000).toISOString(),
    vann_avstand_mm: mm(pct),
  };
}

describe('dagligForbruk', () => {
  it('returnerer tomt array ved for få punkter', () => {
    expect(dagligForbruk([])).toEqual([]);
    expect(dagligForbruk([{ t: Date.now(), pct: 50 } as VannPunkt])).toEqual([]);
  });

  it('regner positivt forbruk når nivået synker i et døgn', () => {
    const naa = Date.now();
    const punkter: VannPunkt[] = [
      { t: naa - 0.9 * 86_400_000, pct: 80 },
      { t: naa - 0.1 * 86_400_000, pct: 60 },
    ];
    const ut = dagligForbruk(punkter, 1);
    // 20 pp av 5,2 L = 1,04 L
    expect(ut).toHaveLength(1);
    expect(ut[0]).toBeCloseTo(1.04, 2);
  });

  it('gir 0 på påfyll-døgn (nivået stiger)', () => {
    const naa = Date.now();
    const punkter: VannPunkt[] = [
      { t: naa - 0.9 * 86_400_000, pct: 30 },
      { t: naa - 0.1 * 86_400_000, pct: 95 },
    ];
    expect(dagligForbruk(punkter, 1)[0]).toBe(0);
  });
});

describe('beregnVannTrend — nye felt', () => {
  it('detekterer sistFyltAt ved et hopp opp > 12 pp', () => {
    const rader = [rad(3, 70), rad(2.5, 55), rad(2, 40), rad(1.5, 92), rad(1, 85), rad(0.5, 78)];
    const t = beregnVannTrend(rader, 78);
    expect(t.sistFyltAt).toBeInstanceOf(Date);
  });

  it('sistFyltAt er null uten påfylling', () => {
    const rader = [rad(3, 90), rad(2, 80), rad(1, 70), rad(0.2, 62)];
    const t = beregnVannTrend(rader, 62);
    expect(t.sistFyltAt).toBeNull();
    expect(Array.isArray(t.dagligForbruk)).toBe(true);
  });
});
