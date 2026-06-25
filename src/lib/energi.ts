/**
 * Strømforbruk for vekstlyset — grunnet i MÅLTE tall (10. juni 2026):
 * stripa trakk 0,94 A per potte ved 12 V og full styrke ⇒ ~11,3 W.
 *
 * PWM-dimming skalerer snitteffekten ~lineært med duty, så ved intensitet I%
 * er snitteffekten ≈ 11,3 × I/100 W mens lyset står på. Elektronikken (ESP32 +
 * sensorer, ~1–2 W) går uansett døgnet rundt og regnes ikke med her — dette er
 * spaken brukeren faktisk styrer: lysplanen.
 *
 * Tallet er et ærlig overslag (LED-effekt vs. PWM er ikke helt lineær, og
 * strømprisen svinger), men gir en god følelse av «hva koster lyset i måneden».
 */

/** Målt LED-effekt per potte ved 100 % intensitet (0,94 A × 12 V). */
export const LED_WATT_100 = 11.3;

/** Grov standard strømpris inkl. nettleie (kr/kWh). Juster — norsk spot svinger. */
export const STROMPRIS_KR_KWH = 1.5;

export interface LysEnergi {
  /** Snitteffekt (W) ved gjeldende intensitet. */
  wattSnitt: number;
  kwhPerDag: number;
  kwhPerManed: number;
  /** Estimert kostnad per måned (kr) ved oppgitt pris. */
  krPerManed: number;
}

/**
 * Estimer lysets energibruk for én potte.
 * @param intensitetProsent 0–100 (klampes)
 * @param timerPerDag       lengden på lys-vinduet (timer)
 * @param prisKrKwh         strømpris (kr/kWh), standard STROMPRIS_KR_KWH
 */
export function lysEnergi(
  intensitetProsent: number,
  timerPerDag: number,
  prisKrKwh: number = STROMPRIS_KR_KWH,
): LysEnergi {
  const i = Math.max(0, Math.min(100, intensitetProsent)) / 100;
  const timer = Math.max(0, timerPerDag);
  const wattSnitt = LED_WATT_100 * i;
  const kwhPerDag = (wattSnitt * timer) / 1000;
  const kwhPerManed = kwhPerDag * 30;
  return {
    wattSnitt: Math.round(wattSnitt * 10) / 10,
    kwhPerDag: Math.round(kwhPerDag * 1000) / 1000,
    kwhPerManed: Math.round(kwhPerManed * 10) / 10,
    krPerManed: Math.round(kwhPerManed * prisKrKwh),
  };
}
