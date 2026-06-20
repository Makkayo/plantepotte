# logic.py — ren beslutningslogikk for Plantepotte-firmwaren.
#
# Denne fila importerer INGENTING fra `machine`/`network`, så den kan kjøres
# både på ESP32 (MicroPython) OG på en vanlig PC (CPython). Det betyr at vi
# kan teste lys-timer, tidssone og dimming med `python test_logic.py` FØR vi
# flasher noe — og det vi tester her er nøyaktig det main.py bruker.


def hhmm_to_min(s):
    """'07:30' -> 450 minutter siden midnatt. None ved ugyldig format."""
    try:
        return int(s[0:2]) * 60 + int(s[3:5])
    except (ValueError, TypeError, IndexError):
        return None


def local_hm(utc_h, utc_m, tz_offset_hours):
    """UTC-tid + norsk offset -> (time, minutt) i lokal tid."""
    return (utc_h + tz_offset_hours) % 24, utc_m


def _ukedag(y, m, d):
    """Ukedag for en dato (0=sondag ... 6=lordag). Sakamotos algoritme — ren
    aritmetikk, virker likt pa CPython og MicroPython."""
    t = (0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4)
    if m < 3:
        y -= 1
    return (y + y // 4 - y // 100 + y // 400 + t[m - 1] + d) % 7


def _siste_sondag(y, m, dager):
    """Datoen for siste sondag i en maned med `dager` dager."""
    return dager - _ukedag(y, m, dager)


def norsk_utc_offset(year, month, mday, hour):
    """Norsk UTC-offset i timer for en UTC-dato/-tid: 1 = CET (vinter), 2 = CEST
    (sommer). EU-sommertid varer fra siste sondag i mars kl 01:00 UTC til siste
    sondag i oktober kl 01:00 UTC — regnes ut her, sa ingen manuell halvarlig
    endring av config trengs. (Mars og oktober har alltid 31 dager.)"""
    start = (3, _siste_sondag(year, 3, 31), 1)
    slutt = (10, _siste_sondag(year, 10, 31), 1)
    naa = (month, mday, hour)
    return 2 if start <= naa < slutt else 1


def clamp(v, lo, hi):
    if v < lo:
        return lo
    if v > hi:
        return hi
    return v


def int_or_default(v, default):
    """Heltall fra et kommando-felt. None/ugyldig -> default.

    VIKTIG: `int(v or default)` er IKKE det samme — `0 or 70` blir 70 i
    Python, så gyldig 0 % fra appen ville blitt til 70 %. Denne tar vare på 0.
    """
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


def light_should_be_on(now_min, on_min, off_min):
    """Skal lyset stå på nå? Støtter at timeren krysser midnatt.

    Alle argumenter er minutter siden midnatt (0-1439).
    """
    if on_min is None or off_min is None:
        return False
    if on_min == off_min:
        return False                      # ingen lystid definert
    if on_min < off_min:                  # vanlig dag, f.eks. 07:00-23:00
        return on_min <= now_min < off_min
    return now_min >= on_min or now_min < off_min   # krysser midnatt, f.eks. 20:00-06:00


def duty_for(intensitet, light_on, max_duty=1023):
    """Lysstyrke i prosent (0-100) + på/av -> PWM duty (0..max_duty)."""
    if not light_on:
        return 0
    return int(clamp(intensitet, 0, 100) / 100 * max_duty)


def adjust(intensitet, delta, lo=0, hi=100):
    """Encoder-justering av lysstyrke, med klamping innenfor 0-100."""
    return clamp(intensitet + delta, lo, hi)
