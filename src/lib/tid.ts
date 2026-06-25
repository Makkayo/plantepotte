/**
 * Tids-/lysvindu-hjelpere. ÉN sannhet for «hvor lenge lyser lampa», delt av
 * SolBue, PotteKort, AnleggPanel og LysSheet (som før hadde hver sin kopi —
 * og to av dem var uenige om on===off-kanten).
 *
 * Speiler firmwaren (`logic.light_should_be_on`): on===off betyr «ingen lystid»,
 * altså 0 — IKKE 24 t. Da viser appen samme varighet/DLI som potta faktisk kjører.
 */

/** "07:30" → 450 minutter siden midnatt. Ugyldig/manglende → 0. */
export function hhmmTilMin(s: string | null | undefined): number {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Lengden på lys-vinduet i minutter (0–1440). Håndterer at vinduet krysser
 * midnatt (off < on). on===off → 0 (samme som firmwaren: lyset er av).
 */
export function lysVarighetMin(on: string | null | undefined, off: string | null | undefined): number {
  if (!on || !off) return 0; // halv-redigert/tomt felt → ingen lystid (som firmwaren)
  const o = hhmmTilMin(on);
  const f = hhmmTilMin(off);
  if (o === f) return 0;
  return (((f - o) % 1440) + 1440) % 1440;
}

/** Samme som lysVarighetMin, men i timer (kan være desimal). */
export function lysVarighetTimer(on: string | null | undefined, off: string | null | undefined): number {
  return lysVarighetMin(on, off) / 60;
}
