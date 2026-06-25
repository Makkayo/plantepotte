import { describe, it, expect } from 'vitest';
import {
  beregnDli,
  intensitetForDli,
  anbefaltInnstilling,
  MAKS_FOTOPERIODE,
  vurderLysKompatibilitet,
  vurderVannKompatibilitet,
  familieAvstand,
  vannAvstand,
} from './lys';
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

  it('lager et gyldig lys-vindu sentrert rundt 14:00', () => {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    // Standard (14 t): 07:00–21:00.
    const d = anbefaltInnstilling([]);
    expect(d.timer_on).toBe('07:00');
    expect(d.timer_off).toBe('21:00');
    // Lang fotoperiode (18 t): 05:00–23:00 — fortsatt gyldige HH:MM.
    const lang = anbefaltInnstilling([mkPlante({ dli_optimal: 40, timer_optimal: 16 })]);
    expect(lang.timer_on).toMatch(hhmm);
    expect(lang.timer_off).toMatch(hhmm);
    expect(lang.timer_on).toBe('05:00');
    expect(lang.timer_off).toBe('23:00');
  });
});

describe('familieAvstand', () => {
  it('måler avstand langs lys-aksen (lavt → høyt DLI)', () => {
    expect(familieAvstand('standard-urter', 'standard-urter')).toBe(0);
    expect(familieAvstand('salat-blader', 'standard-urter')).toBe(1); // naboer
    expect(familieAvstand('mikrogront', 'solhungrige')).toBe(4); // ytterpunktene
  });
});

describe('vurderLysKompatibilitet', () => {
  const p = (fam: Plante['lys_familie']) => mkPlante({ lys_familie: fam });

  it('tomt/én plante → perfekt', () => {
    expect(vurderLysKompatibilitet([]).niva).toBe('perfekt');
    expect(vurderLysKompatibilitet([p('standard-urter')]).niva).toBe('perfekt');
  });
  it('samme familie → perfekt', () => {
    expect(vurderLysKompatibilitet([p('salat-blader'), p('salat-blader')]).niva).toBe('perfekt');
  });
  it('nabofamilier → god', () => {
    expect(vurderLysKompatibilitet([p('salat-blader'), p('standard-urter')]).niva).toBe('god');
  });
  it('to steg unna → risikabel', () => {
    expect(vurderLysKompatibilitet([p('mikrogront'), p('salat-blader')]).niva).toBe('risikabel');
  });
  it('ytterpunkter → inkompatibel', () => {
    expect(vurderLysKompatibilitet([p('mikrogront'), p('solhungrige')]).niva).toBe('inkompatibel');
  });
});

describe('vannAvstand', () => {
  it('måler avstand langs vann-aksen', () => {
    expect(vannAvstand('medium', 'medium')).toBe(0);
    expect(vannAvstand('lav', 'hoy')).toBe(2);
  });
});

describe('vurderVannKompatibilitet', () => {
  it('≤1 plante → ok', () => {
    expect(vurderVannKompatibilitet([]).niva).toBe('ok');
    expect(vurderVannKompatibilitet([mkPlante({})]).niva).toBe('ok');
  });
  it('samme vannbehov + veke-egnet → ok', () => {
    const planter = [
      mkPlante({ vann_behov: 'medium', veke_egnet: 'bra' }),
      mkPlante({ vann_behov: 'medium', veke_egnet: 'utmerket' }),
    ];
    expect(vurderVannKompatibilitet(planter).niva).toBe('ok');
  });
  it('nabo-vannbehov (medium↔høy) → forsiktig', () => {
    const planter = [
      mkPlante({ vann_behov: 'medium', veke_egnet: 'bra' }),
      mkPlante({ vann_behov: 'hoy', veke_egnet: 'bra' }),
    ];
    expect(vurderVannKompatibilitet(planter).niva).toBe('forsiktig');
  });
  it('lav vs høy vannbehov → inkompatibel', () => {
    const planter = [
      mkPlante({ vann_behov: 'lav', veke_egnet: 'bra' }),
      mkPlante({ vann_behov: 'hoy', veke_egnet: 'bra' }),
    ];
    expect(vurderVannKompatibilitet(planter).niva).toBe('inkompatibel');
  });
  it('en «ikke anbefalt»-plante → inkompatibel, med forklaring', () => {
    const planter = [
      mkPlante({ navn: 'Sukkulent', vann_behov: 'medium', veke_egnet: 'ikke_anbefalt' }),
      mkPlante({ vann_behov: 'medium', veke_egnet: 'bra' }),
    ];
    const r = vurderVannKompatibilitet(planter);
    expect(r.niva).toBe('inkompatibel');
    expect(r.detaljer.join(' ')).toMatch(/Sukkulent/);
  });
});
