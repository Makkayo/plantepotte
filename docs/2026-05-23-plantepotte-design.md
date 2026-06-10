# Plantepotte — System Design

**Dato opprettet:** 2026-05-23
**Sist oppdatert:** 2026-05-30 (vannmåling oppdatert til VL53L0X-laser)
**Status:** Backend og web-app live. Hardware ankommer ~2. juni.

> ⚠️ **Dette er et øyeblikksbilde — gjeldende fasit er prosjekt-skillen** (`C:\Users\marku\.claude\skills\plantepotte\skill.md`). Disse delene er fortsatt historiske og er IKKE oppdatert her:
> - **Kamera:** ESP32-CAM lagt til på potte 1 → bilder til Supabase Storage → vekst-tidslinje i appen (gjøres når kameraet er testet).
> - **Web-app:** er skrevet om til **Svelte 5 + TypeScript + Vite** (ikke lenger vanilla én-fil `index.html` som beskrevet nederst).
> - **Auto-justerende lys** (stepper + lead screw) er en utforsket fremtidsidé — se skillen.
> - **Fysisk design** nederst beskriver et eldre "3 deler"-konsept; gjeldende 3D-modell er base + 4 stolper + tak (se skillen).
>
> ✅ **Vannmåling er nå oppdatert i dette dokumentet:** XKC-Y25 er erstattet av **VL53L0X ToF-laser + 3D-printet flottør** i en berolings-brønn, og datafeltet er `vann_avstand_mm` (rå mm fra laser til flottør). XKC-Y25 ×4 er reserve. GPIO-tabell, koblingsdiagram, `main.py`, SQL og datakontrakt under reflekterer laseren.

---

## Konsept

Modulær, selvvannende innendørs plantepotte med app-styrte vekstlys. Passiv sub-irrigasjon (veke/kapillærsystem). Ingen pumpe. ESP32 styrer LED-strip via WiFi + Supabase. Kontrolleres via web-app med innlogging.

Inspirert av Auk mini 2 — men 3D-printet, modulær og fullt egenbygd.

**Plan:** 2 potter. Potte 1 bygges først med full sensor-suite. Potte 2 bygges etterpå, enklere oppsett (kun lys + vannstand). Begge deler én strømforsyning.

---

## Fysisk design (3D-print)

**3 deler:**

1. **Bunn (reservoar)** — vannbeholder + vekeutgang i bunn. IKEA 365+ 5.2L brukes som tank. Veke henger ned i vannet.
2. **Kolonneringer** — stablebare mellomringer for høydejustering.
3. **Lokk/tak** — holder LED-strip + elektronikkboks. Lyset peker ned mot planten.

**Materiale:** PETG (tåler fukt bedre enn PLA)
**Printer:** Bambu Lab P2S, 256×256×256 mm byggeflate
**Veke:** 3 mm bomullssnor

Detaljert designplan: se `3d-design.html`.

---

## Elektronikk

### Komponenter (bestilt fra AliExpress, ~€90)

| Del | Spesifikasjon | Antall |
|-----|---------------|--------|
| ESP32 30-pin Type-C | WROOM-32D 32S | ×2 |
| LR7843/FR120N MOSFET-modul | Opto-isolert byggesett: bart kort + løs grønn 2-v (PWM/GND) + blå 3-v (+/LOAD/−) skrueklemme (loddes på). 3-pins header som fulgte med passer IKKE (5mm vs 2,54mm) — reserve | ×4 |
| Phyto LED-strip | 12V, 5050, 4 rød:1 blå, IP65, 5m. Målt 0,36 A per 40 cm (10,8 W/m) | ×1 |
| 12V adapter | AC 110–240V → 12V 3A, EU (5A-oppgradering planlagt for 2 potter) | ×1 |
| DC barrel jack | 5.5×2.1mm pigtail med skruklemmer | 10 par |
| Buck converter | **FAST 5V** USB-buck (KIS3R33S-type), 5A — barrel-jack inn (VIN) + USB/skruklemmer ut (5V/GND). IKKE justerbar | ×1 |
| Breadboard MB-102 | 830-punkt + 65 jumper-kabler | ×2 |
| LED clip connector | 8mm 2-pin solderless | 5 stk |
| KF301 terminalblokk | 2-pin sort, 5mm pitch | 10 stk |
| Vekemateriale | Bomullssnor 3mm, 10m | ×1 |
| Elektrisk tape | Værbestandig, 20 ft | ×1 |
| VL53L0X | ToF-laser avstandssensor, I2C, måler vannstand via flottør | ×3 |
| XKC-Y25 | Kapasitiv vannstandssensor (nå **reserve** — erstattet av laser) | ×4 |
| ESP32-CAM-MB | OV2640-kamera + programmeringsboard (vekst-tidslinje) | ×2 |
| KY-040 | Rotary encoder med knapp, 3.3V | 3 stk |
| Jordfuktsensor | Kapasitiv v2.0, korrosjonsbestandig | 3 stk |
| OLED SSD1306 | 0.96", I2C, 128×64, 3.3V | ×1 |
| DHT22 (AM2302) | Temp + luftfuktighet, 3.3V | ×1 |

