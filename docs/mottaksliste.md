# Mottaksliste — Plantepotte

Holder styr på hva som er **bestilt → ankommet → testet** på breadboard.

**Status-koder:**
- ⬜ Ikke kommet
- 📦 Ankommet (ikke testet)
- ✅ Testet og funker
- ⚠️ Ankommet, men problem (se notat)

*Sist oppdatert: 2026-06-19 — Bestilling 3 komplett (elektronikk-lakk ankom)*

---

## Bestilling 1 — AliExpress (~€90)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ✅ | ESP32 32S DevKit (30-pin) | ×2 | Kom 9. juni — MicroPython v1.28.0 flashet, testet 9. juni |
| ⚠️ | LR7843/FR120N MOSFET-modul | ×4 | Kom 9. juni — **BYGGESETT**: bart kort + løse skrueklemmer som MÅ loddes på (grønn 2-v = PWM/GND, blå 3-v = +/LOAD/−). Opto-isolert. 3-pins header som fulgte med passer IKKE (5mm vs 2,54mm) → reserve. **Venter på loddebolt (best. 4) før bruk** |
| ✅ | LED-strip phyto 12V 5050 (5m) | ×1 | **Tent 10. juni** — 3×40cm parallell lyser jevnt rødt/blått ✅. Målt **0,36 A/40cm-stripe**, 0,94 A for 3 striper (én potte). «4:1» phyto-ratio bekreftet |
| ✅ | 12V 3A adapter | ×1 | Testet 10. juni — gir 12V (målt). 5.5×2.1mm. **5A-oppgradering planlagt** for 2 potter |
| 📦 | DC barrel jack pigtail-par | ×1 | Kom 9. juni — «10 Pairs 12V DC Power Connector» |
| 📦 | Breadboard MB-102 + jumpere | ×2 | Kom 9. juni — «BB004-MB102+65PCS» |
| ✅ | Buck converter 5V/5A | ×1 | Testet 10. juni — **FAST 5V USB-buck (KIS3R33S-type), IKKE justerbar** (USB-port + 2 skrueklemmer, ingen trim-skrue). Målt **5,26V** ut — trygt for ESP32. Barrel-jack inn (VIN), USB-side ut (5V/GND). (Var feilnotert «LM2596S adjustable») |
| 📦 | LED clip connector 8mm | ×1 | Kom 9. juni — «MA2P-8, 8mm 2Pin Strip-to-Wire» |
| 📦 | Terminalblokk KF301 2P | ×1 | Kom 9. juni — «KF301 2P, 5.0mm pitch, sort» |
| 📦 | Vekemateriale bomullssnor 3mm | ×1 | Kom 6. juni |
| 📦 | Elektrisk tape | ×1 | Kom 9. juni — «20m PVC electrical tape, svart» |
| 📦 | XKC-Y25 (reserve) | ×4 | Kom 9. juni — «Y25-NPN-5-12V», minst 1 verifisert (bestilt ×4) |
| ✅ | KY-040 rotary encoder | ×1 | Testet 9. juni — IRQ-basert, dimmer 0–10 + av/på-knapp fungerer |
| ✅ | Jordfuktsensor kapasitiv v2.0 | ×1 (3stk) | **Alle 3 testet + kalibrert 10. juni** (GPIO 34/35/32). Tørr (luft) ~3190, våt (vann) ~1140 — alle tre nesten like → felles kalibrering funker. NB: firmware/app støtter nå 4 plasser (GPIO 34/35/32/33); 4. sensor + flere bestilt (se Bestilling 5) |
| ✅ | OLED SSD1306 0.96" | ×1 | Testet 9. juni — viser temp/fukt/jord/lys. ssd1306.py lastet opp til ESP32 |
| ✅ | DHT22 (AM2302) | ×1 | Testet 9. juni — 28.4°C / 48.2% ved første test |

## Bestilling 2 — AliExpress tilbehør (~€37)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| 📦 | Silikonledning 22 AWG (rød+svart) | ×1 | Kom 6. juni — rød+svart bekreftet (rød = +, svart = −) |
| 📦 | Dupont jumper M-M 30cm | ×1 | Kom 6. juni |
| 📦 | Dupont jumper M-F 30cm | ×1 | Kom 6. juni |
| 📦 | Dupont jumper F-F 30cm | ×1 | Kom 9. juni — «DP-30cm-F-F-40pin» (BoardCore) |
| 📦 | Lever-connectors (Wago-klone) 50stk | ×1 | Kom 9. juni — «PCT-211: 50PCS», 1-to-1 inline |
| 📦 | Wire stripper "Pro" 3-i-1 | ×1 | Kom 9. juni — strip/cut/crimp 22-10 AWG |
| 📦 | Heat shrink kit 580stk | ×1 | Kom 6. juni |
| 📦 | DC inline switch | ×2 | Kom 9. juni — 2 stk vippebryter m/barrel-jack, CE/UKCA/UL |
| 📦 | Glass fuse holder BLX-A | ×1 | Kom 6. juni — holder(e) + glass F3AL250V (rask, patron 5×20). F3A passer holder MEN er rask → reserve |
| 📦 | Slow-blow sikring 3A | ×1 | Kom 6. juni — keramisk T3AL250V (treg) ✅ DENNE brukes. Leaded/aksial (tråd-bein) → passer IKKE holder; kobles inline med Wago. Vurder å kjøpe 5×20 T3A patron til holder senere |
| 📦 | 3M dobbeltsidig tape | ×1 | Kom 6. juni |
| 📦 | Kabel-organizer klips 30stk | ×1 | Kom 9. juni — «3059 Black, 30pcs Cable Organizer Clips» |

