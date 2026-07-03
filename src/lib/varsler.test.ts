import { describe, it, expect } from 'vitest';
import { kasseVarsler, VANN_LAV_PCT, type KasseTilstand, type VarselHistorikkRad } from './varsler';
import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull, Plante } from './database.types';

// ───────────────────────────── Fabrikker ─────────────────────────────

function mkPotte(o: Partial<Potte> = {}): Potte {
  return {
    id: 'k1',
    potte_id: 'potte-1',
    navn: 'Kjøkkenkassa',
    emoji: null,
    skillevegger: [true, true],
    har_sensorer: true,
    i_drift: true,
    notater: null,
    vann_tom_mm: null,
    vann_full_mm: null,
    owner_id: null,
    opprettet_at: '2026-01-01',
    ...o,
  };
}

// Standardkalibrering: tom=200mm, full=40mm → avstand = 40 + (1-pct/100)*160.
function vannMm(pct: number): number {
  return Math.round(40 + (1 - pct / 100) * 160);
}
// Standard jordkalibrering: tørr=3200, våt=1140 → ADC = 3200 - pct/100*2060.
function jordAdc(pct: number): number {
  return Math.round(3200 - (pct / 100) * 2060);
}

function mkSensor(o: Partial<PotteSensorData> = {}): PotteSensorData {
  return {
    id: 's1',
    potte_id: 'potte-1',
    temperatur: 22,
    luftfuktighet: 55,
    jord1: jordAdc(60),
    jord2: jordAdc(60),
    jord3: jordAdc(60),
    jord4: jordAdc(60),
    vann_avstand_mm: vannMm(70),
    registrert_at: new Date().toISOString(),
    owner_id: null,
    ...o,
  };
}

function mkCommand(o: Partial<PotteCommand> = {}): PotteCommand {
  return {
    id: 'c1',
    potte_id: 'potte-1',
    intensitet: 70,
    timer_on: '07:00',
    timer_off: '21:00',
    plantetype: null,
    updated_at: null,
    owner_id: null,
    ...o,
  };
}

function mkPlante(o: Partial<Plante> = {}): Plante {
  return {
    id: 'p1',
    slug: 'basilikum',
    navn: 'Basilikum',
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

function mkPlanting(plante: Plante, dagerSiden: number, o: Partial<PottePlanteFull> = {}): PottePlanteFull {
  return {
    id: `pp-${plante.id}`,
    potte_id: 'potte-1',
    plante_id: plante.id,
    seksjon: 1,
    plantet_at: new Date(Date.now() - dagerSiden * 86_400_000).toISOString(),
    fjernet_at: null,
    notater: null,
    plante,
    ...o,
  };
}

/** Vannhistorikk: fra `fraPct` (for N dager siden) jevnt ned til `tilPct` nå. */
function vannHistorikk(fraPct: number, tilPct: number, dager: number, punkter = 24): VarselHistorikkRad[] {
  const naa = Date.now();
  const ut: VarselHistorikkRad[] = [];
  for (let i = 0; i <= punkter; i++) {
    const frac = i / punkter;
    ut.push({
      registrert_at: new Date(naa - (1 - frac) * dager * 86_400_000).toISOString(),
      vann_avstand_mm: vannMm(fraPct + (tilPct - fraPct) * frac),
      jord1: null,
      jord2: null,
      jord3: null,
      jord4: null,
    });
  }
  return ut;
}

/** Jordhistorikk: alle 4 kanaler på fast fukt i `timer` timer bakover fra nå. */
function jordHistorikk(pct: number, timer: number, stegTimer = 2): VarselHistorikkRad[] {
  const naa = Date.now();
  const ut: VarselHistorikkRad[] = [];
  for (let t = timer; t >= 0; t -= stegTimer) {
    // Bittelitt jitter så serien ligner ekte prober (og unngår fastlåst-diagnose).
    const adc = jordAdc(pct) + (t % 4 === 0 ? 3 : -3);
    ut.push({
      registrert_at: new Date(naa - t * 3_600_000).toISOString(),
      vann_avstand_mm: vannMm(70),
      jord1: adc,
      jord2: adc,
      jord3: adc,
      jord4: adc,
    });
  }
  return ut;
}

function tilstand(o: Partial<KasseTilstand> = {}): KasseTilstand {
  return {
    potte: mkPotte(),
    sensor: mkSensor(),
    command: mkCommand(),
    planter: [],
    historikk: [],
    ...o,
  };
}

const kategorier = (v: ReturnType<typeof kasseVarsler>) => v.map((x) => x.kategori);

// ───────────────────────────── Tester ─────────────────────────────

describe('kasseVarsler — utstyr (frakoblet)', () => {
  it('varsler frakoblet når siste avlesning er gammel, og demper sensor-varslene', () => {
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({
          registrert_at: new Date(Date.now() - 45 * 60_000).toISOString(),
          vann_avstand_mm: vannMm(70),
        }),
      }),
    );
    expect(kategorier(v)).toEqual(['utstyr']);
    expect(v[0]!.melding).toMatch(/Frakoblet/);
  });

  it('tar med siste kjente krise i frakoblet-meldingen (lavt vann)', () => {
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({
          registrert_at: new Date(Date.now() - 45 * 60_000).toISOString(),
          vann_avstand_mm: vannMm(5),
        }),
      }),
    );
    expect(v[0]!.melding).toMatch(/vannet var lavt \(5 %\)/);
  });

  it('ingen sensor-varsler for kasse uten sensorer', () => {
    const v = kasseVarsler(
      tilstand({ potte: mkPotte({ har_sensorer: false, i_drift: false }), sensor: undefined }),
    );
    expect(v).toEqual([]);
  });
});

