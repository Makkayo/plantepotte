# test_logic.py — kjør med:  python test_logic.py
#
# Verifiserer beslutningslogikken til firmwaren UTEN hardware. Hvis alt
# passerer, vet vi at lys-timeren, tidssone-omregningen og dimmingen er riktige
# før vi laster koden opp på ESP32-en.

from logic import (hhmm_to_min, local_hm, light_should_be_on,
                   duty_for, clamp, adjust, int_or_default)

_fails = 0


def check(name, got, want):
    global _fails
    ok = got == want
    print(("PASS " if ok else "FAIL "), name, "->", repr(got),
          "" if ok else "(forventet " + repr(want) + ")")
    if not ok:
        _fails += 1


# ── klokkeslett-parsing ──
check("hhmm 07:30", hhmm_to_min("07:30"), 450)
check("hhmm 00:00", hhmm_to_min("00:00"), 0)
check("hhmm 23:59", hhmm_to_min("23:59"), 1439)
check("hhmm ugyldig", hhmm_to_min("xx:yy"), None)

# ── tidssone (UTC -> norsk) ──
check("UTC 22:00 +2 = 00:00", local_hm(22, 0, 2), (0, 0))
check("UTC 05:30 +2 = 07:30", local_hm(5, 30, 2), (7, 30))

# ── lys-timer: vanlig dag 07:00-23:00 ──
on, off = hhmm_to_min("07:00"), hhmm_to_min("23:00")
check("12:00 -> PA", light_should_be_on(720, on, off), True)
check("06:00 -> AV", light_should_be_on(360, on, off), False)
check("07:00 -> PA (grense)", light_should_be_on(420, on, off), True)
check("23:00 -> AV (grense)", light_should_be_on(1380, on, off), False)

# ── lys-timer: krysser midnatt 20:00-06:00 ──
on2, off2 = hhmm_to_min("20:00"), hhmm_to_min("06:00")
check("23:00 -> PA (natt)", light_should_be_on(1380, on2, off2), True)
check("03:00 -> PA (natt)", light_should_be_on(180, on2, off2), True)
check("12:00 -> AV (natt)", light_should_be_on(720, on2, off2), False)

# ── dimming / PWM duty ──
check("70% & på", duty_for(70, True), int(70 / 100 * 1023))
check("70% & av", duty_for(70, False), 0)
check("over 100 klampes", duty_for(150, True), 1023)

# ── kommando-parsing (int_or_default) ──
check("0 % forblir 0 (ikke 70!)", int_or_default(0, 70), 0)
check("None -> default", int_or_default(None, 70), 70)
check("tall som tekst", int_or_default("55", 70), 55)
check("sopple -> default", int_or_default("xyz", 70), 70)

# ── encoder-justering ──
check("adjust +5", adjust(80, 5), 85)
check("adjust klamp 100", adjust(98, 5), 100)
check("adjust klamp 0", adjust(2, -5), 0)

print("-" * 44)
if _fails == 0:
    print("ALLE TESTER PASSERTE")
else:
    print(str(_fails) + " TEST(ER) FEILET")
    raise SystemExit(1)
