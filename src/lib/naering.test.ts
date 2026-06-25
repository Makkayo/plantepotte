import { describe, it, expect } from 'vitest';
import {
  naeringsfase,
  kasseNaering,
  dagerSiden,
  FASE2_START_DAG,
  FASE2_FULL_DAG,
} from './naering';

describe('dagerSiden', () => {
  it('null for manglende/ugyldig dato', () => {
    expect(dagerSiden(null)).toBeNull();
    expect(dagerSiden('tull')).toBeNull();
  });
  it('teller hele dager', () => {
    const naa = Date.UTC(2026, 5, 25);
    expect(dagerSiden(new Date(Date.UTC(2026, 5, 20)).toISOString(), naa)).toBe(5);
    expect(dagerSiden(new Date(naa).toISOString(), naa)).toBe(0);
  });
});

describe('naeringsfase', () => {
  it('fase 1 (rent vann) før dag 21', () => {
    const s = naeringsfase(10);
    expect(s.fase).toBe('jord');
    expect(s.handlingNaa).toBe(false);
    expect(s.melding).toMatch(/\d+ dager til/);
  });
  it('overgang til fase 2 ved dag 21 — handling nå', () => {
    expect(naeringsfase(FASE2_START_DAG).fase).toBe('start-naering');
    expect(naeringsfase(FASE2_START_DAG).handlingNaa).toBe(true);
    expect(naeringsfase(30).fase).toBe('start-naering');
  });
  it('full næring fra dag 42', () => {
    expect(naeringsfase(FASE2_FULL_DAG).fase).toBe('full-naering');
    expect(naeringsfase(100).fase).toBe('full-naering');
    expect(naeringsfase(FASE2_FULL_DAG).handlingNaa).toBe(false);
  });
});

describe('kasseNaering', () => {
  it('null uten plantedatoer', () => {
    expect(kasseNaering([])).toBeNull();
    expect(kasseNaering([null, null])).toBeNull();
  });
  it('bruker eldste planting (mest uttømt jord)', () => {
    const naa = Date.now();
    const iso = (d: number) => new Date(naa - d * 86_400_000).toISOString();
    // Eldste = 50 dager → full næring.
    expect(kasseNaering([iso(5), iso(50)], naa)!.fase).toBe('full-naering');
    // Eldste = 25 dager → start-næring.
    expect(kasseNaering([iso(25), null], naa)!.fase).toBe('start-naering');
  });
});
