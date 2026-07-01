/**
 * Høsting — modellert som KONTINUERLIG høst, ikke ett engangs-øyeblikk.
 *
 * Virkeligheten for urter og salat i en veke-kasse: du høster litt av gangen,
 * etter hvert som du lager mat. Basilikum klippes til middagen og vokser videre;
 * salat er cut-and-come-again. «Klar til høsting» er derfor ikke en målstrek, men
 * STARTEN på en løpende høste-periode.
 *
 * Modell:
 *   `dager_til_hosting` (katalog) = dager til FØRSTE høst (når du kan begynne).
 *   Fase «voksende»  (alder < første høst): teller ned mot første klipp.
 *   Fase «høsteklar» (alder ≥ første høst):
 *     - kontinuerlig (urt/salat/frukt): «Høst etter behov» — løpende, ingen slutt.
 *     - engangs (mikrogrønt/rot/blomst): «Klar til høsting» — høst og bytt ut.
 *
 * Kun meningsfullt i DRIFT (ekte plantedato) og når planten har et
 * dager_til_hosting-anslag.
 */

import { dagerSiden } from './naering';

export type HostingFase = 'voksende' | 'hosteklar';

/**
 * Kategorier der man høster litt av gangen, om og om igjen: urter (snitt),
 * salat/bladgrønt (cut-and-come-again), frukt (plukk moden frukt løpende).
 * Mikrogrønt klippes typisk én gang, rot-grønnsaker/blomster høstes én gang →
 * regnes som engangs.
 */
const KONTINUERLIGE_KATEGORIER = new Set(['urt', 'salat', 'frukt']);

export function erKontinuerlig(kategori: string | null | undefined): boolean {
  return kategori != null && KONTINUERLIGE_KATEGORIER.has(kategori);
}

/** Nudge-vindu: hvor lenge en fersk «høsteklar» vises i oversikts-feeden (dager). */
export const HOSTE_NUDGE_DAGER = 7;

export interface HostingStatus {
  fase: HostingFase;
  /** True for cut-and-come-again / løpende plukk (urt/salat/frukt). */
  kontinuerlig: boolean;
  /** Dager siden planting. */
  dagerPlantet: number;
  /** Katalogens anslag for dager til FØRSTE høst. */
  dagerTilHosting: number;
  /** Dager igjen til første høst (0 når høsteklar). */
  dagerIgjen: number;
  /** Dager siden den ble høsteklar (0 mens den fortsatt vokser). */
  dagerHosteklar: number;
  /** Fremdrift mot første høst, 0–100 %. */
  prosent: number;
  /** True i høsteklar-fasen (bakoverkompatibelt navn). */
  klar: boolean;
  /** Kort etikett tilpasset fase + høste-type. */
  tekst: string;
}

/**
 * Høste-status for én planting. `naa` er injiserbar for testbarhet.
 * Returnerer null hvis alder eller høste-anslag mangler.
 */
export function hostingStatus(
  plantetAt: string | null | undefined,
  dagerTilHosting: number | null | undefined,
  kategori?: string | null,
  naa = Date.now(),
): HostingStatus | null {
  const dagerPlantet = dagerSiden(plantetAt, naa);
  if (dagerPlantet === null || dagerTilHosting == null || dagerTilHosting <= 0) {
    return null;
  }
  const kontinuerlig = erKontinuerlig(kategori);
  const klar = dagerPlantet >= dagerTilHosting;
  const dagerIgjen = Math.max(0, dagerTilHosting - dagerPlantet);
  const dagerHosteklar = Math.max(0, dagerPlantet - dagerTilHosting);
  const prosent = Math.max(0, Math.min(100, Math.round((dagerPlantet / dagerTilHosting) * 100)));

  let tekst: string;
  if (!klar) {
    tekst =
      dagerIgjen <= 3
        ? `Første høst om ${dagerIgjen} ${dagerIgjen === 1 ? 'dag' : 'dager'}`
        : `Første høst om ~${dagerIgjen} d`;
  } else if (kontinuerlig) {
    tekst = 'Høst etter behov';
  } else {
    tekst = 'Klar til høsting';
  }

  return {
    fase: klar ? 'hosteklar' : 'voksende',
    kontinuerlig,
    dagerPlantet,
    dagerTilHosting,
    dagerIgjen,
    dagerHosteklar,
    prosent,
    klar,
    tekst,
  };
}

export interface AktuellHosting {
  navn: string;
  status: HostingStatus;
}

/**
 * Den mest aktuelle høstingen i en kasse: høsteklare først (ferskest først),
 * ellers den nærmest første høst. Brukes til et kompakt signal på oversikts-
 * kortene og til feed-nudgen.
 */
export function mestAktuelleHosting(
  planter: {
    navn: string;
    plantet_at: string | null;
    dager_til_hosting: number | null;
    kategori?: string | null;
  }[],
  naa = Date.now(),
): AktuellHosting | null {
  const alle: AktuellHosting[] = [];
  for (const p of planter) {
    const status = hostingStatus(p.plantet_at, p.dager_til_hosting, p.kategori, naa);
    if (status) alle.push({ navn: p.navn, status });
  }
  if (alle.length === 0) return null;
  // Nærmest høst først (høsteklare = 0 dager igjen); ved likhet, ferskest klar først.
  alle.sort(
    (a, b) =>
      a.status.dagerIgjen - b.status.dagerIgjen ||
      a.status.dagerHosteklar - b.status.dagerHosteklar,
  );
  return alle[0]!;
}
