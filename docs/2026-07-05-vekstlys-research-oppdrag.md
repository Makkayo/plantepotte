# Vekstlys — research-oppdrag & statussnapshot (5. juli 2026)

## 0. Hva dette dokumentet er
- **Research-underlag** for en grundig fordypning på vekstlys-oppgraderingen (tenkt utført av Fable).
- Samtidig et **snapshot** av beslutning + handlekurv + hva som allerede er verifisert, per 5. juli 2026.
- Kilde-sannhet ellers: plantepotte-skillens «Vekstlys — ytelse, måling & oppgraderingsvei»-seksjon. Hold i synk.

---

## 1. Rammer (må respekteres i researchen)
- **System:** selvvannende innendørs plantekasse, veke/sub-irrigasjon, IKEA 365+ 5,2 L tank. Footprint ~**450 × 535 mm**, 2 åttekantede potter (2–4 planteplasser). Rota står *alltid* fuktig (veke).
- **Vekster nå:** basilikum 'Gustosa', bladsalat/baby leaf, bladsalat 'Witte Dunsel', ruccola 'Wasabi'. Alle **bladvekster, lav–middels DLI, lys-tolerante** (vokser saktere ved lite lys, dør ikke).
- **Elektronikk-integrasjon (hard constraint):** ESP32 (MicroPython) styrer lyset via **PWM på GPIO26 → low-side MOSFET**. Lyset MÅ være **DC** og kunne slås/dimmes via MOSFET for å beholde app/timer/KY-040-styringen. **Ikke 230V-armaturer** (bryter integrasjonen + nettsikkerhet).
- **Ny strøm-arkitektur:** én **24V-adapter** → barene (via FR120N MOSFET) + 24V→5V buck → ESP32/sensorer/ESP32-CAM. (12V-skinna droppes helt — eneste 12V-last var den gamle stripa.)
- **Kamera:** ESP32-CAM på toppen tar vekstbilder → **hvitt lys ønskes** (magenta phyto-lys ødela bildene).
- **Innkjøp:** hobby-budsjett, AliExpress/Norge, Buyer Protection. Måleverktøy: **Photone** (mobil-app) + evt. senere ekte PAR-meter.
- **Skala-mål:** «nok lys til friske, kompakte bladvekster», ikke maks-yield-cannabis. Skal kunne skaleres til potte 2 (identisk).

---

## 2. Beslutning per 5. juli (det som skal stress-testes)
Bytt fra svak magenta 12V phyto-strip → **hvite 24V Samsung LM281B-barer.**

**Valgt lys:** 2× **DC24V 25W Samsung LM281B+ 500 mm stive alu-barer** (50 W totalt; 3000K+5000K hvit + 660nm rød + IR/UV).

**Handlekurv (AliExpress, ~502 kr m/frakt):**
| Del | Pris | Merknad |
|-----|------|---------|
| 2× Samsung 24V-barer 50W (KQO) | 141,69 kr | Selve lyset |
| 24V 5A adapter EU (SuperMall) | 147,15 kr | Plugg **5,5×2,1 mm bekreftet** (matcher eksisterende) |
| FR120N MOSFET 100V (TZT) | 4,05 kr | Bryter (bytter LR7843 30V) |
| 24V→5V buck 2-pk (WAVGAT) | 16,31 kr | Ny 5V-kilde (gammel buck er 12V-inn) |
| M3 standoff-boks 250-stk (Hundred Years) | 74,20 kr | Bar-montering + perfboard |
| *(+ 1× ESP32 32D Type-C KIT A, Choice/gratis frakt)* | 69,15 kr | Lek/reserve, ikke potte-hjerne |

Alt annet til montering **eies** (silikonledning 20 AWG, Wago, 3A/5A slow-blow-sikring + BLX-A-holder, barrel-pigtail, inline-switch, heat shrink, heat-set inserts + M3-skruer). ⚠️ **Ikke betalt** — Markus sjekker ut selv.

---

## 3. Hva som ALLEREDE er verifisert (ikke bruk research-tid på nytt)
- **Bar-spec** (customledpcb): DC24V **konstant-spenning** (plugg rett i 24V, ingen CC-driver — «all DC24V power driver works with it»), **250–350 PPFD**, **1,8 µmol/J**, 500×30 mm, 38 hvit (28×3000K + 10×5000K) + 20 rød (660nm) + 2 IR + 2 UV. Kan kjedes 6 (maks 10).
- **FR120N** datablad: Vgs(th) 2,5–4 V, drives fra 3,3–5 V logikk (opto-modul håndterer gate-drive). 100V/15A → rikelig margin over 24V. Drop-in for LR7843.
- **Photone:** ±20–30 PAR mot ekte PAR-meter **når** papir-diffusor + riktig lyskilde-innstilling brukes. Leser **hvitt langt mer nøyaktig** enn magenta.
- **Plugg:** 24V-adapteren er **5,5×2,1 mm** → matcher B1-pigtailene + inline-bryter. Ingen adapter nødvendig.
- **Fotontall (grovt):** 50 W × 1,8 µmol/J = **90 µmol/s** PPF. Over kanopiet (~0,2–0,3 m²) → ~**150–300 PPFD snitt** = **5–10× dagens ~30**.

---

