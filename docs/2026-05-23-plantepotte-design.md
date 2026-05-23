# Plantepotte — System Design

**Dato:** 2026-05-23  
**Status:** Godkjent — klar for implementering

---

## Konsept

Modulær, selvvannende innendørs plantepotte med app-styrte vekstlys. Passiv sub-irrigasjon (veke/kapillærsystem). Ingen pumpe. ESP32 styrer LED-strip via WiFi + Supabase. Kontrolleres via web-app.

Inspirert av Auk mini 2 — men 3D-printet, modulær og fullt egenbygd.

---

## Fysisk design (3D-print)

**3 deler:**

1. **Bunn (reservoar)** — vannbeholder + vekeutgang i bunn. Jord-beholder sitter i, veke henger ned i vannet.
2. **Kolonneringer** — stablebare mellomringer for høydejustering. Twist-lock teleskopisk løsning planlegges fase 2.
3. **Lokk/tak** — holder LED-strip + ESP32 + kabling. Lyset peker ned mot planten.

**Materiale:** PLA eller PETG (PETG tåler fukt bedre)  
**Veke:** ~5mm bomullssnor/filtstripe

---

## Elektronikk (fase 1 — ingen lodding)

### Komponenter

| Del | Detalj | Pris |
|-----|--------|------|
| ESP32 30-pin Type-C (32S) | WROOM-32D, 4.8★ | €4.40 |
| Phyto LED-strip 12V | 4 Rød : 1 Blå 5050, IP65 | €10.47 |
| LR7843 MOSFET-modul ×4 | Logic-level, skruklemmer | €1.21 |
| 12V 3A adapter EU | Universal | €5.62 |
| DC barrel jack 10par | 5.5×2.1mm, skruklemmer | €3.52 |
| Breadboard + 65 jumpere | MB-102 | €3.17 |
| LM2596 buck converter ×5 | 12V→5V, stilles inn med multimeter | €3.77 |
| 8mm 2-pin LED clip connector | Loddefri kobling til strip | ~€1–2 |
| KF301 terminalblokkstrips | For permanent montering | ~€1–2 |
| **Total AliExpress** | | **~€35–37** |

### Koblingsdiagram

```
12V adapter → DC barrel jack → skinnе (12V / GND)
                    ├─ LM2596 buck converter → 5V → ESP32 VIN-pin
                    └─ LR7843 MOSFET-modul:
                           VIN  → 12V rail
                           GND  → felles GND
                           SIG  → ESP32 GPIO26
                           OUT  → LED-strip (via clip-connector)

ESP32 GND → felles GND (VIKTIG: én felles referanse)
ESP32 GPIO26 → MOSFET SIG (PWM 1kHz)
```

**Én strømkilde:** Kun 12V-adapteren. LM2596 gir 5V til ESP32.  
**ADVARSEL:** Still LM2596 til nøyaktig 5.0V med multimeter FØR du kobler til ESP32.  
**ADVARSEL:** LR7843 er logic-level MOSFET (threshold 1.5–2.5V). Standard IRF540N fungerer IKKE.

### Mål for 3D-design (elektronikk-seksjon i lokket)

| Komponent | Mål (ca.) |
|-----------|-----------|
| ESP32 DevKit 30-pin | 52 × 28 × 13 mm |
| LR7843 MOSFET-modul | 33 × 22 × 15 mm |
| LM2596 buck converter | 43 × 21 × 14 mm |
| Barrel jack (hull i vegg) | Ø 12 mm hull, 22 mm dyp |
| LED-strip | 8 mm bred, langs innerkant av ring |

Minimum indre diameter lokk: **~130 mm**  
Høyde elektronikk-seksjon: **~30 mm**  
Mål på nytt med skyvelær når delene ankommer — disse er nominelle.

---

## MicroPython-kode

### config.py
```python
WIFI_SSID = "ditt-nett"
WIFI_PASS = "passord"
SUPABASE_URL = "https://PROSJEKT.supabase.co"
ANON_KEY = "eyJ..."
POTTE_ID = "potte1"
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
import time, urequests
from machine import Pin, PWM, RTC
from config import SUPABASE_URL, ANON_KEY, POTTE_ID

led = PWM(Pin(26), freq=1000)
rtc = RTC()
headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

def get_cmd():
    url = f"{SUPABASE_URL}/rest/v1/potte_commands?potte_id=eq.{POTTE_ID}&order=updated_at.desc&limit=1"
    try:
        r = urequests.get(url, headers=headers)
        data = r.json()
        r.close()
        return data[0] if data else None
    except:
        return None

import ntptime
try: ntptime.settime()
except: pass

while True:
    cmd = get_cmd()
    if cmd:
        intensitet = cmd.get('intensitet', 0)
        timer_on  = cmd.get('timer_on', '07:00')
        timer_off = cmd.get('timer_off', '23:00')
        h, m = rtc.datetime()[4:6]
        now_min = h * 60 + m
        on_min  = int(timer_on[:2]) * 60 + int(timer_on[3:])
        off_min = int(timer_off[:2]) * 60 + int(timer_off[3:])
        if on_min <= now_min < off_min:
            led.duty(int(intensitet / 100 * 1023))
        else:
            led.duty(0)
    time.sleep(5)
```

---

## Database (Supabase)

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
ALTER TABLE planteprofiler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read" ON planteprofiler FOR SELECT USING (true);

INSERT INTO potte_commands (potte_id, intensitet, timer_on, timer_off)
VALUES ('potte1', 70, '07:00', '23:00');
```

---

## Web-app

**Stack:** Vanilla HTML/CSS/JS, én fil `index.html`  
**Hosting:** Cloudflare Pages  
**Mulig integrasjon:** matplanlegger.pages.dev (ny tab, ikke merge)

---

## Fase 2 (fremtid)

- Teleskopiske søyler med twist-lock
- Fuktsensor (kapasitiv, ESP32 ADC)
- Vannstand-varsler i appen
- Multi-potte dashboard
