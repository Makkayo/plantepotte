/**
 * Kalibrering for de kapasitive jordfuktsensorene (v2.0).
 * Målt på breadboard 2026-06-10 med alle 3 sensorene — de leste nesten likt:
 *   - Tørr (i luft):  ~3190 ADC
 *   - Våt (i vann):   ~1140 ADC
 * Lavere ADC = våtere. Standardene under brukes globalt; senere kan de lagres
 * per sensor (med "sett tørr"/"sett våt"-knapp) — samme prinsipp som vannstand.
 */
export const JORD_TORR = 3200; // ADC tørr → 0 %
export const JORD_VAT = 1140; // ADC våt → 100 %

/** Map kapasitiv jordfuktsensor ADC (0–4095) til prosent (lavere ADC = våtere). */
export function jordfuktProsent(
  raw: number | null | undefined,
  tort: number = JORD_TORR,
  vat: number = JORD_VAT,
): number | null {
  if (raw === null || raw === undefined) return null;
  const spenn = tort - vat;
  if (spenn <= 0) return null; // ugyldig kalibrering
  return Math.max(0, Math.min(100, Math.round(((tort - raw) / spenn) * 100)));
}

export function jordfuktKlasse(pct: number | null): 'dry' | 'ok' | 'wet' | 'unknown' {
  if (pct === null) return 'unknown';
  if (pct < TORR_GRENSE) return 'dry'; // samme grense som fuktStatus / PotteKort / advarsler
  if (pct > 85) return 'wet';
  return 'ok';
}

/**
 * Jordfukt-terskler (i %). ÉN sannhet — brukes av fuktStatus, jordfuktKlasse,
 * PotteKort («N felt trenger vann») og oversiktens advarsler, så «tørr» betyr
 * det samme overalt. Endrer du grensa her, flytter den seg konsistent i hele appen.
 */
export const TORR_GRENSE = 35; // < dette = trenger vann (rød)
export const FRISK_GRENSE = 55; // ≥ dette = fin fukt (grønn)

/**
 * Fukt-status for «Anlegget»-visningen (oktagon-feltene + detalj-arket).
 * Terskler: ≥55 frisk, 35–54 begynner å tørke, <35 tørr.
 * Returnerer hex (brukes i inline-stiler for jord-gradient/prikk/tall) + tekst.
 */
export function fuktStatus(pct: number | null): {
  farge: string;
  tekst: string;
  klasse: 'frisk' | 'tørker' | 'tørr' | 'unknown';
} {
  if (pct === null) return { farge: '#5a6376', tekst: 'Ukjent', klasse: 'unknown' };
  if (pct >= FRISK_GRENSE) return { farge: '#4ade80', tekst: pct >= 70 ? 'Frisk og fuktig' : 'Fin fukt', klasse: 'frisk' };
  if (pct >= TORR_GRENSE) return { farge: '#fbbf24', tekst: 'Begynner å tørke', klasse: 'tørker' };
  return { farge: '#f87171', tekst: 'Trenger vann', klasse: 'tørr' };
}

/**
 * Bygg en 7-dagers jordfukt-sparkline (7 verdier i %) fra sensorhistorikk for
 * én seksjon. Bøtter på døgn (døgn-snitt). Tomme døgn fylles med nærmeste KJENTE
 * verdi (carry-forward): et hull betyr «ingen ny måling», ikke «fukten falt til
 * snittet» — så linja holder seg jevn i stedet for å sprette mot gjennomsnittet.
 * Ledende tomme døgn (før første måling) får første kjente verdi (back-fill).
 * Helt tom historikk → alle 0.
 */
