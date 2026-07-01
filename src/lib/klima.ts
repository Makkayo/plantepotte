/**
 * Klima-innsikt fra DHT22 (temp + luftfuktighet) — VPD.
 *
 * VPD (Vapor Pressure Deficit) er «hvor tørst lufta gjør plantene»: differansen
 * mellom hvor mye fukt lufta KAN holde og hvor mye den faktisk holder. Det er
 * et mer plante-ærlig mål enn rå luftfuktighet, fordi det veier inn temperaturen.
 *
 * Hvorfor det er nyttig nettopp her: norsk inneluft om vinteren (oppvarming) er
 * ofte svært tørr → høy VPD → bladgrønnsaker/urter kan stresse og få sprø
 * kanter. Da vet du at det er lufta, ikke vanningen, som er problemet.
 *
 * Formel (Tetens): SVP = 0,6108 · e^(17,27·T / (T+237,3))  [kPa]
 *                  VPD = SVP · (1 − RH/100)
 * Dette er LUFT-VPD. Blad-VPD (bladet er gjerne et par grader kjøligere) ville
 * vært litt lavere, men luft-VPD holder for en hjemme-indikator.
 */

export type VpdSone = 'fuktig' | 'ideelt' | 'litt-tort' | 'tort' | 'ukjent';

export interface Vpd {
  /** VPD i kPa (null hvis temp/RH mangler). */
  kpa: number | null;
  sone: VpdSone;
  tekst: string;
  /** Hex-farge til en liten indikator (matcher app-paletten). */
  farge: string;
}

/** Metningstrykk for vanndamp (kPa) ved temperatur T (°C). */
export function metningstrykk(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Beregn luft-VPD + sone fra temperatur og relativ luftfuktighet.
 * Sonene er valgt for bladgrønnsaker/urter i vegetativ vekst, og bevisst litt
 * romsligere enn lærebok-tabellene fordi dette er et VEKE-system: røttene har
 * alltid vann, så plantene kan transpirere fritt og tåler høyere VPD uten
 * stress enn jord-dyrkede planter (der tørr jord + tørr luft rammer sammen).
 *   <0,4 fuktig (sopp/mugg-risiko) · 0,4–1,3 ideelt · 1,3–1,8 litt tørt ·
 *   >1,8 tørt (reell transpirasjons-stress).
 */
export function beregnVpd(
  tempC: number | null | undefined,
  rhProsent: number | null | undefined,
): Vpd {
  if (tempC === null || tempC === undefined || rhProsent === null || rhProsent === undefined) {
    return { kpa: null, sone: 'ukjent', tekst: 'Mangler data', farge: '#5a6376' };
  }
  const rh = Math.max(0, Math.min(100, rhProsent));
  const svp = metningstrykk(tempC);
  const kpa = Math.max(0, Math.round(svp * (1 - rh / 100) * 100) / 100);

  let sone: VpdSone;
  let tekst: string;
  let farge: string;
  if (kpa < 0.4) {
    sone = 'fuktig';
    tekst = 'Lufta er fuktig — luft litt for å unngå mugg';
    farge = '#60a5fa';
  } else if (kpa <= 1.3) {
    sone = 'ideelt';
    tekst = 'Ideell luft for vekst';
    farge = '#4ade80';
  } else if (kpa <= 1.8) {
    sone = 'litt-tort';
    tekst = 'Lufta er i tørreste laget';
    farge = '#fbbf24';
  } else {
    sone = 'tort';
    tekst = 'Tørr luft — plantene kan stresse (vurder å fukte/flytte)';
    farge = '#f87171';
  }
  return { kpa, sone, tekst, farge };
}
