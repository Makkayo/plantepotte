// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PotteKort from './PotteKort.svelte';
import type { Potte, PottePlanteFull, PotteSensorData } from '../lib/database.types';

/**
 * Komponent-tester for PotteKort — dekker akkurat de UI-reglene som logikk-
 * tester IKKE fanger, og der en ekte bug oppsto 1. juli: at «Simulert
 * forhåndsvisning» MÅ erstatte «Testmodus»-merket når kortet viser sim-data
 * (gate-flippen later `i_drift=true`, så uten dette ser sim ut som ekte drift).
 */

function lagPotte(over: Partial<Potte> = {}): Potte {
  return {
    id: '1',
    potte_id: 'potte1',
    navn: 'Testkasse',
    emoji: '🌿',
    skillevegger: [false, false],
    har_sensorer: true,
    i_drift: false,
    notater: null,
    vann_tom_mm: null,
    vann_full_mm: null,
    owner_id: null,
    opprettet_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const DAG = 86_400_000;
function lagPlante(navn: string, dagerTilHosting: number, alderDager: number): PottePlanteFull {
  return {
    id: `pp-${navn}`,
    potte_id: 'potte1',
    plante_id: `pl-${navn}`,
    seksjon: 1,
    plantet_at: new Date(Date.now() - alderDager * DAG).toISOString(),
    fjernet_at: null,
    notater: null,
    plante: {
      id: `pl-${navn}`,
      slug: navn.toLowerCase(),
      navn,
      vitenskapelig: null,
      emoji: '🌿',
      kategori: 'salat',
      lys_familie: 'salat-blader',
      dli_min: 12,
      dli_optimal: 16,
      dli_maks: 20,
      timer_optimal: 13,
      intensitet_optimal: 70,
      vann_behov: 'medium',
      veke_egnet: 'utmerket',
      dager_til_hosting: dagerTilHosting,
      hoyde_maks_cm: 20,
      vanskelighetsgrad: 'lett',
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
      opprettet_at: '2026-01-01T00:00:00Z',
    },
  };
}

// Jordfukt: JORD_TORR=3200 (0%), JORD_VAT=1140 (100%). ~2900 ADC ≈ tørr (~15%).
function lagSensor(alderMin: number, jordAdc: number): PotteSensorData {
  return {
    id: 's',
    potte_id: 'potte1',
    temperatur: 22,
    luftfuktighet: 55,
    jord1: jordAdc,
    jord2: jordAdc,
    jord3: jordAdc,
    jord4: jordAdc,
    vann_avstand_mm: 60,
    registrert_at: new Date(Date.now() - alderMin * 60_000).toISOString(),
    owner_id: null,
  };
}

const felles = {
  command: undefined,
  sensor: undefined,
  planter: [] as PottePlanteFull[],
  now: new Date(),
  onClick: () => {},
};

describe('PotteKort — merking av modus', () => {
  it('viser «Testmodus» når kassa er i testmodus og ikke simulert', () => {
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ i_drift: false }),
      simulert: false,
    });
    expect(container.textContent).toContain('Testmodus');
    expect(container.textContent).not.toContain('Simulert forhåndsvisning');
  });

  it('viser «Simulert forhåndsvisning» og IKKE «Testmodus» når simulert', () => {
    // Sim gate-flipper i_drift → true; badgen må likevel avsløre at det er sim.
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ i_drift: true }),
      simulert: true,
    });
    expect(container.textContent).toContain('Simulert forhåndsvisning');
    expect(container.textContent).not.toContain('Testmodus');
  });

  it('viser verken merke i ekte drift', () => {
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ i_drift: true }),
      simulert: false,
    });
    expect(container.textContent).not.toContain('Testmodus');
    expect(container.textContent).not.toContain('Simulert forhåndsvisning');
  });
});

describe('PotteKort — høsting', () => {
  it('viser kontinuerlig høste-tilstand for en høsteklar salat i drift', () => {
    // 60 dager gammel, høstes på 45 → høsteklar; salat = kontinuerlig.
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ i_drift: true }),
      planter: [lagPlante('Salat', 45, 60)],
    });
    expect(container.textContent).toContain('Høst etter behov');
  });

  it('viser nedtelling for en plante som ennå vokser', () => {
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ i_drift: true }),
      planter: [lagPlante('Salat', 45, 20)],
    });
    expect(container.textContent).toContain('Første høst om');
  });

  it('viser INGEN høsting i testmodus (plantedato teller ikke)', () => {
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ i_drift: false }),
      planter: [lagPlante('Salat', 45, 60)],
    });
    expect(container.textContent).not.toContain('Høst etter behov');
    expect(container.textContent).not.toContain('Første høst om');
  });
});

describe('PotteKort — frakoblet-visning', () => {
  it('fersk tørr jord viser «trenger vann»-merket', () => {
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ har_sensorer: true }),
      sensor: lagSensor(2, 2950), // 2 min gammel = tilkoblet, ~tørr jord
    });
    expect(container.textContent).toContain('Tilkoblet');
    expect(container.textContent).toContain('trenger vann');
  });

  it('frakoblet skjuler «trenger vann»-merket (bygger på gamle data) og viser «sist sett»', () => {
    const { container } = render(PotteKort, {
      ...felles,
      potte: lagPotte({ har_sensorer: true }),
      sensor: lagSensor(60, 2950), // 60 min gammel = frakoblet, samme tørre jord
    });
    expect(container.textContent).toContain('Frakoblet');
    expect(container.textContent).toContain('sist sett');
    expect(container.textContent).not.toContain('trenger vann');
  });
});
