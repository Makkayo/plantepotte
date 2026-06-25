import { describe, it, expect } from 'vitest';
import { lysEnergi, LED_WATT_100, STROMPRIS_KR_KWH } from './energi';

describe('lysEnergi', () => {
  it('full styrke 16 t: ~11,3 W snitt, ~5,4 kWh/mnd', () => {
    const e = lysEnergi(100, 16);
    expect(e.wattSnitt).toBeCloseTo(LED_WATT_100, 1);
    expect(e.kwhPerDag).toBeCloseTo(0.181, 2);
    expect(e.kwhPerManed).toBeCloseTo(5.4, 1);
    expect(e.krPerManed).toBe(Math.round(5.424 * STROMPRIS_KR_KWH));
  });

  it('halv intensitet halverer effekten', () => {
    const full = lysEnergi(100, 12);
    const halv = lysEnergi(50, 12);
    expect(halv.wattSnitt).toBeCloseTo(full.wattSnitt / 2, 1);
    expect(halv.kwhPerManed).toBeCloseTo(full.kwhPerManed / 2, 1);
  });

  it('0 % eller 0 timer → null forbruk', () => {
    expect(lysEnergi(0, 16).kwhPerManed).toBe(0);
    expect(lysEnergi(80, 0).kwhPerManed).toBe(0);
    expect(lysEnergi(0, 16).krPerManed).toBe(0);
  });

  it('klamper intensitet over 100 %', () => {
    expect(lysEnergi(150, 10).wattSnitt).toBe(lysEnergi(100, 10).wattSnitt);
  });

  it('respekterer egendefinert strømpris', () => {
    const billig = lysEnergi(100, 16, 0.5);
    const dyr = lysEnergi(100, 16, 3);
    expect(dyr.krPerManed).toBeGreaterThan(billig.krPerManed);
  });
});
