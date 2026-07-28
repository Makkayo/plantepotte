# Mottaksliste — Plantepotte

Holder styr på hva som er **bestilt → ankommet → testet** på breadboard.

**Status-koder:**
- ⬜ Ikke kommet
- 📦 Ankommet (ikke testet)
- ✅ Testet og funker
- ⚠️ Ankommet, men problem (se notat)

*Sist oppdatert: 2026-07-28 — **B7 mottatt 5 av 7: BARENE KOM 28. juli.** ⏰ Photone-målingen er nå den aktive oppgaven (innen Buyer Protection, forvent ~150–250, måles rett på 24V-adapteren). Fra før: 24V-adapter, M3-standoffs, ESP32-32D KIT A og ESP-WROOM-32 «one set» (25. juli, godkjent uten inspeksjon — delene sjekkes når de skal brukes). Gjenstår: buck ×2 (~30. juli), FR120N ×4 (~13. aug).*

---

## Bestilling 1 — AliExpress (~€90)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ✅ | ESP32 32S DevKit (30-pin) | ×2 | Kom 9. juni — MicroPython v1.28.0 flashet, testet 9. juni |
| ✅ | LR7843/FR120N MOSFET-modul | ×4 | Kom 9. juni — BYGGESETT (løse skrueklemmer loddes på; grønn 2-v PWM/GND, blå 3-v +/LOAD/−, opto-isolert). **3 loddet + ESP32-styrt PWM-dimming av 12V-stripa verifisert 20. juni** ✅. **4. modul = SKRAP** (grønn 2-pin smeltet under lodding — hull + skrue ødelagt). → 3 gode (trenger bare 2) |
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
| ✅ | DC inline switch | ×2 | Kom 9. juni — 2 stk vippebryter m/barrel-jack, CE/UKCA/UL. **Spec verifisert 5. juli (MJJC-DC5521-304): merket 5V/12V/24V, 5A, LVD/CE** → gjenbrukes direkte i 24V-oppsettet (B7), ingen ny bryter trengs |
| 📦 | Glass fuse holder BLX-A | ×1 | Kom 6. juni — holder(e) + glass F3AL250V (rask, patron 5×20). F3A passer holder MEN er rask → reserve |
| 📦 | Slow-blow sikring 3A | ×1 | Kom 6. juni — keramisk T3AL250V (treg) ✅ DENNE brukes. Leaded/aksial (tråd-bein) → passer IKKE holder; kobles inline med Wago. Vurder å kjøpe 5×20 T3A patron til holder senere |
| 📦 | 3M dobbeltsidig tape | ×1 | Kom 6. juni |
| 📦 | Kabel-organizer klips 30stk | ×1 | Kom 9. juni — «3059 Black, 30pcs Cable Organizer Clips» |

