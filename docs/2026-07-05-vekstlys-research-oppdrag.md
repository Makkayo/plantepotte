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

**Endelig ordre (AliExpress — ✅ BESTILT & BETALT 5. juli 2026, ført som Bestilling 7 i `mottaksliste.md`. Subtotal 546,36 + frakt 90,13 + mva 159,23 = 795,72 kr, 7 del-ordrer):**
| Del | Antall | Pris | Merknad |
|-----|:---:|------|---------|
| Samsung 24V-barer 50W 2-pk (KQO) | 1 | 141,69 kr | Selve lyset (2 barer i pakken). Levering 12.–21. juli — FØRST |
| 24V 5A adapter EU (SuperMall) | 1 | 147,15 kr | Plugg **5,5×2,1 mm bekreftet** (matcher eksisterende) |
| FR120N MOSFET 100V 9.4A (TZT) | **4** | 4,05 kr/stk | Bryter (bytter LR7843 30V) — 4 stk = potte 1 + potte 2 + 2 reserve/lek. Levering ~13. aug — SIST |
| 24V/12V→5V **5A** buck 25W (WAVGAT) | **2** | 16,31 kr/stk | Ny 5V-kilde (gammel buck er 12V-inn). 5A ut = rikelig over 1,5A-kravet ✓. Levering ~30. juli |
| M3 standoff-boks 250-stk (Hundred Years) | 1 | 74,20 kr | Bar-montering + perfboard |
| ESP32 32D Type-C KIT A (NEVER GIVE UP) | 1 | 69,15 kr | Lek/reserve (38-pin), ikke potte-hjerne |
| ESP-WROOM-32 30-pin Type-C «one set» (BodyWell) | 1 | 65,35 kr | **Potte 2-hjerne/reserve ✓** — verifisert 30-pin + Type-C + PCB-antenne fra produktbilde. Lukker ønskeliste-punktet |

**Merk leveringsrekkefølgen:** barene kommer først (12.–21. juli), FR120N sist (~13. aug) → **Photone-mål barene rett på 24V-adapteren (uten MOSFET, alltid-på)** innen Buyer Protection uten å vente på bryteren.

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
8. **Fotoperiode-strategi:** app-en forlenger allerede dagen når intensitet ikke rekker DLI (opptil 18 t), og PPFD er nå **kalibrerbar** i appen (Fable 3. juli — legg inn målt verdi i `settings.ts`/lys-arket, erstatter 200 µmol-antagelsen). Med sterkere barer — hva er beste kombinasjon av PPFD × timer for disse vekstene (energi vs vekst)?

---

## 6. Gratis-spaker som gjelder uansett (uavhengig av kjøp)
1. **Senk lysbjelken** mot plantene (stolpene er høydejusterbare, Wago tar slacken).
2. **Hvite/reflekterende innervegger** (print PETG hvitt, eller mylar-folie — ~90–95 % refleksjon vs ~80 % hvit PETG). *Utsatt av Markus til han ser om det trengs.*
3. **Bruk plantene som måler:** strekker seg/bleke = mer lys; kompakte/stive = nok. Følg de første 1–2 ukene.

---

## 8. Fable-gjennomgang 5. juli — svar på de åpne spørsmålene

**Hovedkonklusjon: KJØP KURVEN som den står.** Ingen av de 8 spørsmålene endret beslutningen. Detaljer:

