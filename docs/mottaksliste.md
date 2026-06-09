# Mottaksliste — Plantepotte

Holder styr på hva som er **bestilt → ankommet → testet** på breadboard.

**Status-koder:**
- ⬜ Ikke kommet
- 📦 Ankommet (ikke testet)
- ✅ Testet og funker
- ⚠️ Ankommet, men problem (se notat)

*Sist oppdatert: 2026-06-09 (kveld)*

---

## Bestilling 1 — AliExpress (~€90)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ✅ | ESP32 32S DevKit (30-pin) | ×2 | Kom 9. juni — MicroPython v1.28.0 flashet, testet 9. juni |
| 📦 | LR7843 MOSFET-modul | ×4 | Kom 9. juni — «FR120N LR7843 MOS Tube FET», individuelt pakket |
| 📦 | LED-strip phyto 12V 5050 (5m) | ×1 | Kom 9. juni — fraktlapp «ZYDT-5050-60F-5M», håndskrevet «4:1» bekrefter 4R:1B phyto-ratio ✅ |
| 📦 | 12V 3A adapter | ×1 | Kom 9. juni — «12V 3A, EU-plugg», 5.5×2.1mm |
| 📦 | DC barrel jack pigtail-par | ×1 | Kom 9. juni — «10 Pairs 12V DC Power Connector» |
| 📦 | Breadboard MB-102 + jumpere | ×2 | Kom 9. juni — «BB004-MB102+65PCS» |
| 📦 | Buck converter 5V/5A | ×1 | Kom 9. juni — «LM2596S adjustable» ⚠️ still til 5,0V m/multimeter FØR ESP32 |
| 📦 | LED clip connector 8mm | ×1 | Kom 9. juni — «MA2P-8, 8mm 2Pin Strip-to-Wire» |
| 📦 | Terminalblokk KF301 2P | ×1 | Kom 9. juni — «KF301 2P, 5.0mm pitch, sort» |
| 📦 | Vekemateriale bomullssnor 3mm | ×1 | Kom 6. juni |
| 📦 | Elektrisk tape | ×1 | Kom 9. juni — «20m PVC electrical tape, svart» |
| 📦 | XKC-Y25 (reserve) | ×4 | Kom 9. juni — «Y25-NPN-5-12V», minst 1 verifisert (bestilt ×4) |
| ✅ | KY-040 rotary encoder | ×1 | Testet 9. juni — IRQ-basert, dimmer 0–10 + av/på-knapp fungerer |
| ✅ | Jordfuktsensor kapasitiv v2.0 | ×1 (3stk) | Testet 9. juni — 1 av 3 testet (GPIO34), reagerer på vann. GPIO35+32 gjenstår |
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
| ⬜ | VL53L0X ToF-laser | ×3 | |
| ⬜ | ESP32-CAM-MB (OV2640) | ×2 | |
| ⬜ | Elektronikk-lakk (konformell coating) | ×1 | |

## Bestilling 4 — loddeutstyr & lek (~€54)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ⬜ | Tredje hånd (loddestasjon) | ×1 | |
| ⬜ | Magnetisk tredje hånd | ×1 | |
| ⬜ | USB-loddebolt C200S | ×1 | |
| ⬜ | Loddetinn 0.8mm | ×1 | |
| ⬜ | Avloddefletning | ×1 | |
| ⬜ | Silikon-loddematte | ×1 | |
| ⬜ | ESP32 starter kit | ×1 | |
| ⬜ | MG90S servo | ×2 | |
| ⬜ | I2C level converter (ikke i bruk) | ×1 | |
| ⬜ | WS2812B RGB-strip (lek) | ×1 | |

## Kjøp lokalt

| Status | Del | Notat |
|:------:|-----|-------|
| ✅ | Multimeter (UT131D) | Kjøpt — brukes til å sette buck til 5.0V før ESP32 |
| ✅ | USB-C datakabel | Fungerer — Thonny koblet til ESP32 uten problemer |
