import { describe, it, expect } from 'vitest';
import { beregnVpd, metningstrykk } from './klima';

describe('metningstrykk', () => {
  it('følger Tetens-formelen', () => {
    expect(metningstrykk(20)).toBeCloseTo(2.338, 2);
    expect(metningstrykk(0)).toBeCloseTo(0.611, 2);
  });
});

describe('beregnVpd', () => {
  it('regner VPD og sone for typisk inneklima', () => {
    const v = beregnVpd(21, 60);
    expect(v.kpa).toBeCloseTo(0.99, 1);
    expect(v.sone).toBe('ideelt');
  });

  it('flagger tørr norsk vinterluft som stress', () => {
    const v = beregnVpd(22, 20);
    expect(v.kpa).toBeGreaterThan(1.6);
    expect(v.sone).toBe('tort');
  });

  it('flagger svært fuktig luft (mugg-risiko)', () => {
    const v = beregnVpd(20, 95);
    expect(v.kpa).toBeLessThan(0.4);
    expect(v.sone).toBe('fuktig');
  });

  it('mangler data → ukjent', () => {
    expect(beregnVpd(null, 50).sone).toBe('ukjent');
    expect(beregnVpd(21, null).kpa).toBeNull();
  });

  it('klamper RH til 0–100', () => {
    expect(beregnVpd(20, 150).kpa).toBe(0); // 100 % RH → VPD 0
    expect(beregnVpd(20, 150).kpa).not.toBeNull();
  });
});
