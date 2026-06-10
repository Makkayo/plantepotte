# main.py — Plantepotte firmware (potte 1)
# ESP32 + MicroPython. Bruker logic.py for alle beslutninger (testbar på PC).
#
# Hva den gjor, i loop hvert 5. sekund:
#   1. Sorger for at WiFi er oppe (gjenoppkobler ved brudd)
#   2. Henter lys-kommando fra Supabase (intensitet + timer pa/av)
#   3. Leser sensorer: DHT22, inntil 4x jordfukt (ra ADC), VL53L0X vann-avstand (mm)
#   4. Styrer LED-strip via MOSFET (PWM) etter timer + intensitet
#   5. Lokal dimming med KY-040: vri = +/-5 %, trykk = tilbake til app-verdien
#      (begge reagerer OYEBLIKKELIG via interrupt — venter ikke pa loopen)
#   6. Poster sensordata til Supabase hvert 60. sekund
#   7. Viser status pa OLED
#   8. Re-synker klokka mot NTP en gang i dognet (ESP32-klokka drifter)
#   9. Watchdog (hvis BRUK_WATCHDOG=True): restarter ESP32 automatisk hvis
#      loopen henger i over 2 min (f.eks. nettverkskall som aldri svarer)

import time
import network
import urequests
import dht
import ntptime
from machine import Pin, PWM, ADC, SoftI2C, RTC, WDT

from config import (SUPABASE_URL, ANON_KEY, POTTE_ID, TZ_OFFSET_HOURS,
                    WIFI_SSID, WIFI_PASS, DEFAULT_INTENSITET,
                    DEFAULT_TIMER_ON, DEFAULT_TIMER_OFF, BRUK_WATCHDOG,
                    AKTIVE_JORDSENSORER)
import ssd1306
import logic

# Laser-driveren er valgfri: taler at den mangler/feiler (vann blir None).
try:
    import vl53l0x
    _HAS_LASER_DRIVER = True
except Exception as e:
    print("vl53l0x-driver ikke lastet:", e)
    _HAS_LASER_DRIVER = False

# ── Hardware ──
led = PWM(Pin(26), freq=1000)
led.duty(0)

dht_sensor = dht.DHT22(Pin(4))

# 4 jordfukt-plasser pa ADC1-pinner (trygge med WiFi). Plass 1-4 = GPIO
# 34/35/32/33. Vi setter opp alle 4, men leser kun de i AKTIVE_JORDSENSORER.
SOIL_PINS = (34, 35, 32, 33)
soil = []
for _p in SOIL_PINS:
    _a = ADC(Pin(_p))
    _a.atten(ADC.ATTN_11DB)        # full 0-3.3 V -> 0-4095
    soil.append(_a)

i2c = SoftI2C(scl=Pin(22), sda=Pin(21))

try:
    display = ssd1306.SSD1306_I2C(128, 64, i2c)
except Exception as e:
    print("OLED-init feilet:", e)
    display = None

tof = None
if _HAS_LASER_DRIVER:
    try:
        tof = vl53l0x.VL53L0X(i2c)
    except Exception as e:
        print("Laser-init feilet:", e)
        tof = None

# KY-040 dreieknapp
clk = Pin(16, Pin.IN, Pin.PULL_UP)
dt = Pin(17, Pin.IN, Pin.PULL_UP)
sw = Pin(18, Pin.IN, Pin.PULL_UP)

rtc = RTC()
sta = network.WLAN(network.STA_IF)
headers = {
    "apikey": ANON_KEY,
    "Authorization": "Bearer " + ANON_KEY,
    "Content-Type": "application/json",
}

# ── Tilstand ──
intensitet = DEFAULT_INTENSITET       # gjeldende lysstyrke (kan justeres av encoder)
app_intensitet = DEFAULT_INTENSITET   # siste verdi fra appen (encoder-trykk gar hit)
timer_on = DEFAULT_TIMER_ON
timer_off = DEFAULT_TIMER_OFF
lyser = False                         # er lyset pa akkurat na? (timer-styrt, settes i loopen)
last_cmd_stamp = None
_last_turn_ms = 0                     # debounce: tidspunkt for siste godkjente vridning
_last_press_ms = 0                    # debounce for encoder-knappen


