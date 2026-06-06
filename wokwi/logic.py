# logic.py — KOPI av firmware/logic.py (Wokwi laster filene fra denne mappa).
# Holdes identisk med firmware/logic.py så simulatoren tester samme logikk
# som kjører på den ekte potta.

def hhmm_to_min(s):
    try:
        return int(s[0:2]) * 60 + int(s[3:5])
    except (ValueError, TypeError, IndexError):
        return None


def local_hm(utc_h, utc_m, tz_offset_hours):
    return (utc_h + tz_offset_hours) % 24, utc_m


def clamp(v, lo, hi):
    if v < lo:
        return lo
    if v > hi:
        return hi
    return v


def light_should_be_on(now_min, on_min, off_min):
    if on_min is None or off_min is None:
        return False
    if on_min == off_min:
        return False
    if on_min < off_min:
        return on_min <= now_min < off_min
    return now_min >= on_min or now_min < off_min


def duty_for(intensitet, light_on, max_duty=1023):
    if not light_on:
        return 0
    return int(clamp(intensitet, 0, 100) / 100 * max_duty)


def adjust(intensitet, delta, lo=0, hi=100):
    return clamp(intensitet + delta, lo, hi)