### Lokalkjøp
- Multimeter (Jula UT131D eller DT832)
- Liten flat presisjonsskrutrekker
- Dobbeltsidig 3M-tape
- USB-C datakabel

### GPIO-tildeling (Potte 1)

| GPIO | Komponent | Funksjon | Spenning |
|------|-----------|----------|----------|
| 26   | MOSFET SIG | PWM 1 kHz til LED | Signal 3.3V |
| 21   | OLED SDA | I2C-data | 3.3V |
| 22   | OLED SCL | I2C-klokke | 3.3V |
| 4    | DHT22 DATA | Temp/fukt | 3.3V |
| 34   | Jordfukt #1 | ADC (input-only pin) | 3.3V |
| 35   | Jordfukt #2 | ADC (input-only pin) | 3.3V |
| 32   | Jordfukt #3 | ADC | 3.3V |
| 33   | Jordfukt #4 | ADC | 3.3V |
| 16   | KY-040 CLK | Rotary encoder | 3.3V |
| 17   | KY-040 DT | Rotary encoder | 3.3V |
| 18   | KY-040 SW | Encoder-knapp | 3.3V |
| 21   | VL53L0X SDA | Vannstand-laser (deler I2C med OLED, adresse 0x29) | 3.3V |
| 22   | VL53L0X SCL | Vannstand-laser (deler I2C med OLED) | 3.3V |

Laseren henger på samme I2C-buss som OLED-en (SDA=21, SCL=22) — ingen ekstra pinner.
GPIO **19 og 23 er nå frie** (var XKC-Y25 før) — reserve, f.eks. fremtidig stepper for auto-lys.

**Strapping-pinner (ikke bruk):** GPIO 0, 2, 12, 15.

### Koblingsdiagram (forenklet)

```
230V → 12V adapter → DC barrel jack ─┬─→ 12V til MOSFET VIN
                                     │      MOSFET OUT → LED-strip
                                     │      MOSFET SIG ← ESP32 GPIO26 (PWM)
                                     │
                                     └─→ Buck converter (FAST 5V — verifiser ~5V FØR ESP32)
                                           ├─→ 5V til ESP32 VIN
                                           └─→ 5V til ESP32-CAM (eget kort, ~300mA)

ESP32 3.3V pin → OLED VCC, DHT22 VCC, Jordfukt ×4 VCC, KY-040 +, VL53L0X VIN
ESP32 GPIO    → alle signal/data-pinner som spesifisert i tabellen over

OLED + VL53L0X deler I2C-buss: SDA→GPIO21, SCL→GPIO22 (ulike adresser: OLED 0x3C, laser 0x29)

⏚ FELLES GND-skinne: adapter, buck, MOSFET, ESP32 og alle sensor-GND
  må samles på samme breadboard-rad. Uten dette fungerer ingen signaler.
```

### Sikkerhetsregler