## Bestilling 3 — laser + kamera (~€26)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| 📦 | VL53L0X ToF-laser | ×3 | Kom 17. juni — «A03-VL53L0X-Zi», Estardyn GY-VL53L0XV2, 940nm I2C, 25×10.7mm. Alle 3 i separate ESD-poser |
| 📦 | ESP32-CAM-MB (OV2640) | ×2 | Kom 17. juni — «I64-ESP32-CAM+I65-MB-DIZuo», CH340G, Micro USB. Begge sett i ESD-poser |
| 📦 | Elektronikk-lakk (konformell coating) | ×1 | Kom 19. juni — konformell coating (SF90-type). Bestilling 3 nå komplett (laser + kamera + lakk) |

## Bestilling 4 — loddeutstyr & lek (~€54)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| 📦 | Tredje hånd (loddestasjon) | ×1 | Kom 17. juni — «PCB Holder with Alligator Clips for Electronics Repair», 3 fleksible armer + alligator-klips |
| 📦 | Magnetisk tredje hånd | ×1 | Kom 17. juni — «Soldering Station with Flexible Arms Soldering Iron Holder», gooseneck-armer (kuleleddskjede) |
| 📦 | USB-loddebolt C200S | ×1 | Kom 17. juni — «Portable Soldering Iron USB Battery 3.7V», display + +/- knapper. NB: ser ut som batteri-drevet USB-bolt (ikke vanlig C200S) |
| 📦 | Loddetinn 0.8mm | ×1 | Kom 17. juni — «0.8mm 100g Soldering Tin Wire, No-clean Rosin Core FLUX 2.0%» |
| 📦 | Avloddefletning | ×1 | Kom 17. juni — CP-2015, 2.0mm × 1.5m, RoHS |
| 📦 | Silikon-loddematte | ×1 | Kom 17. juni — S160, blå, 30×45cm |
| 📦 | ESP32 starter kit | ×1 | Kom 17. juni — «ESP32 Basic Starter Kit» i plastboks med DHT22, OLED, reléer m.m. |
| 📦 | MG90S servo | ×2 | Kom 17. juni — begge i separate pakker merket «MG90S-1pcs», All Metal Gear 9g |
| 📦 | I2C level converter (ikke i bruk) | ×1 | Kom 17. juni — «10pcs 4 Channels IIC I2C Logic Level Converter, 3.3V to 5V» — ikke planlagt brukt (laser+OLED er begge 3.3V) |
| 📦 | WS2812B RGB-strip (lek) | ×1 | Kom 17. juni — «WS2812B DC5V, 1m 30 LED/m, IP30, White PCB» |

## Bestilling 5 — påfyll & semi-permanent bygg (~€38, bestilt 10. juni)

Samlet etter kveldens testing. AliExpress-søkeord i parentes.

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ⬜ | 12V **5A**-adapter (self-adapting 2,1/2,5mm) | ×1 | Margin for 2 potter (`12V 5A power adapter 5.5x2.1mm EU plug`) |
| ⬜ | Wago **221-415** (5-veis, original) | 10-pk | Samle 3 takstriper + ned-kabel til ett par |
| ⬜ | Wago **221-413** (3-veis, original) | 10-pk | Mindre 12V-skjøter |
| ⬜ | Jordfuktsensor v2.0 | 10-pk | → 13 totalt: 8 til 2 potter (4/potte) + 5 reserve |
| ⬜ | Motstand-sortiment 1/4W | 600-pk | Pulldown (auto-deteksjon) + indikator-LED + lek |
| ⬜ | 5mm LED-pakke | 100-pk | Indikator-LED-test på GPIO26 + lek |
| ⬜ | Silikonledning **2-pin 20 AWG** | 10 m | Erstatter 22+20 AWG; kraft-runs 2 potter |
| ⬜ | LED clip 8mm 2-pin | 5-pk | Flere strip-clips (åpnes dårlig, vil ha reserve) |
| ⬜ | **Flux-penn** (No Clean) | ×1 | Gjør lodding mye lettere — IKKE syre-flux |
| ⬜ | Sikring 5×20 **Slow Blow** 3A | 10-pk | Treg patron til BLX-A-holderen (3A-adapter) |
| ⬜ | Sikring 5×20 **Slow Blow** 5A | 10-pk | Til 5A-adapteren |
| ⬜ | Perfboard double-sided 7×9cm | 5-pk | Semi-permanent bygg (hovedkort) |
| ⬜ | Perfboard double-sided 5×7cm | 10-pk | Lodde-øving + små kort |
| ⬜ | Pinnerader 2,54mm (male+female) | 5 sett | Hunn-headers på perfboard → moduler plugges i |
| ⬜ | 6-i-1 elektrisk presisjonsskrutrekker | ×1 | N20-håndtak, USB-C-ladbar, magnetiske bits (PH000/PH00/P2/Y0.6) — til elektronikk-skruing |

## Bestilling 6 — montering & kabling (~€23, bestilt 11. juni)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ⬜ | Heat-set insert + skrue-sett (M2/M2.5/M3/M4 messing, 1050 stk) | ×1 | Smeltes inn i PETG med loddebolt — metallgjenger for PCB-moduler |
| ⬜ | PCB-distansebolter / standoffs (Rafford messing, M2–M6, 14 stk) | ×1 | Løfter moduler opp fra overflaten |
| ⬜ | Kabelspiral-wrap (svart, fleksibel) | ×1 | Kabelbeskyttelse |

## Kjøp lokalt

| Status | Del | Notat |
|:------:|-----|-------|
| ✅ | Multimeter (UT131D) | Kjøpt — brukt til buck (5,26V) + LED-strømmåling (0,36 A/stripe) 10. juni |
| ✅ | USB-C datakabel | Fungerer — Thonny koblet til ESP32 uten problemer |
