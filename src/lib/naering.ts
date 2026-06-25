/**
 * To-fase næring — minner deg på når du skal bytte fra «rent vann» til næring.
 *
 * Bakgrunn (din dyrkeplan): torvfri kokos-jord + perlite har innebygd starter-
 * næring som varer ~3–6 uker. Derfor:
 *   Fase 1 (uke 0–~3):  kun rent vann i badet — jorda mater plantene.
 *   Fase 2 (~uke 3–6):  start svak hydroponisk næring (Nelson Garden), øk gradvis.
 *   Fase 2+ (uke 6+):   jorda er tom → full dosering etter flaska.
 *
 * Det lette å glemme er overgangen til fase 2 i rett tid. Appen vet `plantet_at`
 * og kan minne deg på det. Ren logikk på data du allerede har — null gjetning.
 */

export type NaeringFase = 'jord' | 'start-naering' | 'full-naering';

export interface Naeringsstatus {
  fase: NaeringFase;
  /** Alder (dager) som status er regnet fra. */
  dager: number;
  tittel: string;
  melding: string;
  /** True i overgangsvinduet: nå bør du faktisk gjøre noe (starte næring). */
  handlingNaa: boolean;
}

/** ~uke 3 — kokos-starteren begynner å tømmes, start svak næring. */
export const FASE2_START_DAG = 21;
/** ~uke 6 — jorda regnes som tom, full næring. */
export const FASE2_FULL_DAG = 42;

/** Hele dager siden et ISO-tidsstempel (null hvis ukjent). */
export function dagerSiden(isoDato: string | null | undefined, naa = Date.now()): number | null {
  if (!isoDato) return null;
  const t = new Date(isoDato).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((naa - t) / 86_400_000));
}

export function naeringsfase(dager: number): Naeringsstatus {
  if (dager < FASE2_START_DAG) {
    return {
      fase: 'jord',
      dager,
      tittel: 'Fase 1 · jorda mater',
      melding: `Kun rent vann i badet — kokos-jorda har næring de første ukene. ~${FASE2_START_DAG - dager} dager til du bør starte næring.`,
      handlingNaa: false,
    };
  }
  if (dager < FASE2_FULL_DAG) {
    return {
      fase: 'start-naering',
      dager,
      tittel: 'Fase 2 · start næring',
      melding:
        'På tide å starte svak hydroponisk næring i badet (f.eks. Nelson Garden) — start forsiktig og øk gradvis.',
      handlingNaa: true,
    };
  }
  return {
    fase: 'full-naering',
    dager,
    tittel: 'Fase 2 · full næring',
    melding: 'Jorda er tom for starter-næring nå — følg doseringen på flaska. Cal-Mag kun ved synlig mangel.',
    handlingNaa: false,
  };
}

/**
 * Næringsstatus for en kasse. Bruker den ELDSTE aktive plantingen (den jorda
 * som er kommet lengst og er mest uttømt). null hvis ingen plantedatoer.
 */
export function kasseNaering(
  plantetDatoer: (string | null)[],
  naa = Date.now(),
): Naeringsstatus | null {
  const dager = plantetDatoer
    .map((d) => dagerSiden(d, naa))
    .filter((x): x is number => x !== null);
  if (dager.length === 0) return null;
  return naeringsfase(Math.max(...dager));
}
