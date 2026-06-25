import { describe, it, expect } from 'vitest';
import { hhmmTilMin, lysVarighetMin, lysVarighetTimer } from './tid';

describe('hhmmTilMin', () => {
  it('parser HH:MM til minutter siden midnatt', () => {
    expect(hhmmTilMin('07:30')).toBe(450);
    expect(hhmmTilMin('00:00')).toBe(0);
    expect(hhmmTilMin('23:59')).toBe(1439);
  });
  it('ugyldig/tom → 0', () => {
    expect(hhmmTilMin(null)).toBe(0);
    expect(hhmmTilMin(undefined)).toBe(0);
    expect(hhmmTilMin('')).toBe(0);
    expect(hhmmTilMin('tull')).toBe(0);
  });
});

describe('lysVarighetMin', () => {
  it('vanlig dag (on < off)', () => {
    expect(lysVarighetMin('07:00', '23:00')).toBe(16 * 60);
    expect(lysVarighetMin('08:00', '20:00')).toBe(12 * 60);
  });
  it('krysser midnatt (off < on)', () => {
    expect(lysVarighetMin('20:00', '06:00')).toBe(10 * 60);
    expect(lysVarighetMin('22:30', '06:30')).toBe(8 * 60);
  });
  it('on === off → 0 (lyset er av, som i firmwaren)', () => {
    expect(lysVarighetMin('07:00', '07:00')).toBe(0);
    expect(lysVarighetMin('00:00', '00:00')).toBe(0);
  });
  it('halv-redigert/tomt felt → 0', () => {
    expect(lysVarighetMin('07:00', '')).toBe(0);
    expect(lysVarighetMin('', '23:00')).toBe(0);
    expect(lysVarighetMin('07:00', null)).toBe(0);
  });
});

describe('lysVarighetTimer', () => {
  it('gir varighet i timer', () => {
    expect(lysVarighetTimer('07:00', '23:00')).toBe(16);
    expect(lysVarighetTimer('20:00', '06:00')).toBe(10);
    expect(lysVarighetTimer('07:00', '07:30')).toBe(0.5);
    expect(lysVarighetTimer('07:00', '07:00')).toBe(0);
  });
});