describe('kasseVarsler — vann', () => {
  it('varsler akutt ved lavt nivå', () => {
    const v = kasseVarsler(tilstand({ sensor: mkSensor({ vann_avstand_mm: vannMm(12) }) }));
    const vann = v.find((x) => x.kategori === 'vann')!;
    expect(vann.alvor).toBe('hoy');
    expect(vann.melding).toMatch(/Vann lavt \(12 %\)/);
  });

  it('varsler på forbrukstrenden FØR nivået er akutt (holder ~2 dager)', () => {
    // 40 % igjen er over VANN_LAV_PCT, men forbruket er ~20 pp/døgn → tomt om ~2 d.
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ vann_avstand_mm: vannMm(40) }),
        historikk: vannHistorikk(100, 40, 3),
      }),
    );
    const vann = v.find((x) => x.kategori === 'vann')!;
    expect(vann.melding).toMatch(/holder bare ~2 dager/);
  });

  it('maser ikke når nivået er greit og forbruket lavt', () => {
    // 40 % igjen, ~2 pp/døgn → tomt om ~20 dager.
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ vann_avstand_mm: vannMm(40) }),
        historikk: vannHistorikk(46, 40, 3),
      }),
    );
    expect(kategorier(v)).not.toContain('vann');
  });

  it('maks ett vann-varsel: akutt nivå vinner over trenden', () => {
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ vann_avstand_mm: vannMm(10) }),
        historikk: vannHistorikk(70, 10, 3),
      }),
    );
    const vann = v.filter((x) => x.kategori === 'vann');
    expect(vann).toHaveLength(1);
    expect(vann[0]!.melding).toMatch(/Vann lavt/);
  });
});

describe('kasseVarsler — jord', () => {
  it('varsler tørr jord', () => {
    const torr = jordAdc(10);
    const v = kasseVarsler(
      tilstand({ sensor: mkSensor({ jord1: torr, jord2: torr, jord3: torr, jord4: torr }) }),
    );
    const jord = v.find((x) => x.kategori === 'jord')!;
    expect(jord.alvor).toBe('hoy');
    expect(jord.melding).toMatch(/Jord tørr/);
  });

  it('varsler vedvarende svært våt jord (rotråte-risiko)', () => {
    const vaat = jordAdc(92);
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ jord1: vaat, jord2: vaat, jord3: vaat, jord4: vaat }),
        historikk: jordHistorikk(92, 76),
      }),
    );
    const jord = v.find((x) => x.kategori === 'jord')!;
    expect(jord.melding).toMatch(/svært våt i flere døgn/);
  });

  it('nevner utsatt plante ved navn i overvåt-varselet', () => {
    const vaat = jordAdc(92);
    const rosmarin = mkPlante({ id: 'p2', navn: 'Rosmarin', veke_egnet: 'forsiktig' });
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ jord1: vaat, jord2: vaat, jord3: vaat, jord4: vaat }),
        historikk: jordHistorikk(92, 76),
        planter: [mkPlanting(rosmarin, 10)],
      }),
    );
    expect(v.find((x) => x.kategori === 'jord')!.melding).toMatch(/Rosmarin/);
  });

  it('kort tid på vått (rett etter påfyll) varsler IKKE', () => {
    const vaat = jordAdc(92);
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ jord1: vaat, jord2: vaat, jord3: vaat, jord4: vaat }),
        historikk: jordHistorikk(92, 12),
      }),
    );
    expect(kategorier(v)).not.toContain('jord');
  });
});