- **Buck converter:** Det innkjøpte kortet er en **FAST 5V USB-buck (KIS3R33S-type)** — IKKE justerbar (har USB-port + to skrueklemmer, ingen trim-skrue). Den kan ikke stilles feil. Verifiser likevel ~5V med multimeter FØR ESP32 kobles til (målt 5,26V 2026-06-10 — trygt). Barrel-jack inn = VIN, USB-side = 5V/GND ut.
- **LR7843** (logic-level MOSFET, threshold 1.5–2.5V). Standard IRF540N fungerer IKKE direkte fra ESP32 — krever 10V gate-spenning.
- **KY-040** drives på 3.3V — ALDRI 5V. Ellers sender signal-pinnene 5V tilbake til ESP32 GPIO og ødelegger dem.
- **MOSFET SIG** må alltid være koblet til GPIO — aldri la den henge løs (MOSFET blir halvåpen og varmes opp).
- **ESP32 GPIO** tåler kun 3.3V.
- **VL53L0X-laser:** koble VIN til **3.3V** (modulen har egen regulator, men 3.3V er tryggest mot ESP32s 3.3V I2C). Del SDA/SCL med OLED. Ikke pek laseren mot øyne på kloss hold.

### Mål for 3D-design

| Komponent | Mål (ca.) |
|-----------|-----------|
| ESP32 DevKit 30-pin | 54 × 28 × 13 mm |
| LR7843 MOSFET-modul | 33 × 22 × 15 mm |
| Buck converter | 43 × 21 × 14 mm |
| Barrel jack (hull) | Ø 12 mm, 22 mm dyp |
| OLED 0.96" | 27 × 27 mm |
| KY-040 | Ø 6 mm aksel, panel-mount |
| VL53L0X-modul | ~25 × 11 × 3 mm (GY-530 breakout), sitter på laser-lokk over brønn |
| XKC-Y25 (reserve) | Ø 22 mm |
| LED-strip | 8 mm bredde |
| IKEA 365+ 5.2L | ~340 × 210 × 100 mm ytre |

Mål på nytt med skyvelær når deler ankommer.

---

## MicroPython-kode

### config.py
```python
WIFI_SSID = "ditt-nett"
WIFI_PASS = "ditt-passord"
SUPABASE_URL = "https://ebjbxfwtwrahuokydvtj.supabase.co"
ANON_KEY = "eyJ..."           # full anon-nøkkel, hentes fra Supabase-dashboardet
POTTE_ID = "potte1"           # "potte2" for den andre

# Norsk tidssone. UTC+1 om vinteren, UTC+2 om sommeren.
# ESP32 har ikke automatisk DST — endre denne manuelt to ganger i året.
TZ_OFFSET_HOURS = 2
```

### boot.py
```python
import network, time
from config import WIFI_SSID, WIFI_PASS

sta = network.WLAN(network.STA_IF)
sta.active(True)
sta.connect(WIFI_SSID, WIFI_PASS)
for _ in range(20):
    if sta.isconnected(): break
    time.sleep(0.5)
print("WiFi:", sta.ifconfig()[0])
```

