# Plantepotte — System Design

**Dato opprettet:** 2026-05-23
**Sist oppdatert:** 2026-06-12 (totalrevisjon: utdatert main.py-skisse fjernet — `firmware/` er fasiten)
**Status:** Backend og web-app live. Hardware B1+B2 ankommet og i stor grad breadboard-testet (LED tent 10. juni). B3–B5 i posten. Neste: main.py + WiFi + Supabase end-to-end.

> ⚠️ **Dette er et øyeblikksbilde — gjeldende fasit er prosjekt-skillen** (`C:\Users\marku\.claude\skills\plantepotte\skill.md`). Disse delene er fortsatt historiske og er IKKE oppdatert her:
> - **Kamera:** ESP32-CAM lagt til på potte 1 → bilder til Supabase Storage → vekst-tidslinje i appen (gjøres når kameraet er testet).
> - **Web-app:** er skrevet om til **Svelte 5 + TypeScript + Vite** (ikke lenger vanilla én-fil `index.html` som beskrevet nederst).
> - **Auto-justerende lys** (stepper + lead screw) er en utforsket fremtidsidé — se skillen.
> - **Fysisk design** nederst beskriver et eldre "3 deler"-konsept; gjeldende 3D-modell er base + 4 stolper + tak (se skillen).
>
> ✅ **Vannmåling er nå oppdatert i dette dokumentet:** XKC-Y25 er erstattet av **VL53L0X ToF-laser + 3D-printet flottør** i en berolings-brønn, og datafeltet er `vann_avstand_mm` (rå mm fra laser til flottør). XKC-Y25 ×4 er reserve. GPIO-tabell, koblingsdiagram, SQL og datakontrakt under reflekterer laseren (firmware-koden ligger i `firmware/`, ikke her).

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

3D-designet gjøres av Markus selv (Fusion 360 → `3d-modell/Plantekassa.3mf`).

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

> `firmware/config.py` er **gitignored** (WiFi-passordet skal aldri til GitHub). Kopier `firmware/config.example.py` → `config.py` og fyll inn.

```python
WIFI_SSID = "ditt-nett"
WIFI_PASS = "ditt-passord"
SUPABASE_URL = "https://ebjbxfwtwrahuokydvtj.supabase.co"
ANON_KEY = "eyJ..."           # full anon-nøkkel, hentes fra Supabase-dashboardet
POTTE_ID = "potte1"           # "potte2" for den andre

# Norsk tidssone. UTC+1 om vinteren, UTC+2 om sommeren.
# ESP32 har ikke automatisk DST — endre denne manuelt to ganger i året.
TZ_OFFSET_HOURS = 2

# Hvilke av de 4 jordfukt-plassene (GPIO 34/35/32/33) er koblet til?
AKTIVE_JORDSENSORER = [1, 2, 3]

# Watchdog: True i drift (ESP32 restarter seg selv hvis programmet henger
# >2 min), False under utvikling i Thonny (ellers restarter brettet midt i økta).
BRUK_WATCHDOG = False

# Sensordata-posting i sekunder (300 = hvert 5. min — minutt trengs aldri).
POST_INTERVALL_SEK = 300
```

### boot.py og main.py — IKKE kopier herfra

> ⛔ **Koden ligger i [`firmware/`](../firmware/) — det er fasiten.** Tidligere
> sto en forenklet main.py-skisse her, men den ble liggende etter (den manglet
> bl.a. jord4, watchdog, NTP-resynk og socket-opprydding, og hadde en
> indekseringsfeil). For å unngå at noen flasher en gammel kopi er den fjernet.
>
> - `firmware/main.py` — hovedprogrammet (sensorer, lys, Supabase, OLED, encoder)
> - `firmware/logic.py` — ren beslutningslogikk, testes på PC med `python test_logic.py`
> - `firmware/boot.py` — WiFi-oppkobling ved oppstart
> - Flashe-instruksjoner: `firmware/README.md`

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

-- Appen henter alltid «nyeste avlesning per potte» — uten denne blir det
-- full tabellskanning når dataene vokser (~105k rader/år/potte). (Lagt til 12. juni 2026.)
CREATE INDEX IF NOT EXISTS potte_sensor_data_potte_id_registrert_at_idx
  ON potte_sensor_data (potte_id, registrert_at DESC);

-- Storage (bucket `plantebilder`): ESP32-CAM laster opp som anon, web-appen
-- er INNLOGGET (authenticated) og trenger egen SELECT-policy for å kunne
-- LISTE filene til veksttidslinja. (Lagt til 12. juni 2026.)
-- CREATE POLICY "authenticated read plantebilder"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'plantebilder');

ALTER TABLE planteprofiler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read" ON planteprofiler FOR SELECT USING (true);
CREATE POLICY "auth write" ON planteprofiler FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO potte_commands (potte_id, intensitet, timer_on, timer_off) VALUES
  ('potte1', 70, '07:00', '23:00'),
  ('potte2', 70, '07:00', '23:00');
```

### Datakontrakt mellom ESP32 og web-app

- **`jord1/2/3/4`** er RÅ ADC-verdier (0–4095). Web-appen mapper til prosent (målt kalibrering 2026-06-10: tørr ~3200 = 0 %, våt ~1140 = 100 % — se `JORD_TORR`/`JORD_VAT` i `utils.ts`) og kalibrerer per sensor om nødvendig. ESP32 skal IKKE konvertere til prosent — da blir kalibrering umulig uten å flashe på nytt. Inntil 4 plasser (GPIO 34/35/32/33); `config.AKTIVE_JORDSENSORER` styrer hvilke som leses — resten sendes som `null` og skjules i appen.
- **`vann_avstand_mm`** er rå avstand i mm fra VL53L0X-laseren til flottøren. Stor avstand = lite vann, liten avstand = mye vann. Web-appen kalibrerer tom/full **per potte** via `potter.vann_tom_mm`/`vann_full_mm` (settes med «Sett som tom/full»-knappene i SensorPanel, lagt til 2026-06-10; NULL = global standard i `utils.ts`) og viser nivå i %.
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
| 4 | 3D-printet innkapsling | Skissefase |
| 5 | Potte 2 + evt. aktiv vannpumpe | Fremtid |

---

## Mulig framtidig integrasjon

Plantepotte og Matplanlegger deler allerede Supabase-prosjekt. Når plantepotte-hardware er på plass, kan appene slås sammen til én. Forutsetninger:
- Matplanlegger-frontend må oppdateres til å bruke Supabase Auth
- RLS må aktiveres på matplanlegger-tabellene (`shopping_list`, `pantry`, `cooked_log`, `price_history`)
