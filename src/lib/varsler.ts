/**
 * Varsel-motoren for oversiktens handlingsfeed — REN logikk, én sannhet.
 *
 * Tar alt appen vet om én kasse (siste avlesning, lyskommando, planter,
 * sensorhistorikk) og returnerer lista av varsler/gjøremål/gode nyheter som
 * feeden skal vise. Bor her og ikke i PotteOversikt.svelte av to grunner:
 *
 *  1. Testbarhet: hver regel (og prioriteringen mellom dem) har enhetstester —
 *     terskler kan ikke skli fra hverandre uten at en test roper.
 *  2. Anti-spam by design: maks ETT varsel per kategori per kasse. Kategoriene
 *     (utstyr, vann, jord, klima, lys, næring, høsting) er uavhengige akser —
 *     tørr jord skal ikke skjule tørr luft — men innen én akse viser vi bare
 *     det viktigste. En feed som maser om alt, leses ikke.
 *
 * Prioritering innen aksene:
 *  - utstyr: frakoblet demper ALLE sensor-varsler (tallene er utdaterte), men
 *    tar med siste kjente krise i meldingen så den ikke forsvinner i stillhet.
 *    Ellers løftes maskinvare-diagnosene (løs/død/luft-probe, veke-kontakt)
 *    hit fra historikken — samme motorer som detaljens maskinvare-sjekk.
 *  - vann: akutt lavt nivå (<20 %) før trend-prognosen («holder ~X dager») —
 *    trenden gjør varselet forbruks-bevisst: høyt forbruk varsler FØR 20 %,
 *    lavt forbruk maser ikke på 19 %.
 *  - jord: tørt (akutt, rød) før vedvarende vått (rotråte utvikler seg sakte).
 *  - klima: temperatur-ekstremer før VPD (temperaturen inngår i VPD uansett).
 *  - lys: gjeldende lysplan mot plantenes dokumenterte DLI-behov — av/for
 *    svakt/for sterkt. Samme vurdering som lys-arket (vurderPlanteDli).
 */

import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from './database.types';
import {
  feltFukter,
  vannNivaProsent,
  jordfuktProsent,
  sensorEtikett,
  TORR_GRENSE,
  OFFLINE_GRENSE_MIN,
} from './utils';
import { beregnVannTrend } from './trend';
import { beregnVpd, TEMP_KALD_GRENSE, TEMP_VARM_GRENSE } from './klima';
import { kasseNaering } from './naering';
import { mestAktuelleHosting, HOSTE_NUDGE_DAGER } from './hosting';
import { beregnDli, vurderPlanteDli, ANTATT_PPFD_MAX } from './lys';
import { lysVarighetTimer } from './tid';
import { overvaatHelse, probeHelse, luftFunn, vekeHelse } from './diagnose';

/** Vann under dette (%) = akutt lavt — samme grense som vannKlasse 'lav'. */
export const VANN_LAV_PCT = 20;
/** Trend-prognose på ≤ dette antall dager til tom tank → varsle selv om nivået er OK. */
export const VANN_DAGER_GRENSE = 2;

export type VarselAlvor = 'hoy' | 'mid' | 'gjøremål' | 'positiv';
export type VarselKategori = 'utstyr' | 'vann' | 'jord' | 'klima' | 'lys' | 'naering' | 'hosting';

export interface Varsel {
  kategori: VarselKategori;
  alvor: VarselAlvor;
  ikon: string;
  melding: string;
}

/** Historikk-rad slik både PotteDetalj og PotteOversikt henter den. */
export interface VarselHistorikkRad {
  registrert_at: string | null;
  vann_avstand_mm: number | null;
  jord1: number | null;
  jord2: number | null;
  jord3: number | null;
  jord4: number | null;
}

export interface KasseTilstand {
  /** Effektiv potte (gate-flippet i sim) — samme som resten av visningen bruker. */
  potte: Potte;
  sensor: PotteSensorData | undefined;
  command: PotteCommand | undefined;
  planter: PottePlanteFull[];
  /** Sensorhistorikk (≥ 3–4 døgn) for trend/overvåt. Tom liste = hopp over de reglene. */
  historikk: VarselHistorikkRad[];
  /** Kalibrert PPFD ved 100 % (fra settings). */
  ppfdMaks?: number;
  /** Injiserbar klokke for tester. */
  naa?: number;
}

function fmtDager(d: number): string {
  const avr = Math.round(d * 10) / 10;
  return avr === Math.round(avr) ? String(Math.round(avr)) : String(avr).replace('.', ',');
}