describe('kasseVarsler — klima', () => {
  it('varsler kulde', () => {
    const v = kasseVarsler(tilstand({ sensor: mkSensor({ temperatur: 6 }) }));
    expect(v.find((x) => x.kategori === 'klima')!.melding).toMatch(/Kaldt \(6 °C\)/);
  });

  it('varsler tørr luft via VPD når temperaturen ellers er OK', () => {
    // 28 °C / 30 % RH → VPD ≈ 2,6 kPa (sone «tort»).
    const v = kasseVarsler(tilstand({ sensor: mkSensor({ temperatur: 28, luftfuktighet: 30 }) }));
    const klima = v.find((x) => x.kategori === 'klima')!;
    expect(klima.melding).toMatch(/Tørr luft/);
  });

  it('varsler fuktig luft (muggrisiko)', () => {
    // 18 °C / 90 % RH → VPD ≈ 0,2 kPa (sone «fuktig»).
    const v = kasseVarsler(tilstand({ sensor: mkSensor({ temperatur: 18, luftfuktighet: 90 }) }));
    expect(v.find((x) => x.kategori === 'klima')!.melding).toMatch(/Fuktig luft/);
  });

  it('temperatur-ekstrem vinner over VPD (maks ett klima-varsel)', () => {
    // 35 °C / 30 % gir også skyhøy VPD — men varmen er rot-årsaken.
    const v = kasseVarsler(tilstand({ sensor: mkSensor({ temperatur: 35, luftfuktighet: 30 }) }));
    const klima = v.filter((x) => x.kategori === 'klima');
    expect(klima).toHaveLength(1);
    expect(klima[0]!.melding).toMatch(/varmt/);
  });

  it('helt vanlig inneklima gir ingen klima-varsler', () => {
    const v = kasseVarsler(tilstand({ sensor: mkSensor({ temperatur: 22, luftfuktighet: 55 }) }));
    expect(kategorier(v)).not.toContain('klima');
  });
});

