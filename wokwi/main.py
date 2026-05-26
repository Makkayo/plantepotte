# Plantepotte — Wokwi-simulator
# Potte 1, komplett krets (ingen WiFi/Supabase)
#
# Komponenter:
#   ESP32 DevKit v1     — mikrokontroller
#   SSD1306 OLED        — 128×64 I2C-display (GPIO21/22)
#   DHT22               — temperatur + luftfuktighet (GPIO4)
#   KY-040 encoder      — vridbar LED-dimmer (GPIO16/17/18)
#   Potentiometer ×3    — jordfuktsensorer (GPIO34/35/32)
#   Trykknapp ×2 (Q/W)  — XKC-Y25 vannstandsensorer (GPIO19/23)
#   N-MOSFET + LED      — vekstlys: GPIO26 PWM → 100Ω → gate → LED via drain/source
#   Slide-switch        — strøm til vekstlys-kretsen (5V inn/ut)
#
#   IKKE simulert (finnes ikke i Wokwi):
#     Buck converter, 12V adapter, barrel jack, 3A sikring
#
# Slik bruker du simulatoren:
#   Vri encoder         → LED-lysstyrke (5% per klikk)
#   Trykk encoder-knapp → reset lysstyrke til 80%
#   Trykk Q (tastatur)  → XKC lav-sensor (vann detektert)
#   Trykk W (tastatur)  → XKC mid-sensor
#   Vri potentiometer   → jordfuktighet (venstre = tørr, høyre = våt)
#   (Slide-switch: ikke koblet ennå — ep:VIN er ugyldig pin i Wokwi)

from machine import Pin, PWM, I2C, ADC
import dht
import ssd1306
import time

# ── I2C + OLED ───────────────────────────────────────────────────
i2c  = I2C(0, sda=Pin(21), scl=Pin(22), freq=400_000)
oled = ssd1306.SSD1306_I2C(128, 64, i2c)

def oled_melding(linje1, linje2=""):
    oled.fill(0)
    oled.text(linje1, 0, 24)
    oled.text(linje2, 0, 36)
    oled.show()

oled_melding("Plantepotte", "  starter...")
time.sleep_ms(800)

# ── DHT22 ────────────────────────────────────────────────────────
sensor = dht.DHT22(Pin(4))

# ── LED-strip PWM (rød LED i simulator = vekstlys) ───────────────
led_pwm   = PWM(Pin(26), freq=1000)
lysstyrke = 80                        # prosent 0–100
led_pwm.duty(int(lysstyrke / 100 * 1023))

# ── Jordfuktsensorer (potentiometer i simulator) ─────────────────
# GPIO34/35/32 er ADC-input-only pinner på ESP32
adc_pins = [34, 35, 32]
adc = []
for p in adc_pins:
    a = ADC(Pin(p))
    a.atten(ADC.ATTN_11DB)   # full 0–3.3V rekkevidde → 0–4095
    adc.append(a)

# ── XKC-Y25 vannstandssensorer (trykknapp i simulator) ───────────
# Intern pull-up: HIGH = ingen vann, LOW = vann detektert (NPN-sensor)
xkc_lav = Pin(19, Pin.IN, Pin.PULL_UP)   # Q-tast i Wokwi
xkc_mid = Pin(23, Pin.IN, Pin.PULL_UP)   # W-tast i Wokwi

# ── KY-040 rotary encoder ────────────────────────────────────────
clk_pin     = Pin(16, Pin.IN)
dt_pin      = Pin(17, Pin.IN)
sw_pin      = Pin(18, Pin.IN, Pin.PULL_UP)
forrige_clk = clk_pin.value()
sw_trykket  = False

# ── Hjelpefunksjoner ─────────────────────────────────────────────
def vann_status():
    lav = not xkc_lav.value()   # True = vann detektert
    mid = not xkc_mid.value()
    if lav and mid: return "FULL  "
    if lav:         return "HALV  "
    return                 "TOM   "

def jord_prosent(a):
    raw = a.read()               # 0–4095
    # Kapasitiv sensor: lavere raw = våtere jord
    # I simulator: potensiometer til venstre = tørr, høyre = våt
    return max(0, min(100, int((4095 - raw) / 4095 * 100)))

# ── Startmelding ─────────────────────────────────────────────────
print("=" * 40)
print("Plantepotte klar! (Wokwi-simulator)")
print("  Vri encoder  → LED-lysstyrke")
print("  Tast Q       → XKC lav-sensor")
print("  Tast W       → XKC mid-sensor")
print("  3 pottmetre  → jordfuktighet")
print("=" * 40)

# ── Hovedløkke ───────────────────────────────────────────────────
while True:
    # DHT22 temp + fukt
    try:
        sensor.measure()
        temp = sensor.temperature()
        fukt = sensor.humidity()
    except Exception:
        temp, fukt = 0.0, 0.0

    # Encoder — sjekk rotasjon
    clk_val = clk_pin.value()
    if clk_val != forrige_clk:
        if dt_pin.value() != clk_val:
            lysstyrke = min(100, lysstyrke + 5)   # dreide høyre
        else:
            lysstyrke = max(0,   lysstyrke - 5)   # dreide venstre
        led_pwm.duty(int(lysstyrke / 100 * 1023))
        forrige_clk = clk_val

    # Encoder — sjekk knapp (reset lysstyrke)
    sw_naa = not sw_pin.value()
    if sw_naa and not sw_trykket:
        lysstyrke = 80
        led_pwm.duty(int(lysstyrke / 100 * 1023))
        print("Encoder-knapp: lysstyrke reset til 80%")
    sw_trykket = sw_naa

    # Jordfukt
    j = [jord_prosent(a) for a in adc]

    # OLED oppdatering
    oled.fill(0)
    oled.text(f"{temp:.1f}C  {fukt:.0f}% rH", 0, 0)
    oled.text(f"Vann: {vann_status()}", 0, 12)
    oled.text(f"J1:{j[0]}% J2:{j[1]}% J3:{j[2]}%", 0, 24)
    oled.text(f"LED:  {lysstyrke}%", 0, 36)
    oled.text("Q=lav  W=mid  enc=lys", 0, 52)
    oled.show()

    # Seriell output (vises i Wokwi-konsoll)
    print(f"T={temp:.1f}C H={fukt:.0f}% Vann={vann_status().strip()} "
          f"J={j[0]}/{j[1]}/{j[2]}% LED={lysstyrke}%")

    time.sleep_ms(200)
