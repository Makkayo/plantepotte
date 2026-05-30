# Plantepotte — Wokwi-simulator
# Potte 1, komplett krets (ingen WiFi/Supabase)
#
# Komponenter:
#   ESP32 DevKit v1     — mikrokontroller
#   SSD1306 OLED        — 128×64 I2C-display (GPIO21/22)
#   DHT22               — temperatur + luftfuktighet (GPIO4)
#   KY-040 encoder      — vridbar LED-dimmer (GPIO16/17/18)
#   Potentiometer ×3    — jordfuktsensorer (GPIO34/35/32)
#   Potentiometer ×1    — vannstand (simulerer VL53L0X-laser, GPIO33)
#   N-MOSFET + LED      — vekstlys: GPIO26 PWM → 100Ω → gate → LED via drain/source
#   Slide-switch        — strøm til vekstlys-kretsen (5V inn/ut)
#
#   IKKE simulert (finnes ikke i Wokwi):
#     Buck converter, 12V adapter, barrel jack, 3A sikring
#
# Slik bruker du simulatoren:
#   Vri encoder         → LED-lysstyrke (5% per klikk)
#   Trykk encoder-knapp → reset lysstyrke til 80%
#   Vri vann-pot        → vannstand (venstre = tomt/langt, høyre = fullt/nært)
#   Vri jord-potmetre   → jordfuktighet (venstre = tørr, høyre = våt)
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

# ── Vannstand (potentiometer i simulator = VL53L0X-laser) ────────
# Ekte hardware: laser måler avstand (mm) til en flottør. Wokwi har
# ingen laser, så vi bruker en potmeter som stand-in for vannstanden.
vann_adc = ADC(Pin(33))
vann_adc.atten(ADC.ATTN_11DB)            # 0–3.3V → 0–4095

# ── KY-040 rotary encoder ────────────────────────────────────────
clk_pin     = Pin(16, Pin.IN, Pin.PULL_UP)
dt_pin      = Pin(17, Pin.IN, Pin.PULL_UP)
sw_pin      = Pin(18, Pin.IN, Pin.PULL_UP)
sw_trykket  = False

# Interrupt: brikken "vekkes" i samme øyeblikk encoderen vris,
# uansett hva hovedløkken ellers holder på med. Derfor mister vi
# aldri en vridning, selv om løkken sover.
def encoder_dreid(pin):
    global lysstyrke
    if dt_pin.value():
        lysstyrke = min(100, lysstyrke + 5)   # med klokka
    else:
        lysstyrke = max(0,   lysstyrke - 5)   # mot klokka
    led_pwm.duty(int(lysstyrke / 100 * 1023))

clk_pin.irq(trigger=Pin.IRQ_FALLING, handler=encoder_dreid)

# ── Hjelpefunksjoner ─────────────────────────────────────────────
def vann_nivaa():
    # Potmeter → simulert laser-avstand. Venstre (0) = flottør langt nede
    # (tomt, stor mm), høyre (4095) = flottør nær laser (fullt, liten mm).
    raw = vann_adc.read()                 # 0–4095
    pst = max(0, min(100, int(raw / 4095 * 100)))
    mm  = 200 - int(pst / 100 * 160)      # 200 mm (tom) … 40 mm (full)
    return pst, mm

def jord_prosent(a):
    raw = a.read()               # 0–4095
    # Kapasitiv sensor: lavere raw = våtere jord
    # I simulator: potensiometer til venstre = tørr, høyre = våt
    return max(0, min(100, int((4095 - raw) / 4095 * 100)))

# ── Startmelding ─────────────────────────────────────────────────
print("=" * 40)
print("Plantepotte klar! (Wokwi-simulator)")
print("  Vri encoder  → LED-lysstyrke")
print("  Vann-pot     → vannstand (mm + %)")
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

    # Encoder-rotasjon håndteres nå av interrupt (encoder_dreid) — ikke her.

    # Encoder — sjekk knapp (reset lysstyrke)
    sw_naa = not sw_pin.value()
    if sw_naa and not sw_trykket:
        lysstyrke = 80
        led_pwm.duty(int(lysstyrke / 100 * 1023))
        print("Encoder-knapp: lysstyrke reset til 80%")
    sw_trykket = sw_naa

    # Jordfukt
    j = [jord_prosent(a) for a in adc]

    # Vannstand (simulert laser)
    vann_pst, vann_mm = vann_nivaa()

    # OLED oppdatering
    oled.fill(0)
    oled.text(f"{temp:.1f}C  {fukt:.0f}% rH", 0, 0)
    oled.text(f"Vann: {vann_pst}% ({vann_mm}mm)", 0, 12)
    oled.text(f"J1:{j[0]}% J2:{j[1]}% J3:{j[2]}%", 0, 24)
    oled.text(f"LED:  {lysstyrke}%", 0, 36)
    oled.text("vann-pot  enc=lys", 0, 52)
    oled.show()

    # Seriell output (vises i Wokwi-konsoll)
    print(f"T={temp:.1f}C H={fukt:.0f}% Vann={vann_pst}%/{vann_mm}mm "
          f"J={j[0]}/{j[1]}/{j[2]}% LED={lysstyrke}%")

    time.sleep_ms(200)
