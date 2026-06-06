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


def clamp(v, lo, hi):
    if v < lo:
        return lo
    if v > hi:
        return hi
    return v


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