def _apply_duty():
    """Oppdater PWM med en gang — kalles bade fra loopen og fra interrupts,
    sa knappen/vridninger far OYEBLIKKELIG effekt (ikke 5+ sek forsinkelse)."""
    led.duty(logic.duty_for(intensitet, lyser))


# ── KY-040 via interrupt (mister aldri en vridning) ──
# Billige KY-040 spretter mekanisk og gir falske trinn uten debounce.
# 200 ms mellom godkjente vridninger filtrerer bort sprettet (bevist pa
# breadboard 2026-06-09). Raskt nok for en dimmer; trege vridninger taper
# ingen trinn.
def _on_turn(pin):
    global intensitet, _last_turn_ms
    now = time.ticks_ms()
    if time.ticks_diff(now, _last_turn_ms) < 200:
        return
    _last_turn_ms = now
    if dt.value():
        intensitet = logic.adjust(intensitet, 5)     # med klokka = lysere
    else:
        intensitet = logic.adjust(intensitet, -5)    # mot klokka = morkere
    _apply_duty()


# Encoder-knapp via interrupt: trykk = tilbake til appens verdi.
# (Var tidligere pollet hvert 5. sek — korte trykk kunne forsvinne.)
def _on_press(pin):
    global intensitet, _last_press_ms
    now = time.ticks_ms()
    if time.ticks_diff(now, _last_press_ms) < 300:
        return
    _last_press_ms = now
    intensitet = app_intensitet
    _apply_duty()


clk.irq(trigger=Pin.IRQ_FALLING, handler=_on_turn)
sw.irq(trigger=Pin.IRQ_FALLING, handler=_on_press)


# ── WiFi ──
def ensure_wifi():
    if sta.isconnected():
        return True
    try:
        sta.active(True)
        sta.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(20):
            if sta.isconnected():
                print("WiFi gjenoppkoblet:", sta.ifconfig()[0])
                return True
            time.sleep(0.5)
    except Exception as e:
        print("WiFi-feil:", e)
    return sta.isconnected()


# ── Supabase ──
def get_cmd():
    url = (SUPABASE_URL + "/rest/v1/potte_commands?potte_id=eq." + POTTE_ID +
           "&select=intensitet,timer_on,timer_off,updated_at" +
           "&order=updated_at.desc&limit=1")
    try:
        r = urequests.get(url, headers=headers)
        data = r.json()
        r.close()
        return data[0] if data else None
    except Exception as e:
        print("get_cmd feilet:", e)
        return None


def post_sensors(temp, hum, s, vann_mm):
    url = SUPABASE_URL + "/rest/v1/potte_sensor_data"
    post_headers = dict(headers)
    post_headers["Prefer"] = "return=minimal"
    payload = {
        "potte_id": POTTE_ID,
        "temperatur": temp,
        "luftfuktighet": hum,
        "jord1": s[0], "jord2": s[1], "jord3": s[2], "jord4": s[3],
        "vann_avstand_mm": vann_mm,
    }
    try:
        r = urequests.post(url, headers=post_headers, json=payload)
        r.close()
        return True
    except Exception as e:
        print("post_sensors feilet:", e)
        return False


# ── Sensorer ──
def read_sensors():
    try:
        dht_sensor.measure()
        temp = dht_sensor.temperature()
        hum = dht_sensor.humidity()
    except Exception:
        temp, hum = None, None
    # Les kun aktive plasser; resten blir None (appen viser dem ikke).
    s = [soil[i].read() if (i + 1) in AKTIVE_JORDSENSORER else None
         for i in range(4)]               # ra ADC 0-4095 (appen kalibrerer)
    vann_mm = None
    if tof:
        try:
            vann_mm = tof.read()
        except Exception:
            vann_mm = None
    return temp, hum, s, vann_mm


# ── OLED ──
def _txt(v):
    return "-" if v is None else str(v)


