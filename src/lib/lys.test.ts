import { describe, it, expect } from 'vitest';
import { beregnDli, intensitetForDli, anbefaltInnstilling, MAKS_FOTOPERIODE } from './lys';
import type { Plante } from './database.types';

/** Minimal Plante-fabrikk for tester — sett bare feltene testen bryr seg om. */
function mkPlante(o: Partial<Plante>): Plante {
  return {
    id: 'x',
    slug: 'x',
    navn: 'Test',
    vitenskapelig: null,
    emoji: null,
    kategori: 'urt',
    lys_familie: 'standard-urter',
    dli_min: null,
    dli_optimal: null,
    dli_maks: null,
    timer_optimal: null,
    intensitet_optimal: null,
    vann_behov: 'medium',
    veke_egnet: 'bra',
    dager_til_hosting: null,
    hoyde_maks_cm: null,
    vanskelighetsgrad: null,
    beskrivelse: null,
    dyrking_tips: null,
    nering_notat: null,
    sa_instruks: null,
    stell_instruks: null,
    host_instruks: null,
    varianter: null,
    kilder: null,
    bilde_url: null,
    bilde_kilde: null,
    owner_id: null,
    publisert: true,
    opprettet_at: '2026-01-01',
    ...o,
  };
}

describe('beregnDli', () => {
  it('regner DLI fra intensitet og timer (200 µmol-antagelse)', () => {
    expect(beregnDli(100, 13)).toBeCloseTo(9.36, 1);
    expect(beregnDli(100, 1)).toBeCloseTo(0.72, 2);
    expect(beregnDli(0, 16)).toBe(0);
  });

  it('intensitetForDli er invers av beregnDli', () => {
    expect(intensitetForDli(9.36, 13)).toBeCloseTo(100, 0);
  });
});

describe('anbefaltInnstilling — fotoperiode-kompensasjon', () => {
  it('forlenger lystiden når 100 % ikke når DLI-målet (svakt lys)', () => {
    // Markus sine planter: lyskrevende blader, men svak strip.
    const planter = [
      mkPlante({ navn: 'Basilikum', dli_optimal: 18, timer_optimal: 14 }),
      mkPlante({ navn: 'Babyleaf', dli_optimal: 16, timer_optimal: 14 }),
      mkPlante({ navn: 'Salat', dli_optimal: 16, timer_optimal: 14 }),
      mkPlante({ navn: 'Ruccola', dli_optimal: 17, timer_optimal: 14 }),
    ];
    const a = anbefaltInnstilling(planter);

    expect(a.intensitet).toBe(100); // intensiteten i taket
    expect(a.forlenget).toBe(true); // dagen forlenget for å kompensere
    expect(a.timer).toBe(MAKS_FOTOPERIODE); // capet, siden målet er uoppnåelig
    expect(a.dliMaal).toBeCloseTo(16.5, 1); // median av 16,16,17,18
    // Forlengelsen skal faktisk gi mer DLI enn biologisk dagslengde ville.
    expect(a.dli).toBeGreaterThan(beregnDli(100, 14));
  });

  it('beholder alltid et mørke-vindu (timer ≤ 18)', () => {
    const ekstrem = [mkPlante({ dli_optimal: 40, timer_optimal: 16 })];
    const c = anbefaltInnstilling(ekstrem);
    expect(c.timer).toBe(MAKS_FOTOPERIODE);
    expect(c.timer).toBeLessThanOrEqual(18);
    // Ærlig: når ikke målet selv ved maks fotoperiode.
    expect(c.dli).toBeLessThan(c.dliMaal);
  });

  it('forlenger IKKE når lyset er sterkt nok', () => {
    const sterkNok = [mkPlante({ dli_optimal: 6, timer_optimal: 12 })];
    const b = anbefaltInnstilling(sterkNok);
    expect(b.forlenget).toBe(false);
    expect(b.intensitet).toBeLessThan(100);
    expect(b.timer).toBe(12); // biologisk optimum beholdt
  });

  it('gir trygge standardverdier uten planter', () => {
    const d = anbefaltInnstilling([]);
    expect(d.intensitet).toBe(70);
    expect(d.timer).toBe(14);
    expect(d.forlenget).toBe(false);
  });
});
