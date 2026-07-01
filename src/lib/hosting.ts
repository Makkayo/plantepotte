/**
 * Høsting-nedtelling — hvor langt en planting er kommet mot høsteklar.
 *
 * Appen vet allerede plantingens alder (`plantet_at`) og plantens typiske
 * `dager_til_hosting` fra katalogen. Da kan den svare på det man faktisk lurer
 * på: «når kan jeg spise dette?» — uten ny maskinvare eller gjetning.
 *
 * Kun meningsfullt i DRIFT (plantet_at er ekte da) og når planten har et
 * dager_til_hosting-anslag. Ellers returneres null og UI-et viser ingenting.
 */

import { dagerSiden } from './naering';

export interface HostingStatus {
  /** Dager siden planting. */
  dagerPlantet: number;
  /** Katalogens anslag for dager til høsteklar. */
  dagerTilHosting: number;
  /** Dager igjen til klar (0 = klar/forbi). */
  dagerIgjen: number;
  /** Fremdrift 0–100 %. */
  prosent: number;
  /** True når plantingen har nådd (eller passert) høste-alderen. */
  klar: boolean;
  /** Kort etikett: «Klar til høsting» / «Høstes om ~12 d». */
  tekst: string;
}

/**
 * Høste-status for én planting. `naa` er injiserbar for testbarhet.
 * Returnerer null hvis alder eller høste-anslag mangler.
 */
export function hostingStatus(
  plantetAt: string | null | undefined,
  dagerTilHosting: number | null | undefined,
  naa = Date.now(),
): HostingStatus | null {
  const dagerPlantet = dagerSiden(plantetAt, naa);
  if (dagerPlantet === null || dagerTilHosting == null || dagerTilHosting <= 0) {
    return null;
  }
  const dagerIgjen = Math.max(0, dagerTilHosting - dagerPlantet);
  const prosent = Math.max(0, Math.min(100, Math.round((dagerPlantet / dagerTilHosting) * 100)));
  const klar = dagerPlantet >= dagerTilHosting;
  const tekst = klar
    ? 'Klar til høsting'
    : dagerIgjen <= 3
      ? `Høstes om ${dagerIgjen} ${dagerIgjen === 1 ? 'dag' : 'dager'}`
      : `Høstes om ~${dagerIgjen} d`;
  return { dagerPlantet, dagerTilHosting, dagerIgjen, prosent, klar, tekst };
}

export interface AktuellHosting {
  navn: string;
  status: HostingStatus;
}

/**
 * Den mest aktuelle høstingen i en kasse (klar først, ellers minst dager igjen).
 * Brukes til et kompakt «neste høsting»-signal på oversikts-kortene.
 */
export function mestAktuelleHosting(
  planter: { navn: string; plantet_at: string | null; dager_til_hosting: number | null }[],
  naa = Date.now(),
): AktuellHosting | null {
  const alle: AktuellHosting[] = [];
  for (const p of planter) {
    const status = hostingStatus(p.plantet_at, p.dager_til_hosting, naa);
    if (status) alle.push({ navn: p.navn, status });
  }
  if (alle.length === 0) return null;
  alle.sort((a, b) => a.status.dagerIgjen - b.status.dagerIgjen);
  return alle[0]!;
}