1. **Reell ytelse billige LM281B-barer:** Bildet fra uavhengige kilder er todelt — kvalitets-armaturer med ekte LM281B måler godt (2,7–2,9 µmol/J, og en Apogee MQ-500-måling av et LM281B-panel viste 387–482 PPFD), MEN billige AliExpress/Amazon-kloner bruker ofte lavere bins (~150 lm/W → reelt ~1,4–2,0 µmol/J). **1,8 som planleggingstall er riktig konservativt.** Selv i verste fall (~1,4) gir 2 barer ~150–190 PPFD reelt = 5–6× dagens ~30 og nok til bladvekster. Nedsiden er bundet; Photone-måling innen Buyer Protection står som mitigering.
2. **1 eller 2 barer? → 2 (bekreftet med regnestykke).** Footprint 0,45×0,535 m = 0,24 m². 2 barer @1,8 = 90 µmol/s → ~225–260 PPFD reelt (60–70 % treffer flaten uten reflekterende vegger) = midt i salat-optimum 250–350. **1 bar = ~110–130 PPFD** — funker, men under optimum, og gir NULL margin hvis barene reelt leverer lavere bin. 2 barer er samtidig sikringen mot spec-inflasjon. Prisdifferansen (~70 kr) er ikke verdt risikoen.
3. **Plassering:** barene langs 535mm-retningen, ca. ¼ og ¾ inn på 450mm-bredden (~112 mm fra hver kant, ~225 mm mellomrom) → jevnest dekning. Hengehøyde 10–15 cm over kanopiet; med metning ~600 PPFD er svi-risiko null selv på 10 cm.
4. **Spektrum:** 3000K+5000K hvit + 660nm er riktig — blåandelen i det hvite hindrer strekking, rød løfter yield. 2×IR + 2×UV er neglisjerbart (langt under 20 µmol far-red-grensen). Ikke bytt.
5. **Alternativer:** DC-kravet (ESP32/MOSFET-PWM) eliminerer nesten alt forbrukermarkedet — Barrina/Monios T5 og quantum boards er 230V. Eneste ferdige 24V DC-alternativ funnet er Procyon 2.0 (24W, 2,5 µmol/J) til ~10× prisen. **LM281B-barene ER sweet-spot'en i DC-lavvolt-klassen.**
6. **Counterfeit:** kan ikke verifiseres fra listing — selger-anmeldelser + Photone-måling (hvitt lys = ±20–30 PAR nøyaktig) innen Buyer Protection er riktig og eneste realistiske mitigering. Allerede planlagt.
7. **Termisk — eneste reelle aksjonpunkt:** 25 W per slank 500mm-profil uten finner blir varm (anslagsvis 50–70 °C i fri luft); PETG mykner ~80 °C. **Fase 3-krav til topp-designet:** (a) barene på 8–10 mm standoffs (luftspalte bak — standoffs er i kurven), (b) ventilasjonsåpninger i toppen over/rundt barene (hex-mønsteret finnes alt som formspråk), (c) ikke PETG i direkte kontakt med bar-baksiden, (d) kjenn/mål temperatur etter 1 t drift første gang.
8. **Fotoperiode/energi:** med reelt ~200–250 PPFD → DLI-mål 14–17 nås på **14–16 t ved 100 %** — 18-timers-kompensasjonen trengs ikke lenger. Energi: 50 W × 15 t ≈ 0,75 kWh/dag ≈ ~25–30 kr/mnd (mot ~5–6 kr for gamle stripa) — synlig, men greit. Husk: (a) legg målt PPFD inn i appen (lys-arket), (b) `energi.ts` bruker målt 12V-effekt — oppdater etter byttet.

**Kurv-notater (uendret fra forrige gjennomgang):** standoff-boksen (74 kr) er fortsatt svakeste verdi-linje men OK som lager; buck-en må sjekkes for ≥1,5 A ved mottak; sjekk om barene har separat rød-inngang + medfølgende ledninger.

**Ekstra kilder (Fable-runden):** [THCFarmer LM281B-måling (Apogee MQ-500)](https://www.thcfarmer.com/threads/samsung-lm281b-vs-samsung-301b.128438/) · [Trimleaf — kjøpsguide/knockoff-advarsel](https://trimleaf.com/blogs/guides/pay-attention-to-these-things-when-buying-led-grow-lights) · [Happy Leaf Procyon 2.0 (24V DC-alternativ)](https://happyleafledgrowlights.com/products/procyon-2-0-full-spectrum-led-grow-lights) · [LED Grow Lights Depot — passiv kjøling](https://www.ledgrowlightsdepot.com/blogs/blog/led-grow-light-cooling-and-heat-dispersion-tips)

---

## 7. Kilder (så langt)
- Bar-spec: [customledpcb DC24V Samsung LM281B](https://www.customledpcb.com/dc24v-30w-samsung-lm281b-led-full-spectrum-grow-light-strips-with-3000k-5000k-660nm-red-uv-ir-mixed-color_p21028.html)
- FR120N: [Infineon/Vishay datablad](https://www.infineon.com/dgdl/Infineon-IRFR120N-DataSheet-v01_01-EN.pdf?fileId=5546d462533600a40153562d2620204d)
- Photone: [growlightmeter.com — accuracy](https://growlightmeter.com/the-best-light-meter-app-for-plants/)
- LM281B efficacy/kvalitet: [Spider Farmer — Samsung LED guide](https://www.spider-farmer.com/blog/samsung-led-grow-lights/) · [THCFarmer LM281B vs 301b](https://www.thcfarmer.com/threads/samsung-lm281b-vs-samsung-301b.128438/)
- Salat/basilikum PPFD/DLI + spektrum: [BATA — lettuce grow light guide](https://www.batagrowlight.com/grow-lights-for-lettuce/) · [Optimal light intensity lettuce & basil under R/B LED (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0304423820303368)
