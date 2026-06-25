import { describe, it, expect } from 'vitest';
import {
  jordfuktProsent,
  jordfuktKlasse,
  fuktStatus,
  vannNivaProsent,
  vannKlasse,
  jordSparkline,
  minutterSiden,
  pluralisering,
  blomsterkasseOppsett,
  antallPlasser,
  foranSeksjon,
  bakSeksjon,
  sensorEtikett,
  TORR_GRENSE,
  FRISK_GRENSE,
  JORD_TORR,
  JORD_VAT,
  VANN_TOM_MM,
  VANN_FULL_MM,
} from './utils';

// ============================ Jordfukt-kalibrering ============================

describe('jordfuktProsent', () => {
  it('mapper tørr-ADC til 0 % og våt-ADC til 100 %', () => {
    expect(jordfuktProsent(JORD_TORR)).toBe(0);
    expect(jordfuktProsent(JORD_VAT)).toBe(100);
  });

  it('midtpunktet blir ~50 %', () => {
    const midt = (JORD_TORR + JORD_VAT) / 2;
    expect(jordfuktProsent(midt)).toBe(50);
  });

  it('klamper utenfor kalibrert område til 0–100', () => {
    expect(jordfuktProsent(JORD_TORR + 500)).toBe(0); // tørrere enn «tørr»
    expect(jordfuktProsent(JORD_VAT - 500)).toBe(100); // våtere enn «vått»
  });

  it('returnerer null for manglende verdi', () => {
    expect(jordfuktProsent(null)).toBeNull();
    expect(jordfuktProsent(undefined)).toBeNull();
  });

  it('returnerer null ved ugyldig kalibrering (vått ≥ tørt)', () => {
    expect(jordfuktProsent(2000, 1500, 1500)).toBeNull();
    expect(jordfuktProsent(2000, 1000, 1500)).toBeNull();
  });

  it('respekterer egendefinert kalibrering', () => {
    // tørt=3000, vått=1000 → spenn 2000; raw 2000 → (3000-2000)/2000 = 50 %
    expect(jordfuktProsent(2000, 3000, 1000)).toBe(50);
  });
});

describe('jordfuktKlasse', () => {
  it('bruker samme tørr-grense som resten av appen', () => {
    expect(jordfuktKlasse(TORR_GRENSE - 1)).toBe('dry');
    expect(jordfuktKlasse(TORR_GRENSE)).toBe('ok');
  });
  it('flagger overvanning over 85 %', () => {
    expect(jordfuktKlasse(86)).toBe('wet');
    expect(jordfuktKlasse(85)).toBe('ok');
  });
  it('null → unknown', () => {
    expect(jordfuktKlasse(null)).toBe('unknown');
  });
});

describe('fuktStatus', () => {
  it('frisk ≥55, «frisk og fuktig» ≥70', () => {
    expect(fuktStatus(70).klasse).toBe('frisk');
    expect(fuktStatus(70).tekst).toBe('Frisk og fuktig');
    expect(fuktStatus(FRISK_GRENSE).klasse).toBe('frisk');
    expect(fuktStatus(FRISK_GRENSE).tekst).toBe('Fin fukt');
  });
  it('tørker mellom 35 og 54', () => {
    expect(fuktStatus(FRISK_GRENSE - 1).klasse).toBe('tørker');
    expect(fuktStatus(TORR_GRENSE).klasse).toBe('tørker');
  });
  it('tørr under 35', () => {
    expect(fuktStatus(TORR_GRENSE - 1).klasse).toBe('tørr');
    expect(fuktStatus(0).klasse).toBe('tørr');
  });
  it('null → unknown', () => {
    expect(fuktStatus(null).klasse).toBe('unknown');
  });
});

// ============================ Vannstand-kalibrering ===========================

describe('vannNivaProsent', () => {
  it('tom-avstand → 0 %, full-avstand → 100 %', () => {
    expect(vannNivaProsent(VANN_TOM_MM)).toBe(0);
    expect(vannNivaProsent(VANN_FULL_MM)).toBe(100);
  });
  it('midtpunkt → ~50 %', () => {
    expect(vannNivaProsent((VANN_TOM_MM + VANN_FULL_MM) / 2)).toBe(50);
  });
  it('klamper til 0–100', () => {
    expect(vannNivaProsent(VANN_TOM_MM + 80)).toBe(0);
    expect(vannNivaProsent(VANN_FULL_MM - 30)).toBe(100);
  });
  it('null → null', () => {
    expect(vannNivaProsent(null)).toBeNull();
    expect(vannNivaProsent(undefined)).toBeNull();
  });
  it('ugyldig kalibrering (full ≥ tom) → null', () => {
    expect(vannNivaProsent(120, 40, 200)).toBeNull();
  });
  it('respekterer per-potte kalibrering', () => {
    // tom=300, full=100 → spenn 200; avstand 200 → (300-200)/200 = 50 %
    expect(vannNivaProsent(200, 300, 100)).toBe(50);
  });
});

describe('vannKlasse', () => {
  it('lav under 20, full over 90', () => {
    expect(vannKlasse(19)).toBe('lav');
    expect(vannKlasse(20)).toBe('ok');
    expect(vannKlasse(90)).toBe('ok');
    expect(vannKlasse(91)).toBe('full');
  });
  it('null → unknown', () => {
    expect(vannKlasse(null)).toBe('unknown');
  });
});