def show(temp, hum, s, vann_mm, lys_pst, lyser, wifi_ok):
    if not display:
        return
    display.fill(0)
    display.text(POTTE_ID + ("   net:ON" if wifi_ok else "   net:--"), 0, 0)
    display.text("T:" + _txt(temp) + "C RH:" + _txt(hum) + "%", 0, 11)
    display.text("Lys:" + str(lys_pst) + "% " + ("PA" if lyser else "AV"), 0, 22)
    display.text("Vann:" + _txt(vann_mm) + "mm", 0, 33)
    display.text("J1:" + _txt(s[0]) + " J2:" + _txt(s[1]), 0, 44)
    display.text("J3:" + _txt(s[2]) + " J4:" + _txt(s[3]), 0, 55)
    display.show()


# ── Klokke (NTP) ──
def sync_ntp():
    try:
        ntptime.settime()                  # setter RTC til UTC
        return True
    except Exception:
        return False


# ── Oppstart ──
print("=" * 40)
print("Plantepotte firmware - " + POTTE_ID)
ensure_wifi()
ntp_ok = False
for _ in range(3):                        # NTP med noen forsok
    if sync_ntp():
        ntp_ok = True
        print("NTP-tid satt (UTC)")
        break
    time.sleep(1)
if not ntp_ok:
    print("ADVARSEL: ingen NTP-tid enna - lystimer venter pa nett")
print("=" * 40)

POST_INTERVAL = 60
NTP_INTERVAL = 24 * 3600                   # re-synk klokka en gang i dognet
last_post = -POST_INTERVAL                 # post med en gang ved oppstart
last_ntp = time.time()

# Watchdog: ESP32 restarter seg selv hvis loopen ikke "melder fra" (feed)
# innen 2 min — redder potta hvis et nettverkskall henger for alltid.
wdt = WDT(timeout=120000) if BRUK_WATCHDOG else None
if wdt:
    print("Watchdog aktiv (2 min)")

# ── Hovedlokke ──
while True:
    if wdt:
        wdt.feed()
    wifi_ok = ensure_wifi()

    # Klokke: re-synk hvert dogn, og prov igjen sa fort nettet er oppe
    # hvis oppstarten skjedde uten internett (ellers er lystimeren feil).
    if wifi_ok and (not ntp_ok or (time.time() - last_ntp) >= NTP_INTERVAL):
        if sync_ntp():
            if not ntp_ok:
                print("NTP-tid satt (UTC)")
            ntp_ok = True
            last_ntp = time.time()

    # 1) Hent kommando. Ny app-verdi (updated_at endret) overstyrer lokal dimming.
    cmd = get_cmd() if wifi_ok else None
    if cmd:
        stamp = cmd.get("updated_at")
        if stamp != last_cmd_stamp:
            last_cmd_stamp = stamp
            # `or DEFAULT` fanger ogsa null-verdi fra DB (ikke bare manglende felt)
            app_intensitet = int(cmd.get("intensitet") or DEFAULT_INTENSITET)
            intensitet = app_intensitet
            timer_on = cmd.get("timer_on", DEFAULT_TIMER_ON)
            timer_off = cmd.get("timer_off", DEFAULT_TIMER_OFF)
            print("Ny kommando:", app_intensitet, "%", timer_on, "-", timer_off)

    # 2) Les sensorer (encoder-knappen handteres na av interrupt, ikke her)
    temp, hum, s, vann_mm = read_sensors()

    # 3) Skal lyset sta pa? (timer + lokal tid)
    _, _, _, _, hh, mm, _, _ = rtc.datetime()
    lh, lm = logic.local_hm(hh, mm, TZ_OFFSET_HOURS)
    now_min = lh * 60 + lm
    lyser = logic.light_should_be_on(now_min,
                                     logic.hhmm_to_min(timer_on),
                                     logic.hhmm_to_min(timer_off))
    _apply_duty()

    # 4) Skjerm
    show(temp, hum, s, vann_mm, intensitet, lyser, wifi_ok)

    # 5) Post sensordata hvert 60. sek
    if wifi_ok and (time.time() - last_post) >= POST_INTERVAL:
        if post_sensors(temp, hum, s, vann_mm):
            last_post = time.time()
            print("Sensordata sendt.")

    time.sleep(5)