## Bestilling 3 — laser + kamera (~€26)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ✅ | VL53L0X ToF-laser | ×3 | Kom 17. juni — «A03-VL53L0X-Zi», GY-VL53L0XV2, 940nm I2C. **Testet 20. juni:** header loddet, `i2c.scan()` viser 0x29+0x3C, `vl53l0x.py`-driver leser stabil avstand (mm) — community-driver verifisert mot ekte sensor ✅. 1 i bruk (potte1), 2 reserve |
| ✅ | ESP32-CAM-MB (OV2640) | ×2 | Kom 17. juni — «I64-ESP32-CAM+I65-MB-DIZuo», CH340G, Micro USB. **Testet 20. juni:** flashet i Arduino IDE, full kjede verifisert — WiFi → bilde → opplasting til Supabase Storage (`HTTP 200`) → dyp søvn, stabilt over flere kjøringer inkl. 59 KB-foto. 1 i bruk (potte1), 1 reserve |
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
| 📦 | 12V **5A**-adapter (self-adapting 2,1/2,5mm) | ×1 | **Kom 26. juni** — MODEL KDT-1250, OUTPUT 12V⎓5A, EU-plugg. Margin for 2 potter |
| 📦 | Wago **221-415** (5-veis, original) | 10-pk | **Kom 26. juni** — ekte Wago bekreftet. Samle 3 takstriper + ned-kabel til ett par |
| 📦 | Wago **221-413** (3-veis, original) | 10-pk | **Kom 26. juni** — ekte Wago bekreftet. Mindre 12V-skjøter |
| 📦 | Jordfuktsensor v2.0 | 10-pk | **Kom 26. juni** — kapasitiv, korrosjonsbestandig. → 13 totalt (8 til 2 potter + 5 reserve) |
| 📦 | Motstand-sortiment 1/4W | 600-pk | **Kom 26. juni** — 1% metallfilm, 30 verdier (10Ω–1MΩ), i sorteringsboks |
| 📦 | 5mm LED-pakke | 100-pk | **Kom 26. juni** — assortert (rød/grønn/gul/blå/hvit), F5 rund |
| 📦 | Silikonledning **2-pin 20 AWG** | 10 m | **Kom 26. juni** — rød+svart sammenhengende 2-pin. Kraft-runs 2 potter |
| 📦 | LED clip 8mm 2-pin | 5-pk | **Kom 26. juni** — «strip-to-wire» 8mm 2-pin. → 10 totalt |
| 📦 | **Flux-penn** (No Clean) | ×1 | **Kom 26. juni** — Low Solid / No Clean (IKKE syre-flux) ✅ |
| 📦 | Sikring 5×20 **Slow Blow** 3A | 10-pk | **Kom 26. juni** — glass 5×20mm treg (T), 10 stk. Patron til BLX-A-holderen |
| 📦 | Sikring 5×20 **Slow Blow** 5A | 10-pk | **Kom 26. juni** — glass 5×20mm treg (T), 10 stk. Til 5A-adapteren |
| 📦 | Perfboard double-sided 7×9cm | 5-pk | **Kom 26. juni** — blå, dobbeltsidig. Semi-permanent bygg (hovedkort) |
| 📦 | Perfboard double-sided 5×7cm | 10-pk | **Kom 26. juni** — blå, dobbeltsidig. Lodde-øving + små kort |
| 📦 | Pinnerader 2,54mm (male+female) | 5 sett | **Kom 26. juni** — 1×40-pin, hann+hunn. Hunn-headers på perfboard |

## Bestilling 6 — montering & kabling (~€23, bestilt 11. juni)

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| 📦 | Heat-set insert + skrue-sett (M2/M2.5/M3/M4 messing, 1050 stk) | ×1 | **Kom 26. juni** — messing «twill knurled», hot-melt insert + skruer. Smeltes inn i PETG |
| ❌ | PCB-distansebolter / standoffs (Rafford messing, M2–M6, 14 stk) | ×0 | **FEILFØRING** — denne «ordren» var i virkeligheten heat-set-tuppene (Rafford, M2–M6, 14 stk, €3 — se «Uventet»-seksjonen). Ekte standoffs ble aldri bestilt; **inngår nå i Bestilling 7** (M3 250-stk boks) |
| 📦 | Kabelspiral-wrap (svart, fleksibel) | ×1 | **Kom 26. juni** — 8mm Ø, 5m, svart spiral. Kabelbeskyttelse |

## Bestilling 7 — lys-oppgradering 24V + reserve (BETALT 5. juli, **795,72 kr** inkl. mva+frakt)

Vekstlys-byttet: magenta 12V-strip → hvite 24V Samsung LM281B-barer (~10× lys, fikser kamera-magenta). Uavhengig verifisert 5. juli (research-doc `2026-07-05-vekstlys-research-oppdrag.md`). 7 varer / 7 del-ordrer: subtotal 546,36 + frakt 90,13 + mva 159,23 = **795,72 kr**. Leveringene kommer SPREDT (12. juli–13. aug).

