import { describe, it, expect } from 'vitest';
import { hostingStatus, mestAktuelleHosting } from './hosting';

const DAG = 86_400_000;
const naa = Date.parse('2026-07-01T12:00:00Z');
const forDager = (d: number) => new Date(naa - d * DAG).toISOString();

describe('hostingStatus', () => {
  it('returnerer null uten plantedato eller høste-anslag', () => {
    expect(hostingStatus(null, 50, naa)).toBeNull();
    expect(hostingStatus(forDager(10), null, naa)).toBeNull();
    expect(hostingStatus(forDager(10), 0, naa)).toBeNull();
  });

  it('teller ned midtveis i vekst', () => {
    const s = hostingStatus(forDager(20), 50, naa)!;
    expect(s.dagerPlantet).toBe(20);
    expect(s.dagerIgjen).toBe(30);
    expect(s.prosent).toBe(40);
    expect(s.klar).toBe(false);
    expect(s.tekst).toBe('Høstes om ~30 d');
  });

  it('markerer klar når alderen har nådd anslaget', () => {
    const s = hostingStatus(forDager(50), 50, naa)!;
    expect(s.klar).toBe(true);
    expect(s.dagerIgjen).toBe(0);
    expect(s.prosent).toBe(100);
    expect(s.tekst).toBe('Klar til høsting');
  });

  it('forbi anslaget er fortsatt klar (ikke negativ)', () => {
    const s = hostingStatus(forDager(80), 50, naa)!;
    expect(s.klar).toBe(true);
    expect(s.dagerIgjen).toBe(0);
    expect(s.prosent).toBe(100);
  });

  it('bruker eksakt formulering de siste dagene', () => {
    expect(hostingStatus(forDager(49), 50, naa)!.tekst).toBe('Høstes om 1 dag');
    expect(hostingStatus(forDager(48), 50, naa)!.tekst).toBe('Høstes om 2 dager');
  });
});

describe('mestAktuelleHosting', () => {
  it('velger den som er nærmest høsting', () => {
    const res = mestAktuelleHosting(
      [
        { navn: 'Basilikum', plantet_at: forDager(10), dager_til_hosting: 50 },
        { navn: 'Ruccola', plantet_at: forDager(25), dager_til_hosting: 30 },
      ],
      naa,
    )!;
    expect(res.navn).toBe('Ruccola'); // 5 d igjen < 40 d
    expect(res.status.dagerIgjen).toBe(5);
  });

  it('prioriterer en som allerede er klar', () => {
    const res = mestAktuelleHosting(
      [
        { navn: 'Salat', plantet_at: forDager(60), dager_til_hosting: 45 },
        { navn: 'Dill', plantet_at: forDager(5), dager_til_hosting: 60 },
      ],
      naa,
    )!;
    expect(res.navn).toBe('Salat');
    expect(res.status.klar).toBe(true);
  });

  it('null når ingen har brukbare data', () => {
    expect(
      mestAktuelleHosting([{ navn: 'X', plantet_at: null, dager_til_hosting: 40 }], naa),
    ).toBeNull();
    expect(mestAktuelleHosting([], naa)).toBeNull();
  });
});
