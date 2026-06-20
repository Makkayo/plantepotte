/**
 * Trend-utregning for vannstanden.
 *
 * ESP32 poster `vann_avstand_mm` jevnlig (hvert 5. min). Ut fra historikken
 * kan vi estimere FORBRUK (hvor fort tanken tømmes) og dermed «holder ~X dager».
 *
 * To detaljer gjør anslaget pålitelig:
 *  1. Vi regner kun på segmentet ETTER siste påfylling — et brått hopp opp i nivå
 *     nullstiller trenden, ellers ville en gammel påfylling forurenset helningen.
 *  2. Vi krever litt data (≥ 4 punkter over ≥ 6 timer) før vi tør melde et tall.
 *
 * Volum: IKEA 365+ 5,2 L reservoar → liter = 5,2 × nivå%.
 */

import { vannNivaProsent } from './utils';

/** Reservoarvolum (L) — IKEA 365+ 5,2L. */
export const TANK_LITER = 5.2;

export interface VannPunkt {
  /** Tidspunkt (ms siden epoch). */
  t: number;
  /** Vannivå i prosent (0–100). */
  pct: number;
}

export interface VannTrend {
  /** Nok data til et meningsfullt anslag? */
  gyldig: boolean;
  /** Endring i prosentpoeng per døgn (negativ = synkende / forbruk). */
  prosentPerDag: number;
  /** Estimerte dager til tomt ved nåværende forbruk (null = ukjent/fylles). */
  dagerIgjen: number | null;
  /** Liter igjen akkurat nå. */
  literIgjen: number;
  /** Liter forbrukt per døgn (null hvis ikke synkende). */
  literPerDag: number | null;
  /** Nedsamplet kronologisk serie til sparkline. */
  sparkline: VannPunkt[];
}

interface SensorRad {
  registrert_at: string | null;
  vann_avstand_mm: number | null;
}

/** Minste kvadraters helning (prosent per millisekund). */
function lineaerHelning(p: VannPunkt[]): number {
  const n = p.length;
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const punkt of p) {
    sx += punkt.t;
    sy += punkt.pct;
    sxx += punkt.t * punkt.t;
    sxy += punkt.t * punkt.pct;
  }
  const nevner = n * sxx - sx * sx;
  if (nevner === 0) return 0;
  return (n * sxy - sx * sy) / nevner;
}

function nedsample(p: VannPunkt[], maks: number): VannPunkt[] {
  if (p.length <= maks) return p;
  const steg = p.length / maks;
  const ut: VannPunkt[] = [];
  for (let i = 0; i < maks; i++) {
    const punkt = p[Math.floor(i * steg)];
    if (punkt) ut.push(punkt);
  }
  const siste = p[p.length - 1];
  if (siste) ut.push(siste);
  return ut;
}

/**
 * Beregn vanntrend fra sensorhistorikk.
 * @param rader   sensorrader (vilkårlig rekkefølge) med tid + rå laser-avstand
 * @param naaPct  nåværende nivå i % (siste avlesning) — brukes som «grunnlinje»
 * @param tomMm   kalibrering: avstand ved tom tank (valgfri, ellers standard)
 * @param fullMm  kalibrering: avstand ved full tank (valgfri, ellers standard)
 */
export function beregnVannTrend(
  rader: SensorRad[],
  naaPct: number | null,
  tomMm?: number,
  fullMm?: number,
): VannTrend {
  const punkter: VannPunkt[] = [];
  for (const r of rader) {
    if (!r.registrert_at) continue;
    const pct = vannNivaProsent(r.vann_avstand_mm, tomMm, fullMm);
    if (pct === null) continue;
    punkter.push({ t: new Date(r.registrert_at).getTime(), pct });
  }
  punkter.sort((a, b) => a.t - b.t);

  const literFra = (pct: number | null): number =>
    pct === null ? 0 : Math.round(TANK_LITER * (pct / 100) * 10) / 10;

  if (punkter.length < 4) {
    return {
      gyldig: false,
      prosentPerDag: 0,
      dagerIgjen: null,
      literIgjen: literFra(naaPct),
      literPerDag: null,
      sparkline: nedsample(punkter, 48),
    };
  }

  // Finn siste påfylling: et hopp opp > 12 prosentpoeng mellom to nabopunkter.
  let start = 0;
  for (let i = 1; i < punkter.length; i++) {
    const naa = punkter[i]!;
    const forrige = punkter[i - 1]!;
    if (naa.pct - forrige.pct > 12) start = i;
  }
  const segment = punkter.slice(start);
  const forste = segment[0]!;
  const sisteP = segment[segment.length - 1]!;
  const spennMs = sisteP.t - forste.t;
  const nokData = segment.length >= 4 && spennMs >= 6 * 3600 * 1000;

  const helning = nokData ? lineaerHelning(segment) : 0; // pct per ms
  const prosentPerDag = helning * 86_400_000;
  const synkende = prosentPerDag < -0.2; // > 0,2 %/døgn ned = reelt forbruk
  const grunnPct = naaPct ?? sisteP.pct;
  const dagerIgjen = synkende ? Math.max(0, grunnPct / -prosentPerDag) : null;
  const literPerDag = synkende ? Math.round(TANK_LITER * (-prosentPerDag / 100) * 100) / 100 : null;

  return {
    gyldig: nokData,
    prosentPerDag: Math.round(prosentPerDag * 10) / 10,
    dagerIgjen: dagerIgjen === null ? null : Math.round(dagerIgjen * 10) / 10,
    literIgjen: literFra(grunnPct),
    literPerDag,
    sparkline: nedsample(punkter, 48),
  };
}