### main.py
```python
import time, urequests, dht, ntptime
from machine import Pin, PWM, RTC, ADC, SoftI2C
from config import SUPABASE_URL, ANON_KEY, POTTE_ID, TZ_OFFSET_HOURS
import ssd1306
import vl53l0x   # last opp vl53l0x.py-driveren sammen med main.py

# ─── Hardware-oppsett ───
led = PWM(Pin(26), freq=1000)

dht_sensor = dht.DHT22(Pin(4))

soil1 = ADC(Pin(34)); soil1.atten(ADC.ATTN_11DB)
soil2 = ADC(Pin(35)); soil2.atten(ADC.ATTN_11DB)
soil3 = ADC(Pin(32)); soil3.atten(ADC.ATTN_11DB)

i2c = SoftI2C(scl=Pin(22), sda=Pin(21))
display = ssd1306.SSD1306_I2C(128, 64, i2c)

# VL53L0X-laser deler samme I2C-buss som OLED (adresse 0x29).
tof = vl53l0x.VL53L0X(i2c)

rtc = RTC()
headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

# ─── Hjelpefunksjoner ───
def local_hour_min():
    """ESP32 RTC er UTC etter ntptime.settime(). Konverter til norsk tid."""
    y, mo, d, _, h, m, s, _ = rtc.datetime()
    h = (h + TZ_OFFSET_HOURS) % 24
    return h, m

def get_cmd():
    url = f"{SUPABASE_URL}/rest/v1/potte_commands?potte_id=eq.{POTTE_ID}&order=updated_at.desc&limit=1"
    try:
        r = urequests.get(url, headers=headers)
        data = r.json()
        r.close()
        return data[0] if data else None
    except Exception as e:
        print("get_cmd feilet:", e)
        return None

def read_sensors():
    try:
        dht_sensor.measure()
        temp, hum = dht_sensor.temperature(), dht_sensor.humidity()
    except Exception:
        temp, hum = None, None
    # Send RÅ ADC-verdier (0-4095) — kalibrering gjøres i web-appen.
    soil = [soil1.read(), soil2.read(), soil3.read()]
    # Vannstand: rå avstand i mm fra laser til flottør. Web-appen kalibrerer tom/full.
    try:
        vann_mm = tof.read()
    except Exception:
        vann_mm = None
    return temp, hum, soil, vann_mm

def post_sensors(temp, hum, soil, vann_mm):
    url = f"{SUPABASE_URL}/rest/v1/potte_sensor_data"
    payload = {
        "potte_id": POTTE_ID,
        "temperatur": temp,
        "luftfuktighet": hum,
        "jord1": soil[0], "jord2": soil[1], "jord3": soil[2], "jord4": soil[3],
        "vann_avstand_mm": vann_mm,
    }
    try:
        r = urequests.post(url, headers=headers, json=payload)
        r.close()
    except Exception as e:
        print("post_sensors feilet:", e)

def update_display(temp, hum, soil, vann_mm):
    display.fill(0)
    display.text(f"Temp: {temp}C", 0, 0)
    display.text(f"Fukt: {hum}%", 0, 12)
    display.text(f"Jord: {soil[0]}", 0, 24)
    display.text(f"Vann: {vann_mm}mm", 0, 36)
    display.show()

# ─── Bootstrap ───
try:
    ntptime.settime()
except Exception:
    pass

last_post = 0
POST_INTERVAL = 60  # sek mellom hver sensorposting

# ─── Hovedløkke ───
while True:
    cmd = get_cmd()
    temp, hum, soil, vann_mm = read_sensors()
    update_display(temp, hum, soil, vann_mm)

    if cmd:
        intensitet = cmd.get('intensitet', 0)
        timer_on  = cmd.get('timer_on', '07:00')
        timer_off = cmd.get('timer_off', '23:00')
        h, m = local_hour_min()
        now_min = h * 60 + m
        on_min  = int(timer_on[:2]) * 60 + int(timer_on[3:])
        off_min = int(timer_off[:2]) * 60 + int(timer_off[3:])
        # Støtt at off < on (krysser midnatt)
        if on_min < off_min:
            light_on = on_min <= now_min < off_min
        else:
            light_on = now_min >= on_min or now_min < off_min
        led.duty(int(intensitet / 100 * 1023) if light_on else 0)

    now = time.time()
    if now - last_post >= POST_INTERVAL:
        post_sensors(temp, hum, soil, vann_mm)
        last_post = now

    time.sleep(5)
```

---

## Database (Supabase)

**Prosjekt:** `ebjbxfwtwrahuokydvtj` (delt med Matplanlegger)
**Tabellene er allerede opprettet.** SQL nedenfor er kun referanse.

