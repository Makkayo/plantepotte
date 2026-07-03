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

/**
 * Hopp opp i nivå (prosentpoeng) mellom to nabopunkter som regnes som påfylling.
 * Deles av trend-nullstillingen og døgnforbruket — «påfylling» betyr det samme
 * begge steder. Godt over laser-jitter (±1–2 mm ≈ ±1 pp), godt under en reell
 * kanne-påfylling.
 */
export const FYLL_HOPP_PP = 12;

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
  /** Tidspunkt for siste detekterte påfylling (hopp > 12 pp). null = ingen i vinduet. */
  sistFyltAt: Date | null;
  /** Liter forbrukt per døgn, eldste→nyeste, opptil 7 verdier. Tom = for lite data. */
  dagligForbruk: number[];
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
      sistFyltAt: null,
      dagligForbruk: dagligForbruk(punkter),
      sparkline: nedsample(punkter, 48),
    };
  }

  // Finn siste påfylling: et hopp opp > FYLL_HOPP_PP mellom to nabopunkter.
  let start = 0;
  let sistFyltAt: Date | null = null;
  for (let i = 1; i < punkter.length; i++) {
    const naa = punkter[i]!;
    const forrige = punkter[i - 1]!;
    if (naa.pct - forrige.pct > FYLL_HOPP_PP) {
      start = i;
      sistFyltAt = new Date(naa.t);
    }
  }
  const forbrukSerie = dagligForbruk(punkter);
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
    sistFyltAt,
    dagligForbruk: forbrukSerie,
    sparkline: nedsample(punkter, 48),
  };
}

/**
 * Reelt forbruk (prosentpoeng) i en kronologisk serie: del serien i segmenter
 * ved hver påfylling (hopp > FYLL_HOPP_PP) og summer fallet per segment
 * (start − slutt, klampet ≥ 0). Punkt-for-punkt-summering ville blåst opp
 * tallet med laser-jitter; første-minus-siste ville gjemt alt forbruk på
 * påfyllingsdager. Segment-summen unngår begge.
 */
function forbrukPctISerie(punkter: VannPunkt[]): number {
  let sum = 0;
  let segStart = punkter[0]!;
  let forrige = punkter[0]!;
  for (let i = 1; i < punkter.length; i++) {
    const p = punkter[i]!;
    if (p.pct - forrige.pct > FYLL_HOPP_PP) {
      sum += Math.max(0, segStart.pct - forrige.pct);
      segStart = p;
    }
    forrige = p;
  }
  sum += Math.max(0, segStart.pct - forrige.pct);
  return sum;
}

/**
 * Liter forbrukt per døgn de siste `antallDager` dagene (eldste→nyeste).
 * Per døgn: forbrukPctISerie × tankliter — påfyllingsdager teller forbruket
 * FØR og ETTER påfyllingen (i stedet for å vise ~0, som første-minus-siste
 * gjorde). Døgn med < 2 punkter settes 0 så grafen alltid har faste stolper.
 * Tom serie hvis under 2 punkter totalt.
 */
export function dagligForbruk(punkter: VannPunkt[], antallDager = 7): number[] {
  if (punkter.length < 2) return [];
  const naa = Date.now();
  const ut: number[] = [];
  for (let d = antallDager - 1; d >= 0; d--) {
    const fra = naa - (d + 1) * 86_400_000;
    const til = naa - d * 86_400_000;
    const iDognet = punkter.filter((p) => p.t >= fra && p.t < til).sort((a, b) => a.t - b.t);
    if (iDognet.length < 2) {
      ut.push(0);
      continue;
    }
    ut.push(Math.round(TANK_LITER * (forbrukPctISerie(iDognet) / 100) * 100) / 100);
  }
  return ut;
}