describe('kasseVarsler — lys (DLI mot plantenes behov)', () => {
  const basilikum = mkPlante({ dli_min: 12, dli_optimal: 18, dli_maks: 25 });

  it('varsler når vekstlyset står av og plantene trenger lys', () => {
    const v = kasseVarsler(
      tilstand({ planter: [mkPlanting(basilikum, 10)], command: mkCommand({ intensitet: 0 }) }),
    );
    expect(v.find((x) => x.kategori === 'lys')!.melding).toMatch(/står av/);
  });

  it('varsler når lysplanen gir for lite DLI', () => {
    // 30 % × 14 t ved 200 µmol ≈ 3 DLI — langt under dli_min 12.
    const v = kasseVarsler(
      tilstand({ planter: [mkPlanting(basilikum, 10)], command: mkCommand({ intensitet: 30 }) }),
    );
    expect(v.find((x) => x.kategori === 'lys')!.melding).toMatch(/for lite lys for 1 plante/);
  });

  it('kalibrert (sterkere) PPFD kan fjerne «for lite»-varselet', () => {
    // Samme plan, men målt 500 µmol ved 100 %: 30 % × 14 t ≈ 7,6 DLI > 70 % av 12? Nei —
    // 0,7×12=8,4, så bruk 40 %: 40 % × 14 t × 500 ≈ 10,1 DLI → «akseptabel», ikke varsel.
    const t = tilstand({
      planter: [mkPlanting(basilikum, 10)],
      command: mkCommand({ intensitet: 40 }),
    });
    expect(kategorier(kasseVarsler({ ...t, ppfdMaks: 500 }))).not.toContain('lys');
    expect(kategorier(kasseVarsler({ ...t, ppfdMaks: 200 }))).toContain('lys');
  });

  it('varsler når lysplanen gir mer enn plantene tåler', () => {
    const skyggeplante = mkPlante({ dli_min: 4, dli_optimal: 6, dli_maks: 8 });
    // 100 % × 18 t ved 200 µmol ≈ 13 DLI — over 130 % av dli_maks 8.
    const v = kasseVarsler(
      tilstand({
        planter: [mkPlanting(skyggeplante, 10)],
        command: mkCommand({ intensitet: 100, timer_on: '05:00', timer_off: '23:00' }),
      }),
    );
    expect(v.find((x) => x.kategori === 'lys')!.melding).toMatch(/mer lys enn 1 plante tåler/);
  });

  it('ingen lys-varsler i testmodus eller uten planter', () => {
    const utenDrift = tilstand({
      potte: mkPotte({ i_drift: false }),
      planter: [mkPlanting(basilikum, 10)],
      command: mkCommand({ intensitet: 0 }),
    });
    expect(kategorier(kasseVarsler(utenDrift))).not.toContain('lys');
    const utenPlanter = tilstand({ command: mkCommand({ intensitet: 0 }) });
    expect(kategorier(kasseVarsler(utenPlanter))).not.toContain('lys');
  });

  it('planter uten DLI-data utløser ingen lys-varsler', () => {
    const ukjent = mkPlante({ dli_min: null, dli_optimal: null, dli_maks: null });
    const v = kasseVarsler(
      tilstand({ planter: [mkPlanting(ukjent, 10)], command: mkCommand({ intensitet: 0 }) }),
    );
    expect(kategorier(v)).not.toContain('lys');
  });
});

describe('kasseVarsler — gjøremål og gode nyheter', () => {
  it('minner om næring i overgangsvinduet (dag 21–41)', () => {
    const v = kasseVarsler(tilstand({ planter: [mkPlanting(mkPlante(), 25)] }));
    expect(v.find((x) => x.kategori === 'naering')!.melding).toMatch(/næring/);
  });

  it('melder fersk høsteklar plante, med «etter behov» for kontinuerlige', () => {
    const salat = mkPlante({ navn: 'Salat', kategori: 'salat', dager_til_hosting: 21 });
    const v = kasseVarsler(tilstand({ planter: [mkPlanting(salat, 23)] }));
    const h = v.find((x) => x.kategori === 'hosting')!;
    expect(h.alvor).toBe('positiv');
    expect(h.melding).toMatch(/Salat er høsteklar — høst etter behov/);
  });

  it('nudger ikke lenge etter at den ble høsteklar', () => {
    const salat = mkPlante({ navn: 'Salat', kategori: 'salat', dager_til_hosting: 21 });
    const v = kasseVarsler(tilstand({ planter: [mkPlanting(salat, 40)] }));
    expect(kategorier(v)).not.toContain('hosting');
  });
});

describe('kasseVarsler — uavhengige akser, ryddig feed', () => {
  it('tørr jord skjuler IKKE tørr luft (egne kategorier)', () => {
    const torr = jordAdc(10);
    const v = kasseVarsler(
      tilstand({
        sensor: mkSensor({ jord1: torr, jord2: torr, jord3: torr, jord4: torr, temperatur: 28, luftfuktighet: 30 }),
      }),
    );
    expect(kategorier(v)).toContain('jord');
    expect(kategorier(v)).toContain('klima');
  });

  it('frisk kasse i god drift gir tom feed', () => {
    const fin = mkPlante({ dli_min: 6, dli_optimal: 10, dli_maks: 20, dager_til_hosting: 60 });
    const v = kasseVarsler(
      tilstand({
        planter: [mkPlanting(fin, 10)],
        command: mkCommand({ intensitet: 70, timer_on: '07:00', timer_off: '21:00' }),
        historikk: vannHistorikk(75, 70, 3),
      }),
    );
    expect(v).toEqual([]);
  });

  it('grensen VANN_LAV_PCT er den samme som vannKlasse «lav» bruker', () => {
    expect(VANN_LAV_PCT).toBe(20);
  });
});