```sql
CREATE TABLE potte_commands (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  potte_id    text NOT NULL DEFAULT 'potte1',
  intensitet  integer NOT NULL DEFAULT 70,
  timer_on    text NOT NULL DEFAULT '07:00',
  timer_off   text NOT NULL DEFAULT '23:00',
  plantetype  text,
  updated_at  timestamptz DEFAULT now()
);

-- Kritisk: UNIQUE-constraint slik at web-appens upsert(onConflict: 'potte_id') virker.
ALTER TABLE potte_commands
  ADD CONSTRAINT potte_commands_potte_id_key UNIQUE (potte_id);

CREATE TABLE potte_sensor_data (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  potte_id      text NOT NULL,
  temperatur    numeric,
  luftfuktighet numeric,
  jord1           integer,   -- RÅ ADC 0-4095 (lavere = våtere for kapasitiv sensor)
  jord2           integer,
  jord3           integer,
  jord4           integer,   -- 4. plass (GPIO 33); null hvis ingen sensor koblet til
  vann_avstand_mm integer,   -- RÅ avstand i mm fra VL53L0X-laser til flottør
  registrert_at   timestamptz DEFAULT now()
);

CREATE TABLE planteprofiler (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  navn        text NOT NULL,
  emoji       text NOT NULL,
  intensitet  integer NOT NULL,
  timer_timer integer NOT NULL
);

INSERT INTO planteprofiler (navn, emoji, intensitet, timer_timer) VALUES
  ('Urter',       '🌿', 70, 16),
  ('Kaktus',      '🌵', 90, 12),
  ('Grønnsaker',  '🍅', 100, 18),
  ('Blomstrende', '🌺', 80, 12),
  ('Tropisk',     '🌴', 60, 14);

ALTER TABLE potte_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON potte_commands FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE potte_sensor_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON potte_sensor_data FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE planteprofiler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read" ON planteprofiler FOR SELECT USING (true);
CREATE POLICY "auth write" ON planteprofiler FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO potte_commands (potte_id, intensitet, timer_on, timer_off) VALUES
  ('potte1', 70, '07:00', '23:00'),
  ('potte2', 70, '07:00', '23:00');
```

### Datakontrakt mellom ESP32 og web-app

- **`jord1/2/3/4`** er RÅ ADC-verdier (0–4095). Web-appen mapper til prosent (målt kalibrering 2026-06-10: tørr ~3200 = 0 %, våt ~1140 = 100 % — se `JORD_TORR`/`JORD_VAT` i `utils.ts`) og kalibrerer per sensor om nødvendig. ESP32 skal IKKE konvertere til prosent — da blir kalibrering umulig uten å flashe på nytt. Inntil 4 plasser (GPIO 34/35/32/33); `config.AKTIVE_JORDSENSORER` styrer hvilke som leses — resten sendes som `null` og skjules i appen.
- **`vann_avstand_mm`** er rå avstand i mm fra VL53L0X-laseren til flottøren. Stor avstand = lite vann, liten avstand = mye vann. Web-appen kalibrerer tom/full per potte og viser nivå i %.
- **`temperatur/luftfuktighet`** er numeriske verdier fra DHT22 direkte (°C og %).

---

## Web-app

**Stack:** Vanilla HTML/CSS/JS, én fil `index.html`
**Live:** https://plantepotte.pages.dev/
**GitHub:** https://github.com/Makkayo/plantepotte
**Auth:** Supabase Auth e-post/passord
**Deploy:** `git push` til `main` → Cloudflare Pages auto-deploy

Funksjoner:
- Login (Supabase Auth)
- Polling av `potte_commands` og `potte_sensor_data` hvert 10. sek
- Plantetype-velger fra `planteprofiler` (auto-fyller intensitet og timer)
- Slider for intensitet, tidsvelger for lys på/av
- "Lagre" gjør upsert til `potte_commands` (krever UNIQUE-constraint, se SQL)
- Sensor-visning per potte: temperatur, fukt, jordfukt ×4 (kun tilkoblede vises), vannstand

---

## Faser

| Fase | Innhold | Status |
|------|---------|--------|
| 1 | Breadboard-prototype: LED PWM, WiFi, Supabase, web-app | Backend ferdig, hardware venter |
| 2 | Alle sensorer aktive, OLED, KY-040, sensorposting | Planlagt |
| 3 | Push-varsler ved lavt vann, historikk | Planlagt |
| 4 | 3D-printet innkapsling (se `3d-design.html`) | Skissefase |
| 5 | Potte 2 + evt. aktiv vannpumpe | Fremtid |

---

## Mulig framtidig integrasjon

Plantepotte og Matplanlegger deler allerede Supabase-prosjekt. Når plantepotte-hardware er på plass, kan appene slås sammen til én. Forutsetninger:
- Matplanlegger-frontend må oppdateres til å bruke Supabase Auth
- RLS må aktiveres på matplanlegger-tabellene (`shopping_list`, `pantry`, `cooked_log`, `price_history`)