// ============================ Sparkline (carry-forward) =======================

describe('jordSparkline', () => {
  const dagerSiden = (d: number, verdi: number) => ({
    registrert_at: new Date(Date.now() - d * 86_400_000).toISOString(),
    verdi,
  });

  it('gir alltid 7 verdier', () => {
    expect(jordSparkline([])).toHaveLength(7);
    expect(jordSparkline([dagerSiden(0.5, 60)])).toHaveLength(7);
  });

  it('tom historikk → alle 0', () => {
    expect(jordSparkline([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('én måling fyller hele linja (carry/back-fill), ingen nuller', () => {
    const ut = jordSparkline([dagerSiden(0.5, 60)]);
    expect(ut.every((v) => v === 60)).toBe(true);
  });

  it('holder forrige verdi over tomme døgn (ikke flatt snitt)', () => {
    const ut = jordSparkline([dagerSiden(2.5, 40), dagerSiden(0.5, 80)]);
    expect(ut).toHaveLength(7);
    expect(ut[0]).toBe(40); // ledende hull back-filles med første kjente
    expect(ut[6]).toBe(80); // nyeste døgn
    expect(ut[5]).toBe(40); // hullet før nyeste holder 40 (ikke snittet 60)
    expect(ut.some((v) => v === null as unknown)).toBe(false);
  });

  it('ignorerer rader uten tid eller verdi', () => {
    const ut = jordSparkline([
      { registrert_at: null, verdi: 99 },
      { registrert_at: new Date().toISOString(), verdi: null },
      dagerSiden(0.3, 45),
    ]);
    expect(ut.every((v) => v === 45)).toBe(true);
  });
});

// ============================ Diverse småhjelpere =============================

describe('minutterSiden', () => {
  it('null for manglende tid', () => {
    expect(minutterSiden(null)).toBeNull();
    expect(minutterSiden(undefined)).toBeNull();
  });
  it('regner minutter siden et tidspunkt', () => {
    expect(minutterSiden(new Date(Date.now() - 5 * 60_000).toISOString())).toBeCloseTo(5, 0);
  });
});

describe('pluralisering', () => {
  it('entall ved 1, flertall ellers', () => {
    expect(pluralisering(1, 'dag', 'dager')).toBe('1 dag');
    expect(pluralisering(2, 'dag', 'dager')).toBe('2 dager');
    expect(pluralisering(0, 'dag', 'dager')).toBe('0 dager');
  });
});

// ============================ Blomsterkasse-oppsett ==========================

describe('seksjonsnummerering', () => {
  it('foran/bak ligger fast per potte', () => {
    expect(foranSeksjon(0)).toBe(1);
    expect(bakSeksjon(0)).toBe(2);
    expect(foranSeksjon(1)).toBe(3);
    expect(bakSeksjon(1)).toBe(4);
  });
});

describe('blomsterkasseOppsett', () => {
  it('udelt potte = 1 plass (kun fremre seksjon)', () => {
    const o = blomsterkasseOppsett([false, false]);
    expect(o).toHaveLength(2);
    expect(o[0]!.delt).toBe(false);
    expect(o[0]!.plasser).toHaveLength(1);
    expect(o[0]!.plasser[0]!.seksjon).toBe(1);
    expect(o[0]!.plasser[0]!.rolle).toBe('hel');
    // Potte 2 bruker fremre seksjon 3 når udelt.
    expect(o[1]!.plasser[0]!.seksjon).toBe(3);
  });

  it('delt potte = 2 plasser (foran=oddetall, bak=partall)', () => {
    const o = blomsterkasseOppsett([true, false]);
    expect(o[0]!.delt).toBe(true);
    expect(o[0]!.plasser.map((p) => p.seksjon)).toEqual([1, 2]);
    expect(o[0]!.plasser.map((p) => p.rolle)).toEqual(['foran', 'bak']);
    expect(o[0]!.plasser.map((p) => p.etikett)).toEqual(['Foran', 'Bak']);
  });
});

describe('antallPlasser', () => {
  it('teller 1 per udelt og 2 per delt potte', () => {
    expect(antallPlasser([false, false])).toBe(2);
    expect(antallPlasser([true, false])).toBe(3);
    expect(antallPlasser([true, true])).toBe(4);
  });
});

describe('sensorEtikett', () => {
  it('udelt potte: bare «Potte N»', () => {
    expect(sensorEtikett(1, [false, false])).toBe('Potte 1');
    expect(sensorEtikett(3, [false, false])).toBe('Potte 2');
  });
  it('delt potte: «Potte N foran/bak»', () => {
    expect(sensorEtikett(1, [true, true])).toBe('Potte 1 foran');
    expect(sensorEtikett(2, [true, true])).toBe('Potte 1 bak');
    expect(sensorEtikett(3, [true, true])).toBe('Potte 2 foran');
    expect(sensorEtikett(4, [true, true])).toBe('Potte 2 bak');
  });
  it('faller tilbake til «Sensor N» utenfor oppsettet', () => {
    expect(sensorEtikett(5, [false, false])).toBe('Sensor 5');
  });
});
