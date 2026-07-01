# Komponentlager — Plantepotte (+ lek/reserve)

«Hva eier jeg akkurat nå», på tvers av alle bestillinger. Oppdateres når noe **anskaffes** eller **brukes opp / bygges inn**.

- **Mottakslista** (`mottaksliste.md`) = innboks for nye pakker (bestilt → ankommet → testet).
- **Dette dokumentet** = beholdning og forbruk.

**Status-koder:** ✅ på lager · 📦 ankommet (ikke testet) · ⬜ bestilt, ikke ankommet · 🔧 i bruk · 🔋 reserve

*Sist oppdatert: 2026-06-26 — Bestilling 5 + 6 ankommet (nesten komplett)*

---

## 🧠 Kort & hjerne (ESP32-familien)

| Del | Totalt | I bruk | Ledig | Status | Notat |
|-----|:------:|:------:|:-----:|:------:|-------|
| ESP32 32S DevKit (30-pin) | 2 | 0 | 2 | ✅ | Potte 1 + potte 2 (hjerne). MicroPython flashet |
| ESP32-CAM-MB (OV2640) | 2 | 1 | 1 | ✅ | **Testet 20. juni** — opplasting til Supabase verifisert. 1 til potte1, 1 reserve/potte2. Arduino IDE |
| ESP32 (starter kit) | 1 | 1 | 0 | 🔧 | **Brukes nå til pultlyset** (lek). Micro-USB |

## 📡 Sensorer

| Del | Totalt | I bruk | Ledig | Status | Notat |
|-----|:------:|:------:|:-----:|:------:|-------|
| VL53L0X ToF-laser | 3 | 1 | 2 | ✅ | **Testet 20. juni** (driver verifisert). 1 i bruk (potte1), 2 reserve |
| Jordfuktsensor v2.0 | 13 | 0 | 13 | ✅ | 3 kalibrert + **10 nye ankommet 26. juni** (B5) → 13 totalt |
| OLED SSD1306 0.96" | 1 | 0 | 1 | ✅ | |
| DHT22 (AM2302) | 1 | 0 | 1 | ✅ | |
| KY-040 dreieknapp | 3 | 1 | 2 | ✅ | 1 i pultlyset. Potta bruker 1 |
| XKC-Y25 væskenivå | 4 | 0 | 4 | 🔋 | **Reserve** — erstattet av laser |

## 💡 Lys

| Del | Totalt | I bruk | Ledig | Status | Notat |
|-----|:------:|:------:|:-----:|:------:|-------|
| LED-strip phyto 12V 5050 | 5 m | ~1,2 m (test) | ~3,8 m | ✅ | Vekstlyset. 0,36 A/40cm målt |
| WS2812B RGB-strip 5V | 1 m (30 LED) | 1 m | 0 | 🔧 | **Pultlyset** (lek, IKKE vekstlys) |
| LR7843/FR120N MOSFET | 4 | 1 | 2 | ✅ | **3 loddet + dimming testet 20. juni.** 1 i bruk (potte1), 2 gode i reserve. **4. = skrap** (grønn 2-pin smeltet) |
| LED clip connector 8mm | 10 | 0 | 10 | 📦 | +5 **ankommet 26. juni** (B5) → 10 totalt |

## ⚡ Kraft & kabling

| Del | Totalt | I bruk | Ledig | Status | Notat |
|-----|:------:|:------:|:-----:|:------:|-------|
| 12V 3A adapter | 1 | 0 | 1 | ✅ | Erstattes av 5A for 2 potter |
| 12V 5A adapter | 1 | 0 | 1 | 📦 | **Ankommet 26. juni** (B5) — KDT-1250, 12V⎓5A. Erstatter 3A for 2 potter |
| Buck converter 5V (fast) | 1 | 1 | 0 | 🔧 | Målt 5,26V. **I bruk: gir potte1 5V fra 12V (selvgående drift 20. juni)** — 12V splittet til buck+MOSFET med en løs 3-veis Wago |
| DC inline switch | 2 | 0 | 2 | 📦 | |
| DC barrel jack pigtail-par | 10 par | 0 | 10 | 📦 | |
| Multimeter UT131D | 1 | — | 1 | ✅ | Lokalt kjøpt |

## 🔗 Tilkobling (skjøt, jumpere, klemmer)

| Del | Totalt | I bruk | Ledig | Status | Notat |
|-----|:------:|:------:|:-----:|:------:|-------|
| Lever-connector PCT-211 (2-v) | 50 | 0 | 50 | 📦 | Wago-klone |
| Wago 221-415 (5-v, original) | 10 | 0 | 10 | 📦 | **Ankommet 26. juni** (B5) — ekte Wago |
| Wago 221-413 (3-v, original) | 10 | 0 | 10 | 📦 | **Ankommet 26. juni** (B5) — ekte Wago |
| Wago 221-412 (2-v) | et fåtall | 0 | noen | ✅ | Hadde fra før |
| Dupont jumper M-M 30cm | 40 | noen | de fleste | 📦 | |
| Dupont jumper M-F 30cm | 40 | noen | de fleste | 📦 | Brukt på KY-040 i pultlys |
| Dupont jumper F-F 30cm | 40 | noen | de fleste | 📦 | Brukt på stripe i pultlys |
| Dupont jumper 20cm (ESP32-sett) | 130 | noen | de fleste | ✅ | Hadde fra før |
| Breadboard MB-102 | 2 | 0 | 2 | 📦 | |
| Terminalblokk KF301 2P | 10 | 0 | 10 | 📦 | |
| Pinnerader 2,54mm (M+F) | 5 sett | 0 | 5 sett | 📦 | **Ankommet 26. juni** (B5) — 1×40-pin hann+hunn |
| I2C level converter (4-kanal) | 10 | 0 | 10 | 📦 | **Ikke i bruk** (laser+OLED er 3.3V) |