export function jordSparkline(
  historikk: { registrert_at: string | null; verdi: number | null }[],
): number[] {
  const naa = Date.now();
  const dager: (number | null)[] = [];
  for (let d = 6; d >= 0; d--) {
    const fra = naa - (d + 1) * 86_400_000;
    const til = naa - d * 86_400_000;
    const iBotte = historikk
      .filter((h) => h.registrert_at && h.verdi !== null)
      .filter((h) => {
        const t = new Date(h.registrert_at as string).getTime();
        return t >= fra && t < til;
      })
      .map((h) => h.verdi as number);
    dager.push(iBotte.length ? Math.round(iBotte.reduce((a, b) => a + b, 0) / iBotte.length) : null);
  }
  // Carry-forward: hold forrige kjente verdi over tomme døgn. Ledende hull får
  // første kjente verdi som startpunkt så de ikke kollapser til 0.
  let forrige = dager.find((x): x is number => x !== null) ?? 0;
  return dager.map((x) => {
    if (x !== null) forrige = x;
    return forrige;
  });
}

/**
 * Vannstand fra VL53L0X-laser.
 *
 * Laseren peker rett ned mot en flytende flottør i berolings-brønnen.
 *  - STOR avstand  = flottøren er langt nede = lite vann  (mot 0 %)
 *  - LITEN avstand = flottøren er nær laseren = mye vann  (mot 100 %)
 *
 * `tomMm`/`fullMm` er standard-kalibrering. Senere bør disse lagres per potte
 * (med en "sett tom" / "sett full"-knapp) — da sender vi inn potte-spesifikke verdier her.
 */
export const VANN_TOM_MM = 200; // avstand når reservoaret er tomt (flottør på bunn)
export const VANN_FULL_MM = 40; // avstand når reservoaret er fullt (flottør på topp)

