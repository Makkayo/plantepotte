import { describe, it, expect } from 'vitest';
import { hostingStatus, mestAktuelleHosting, erKontinuerlig } from './hosting';

const DAG = 86_400_000;
const naa = Date.parse('2026-07-01T12:00:00Z');
const forDager = (d: number) => new Date(naa - d * DAG).toISOString();

describe('erKontinuerlig', () => {
  it('urt/salat/frukt er kontinuerlige, resten engangs', () => {
    expect(erKontinuerlig('urt')).toBe(true);
    expect(erKontinuerlig('salat')).toBe(true);
    expect(erKontinuerlig('frukt')).toBe(true);
    expect(erKontinuerlig('mikrogront')).toBe(false);
    expect(erKontinuerlig('gronnsak')).toBe(false);
    expect(erKontinuerlig(null)).toBe(false);
  });
});

describe('hostingStatus', () => {
  it('returnerer null uten plantedato eller høste-anslag', () => {
    expect(hostingStatus(null, 50, 'urt', naa)).toBeNull();
    expect(hostingStatus(forDager(10), null, 'urt', naa)).toBeNull();
    expect(hostingStatus(forDager(10), 0, 'urt', naa)).toBeNull();
  });

  it('teller ned mot FØRSTE høst i voksende fase', () => {
    const s = hostingStatus(forDager(20), 50, 'urt', naa)!;
    expect(s.fase).toBe('voksende');
    expect(s.dagerIgjen).toBe(30);
    expect(s.dagerHosteklar).toBe(0);
    expect(s.prosent).toBe(40);
    expect(s.klar).toBe(false);
    expect(s.tekst).toBe('Første høst om ~30 d');
  });

  it('kontinuerlig plante blir «Høst etter behov», ikke ferdig', () => {
    const s = hostingStatus(forDager(60), 50, 'salat', naa)!;
    expect(s.fase).toBe('hosteklar');
    expect(s.kontinuerlig).toBe(true);
    expect(s.klar).toBe(true);
    expect(s.dagerHosteklar).toBe(10);
    expect(s.tekst).toBe('Høst etter behov');
  });

  it('engangs plante blir «Klar til høsting»', () => {
    const s = hostingStatus(forDager(60), 50, 'mikrogront', naa)!;
    expect(s.fase).toBe('hosteklar');
    expect(s.kontinuerlig).toBe(false);
    expect(s.tekst).toBe('Klar til høsting');
  });

  it('bruker eksakt formulering de siste dagene før første høst', () => {
    expect(hostingStatus(forDager(49), 50, 'urt', naa)!.tekst).toBe('Første høst om 1 dag');
    expect(hostingStatus(forDager(48), 50, 'urt', naa)!.tekst).toBe('Første høst om 2 dager');
  });

  it('ukjent kategori behandles som engangs', () => {
    expect(hostingStatus(forDager(60), 50, undefined, naa)!.tekst).toBe('Klar til høsting');
  });
});

describe('mestAktuelleHosting', () => {
  it('velger den som er nærmest høsting', () => {
    const res = mestAktuelleHosting(
      [
        { navn: 'Basilikum', plantet_at: forDager(10), dager_til_hosting: 50, kategori: 'urt' },
        { navn: 'Ruccola', plantet_at: forDager(25), dager_til_hosting: 30, kategori: 'salat' },
      ],
      naa,
    )!;
    expect(res.navn).toBe('Ruccola');
    expect(res.status.dagerIgjen).toBe(5);
  });

  it('høsteklare foran voksende, og ferskest klar først', () => {
    const res = mestAktuelleHosting(
      [
        { navn: 'GammelSalat', plantet_at: forDager(80), dager_til_hosting: 45, kategori: 'salat' },
        { navn: 'FerskSalat', plantet_at: forDager(46), dager_til_hosting: 45, kategori: 'salat' },
        { navn: 'Dill', plantet_at: forDager(5), dager_til_hosting: 60, kategori: 'urt' },
      ],
      naa,
    )!;
    expect(res.navn).toBe('FerskSalat'); // begge klare, men ferskest (1 d) < 35 d
    expect(res.status.dagerHosteklar).toBe(1);
  });

  it('null når ingen har brukbare data', () => {
    expect(
      mestAktuelleHosting([{ navn: 'X', plantet_at: null, dager_til_hosting: 40, kategori: 'urt' }], naa),
    ).toBeNull();
    expect(mestAktuelleHosting([], naa)).toBeNull();
  });
});
