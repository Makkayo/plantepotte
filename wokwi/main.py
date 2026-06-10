# Plantepotte — Wokwi-simulator (med lys-timer)
#
# Bruker SAMME logic.py som den ekte firmwaren (firmware/), så lys-timeren du
# ser her er nøyaktig den som kjører på potta. Wokwi har ingen WiFi/Supabase,
# så vi simulerer to ting:
#   • en RASK klokke — et helt døgn på ca. 25 sek — så du SER lyset slå seg
#     på kl 07:00 og av kl 23:00
#   • "kommandoen" fra appen (intensitet 70 %, timer 07:00–23:00)
#
# Kontroller i simulatoren:
#   Vri encoder   → lysstyrke ±5 %   (men lyset er kun på innenfor timer-vinduet)
#   Trykk encoder → tilbake til app-verdien (70 %)
#   Vann-pot      → vannstand
#   3 jord-pot    → jordfuktighet
#
# IKKE simulert (finnes ikke i Wokwi): WiFi, Supabase, VL53L0X-laser, buck,
# 12V-adapter. Vannstanden styres av et potmeter i stedet for laseren.

from machine import Pin, PWM, I2C, ADC
import dht
import ssd1306
import time
import logic

# ── "Kommando" fra appen (ville kommet fra Supabase) ──
APP_INTENSITET = 70
TIMER_ON = "07:00"
TIMER_OFF = "23:00"
on_min = logic.hhmm_to_min(TIMER_ON)
off_min = logic.hhmm_to_min(TIMER_OFF)

# ── Simulert klokke ──
sim_min = 6 * 60        # start 06:00 (rett før på-tid, så du ser den slå på)
SIM_STEP_MIN = 11       # minutter per loop → ~25 s per simulert døgn

# ── I2C + OLED ──
i2c = I2C(0, sda=Pin(21), scl=Pin(22), freq=400_000)
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

# ── DHT22 ──
sensor = dht.DHT22(Pin(4))

# ── LED (rød LED i sim = vekstlys) ──
led = PWM(Pin(26), freq=1000)
intensitet = APP_INTENSITET

# ── Jordfukt + vann (potmeter i sim) ──
# Sim viser 3 jord-pot; den ekte firmwaren støtter 4 plasser (34/35/32/33,
# styrt av AKTIVE_JORDSENSORER i config). Vann-potmeteret ligger derfor på
# GPIO 39 (VN) — GPIO 33 er reservert jordfukt #4 i det ekte bygget.
adc = []
for p in (34, 35, 32):
    a = ADC(Pin(p))
    a.atten(ADC.ATTN_11DB)
    adc.append(a)
vann_adc = ADC(Pin(39))
vann_adc.atten(ADC.ATTN_11DB)

# ── KY-040 ──
clk = Pin(16, Pin.IN, Pin.PULL_UP)
dt = Pin(17, Pin.IN, Pin.PULL_UP)
sw = Pin(18, Pin.IN, Pin.PULL_UP)
sw_prev = False


def _turn(pin):
    global intensitet
    if dt.value():
        intensitet = logic.adjust(intensitet, 5)
    else:
        intensitet = logic.adjust(intensitet, -5)


clk.irq(trigger=Pin.IRQ_FALLING, handler=_turn)


def vann():
    raw = vann_adc.read()
    pst = max(0, min(100, int(raw / 4095 * 100)))
    mm = 200 - int(pst / 100 * 160)        # 200 mm (tom) … 40 mm (full)
    return pst, mm


def jord(a):
    return max(0, min(100, int((4095 - a.read()) / 4095 * 100)))


print("Plantepotte Wokwi-sim med lys-timer.")
print("  Vri encoder = lysstyrke, vann-pot = vannstand.")
print("  Klokka gaar raskt — se lyset slaa seg paa 07:00 og av 23:00.")

while True:
    # DHT22
    try:
        sensor.measure()
        temp, fukt = sensor.temperature(), sensor.humidity()
    except Exception:
        temp, fukt = 0.0, 0.0

    # Encoder-knapp → tilbake til app-verdi
    sw_now = not sw.value()
    if sw_now and not sw_prev:
        intensitet = APP_INTENSITET
    sw_prev = sw_now

    # Klokka fremover
    sim_min = (sim_min + SIM_STEP_MIN) % 1440
    h, m = sim_min // 60, sim_min % 60

    # SAMME beslutning som ekte firmware:
    lyser = logic.light_should_be_on(sim_min, on_min, off_min)
    led.duty(logic.duty_for(intensitet, lyser))

    j = [jord(a) for a in adc]
    vpst, vmm = vann()

    # OLED (maks 16 tegn pr linje)
    oled.fill(0)
    oled.text("{:02d}:{:02d}  {}".format(h, m, "LYS PA" if lyser else "lys av"), 0, 0)
    oled.text("LED: {}%".format(intensitet), 0, 11)
    oled.text("Vindu 07-23", 0, 22)
    oled.text("Vann: {}% {}mm".format(vpst, vmm), 0, 33)
    oled.text("Jord {} {} {}".format(j[0], j[1], j[2]), 0, 44)
    oled.text("encoder = lys", 0, 55)
    oled.show()

    # Seriell (Wokwi-konsoll)
    print("Kl {:02d}:{:02d} {} LED={}% Vann={}%/{}mm Jord={}/{}/{}".format(
        h, m, "PA" if lyser else "av", intensitet, vpst, vmm, j[0], j[1], j[2]))

    time.sleep_ms(200)