## 4. Nye research-funn (5. juli, Opus) — styrker beslutningen
- **LM281B+ er legit:** kvalitets-bins gir ~**2,7 µmol/J** (nesten LM301B). Uavhengig test (cocoforcannabis): LM281B-armatur ga **mer** PPFD (325) enn LM301B-versjon (280) ved samme watt (flere dioder). MEN de **billige AliExpress-barene spec'es 1,8 µmol/J** (lavere bin/driver) → **bruk 1,8 som planleggingstall**, ikke 2,7.
- **Bladsalat optimal PPFD = 250–350 µmol/m²/s @ 14–16 t, DLI 14–17** → bar-spec (250–350) treffer **nøyaktig** salat-optimum.
- **Lysmetning salat ~600 PPFD** → barene (250–350) er godt under → **kjør på maks uten stress/svi-risiko**.
- **Spektrum:** R:B-forhold ~**3** maks yield (2× vs 0,5), mer klorofyll/flavonoider; 7:1 R:B også nevnt for salat. **Blått hindrer strekking.** Far-red >20 µmol under lys-på gir strekking (baren har bare 2× 730nm → trolig ufarlig, men verifiser).
- **Vekstmiljø:** temp 18–22 °C dag, unngå >25 °C (bolting), 14–16 t lys / 8–10 t mørke. (Kobles til app-ens klima/VPD-modul.)
- **⚠️ Counterfeit-risiko:** falske «Samsung»-dioder finnes på billige armaturer → **mitigering: mål PPFD med Photone FØR ferdig bygg, innenfor Buyer Protection.**

**Netto:** researchen så langt **bekrefter kjøpet kraftig** — bar-spec = salat-optimum, godt under metning, spektrum i riktig sone, diode-familien solid. Hovedusikkerhet = om de billige barene faktisk leverer 1,8 µmol/J (bin/counterfeit).

---

## 5. Åpne spørsmål for Fable (den grundige researchen)
1. **Reell målt PPFD** av akkurat disse billige 24V «Samsung LM281B»-barene — finn buyer-målinger / MIGRO-/cocoforcannabis-stil tester. Er 1,8 µmol/J realistisk, eller lavere? Hvor mye taper cheap-driver + evt. klone-dioder?
2. **Trenger han egentlig 2 barer (50 W) per potte, eller holder 1 (25 W)?** Salat-optimum er 250–350 PPFD. Hvis 1 bar gir det over den faktisk planta flaten, sparer han penger + varme. 2 barer = bedre jevnhet/dekning. **Regn på footprint (~45×50 cm) og lysfordeling.**
3. **Optimal 2-bar-plassering:** avstand mellom barene + hengehøyde for jevn PPFD over footprinten (kant vs senter, invers-kvadrat). Hvor lavt kan barene henge over bladvekst uten svi (metning 600 = god margin)?
4. **Spektrum-finpuss:** er bar-ens R:B optimalt for kompakte bladvekster, eller bør han supplere/velge mer blått (5000K/6500K over 3000K) for å hindre strekking? Nytte vs risiko av IR/UV-diodene for salat/basilikum?
5. **Bedre/billigere alternativ i samme skala-klasse** som DIY-miljøet faktisk anbefaler (Barrina/Sunblaster T5 LED-rør? Samsung LM301-strip-kits? mini quantum board? ferdig hvit bar m/ekte µmol-spec)? Hittil-konklusjon: LM281B-bar = sweet-spot, men verifiser mot reelle brukererfaringer.
6. **Counterfeit-håndtering:** hvordan gjenkjenne ekte Samsung-dioder / hvilke AliExpress-selgere er til å stole på for LM281B-barer?
7. **Termisk:** 25 W alu-bar passivt montert i en semi-lukket 3D-printet kasse-topp (PETG) — nok kjøling, eller trengs ventilasjon / spesifisert luftspalte bak baren?
8. **Fotoperiode-strategi:** app-en forlenger allerede dagen når intensitet ikke rekker DLI (opptil 18 t). Med sterkere barer — hva er beste kombinasjon av PPFD × timer for disse vekstene (energi vs vekst), og bør `ANTATT_PPFD_MAX` i `lys.ts` settes til målt verdi?

---

## 6. Gratis-spaker som gjelder uansett (uavhengig av kjøp)
1. **Senk lysbjelken** mot plantene (stolpene er høydejusterbare, Wago tar slacken).
2. **Hvite/reflekterende innervegger** (print PETG hvitt, eller mylar-folie — ~90–95 % refleksjon vs ~80 % hvit PETG). *Utsatt av Markus til han ser om det trengs.*
3. **Bruk plantene som måler:** strekker seg/bleke = mer lys; kompakte/stive = nok. Følg de første 1–2 ukene.

---

## 7. Kilder (så langt)
- Bar-spec: [customledpcb DC24V Samsung LM281B](https://www.customledpcb.com/dc24v-30w-samsung-lm281b-led-full-spectrum-grow-light-strips-with-3000k-5000k-660nm-red-uv-ir-mixed-color_p21028.html)
- FR120N: [Infineon/Vishay datablad](https://www.infineon.com/dgdl/Infineon-IRFR120N-DataSheet-v01_01-EN.pdf?fileId=5546d462533600a40153562d2620204d)
- Photone: [growlightmeter.com — accuracy](https://growlightmeter.com/the-best-light-meter-app-for-plants/)
- LM281B efficacy/kvalitet: [Spider Farmer — Samsung LED guide](https://www.spider-farmer.com/blog/samsung-led-grow-lights/) · [THCFarmer LM281B vs 301b](https://www.thcfarmer.com/threads/samsung-lm281b-vs-samsung-301b.128438/)
- Salat/basilikum PPFD/DLI + spektrum: [BATA — lettuce grow light guide](https://www.batagrowlight.com/grow-lights-for-lettuce/) · [Optimal light intensity lettuce & basil under R/B LED (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0304423820303368)