export function vannNivaProsent(
  avstandMm: number | null | undefined,
  tomMm: number = VANN_TOM_MM,
  fullMm: number = VANN_FULL_MM,
): number | null {
  if (avstandMm === null || avstandMm === undefined) return null;
  const spenn = tomMm - fullMm;
  if (spenn <= 0) return null; // ugyldig kalibrering
  const pct = ((tomMm - avstandMm) / spenn) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function vannKlasse(pct: number | null): 'lav' | 'ok' | 'full' | 'unknown' {
  if (pct === null) return 'unknown';
  if (pct < 20) return 'lav';
  if (pct > 90) return 'full';
  return 'ok';
}

export function formaterTidssiden(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'nettopp';
  if (min < 60) return `for ${min} min siden`;
  const t = Math.round(min / 60);
  if (t < 24) return `for ${t} t siden`;
  const dager = Math.round(t / 24);
  if (dager < 7) return `for ${dager} d siden`;
  return d.toLocaleDateString('no', { day: 'numeric', month: 'short' });
}

/**
 * Minutter siden et ISO-tidsstempel (eller null hvis ukjent).
 * «Livstegn» — hvor lenge siden ESP32 sist postet sensordata.
 */
export function minutterSiden(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

/**
 * Grense (min) for når en potte regnes som «offline». ESP32 poster hvert 5. min
 * (POST_INTERVALL_SEK=300), så 15 min = 3 tapte poster før vi flagger trøbbel.
 */
export const OFFLINE_GRENSE_MIN = 15;

export function formaterDato(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('no', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function pluralisering(n: number, ent: string, fl: string): string {
  return `${n} ${n === 1 ? ent : fl}`;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/* ============================ Blomsterkasse-oppsett ============================
 *
 * En blomsterkasse (rad i `potter`) inneholder N potter (beholdere) — i praksis 2.
 * Hver potte kan ha skillevegg (delt i FORAN + BAK = 2 planteplasser) eller stå
 * udelt (1 plass). `skillevegger`-lista er den ENESTE sannheten: lengden = antall
 * potter, hver verdi = om den potta har skillevegg.
 *
 * Seksjonsnumrene (potte_planter.seksjon) ligger FAST per potte, slik at planter
 * ikke flyttes når man slår en skillevegg av/på:
 *   Potte 1 → seksjon 1 (foran) + 2 (bak)
 *   Potte 2 → seksjon 3 (foran) + 4 (bak)
 * En udelt potte bruker kun sin fremre seksjon (1 / 3); den bakre (2 / 4) er ledig.
 */

export type PlassRolle = 'foran' | 'bak' | 'hel';

export interface Planteplass {
  /** Fast nummer i potte_planter.seksjon (1–4). */
  seksjon: number;
  /** 'hel' når potta er udelt, ellers 'foran'/'bak'. */
  rolle: PlassRolle;
  /** Visningstekst: "Foran" / "Bak" / "" (hel). */
  etikett: string;
}

export interface PotteOppsett {
  /** 1-basert beholder-nummer i kassa. */
  potteNr: number;
  delt: boolean;
  plasser: Planteplass[];
}

/** Fremre seksjonsnummer for en potte (0-basert indeks). */
export function foranSeksjon(potteIdx: number): number {
  return potteIdx * 2 + 1;
}

/** Bakre seksjonsnummer for en potte (0-basert indeks). */
export function bakSeksjon(potteIdx: number): number {
  return potteIdx * 2 + 2;
}

/** Bygg hele oppsettet for en blomsterkasse ut fra skillevegg-lista. */
export function blomsterkasseOppsett(skillevegger: boolean[]): PotteOppsett[] {
  return skillevegger.map((delt, idx) => {
    const plasser: Planteplass[] = delt
      ? [
          { seksjon: foranSeksjon(idx), rolle: 'foran', etikett: 'Foran' },
          { seksjon: bakSeksjon(idx), rolle: 'bak', etikett: 'Bak' },
        ]
      : [{ seksjon: foranSeksjon(idx), rolle: 'hel', etikett: '' }];
    return { potteNr: idx + 1, delt, plasser };
  });
}

/** Totalt antall planteplasser i en blomsterkasse. */
export function antallPlasser(skillevegger: boolean[]): number {
  return skillevegger.reduce((sum, delt) => sum + (delt ? 2 : 1), 0);
}

/**
 * Jordfukt i % per PLANTEPLASS (felt) — ikke per probe. En delt potte har ett
 * felt per probe; en udelt potte kan likevel ha to prober i samme jord, og da
 * er snittet av dem feltets fukt (samme regel som detaljens oktagon-visning).
 * Uten dette ville «N felt trenger vann» på oversikts-kortet telt PROBER og
 * kunnet melde «2 felt» for én udelt potte. Rekkefølge: potte 1 sine felt
 * først, så potte 2. null = ingen måling for feltet.
 */
export function feltFukter(
  jordRaa: (number | null | undefined)[],
  skillevegger: boolean[],
): (number | null)[] {
  const ut: (number | null)[] = [];
  skillevegger.forEach((delt, idx) => {
    const foran = jordfuktProsent(jordRaa[idx * 2]);
    const bak = jordfuktProsent(jordRaa[idx * 2 + 1]);
    if (delt) {
      ut.push(foran, bak);
    } else {
      const kjente = [foran, bak].filter((x): x is number => x !== null);
      ut.push(kjente.length ? Math.round(kjente.reduce((a, b) => a + b, 0) / kjente.length) : null);
    }
  });
  return ut;
}

/**
 * Visningsetikett for en jordfuktsensor (jord1–4) ut fra kassas oppsett.
 * jordN hører til seksjon N → finn hvilken potte/rolle det er.
 */
export function sensorEtikett(sensorNr: number, skillevegger: boolean[]): string {
  const potteIdx = Math.floor((sensorNr - 1) / 2); // seksjon 1,2 → potte 0; 3,4 → potte 1
  const delt = skillevegger[potteIdx];
  if (delt === undefined) return `Sensor ${sensorNr}`;
  const potteNavn = `Potte ${potteIdx + 1}`;
  if (!delt) return potteNavn; // udelt potte: bare "Potte N"
  const erForan = (sensorNr - 1) % 2 === 0;
  return `${potteNavn} ${erForan ? 'foran' : 'bak'}`;
}