## 🔥 Loddeutstyr

| Del | Totalt | Status | Notat |
|-----|:------:|:------:|-------|
| USB-loddebolt (3,7V batteri) | 1 | ⚠️ | **For svak** — varmen når dårlig ut i tippen, gjorde lodding kronglete. Funker så vidt med én bestemt tipp. Loddestasjon vurderes (se ønskeliste) |
| Tredje hånd (alligator-klips) | 1 | 📦 | |
| Magnetisk tredje hånd (gooseneck) | 1 | 📦 | |
| Silikon-loddematte S160 | 1 | 📦 | |
| Flux-penn (No Clean) | 1 | 📦 | **Ankommet 26. juni** (B5) — Low Solid/No Clean |
| Wire stripper Pro (3-i-1) | 1 | 📦 | |
| 6-i-1 presisjonsskrutrekker | 1 | ⬜ | **Ikke i 26. juni-leveransen** — venter fortsatt (B5) |
| Heat-set insert-tipper (loddebolt) | 4 | 📦 | **Ankommet 26. juni** — skru-på-tipper M2–M6 for å smelte inserts inn med loddebolt (supplement til heat insert tool). Sto ikke på B5/B6-lista |

## 🧵 Forbruksvarer (~igjen-anslag)

| Del | Mengde | ~Igjen | Notat |
|-----|:------:|:------:|-------|
| Loddetinn 0.8mm (No-clean) | 100 g | ~100 g | Nytt |
| Avloddefletning 2.0mm | 1,5 m | ~1,5 m | Nytt |
| Silikonledning 22 AWG rød | 5 m | ~5 m | |
| Silikonledning 22 AWG svart | 5 m | ~5 m | |
| Silikonledning 2-pin 20 AWG | 10 m | ~10 m | 📦 **Ankommet 26. juni** (B5) — rød+svart |
| Vekemateriale bomullssnor 3mm | 10 m | ~10 m | |
| Heat shrink kit | 580 stk | ~580 | 11 størrelser |
| Elektrisk tape | 20 m | ~20 m | |
| 3M dobbeltsidig tape | 1 rull | ~hel | |
| Kabel-organizer klips | 30 | 30 | |
| Kabelspiral-wrap | 1 | ~5 m | 📦 **Ankommet 26. juni** (B6) — 8mm svart, 5m |
| Motstand-sortiment 1/4W | 600 | ~600 | 📦 **Ankommet 26. juni** (B5) — 1% metallfilm, 30 verdier |
| 5mm LED | 100 | ~100 | 📦 **Ankommet 26. juni** (B5) — assortert |

## 🔩 Sikringer

| Del | Totalt | Status | Notat |
|-----|:------:|:------:|-------|
| Slow-blow T3A leaded (aksial) | 1 | 📦 | **DENNE brukes** — kobles inline m/Wago |
| Glass fuse holder BLX-A | 10 | 📦 | Holder (5×20 patron) |
| Glass-sikring F3A (rask) | noen | 🔋 | Reserve (vil ha treg, ikke rask) |
| Sikring 5×20 Slow Blow 3A | 10 | 📦 | **Ankommet 26. juni** (B5) — glass 5×20 treg, patron til BLX-A-holder |
| Sikring 5×20 Slow Blow 5A | 10 | 📦 | **Ankommet 26. juni** (B5) — glass 5×20 treg, til 5A-adapter |

## 🪛 Montering & 3D

| Del | Totalt | Status | Notat |
|-----|:------:|:------:|-------|
| Heat-set insert + skrue-sett (M2–M4) | 1050 | 📦 | **Ankommet 26. juni** (B6) — messing, hot-melt |
| PCB standoffs (M2–M6) | 14 | ⬜ | **Ikke i 26. juni-leveransen** — venter fortsatt (B6) |
| Perfboard 7×9cm | 5 | 📦 | **Ankommet 26. juni** (B5) — blå, dobbeltsidig. Semi-permanent bygg |
| Perfboard 5×7cm | 10 | 📦 | **Ankommet 26. juni** (B5) — blå, dobbeltsidig. Lodde-øving |
| M4 messinginnsatser + skruer | — | ✅ | Hadde fra før |
| Heat insert tool | 1 | ✅ | Hadde fra før |

## 🎮 Lek & diverse

| Del | Totalt | I bruk | Ledig | Status | Notat |
|-----|:------:|:------:|:-----:|:------:|-------|
| MG90S servo (9g metal gear) | 2 | 0 | 2 | 📦 | Lek — evt. vannfylling-luke senere |
| Elektronikk-lakk (konformell) | 1 | 0 | 1 | 📦 | Kom 19. juni — B3 komplett |

---

## ⬜ Mangler fortsatt i posten

Stor leveranse 26. juni tok unna nesten hele B5 + B6. Kun to deler gjenstår:

- **B5:** 6-i-1 presisjonsskrutrekker
- **B6:** PCB-distansebolter / standoffs (M2–M6, 14 stk)