**Mottaksstatus 28. juli: 5 av 7 kommet — barene er her.** Delene legges rett på lager uten inspeksjon (Markus' valg — antatt OK); det som må sjekkes står per rad som *«verifiseres ved bruk»* og hører til byggesteget, ikke mottaket. **Unntaket er barene:** Photone-målingen har en frist (Buyer Protection) og må gjøres nå.

> 💡 **Avgjort 25. juli: potte 1 bygges som 24V fra start** — 12V-mellomsteget er droppet. Lys-kjeden kan derfor først kobles når buck (~30. juli) + FR120N (~13. aug) er inne; sensorene kan ferdigtestes på det gamle 12V-adapter+buck-paret i mellomtiden.
>
> ⚡ **Til byggedagen:** 24V-adapteren har samme 5,5×2,1mm-plugg som 12V-adapterne. Gammel buck (12V-inn), LR7843 (30V) og phyto-stripa dør av 24V — hold 24V unna bench-oppsettet.

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| 📦 | Samsung LM281B+ 24V 25W alu-bar 500×30mm, 2-pk (KQO Official Store) | ×1 (2 barer) | 141,69 kr · ordre `3074999822034751` · **Kom 28. juli** (en uke bak opprinnelig 12.–21. juli). Selve lyset — 50 W totalt, 3000K+5000K hvit + 660nm rød. ⏰ **AKTIV OPPGAVE — den ene sjekken med frist:** mål PPFD med Photone (papir-diffusor) **— skal vise ~150–250**. **Riktig Photone-lyskilde = «LED Full+Red»** (hvit fullspektrum + 660nm rød = akkurat denne baren). Den gamle «LED Red/Blue» Markus eide fra stripe-målingen er FEIL spektrum her. Koster ~$5,99 engangs (enkeltkilde, IKKE Pro-abonnement) — se `HISTORIKK.md` for Photone-prismodellen. **Merk: PPFD-tallet har ingen reell frist** — Buyer Protection-sjekken er at begge barer lyser på begge kanaler + at strømtrekket er ~1,0 A/bar ved 24V (måles gratis med UT131D; ~0,5 A = underspesifisert bar = reklamer). PPFD er kalibrering for appens `bar24`-variant og kan gjøres når modulen er kjøpt. Måles rett på 24V-adapteren (ligger klar), ingen grunn til å vente på FR120N. **Tilkobling avklart 28. juli (bilde + avlest merking):** 3 stk **push-in fjærklemmer** loddet på kortet — ingen lodding nødvendig, men de tar **bar strippet ledning (8–10 mm, tvinnet), IKKE Dupont-pinner** (samme felle som Wago). Merking: `W/UV/IR+` = hvit-kanalen (generisk kortmerking; produsenten bruker samme PCB til hvit/UV/IR — vår er bestykket hvit 3000K+5000K), `R+` = 660nm rød, `GND` = felles minus. **Rød har altså egen inngang, men deler retur med hvit** → begge `+` til 24V+, og **én MOSFET på GND-siden dimmer begge** = arkitekturen er uendret. Ledning: 20 AWG (B5, 2-pin rød/svart) permanent; Dupont-tråd kun til benketest (26 AWG, ~1 A/bar OK over 20–30 cm, men 2,1 A i felles retur opp stolpa krever 20 AWG). **Bonus-mulighet:** to MOSFET-er (GPIO 19/23 er ledige, 4 FR120N på vei) gir separat rød-styring — f.eks. rød av under ESP32-CAM-bilder. Ikke gjort nå |
| 📦 | 24V 5A adapter, EU-plugg (SuperMall Store) | ×1 | 147,15 kr · ordre `3074999822114751` · **Kom 25. juli** — 24V⎓5A, EU-plugg, 5,5×2,1mm (matcher B1-pigtails + inline-bryter ✓ 24V/5A-rated). Ny felles skinne (barer + buck). *Verifiseres ved bruk:* mål ubelastet spenning (~24–25V) når 24V-kjeden kobles |
| ⬜ | FR120N MOSFET-modul 100V 9.4A, opto-isolert (TZT teng Official) | ×4 | 4,05 kr/stk · ordre `3074999822094751` · **levering ~13. aug (sist)**. Bytter LR7843 (30V for tett på 24V). 4 stk = potte 1 + potte 2 + 2 reserve. Samme byggesett-type som B1 → skrueklemmer må loddes |
| ⬜ | 24V/12V→5V **5A** buck 25W (WAVGAT Official) | ×2 | 16,31 kr/stk · ordre `3074999822154751` · levering ~30. juli. Ny 5V-kilde (gammel buck er 12V-inn, tåler ikke 24V). 5A ut = rikelig for ESP32+CAM. Én per potte. **Verifiser ~5V med multimeter FØR ESP32** |
| 📦 | M3 standoff-boks messing, 250 stk (Hundred Years Store) | ×1 | 74,20 kr · ordre `3074999822054751` · **Kom 25. juli** — assortert boks (bolter/skruer/muttere/skiver). Bar-montering m/luftspalte (termisk!) + perfboard. Erstatter B6-feilføringen. *Verifiseres ved bruk:* finn høydene i boksen når lysbjelken designes i fase 3 (de setter luftspalten under barene) |
| 📦 | ESP32-32D Type-C **KIT A** (38-pin + GPIO-breakout) (NEVER GIVE UP Store) | ×1 | 69,15 kr · ordre `3074999822134751` · **Kom 25. juli** — produkttittel bekrefter 38-pin + **CP2102** (samme USB-chip som B1-kortene → ingen ny driver). **Lek/reserve — IKKE potte-hjerne** (38-pin ≠ 30-pin footprint) |
| 📦 | ESP-WROOM-32 **30-pin Type-C** «one set» m/skrueklemme-breakout (BodyWell Store) | ×1 | 65,35 kr · ordre `3074999822074751` · **Kom 25. juli** — **POTTE 2-HJERNE/RESERVE ✓** (verifisert mot produktbilde før kjøp: 15 pinner/side, ingen D2/D3/CMD, Type-C, PCB-antenne = samme footprint/pinout som B1). *Verifiseres ved bruk (fase 5, potte 2):* tell pinnene (15/side) før den bygges inn · plugg i PC — ingen COM-port betyr CH340-driver (B1 = CP2102) · flash MicroPython v1.28.0 som på B1-kortene |

### 📏 Photone-måleserie 28. juli 2026 — LM281B-bar (GYLDIG)

**✅ Målt med riktig spektralmodul «LED Full+Red»** (hvit fullspektrum + 660nm rød = akkurat denne baren). Markus kjøpte den før måleserien. Den gamle «LED Red/Blue» han eide fra stripe-målingen er feil spektrum her og ble ikke brukt. **Tallene under er gyldige — ingen ny måleserie nødvendig.**

**Metode-felle som kostet tid:** Photone står som default på **24 timers fotoperiode**. DLI-avlesninger må derfor skaleres til faktisk fotoperiode, eller — bedre — regnes om til **PPFD = DLI₂₄ / 0,0864**, som er fotoperiode-uavhengig.

Målt **én bar**, midt under (avstand til bar):

| Avstand | Målt | → PPFD | Jevnhet (side/midt) |
|---|---|---|---|
| 21 cm | 7,6 mol @24t | 88 | 79 % |
| 11 cm | 14 mol @24t | 162 | 71 % |
| 10 cm | 13,5 mol @18t | 208 | — |
| 5–6 cm | 28 mol @24t | 324 | 57 % |

**Nøkkelfunn — lyset faller som 1/d, IKKE 1/d².** 28→14→7,6 ved 5,5→11→21 cm: hver dobling av avstanden halverer lyset. Det er linjekilde-oppførsel (500mm bar), og betyr at lyset bærer bedre utover enn en punktkilde — nabobaren bidrar mer, og jevnheten blir bedre enn punktkilde-modeller tilsier.

Beregnet for **to barer** (¼ og ¾ inn på 450mm, 22,5 cm fra hverandre), snitt over flaten:

| Høyde | PPFD snitt | Jevnhet | DLI @16t | DLI @18t |
|---|---|---|---|---|
| 5,5 cm | ~230 | 37 % ✗ | 13,2 | 14,9 |
| 10 cm | ~213 | 76 % | **12,3** ✓ | **13,8** ✓ |
| 15 cm | ~154 | 97 % | 8,9 ✗ | 10,0 ✗ |
| 21 cm | ~133 | 95 % | 7,7 ✗ | 8,6 ✗ |

**Konsekvenser:**
1. **Fotoperioden må opp fra 13 t til 16–18 t** for å nå salat-/urte-målet (DLI 12–17). Appen har fotoperiode-kompensasjon i `lys.ts`. Energi ved 18 t: ~27 kWh/mnd ≈ **30–35 kr/mnd**.
2. **Hengehøyde ~10 cm** er beste kompromiss mellom styrke og jevnhet — ikke 15 cm som først antatt.
3. **5–6 cm er dobbelt uklokt:** jevnheten kollapser til 37 %, og 28 mol@24t ≈ 600 PPFD = metningspunktet der bladene ikke kan bruke mer lys.
4. **⬜ ÅPENT:** jevnhetstallene antar planter over hele 450mm-bredden. Plantene står i **to oktagon-potter med vanntank imellom** — står barene rett over pottene, havner den mørke sonen over tanken og ujevnheten betyr mindre. **Trenger senteravstand mellom oktagon-pottene fra Fusion-modellen** for å regne ferdig.
5. Baren er **ikke** en flopp: ~5–6× magenta-stripa (~30 PPFD). Ingen reklamasjonsgrunn. ⬜ Strømmåling (~1,0 A/bar @24V med UT131D) gjenstår som siste harde spec-sjekk.
6. **Én vs to barer — avklart mot faktisk 3D-geometri 28. juli.** ⚠️ Første regnestykke antok pottene på hver SIDE av lysbjelken (~112mm ut) → ga misvisende ~92 PPFD. **Fusion-modellen viser at de to oktagon-pottene ligger PÅ LINJE under bjelken**, som spenner langs lengden mellom de 2 stolpene og går rett over sentrum av begge potter. Sidefallet skjer bare i dybderetningen, ~90mm ut til potte-kant. Korrigert:

| | Én bar | To barer |
|---|---|---|
| PPFD snitt over potte @10 cm | ~160 | ~242 |
| DLI @ 18 t | **~10,4** | **~15,7** |
| Redesign av tak | 4 bein + nye base-fester | bare ny takplate (2 bein beholdes) |
| Kostnad for potte 1 | 0 kr | **0 kr — begge barer er allerede eid** |

**Konklusjon: bygg potte 1 med begge barer.** Ikke fordi én er ubrukelig (~10,4 mol + reflekterende vegger ≈ 12 mol = så vidt i mål for salat), men fordi to koster null ekstra nå, gir 50 % mer lys, krever *mindre* redesign, og kan **dimmes ned til én-bar-nivå via PWM/GPIO26** (appen har intensitet 0–100 %). Motsatt vei krever ny print. **Potte 1 blir dermed eksperimentet som avgjør potte 2:** kjør begge først, dim ned til én, se om plantene merker det → kjøp for potte 2 basert på data (sparer 125 kr/potte hvis én holder). Tegn taket for to uansett.
7. **Designspor som er riktig, men ikke tatt:** smalere + lengre kasse presser potte-kanten nærmere bar-aksen der lyset taper seg — den ene endringen som faktisk flytter tallene for én-bar-varianten. Krever 4 bein (smal bjelke over lang spennvidde bøyer/vrir seg i PETG). Parkert 28. juli — «får se hva det blir til».
7. **🌡️ Barene blir «veldig varme» (bekreftet ved test 28. juli)** — som ventet (50–70 °C). Alu-profilen ER kjøleribba: **oversiden må stå fritt eksponert**, ikke bygges inn tett. Standoffs (M3-boksen) gir luftspalte til PETG-taket, + ventilasjonsåpninger rett over barene. PETG mykner ~80 °C. Kjenn på PETG-en etter 1 t drift første gang.

## Uventet / ekstra i 26. juni-leveransen

| Status | Del | Antall | Notat |
|:------:|-----|:------:|-------|
| ✅ | Heat-set insert-tipper (loddebolt) | 14 | **Kom 26. juni** — Rafford skru-på-tipper M2–M6, **14 stk** (€3), for å smelte heat-set inserts inn. **Dette er varen B6 feilførte som «PCB standoffs»** (samme merke/spec/pris) — ikke en egen 4-stk bonus |

## Kjøp lokalt

| Status | Del | Notat |
|:------:|-----|-------|
| ✅ | Multimeter (UT131D) | Kjøpt — brukt til buck (5,26V) + LED-strømmåling (0,36 A/stripe) 10. juni |
| ✅ | USB-C datakabel | Fungerer — Thonny koblet til ESP32 uten problemer |