/** Alle varsler for én kasse, i visningsrekkefølge. */
export function kasseVarsler(k: KasseTilstand): Varsel[] {
  const ut: Varsel[] = [];
  const p = k.potte;
  const s = k.sensor;
  const naa = k.naa ?? Date.now();
  const ppfd = k.ppfdMaks ?? ANTATT_PPFD_MAX;

  // ── Sensor-drevne akser (kun kasser med sensorer) ──
  if (p.har_sensorer) {
    const minSiden = s?.registrert_at
      ? Math.round((naa - new Date(s.registrert_at).getTime()) / 60000)
      : null;
    const offline = minSiden !== null && minSiden > OFFLINE_GRENSE_MIN;

    const vann = s
      ? vannNivaProsent(s.vann_avstand_mm, p.vann_tom_mm ?? undefined, p.vann_full_mm ?? undefined)
      : null;
    const felter = s
      ? feltFukter([s.jord1, s.jord2, s.jord3, s.jord4], p.skillevegger).filter(
          (x): x is number => x !== null,
        )
      : [];

    if (offline) {
      // Frakoblet sluker sensor-varslene (tallene er gamle), men siste kjente
      // krise nevnes — «potta er taus OG vannet var lavt» er mer alvorlig enn
      // bare «potta er taus».
      let hale = '';
      if (vann !== null && vann < VANN_LAV_PCT) hale = ` — vannet var lavt (${vann} %) sist sett`;
      else if (felter.length && Math.min(...felter) < TORR_GRENSE) hale = ' — jorda var tørr sist sett';
      ut.push({
        kategori: 'utstyr',
        alvor: 'mid',
        ikon: '⚠️',
        melding: `Frakoblet — sjekk strøm og WiFi${hale}`,
      });
    } else if (s) {
      // Vann: akutt nivå, ellers forbruks-prognose fra trenden.
      const trend = beregnVannTrend(
        k.historikk,
        vann,
        p.vann_tom_mm ?? undefined,
        p.vann_full_mm ?? undefined,
      );
      if (vann !== null && vann < VANN_LAV_PCT) {
        ut.push({ kategori: 'vann', alvor: 'hoy', ikon: '💧', melding: `Vann lavt (${vann} %) — fyll snart` });
      } else if (trend.gyldig && trend.dagerIgjen !== null && trend.dagerIgjen <= VANN_DAGER_GRENSE) {
        ut.push({
          kategori: 'vann',
          alvor: 'hoy',
          ikon: '💧',
          melding:
            trend.dagerIgjen < 1
              ? 'Vannet holder under ett døgn til med dagens forbruk — fyll i dag'
              : `Vannet holder bare ~${fmtDager(trend.dagerIgjen)} dager til med dagens forbruk`,
        });
      }

      // Jord: tørt nå (akutt), ellers vedvarende vått (utvikler seg sakte).
      if (felter.length && Math.min(...felter) < TORR_GRENSE) {
        ut.push({ kategori: 'jord', alvor: 'hoy', ikon: '💧', melding: 'Jord tørr — trenger vann' });
      } else if (k.historikk.length > 0) {
        const overvaat = [0, 1, 2, 3].some((idx) =>
          overvaatHelse(
            k.historikk
              .map((r) => ({
                t: r.registrert_at ? new Date(r.registrert_at).getTime() : 0,
                pct: jordfuktProsent([r.jord1, r.jord2, r.jord3, r.jord4][idx] ?? null) ?? NaN,
              }))
              .filter((x) => Number.isFinite(x.pct)),
            naa,
          ).advar,
        );
        if (overvaat) {
          const utsatt = k.planter.find(
            (pp) => pp.plante.veke_egnet === 'forsiktig' || pp.plante.veke_egnet === 'ikke_anbefalt',
          );
          ut.push({
            kategori: 'jord',
            alvor: 'mid',
            ikon: '🫧',
            melding: `Jorda har stått svært våt i flere døgn — sjekk veka og se etter råte${
              utsatt ? ` (${utsatt.plante.navn} tåler det dårlig)` : ''
            }`,
          });
        }
      }

      // Klima: temperatur-ekstremer først, ellers VPD-ytterpunktene.
      if (s.temperatur !== null && s.temperatur < TEMP_KALD_GRENSE) {
        ut.push({
          kategori: 'klima',
          alvor: 'mid',
          ikon: '🌡️',
          melding: `Kaldt (${s.temperatur.toFixed(0)} °C) — veksten stopper og planter kan ta skade`,
        });
      } else if (s.temperatur !== null && s.temperatur > TEMP_VARM_GRENSE) {
        ut.push({
          kategori: 'klima',
          alvor: 'mid',
          ikon: '🌡️',
          melding: `Svært varmt (${s.temperatur.toFixed(0)} °C) — flytt kassa eller luft rommet`,
        });
      } else {
        const vpd = beregnVpd(s.temperatur, s.luftfuktighet);
        if (vpd.sone === 'tort') {
          ut.push({
            kategori: 'klima',
            alvor: 'mid',
            ikon: '💨',
            melding: `Tørr luft (VPD ${vpd.kpa!.toFixed(1).replace('.', ',')} kPa) — plantene kan stresse, vurder å fukte`,
          });
        } else if (vpd.sone === 'fuktig') {
          ut.push({
            kategori: 'klima',
            alvor: 'mid',
            ikon: '💨',
            melding: 'Fuktig luft — luft rommet litt for å unngå mugg',
          });
        }
      }

      // Utstyr: maskinvare-diagnosene fra historikken (samme motorer som
      // detaljens maskinvare-sjekk) — en løs probe skal ikke ligge og lyve i
      // dagevis før man tilfeldigvis åpner detaljen. Ett varsel; resten står
      // i detaljen.
      if (k.historikk.length > 0) {
        const kanalSerier = [0, 1, 2, 3].map((idx) =>
          k.historikk.map((r) => ({
            t: r.registrert_at ? new Date(r.registrert_at).getTime() : 0,
            raw: [r.jord1, r.jord2, r.jord3, r.jord4][idx] ?? null,
          })),
        );
        const funn: string[] = [];
        kanalSerier.forEach((serie, idx) => {
          const f = probeHelse(serie);
          if (f.melding && (f.status === 'frakoblet' || f.status === 'fastlast')) {
            funn.push(`${sensorEtikett(idx + 1, p.skillevegger)} ${f.melding}`);
          }
        });
        for (const f of luftFunn(kanalSerier)) {
          funn.push(`${sensorEtikett(f.kanal, p.skillevegger)} ${f.melding}`);
        }
        const jordSnitt = k.historikk.map((r) => {
          const verdier = [r.jord1, r.jord2, r.jord3, r.jord4]
            .map((x) => jordfuktProsent(x))
            .filter((x): x is number => x !== null);
          return {
            t: r.registrert_at ? new Date(r.registrert_at).getTime() : 0,
            pct: verdier.length ? verdier.reduce((a, b) => a + b, 0) / verdier.length : NaN,
          };
        });
        if (vekeHelse(jordSnitt, trend.sistFyltAt).advar) {
          funn.push('påfyllingen nådde ikke jorda — sjekk at veka når vannet');
        }
        if (funn.length > 0) {
          ut.push({
            kategori: 'utstyr',
            alvor: 'mid',
            ikon: '🔧',
            melding: `Maskinvare: ${funn[0]}${funn.length > 1 ? ` (+${funn.length - 1} til — se detaljen)` : ''}`,
          });
        }
      }
    }
  }

  // ── Lys: gjeldende plan mot plantenes DLI-behov (i drift, med planter) ──
  if (p.i_drift && k.planter.length > 0) {
    const timer = k.command ? lysVarighetTimer(k.command.timer_on, k.command.timer_off) : 0;
    const intensitet = k.command?.intensitet ?? 0;
    const dli = beregnDli(intensitet, timer, ppfd);
    const helse = vurderPlanteDli(k.planter.map((pp) => pp.plante), dli);
    const lavt = helse.filter((h) => h.status === 'lavt').length;
    const hoyt = helse.filter((h) => h.status === 'hoyt').length;
    if ((intensitet === 0 || timer === 0) && lavt > 0) {
      ut.push({
        kategori: 'lys',
        alvor: 'mid',
        ikon: '💡',
        melding: 'Vekstlyset står av — plantene får ikke lyset de trenger',
      });
    } else if (lavt > 0) {
      ut.push({
        kategori: 'lys',
        alvor: 'mid',
        ikon: '💡',
        melding: `Lysplanen gir for lite lys for ${lavt} ${lavt === 1 ? 'plante' : 'planter'} — åpne Vekstlys og bruk anbefalingen`,
      });
    } else if (hoyt > 0) {
      ut.push({
        kategori: 'lys',
        alvor: 'mid',
        ikon: '💡',
        melding: `Lysplanen gir mer lys enn ${hoyt} ${hoyt === 1 ? 'plante' : 'planter'} tåler — skru ned intensiteten`,
      });
    }
  }

  // ── Gjøremål/gode nyheter (uavhengig av sensorer, kun i drift) ──
  if (p.i_drift && k.planter.length > 0) {
    const n = kasseNaering(k.planter.map((pp) => pp.plantet_at), naa);
    if (n?.handlingNaa) {
      ut.push({ kategori: 'naering', alvor: 'gjøremål', ikon: '🧪', melding: 'På tide å starte næring i badet' });
    }
    const h = mestAktuelleHosting(
      k.planter.map((pp) => ({
        navn: pp.plante.navn,
        plantet_at: pp.plantet_at,
        dager_til_hosting: pp.plante.dager_til_hosting,
        kategori: pp.plante.kategori,
      })),
      naa,
    );
    // Nudge kun når noe NETTOPP ble høsteklar — ellers ville en kontinuerlig
    // plante ligge som «klar!» i feeden for alltid. Etter vinduet lever
    // høste-tilstanden videre på kortet/felt-arket, ikke i varsel-feeden.
    if (h?.status.klar && h.status.dagerHosteklar <= HOSTE_NUDGE_DAGER) {
      ut.push({
        kategori: 'hosting',
        alvor: 'positiv',
        ikon: '🧺',
        melding: h.status.kontinuerlig
          ? `${h.navn} er høsteklar — høst etter behov`
          : `${h.navn} er klar til høsting`,
      });
    }
  }

  return ut;
}
