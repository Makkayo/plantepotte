# Plantepotte — Prosjekthistorikk

Datert endringslogg og beslutningshistorikk, flyttet ut av prosjektskillen 5. juli 2026
(skillen beskriver kun nå-tilstanden; dette er arkivet). Nyeste nederst per seksjon.
Bestillingsstatus per del: `mottaksliste.md`. Hva som eies nå: `lager.md`.

---

## Bestillinger — detaljtabeller (B1–B6, alle mottatt)

### Bestilling 1 — AliExpress (mai 2026, ~€90 inkl. mva)

| Del | Spesifikasjon | Antall | Pris |
|-----|---------------|--------|------|
| ESP32 | 32S Development Board, 30-pin Type-C, WROOM-32D | ×2 | €4.18/stk |
| LR7843/FR120N MOSFET | Opto-isolert **byggesett** (ikke ferdig): bart kort + løse skrueklemmer som loddes på — grønn 2-v `PWM`/`GND`, blå 3-v `+`/`LOAD`/`−`. Medfølgende 3-pins header passer IKKE (5mm vs 2,54mm) → reserve | ×4 | €1.21 tot |
| LED-strip | Phyto 12V 5050, 4R:1B ratio, IP65, 5m | ×1 | €10.47 |
| 12V adapter | AC110-240V → 12V 3A, EU-plugg | ×1 | €5.62 |
| DC barrel jack | 5.5×2.1mm pigtail-par med skruklemmer (10par) | ×1 | €3.52 |
| Breadboard | MB-102 830-punkt + 65 jumper-kabler | ×2 | €3.17 |
| Buck converter | **FAST 5V** USB-buck (KIS3R33S-type), 5A — barrel-jack inn (VIN) + USB/skruklemmer ut (5V/GND). IKKE justerbar (feilnotert «LM2596S adjustable»). Målt 5,26V ✅ | ×1 | €1.83 |
| LED clip connector | 8mm 2-pin Strip to Wire A, solderless (5stk) | ×1 | €1.40 |
| Terminalblokkstrips | KF301 2P sort, 5mm pitch (10stk) | ×1 | €1.17 |
| Vekemateriale | Bomullssnor 3mm, 10m | ×1 | €1.52 |
| Elektrisk tape | Weather-resistant, 20ft | ×1 | €1.58 |
| XKC-Y25 | Kapasitiv væskenivåsensor, NPN 5-12V, non-contact | ×4 | €4.41 |
| KY-040 | Rotary encoder modul med knapp, 360°, med caps (3stk) | ×1 | €2.46 |
| Jordfuktsensor | Kapasitiv v2.0, korrosjonsbestandig (3stk) | ×1 | €2.46 |
| OLED-skjerm | SSD1306 0.96" I2C 128×64, blå, 4-pin | ×1 | €1.58 |
| DHT22 | AM2302 temp+fukt sensor, med jumper-kabler | ×1 | €1.23 |

### Bestilling 2 — AliExpress tilbehør (mai 2026, €37.18 fri frakt)

| Del | Spesifikasjon | Antall | Pris |
|-----|---------------|--------|------|
| Silikonledning 22 AWG | 5m rød + 5m svart, fleksibel høy-temp | ×1 | €3.16 |
| Dupont jumper 30cm | Male-to-Male (40pin) | ×1 | €2.10 |
| Dupont jumper 30cm | Male-to-Female (40pin) | ×1 | €1.57 |
| Dupont jumper 30cm | Female-to-Female (40pin) | ×1 | €1.57 |
| Lever-cable connectors (Wago 221-klone) | 1-to-1 inline splice, AWG 28-12, 50 stk | ×1 | €6.32 |
| Multi-function wire stripper "Pro" | 3-i-1: strip 10-24 AWG, cut, crimp | ×1 | €7.56 |
| Heat shrink tubing kit | 580 stk, 11 størrelser (1-10mm), 6 farger, EVA | ×1 | €4.74 |
| DC inline switch (MJJC Inline 304) | 5.5×2.1mm hann-til-hunn, vippebryter. **Spec verifisert 5. juli 2026 (MJJC-DC5521-304): 5V/12V/24V, 5A, LVD/CE** | ×2 | €2.44 |
| Glass fuse holder (BLX-A) | 5×20mm svart, 10 stk — fulgte m/ glass **F3AL250V (rask)**; holder+F3A blir RESERVE (vi vil ha treg, ikke rask) | ×1 | €2.27 |
| Slow blow fuser (T-type, keramikk) | **leaded/aksial T3AL250V** (tråd-bein, IKKE 5×20 patron) — kobles inline med Wago, passer IKKE holderen | ×1 | €1.76 |
| 3M dobbeltsidig tape (transparent akryl) | 118in × 5mm, sterk-festende | ×1 | €1.75 |
| Kabel-organizer klips (adhesive-mount) | 30 stk svart, dobbeltsidig tape-back | ×1 | €1.94 |

### Bestilling 3 — vannmåling-laser + kamera (mai 2026, ~€26)

Erstattet XKC-Y25 for vannmåling, og la til kamera. XKC-Y25 ×4 fra B1 ble reserve.

| Del | Spesifikasjon | Antall | Notat |
|-----|---------------|--------|-------|
| VL53L0X | ToF-laser avstandssensor, I2C, min ~3cm, 940nm IR | ×3 | Potte1 vann (1), potte2 vann senere (1), reserve/auto-lys (1) |
| ESP32-CAM-MB | ESP32-CAM (OV2640 vidvinkel) + MB programmerings-board m/USB | ×2 | Potte1 nå (1), potte2 senere (1) |
| Elektronikk-lakk | Konformell coating (SF90 / "三防漆"), fukt-beskyttelse | ×1 | Påføres selektivt — IKKE på sensorvinduer/kontakter/bevegelige deler |

### Bestilling 4 — loddeutstyr & lek (mai 2026, ~€54)

**Oppdatert 2026-06-10:** loddeutstyret ble oppgradert fra «valgfritt» til kritisk sti — MOSFET-modulen er et byggesett der skrueklemmene MÅ loddes på, og Markus valgte loddet perfboard for det permanente bygget.

| Del | Spesifikasjon | Antall | Bruk |
|-----|---------------|--------|------|
| Tredje hånd (loddestasjon) | 3 fleksible armer + holder | ×1 | Holde kort/ledning |
| Magnetisk tredje hånd | Magnetfot + 360° armer | ×1 | Utfyller den faste |
| USB-loddebolt | C200S mini, USB-C | ×1 | Lett pin-header-lodding |
| Loddetinn 0.8mm | Rosin-core, 100g | ×1 | 60/40 lettest for nybegynner |
| Avloddefletning | 1.0–4.0mm, 1.5m | ×1 | Suger opp loddetinn |
| Silikon-loddematte | S160, 30×45cm | ×1 | Varmebestandig underlag |
| ESP32 starter kit | ESP32-32S + komponenter | ×1 | Øve uten å risikere prosjekt-brett |
| MG90S servo | 9g metal gear | ×2 | Lek nå — evt. vannfylling-luke senere |
| I2C level converter | 4-kanal 3.3V↔5V, 10pk | ×1 | Ikke i bruk — laser+OLED er begge 3.3V |
| WS2812B RGB-strip | 5V, 1m, 30 LED | ×1 | Lek — IKKE vekstlyset |

### Bestilling 5 — påfyll & semi-permanent bygg (bestilt 10. juni, ankom 26. juni 2026, ~€38)

Samlet etter kveldens breadboard-testing. Alt gjennomgått del-for-del mot AliExpress-screenshots (fellene flux-type og rask/treg sikring ble sjekket og var riktige).

| Del | Antall | Bruk |
|-----|--------|------|
| 12V **5A**-adapter (self-adapting 2,1/2,5mm plugg) | ×1 | Margin for 2 potter (3A var i snaueste laget ved 2,5 A) |
| Wago **221-415** (5-veis, original) | 10-pk | Samle 3 takstriper + ned-kabel til ett par |
| Wago **221-413** (3-veis, original) | 10-pk | Mindre 12V-skjøter (PCT-211 er bare 2-veis) |
| Jordfuktsensor v2.0 | 10-pk | → 13 totalt: 8 til 2 potter (4/potte) + 5 reserve |
| Motstand-sortiment 1/4W | 600-pk | Pulldown (auto-deteksjon), indikator-LED, lek |
| 5mm LED-pakke | 100-pk | Indikator-LED-test på GPIO26 |
| Silikonledning **2-pin 20 AWG** | 10 m | Kraft-runs 2 potter |
| LED clip 8mm 2-pin | 5-pk | Reserve (clipsene åpnes dårlig igjen) |
| Flux-penn (No Clean) | ×1 | Lettere lodding — IKKE syre-flux |
| Sikring 5×20 **Slow Blow** 3A + 5A | 10-pk hver | Treg patron til BLX-A-holderen |
| Perfboard double-sided 7×9cm + 5×7cm | 5+10 | Semi-permanent bygg + lodde-øving |
| Pinnerader 2,54mm (male+female) | 5 sett | Hunn-headers på perfboard |

### Bestilling 6 — montering & kabling (bestilt 11. juni, ankom 26. juni 2026, ~€23)

⚠️ **Rettelse 5. juli 2026:** «PCB-distansebolter (standoffs)»-linjen var en feilføring — varen var i virkeligheten **heat-set-tuppene** (Rafford, M2–M6, 14 stk, €3). Ekte standoffs ble aldri bestilt i B6; de inngår i Bestilling 7 (M3 250-stk boks).

| Del | Spesifikasjon | Antall | Pris |
|-----|---------------|--------|------|
| Heat-set insert + skrue-sett | M2/M2.5/M3/M4 messing, 1050 stk (525 inserts + 525 skruer) | ×1 | €16.47 |
| ~~Standoffs~~ → egentlig heat-set-tupper | Rafford, M2–M6, 14 stk | ×1 | €3.00 |
| Kabelspiral-wrap | Svart fleksibel, kabelbeskyttelse | ×1 | €3.36 |

*(Bestilling 7 — lys-oppgradering 24V, bestilt & betalt 5. juli 2026, 795,72 kr — er AKTIV og står i skillen + `mottaksliste.md`. Delvis mottatt 25. juli: 4 av 7.)*

---

## Hardware/bygge-milepæler

**Frem til 12. juni 2026:** Thonny installert · multimeter (UT131D) + USB-C-kabel skaffet · B1+B2 ankommet · ESP32/OLED/DHT22/KY-040/jordfukt ×3 (kalibrert: tørr ~3190, våt ~1140) testet · buck verifisert (fast 5V, 5,26V) · LED-strip tent direkte på 12V, strøm målt (0,36 A/stripe, 0,94 A/potte) · `vann_avstand_mm` + `jord4` i DB · komplett firmware i `firmware/`.

**Firmware-totalrevisjon 12. juni 2026 fikset:** (1) intensitet 0 % fra appen ble til 70 % på ESP32 (`int(v or DEFAULT)`-fellen — nå `logic.int_or_default()`, testdekket); (2) socket-lekkasje i `get_cmd`/`post_sensors` ved nettfeil (try/finally-close — ESP32 har få sockets, lekkasje = alle nettkall døde til reboot); (3) kamera: `secrets.h`-mønster + intervall 60→720 min (2 bilder/dag) + rask retry (10 min) ved feil; (4) Supabase: `authenticated read plantebilder`-policy + indeks `potte_sensor_data(potte_id, registrert_at desc)`; (5) app: PotteOversikt henter nyeste avlesning per potte (før: siste 50 totalt — en offline potte «forsvant»), SensorPanel validerer tom > full ved kalibrering; (6) buggy main.py-skisse fjernet fra spec-dokumentet.

**20. juni 2026 — STOR DAG:** 3 MOSFET loddet (1 skrap — grønn 2-pin smeltet under lodding) + ESP32-PWM-dimming av 12V-stripa verifisert · VL53L0X-laser loddet + community-driver `vl53l0x.py` verifisert mot ekte sensor (`i2c.scan()` viser 0x29+0x3C, stabil mm) · ESP32-CAM flashet i Arduino IDE, full kjede verifisert (WiFi → bilde → Supabase Storage HTTP 200 → dyp søvn, stabilt inkl. 59 KB-foto) · `config.py` m/WiFi flashet + **full integrasjon live** (WiFi+NTP+Supabase, OLED + alle sensorer i appen, app styrer lyset) · breadboard-prototype komplett · **selvgående drift på buck** (lys + sensorer + app helt uten PC; 12V splittet med løs 3-veis Wago).

**26. juni 2026 — B5 + B6 ankommet komplett** (5A-adapter, ekte Wago, jordfukt-10pk → 13 totalt, perfboard, pinnerader, slow-blow-sikringer, flux-penn, motstander/LED, heat-set-sett 1050, kabelspiral, heat-set-tupper ×14).

**25. juli 2026 — B7 delvis mottatt (4 av 7):** 24V 5A-adapter (EU, 5,5×2,1mm), M3 standoff-boks 250 stk, ESP32-32D Type-C KIT A (38-pin, CP2102 — lek/reserve) og ESP-WROOM-32 30-pin Type-C «one set» m/skrueklemme-breakout (potte 2-hjerne). Konsekvenser: (1) **standoff-«spøkelsesvaren» er endelig reelt på lager** — luftspalte-høydene under barene kan måles inn i fase 3-designet nå; (2) **ny fysisk risiko i huset:** 24V-adapteren har samme plugg som 12V-adapterne → merkelapp «24V» + ikke koble 24V til noe før barer/ny buck/FR120N er på plass (gammel buck er 12V-inn, LR7843 er 30V); (3) **barene er underveis** (litt bak opprinnelig 12.–21. juli; sporing sjekket 25. juli, kommer snart), så Photone-målingen og hele 24V-byttet venter på dem. Gjenstår ellers: buck ×2 (~30. juli), FR120N ×4 (~13. aug). **Mottaks-praksis etablert samme dag:** Markus inspiserer ikke nye deler ved mottak — de antas OK og legges rett på lager, og sjekkene (mål buck-utgang, tell pinner) skrives inn i byggesteget der de betyr noe. Photone-målingen av barene er unntaket, siden den er bundet til Buyer Protection. Samme dag verifisert at hele test-parken er grønn (196 vitest + firmware-logikktester) og at Supabase-prosjektet står `ACTIVE_HEALTHY`.

---

## App-endringslogg (v2, kronologisk)

- ✅ **Vann-visning (2026-05-30):** `potte_sensor_data.vann_avstand_mm` (int) erstatter `vann_lav`/`vann_mid` i live-DB. Appen leser mm → `vannNivaProsent()` i `utils.ts` → viser nivå i % (SensorPanel + PotteKort). Standard-kalibrering `VANN_TOM_MM=200`/`VANN_FULL_MM=40` i `utils.ts`. Spec (`main.py`, SQL, GPIO) oppdatert til laser.
- ✅ **Per-potte vann-kalibrering (2026-06-10):** «Sett som tom»/«Sett som full»-knapper lagrer gjeldende laser-avstand til `potter.vann_tom_mm`/`vann_full_mm` (NULL = global standard). Jordfukt fortsatt global kalibrering (sensorene målte nesten likt).
- ✅ **Offline-varsel (2026-06-10 + 20. juni):** advarsel når siste avlesning >15 min gammel + «⚠ Offline»-merke på oversikts-kortene. Delt `OFFLINE_GRENSE_MIN` + `minutterSiden()` i `utils.ts`.
- ✅ **Frontend-redesign av potte-detalj (20. juni):** flate tall → levende datavisualisering i `TilstandPanel.svelte` (hero m/helse-dom, lys-døgnring, vanntank m/bølge+sparkline, jordfukt-søyler, klima). Nye viz-komponenter (`LysDognRing`, `VannTank`, `JordMaler`) + trend-motor `lib/trend.ts`. Ny typografi app-vidt: Fraunces (display) + Hanken Grotesk via Google Fonts; `prefers-reduced-motion` respektert. `SensorPanel.svelte` slettet (innhold flyttet til TilstandPanel).
- ✅ **Smart fotoperiode-kompensasjon (21. juni):** `anbefaltInnstilling()` forlenger lystiden når 100 % intensitet ikke når DLI-målet (opptil `MAKS_FOTOPERIODE=18` t, mørke-vindu ≥6 t). Bakgrunn: ved antatt 200 µmol og 100 %/13 t ble DLI kun ~9,4 mot mål 16–18. Vitest innført samtidig (`lys.test.ts`, 6 tester).
- ✅ **«Anlegget»-redesign (21. juni):** potte-detaljen ble `AnleggPanel` (erstattet TilstandPanel) fra design-Claudes mobil-first HTML-handoff: vekstlys-kort m/on/off-toggle, vannreservoar m/flottør-viz, potter som **oktagoner** (`Potte` + `Felt`, clip-path) der jordfukt tegnes som «våt front» nedenfra (veke-metaforen). Bunn-ark (`Sheet`) for felt-/reservoar-detalj m/7-dagers sparkline + «Marker som fylt». Skillevegg-toggle + plantestyring flyttet inn i oktagonene (`PlanteSlot` slettet). Ny mono-font (JetBrains Mono). `fuktStatus()` (terskler 55/35) + `jordSparkline()` i utils.
- ✅ **«Anlegget» mobil-handoff, hele appen (21. juni kveld):** `PotteOversikt` mobil-first; `PotteKort` redesignet (ikon-boks, online-dot, «N felt trenger vann»-badge, mikro-stats); klima-stripe i detalj; levende lys-tidslinje; LUKE-merke mellom oktagonene; **`LysSheet` + `viz/SolBue` erstattet HELE `LysKontroll`** (alt lys-UI i ark); vann-ark m/«Sist fylt» + 7-dagers forbruksgraf (`trend.ts`: `sistFyltAt` + `dagligForbruk[]`). «Snu potta» bevisst IKKE bygget. `LysKontroll.svelte` + `viz/LysDognRing.svelte` slettet.
- ✅ **Iterasjonsrunde etter live-testing (22. juni):** bugfiks felt-ark (Svelte 5-fellen: reaktiv `{@const}` re-evaluerte til null etter `lukk()` — snapshot før mutering); vanntank flyttet MELLOM oktagonene (`viz/VannFlottor` slettet); kalibrering dempet bak «Kalibrer sensor»-knapp; `Sheet.svelte` gjennomarbeidet (scrollbar 85vh, dra-ned-for-å-lukke m/`touch-action:none`-fellen løst, transform-animasjon); **maskinvare-tilbake virker over hele appen** (`lib/overlayBack.ts`, pushState/popstate-routing).
- ✅ **Cohesion-runde (22. juni):** `viz/VannTank` gjenbrukbar (detalj + oversikt), PotteKort fikk mini sol-bue/vanntank/våt-front — SolBue brukt tre steder.
- ✅ **«Fiks alt»-batch (22. juni):** toast-system (`lib/toast.ts` + `Toaster.svelte`) for skrive-feil; **kamera-tidslinje (fase 4b)** `Veksttidslinje.svelte` (Storage `plantebilder/{potte_id}`, stripe + lightbox); Fraunces-sweep alle overskrifter; sensorløs kasse kan administrere planter (`harSensor`-prop).
- ✅ **PWA + advarsler + innstillings-UI (22. juni):** installerbar på telefon (manifest, sw.js kun i PROD, PNG-ikoner fra dep-fri `scripts/generate-icons.mjs`); in-app-varselbanner (Markus vil ikke ha push); `KasseInnstillinger.svelte` (rediger/opprett/slett kasse).
- ✅ **Innsikt-motorer (26. juni–1. juli):** `klima.ts` (VPD-stripe), `naering.ts` (to-fase-påminnelse), `diagnose.ts` (maskinvare-sjekk fra 7-dagers historikk), `energi.ts` (strømoverslag). Tester → ~99.
- ✅ **Polish-runde (1. juli):** leaf-gradient intensitet-slider m/anbefalt-markør; redigerbar strømpris (`settings.ts`, localStorage); plantefoto i PlanteVelger; Veksttidslinje gates på `har_sensorer`.
- ✅ **Testmodus-simulator (1. juli, Markus' idé):** `TestSimulator.svelte` + `simulering.ts` — presets + sliders driver syntetiske sensordata (ekte inversjoner av visnings-formlene, round-trip-testet); gate-flip forhåndsviser ALT uten maskinvare; skriver aldri til DB. Senere samme kveld: flyttet inn i Testmodus-kortet nederst; oversikten fikk samme effektiv-data-refleksjon; **selvfunnet bug:** gate-flip skjulte Testmodus-badgen → simulert kort så ekte ut — fikset m/`simulert`-prop (gult «🧪 Simulert forhåndsvisning»-merke + stiplet kant). **Regel etablert: enhver «effektiv»-refleksjon av sim MÅ ha egen simulert-markør.** Opprydding `b7c015e`: gate-flip+syntese trukket ut til `effektivKasse()` i simulering.ts (én implementasjon).
- ✅ **Komponent-tester (1. juli, siste økt):** `@testing-library/svelte` + `jsdom` + egen `vitest.config.ts` (produksjons-build urørt); `*.svelte.test.ts` m/`// @vitest-environment jsdom`; første suite `PotteKort.svelte.test.ts` dekker kveldens regresjoner. → 134 tester. Simulator fikk «Nullstill»-knapp.
- ✅ **SW-cache-fiks (1. juli, `500a0af`):** navigasjons-fetch i `sw.js` manglet `{cache:'no-store'}` → nettleserens HTTP-cache kunne servere gammel index.html etter deploy. Fikset; normal reload holder nå (SW-unregister-trikset trengs ikke lenger).
- ✅ **Kontinuerlig høsting (1. juli, Markus' innsikt):** `hosting.ts` — cut-and-come-again: «Høst etter behov» for urt/salat/frukt vs «Klar til høsting» for engangs; feed nudger kun ferskt (`HOSTE_NUDGE_DAGER=7`); VekstBar «puster» i høste-fase.
- ✅ **Cohesion-runde 2 (1. juli):** `viz/VekstBar.svelte` delt (PotteKort mini + felt-ark full); plantefoto i felt-arket; feed-farger distinkte (rød/gul/blå/grønn).
- ✅ **«Gå ut av boksen»-runde (1. juli):** ærlig frakoblet-visning (dempede tall, skjult vann-badge, «sist sett»); desktop 2-kol grid; VPD-terskler romsligere for veke (≤1,3/≤1,8); høsting-nedtelling i kort/felt-ark/feed; feed m/gjøremål+positiv; `docs/go-live-sikkerhet.md` skrevet.
- ✅ **Full gjennomgang, bug-jakt hele stacken (1. juli sen kveld, `56bbb1d`):** 9 funn: (1) Veksttidslinje-tidsbombe (Storage-list `name asc` limit 300 → ville frosset på de 300 eldste; nå desc); (2) slett kasse rydder `potte_commands`+`potte_sensor_data` (ingen FK — gjenoppstått kasse arvet gammel lyskommando); (3) bytt plante reloader alltid ved feil; (4) go-live-nullstilling feiler ikke stille; (5) tomt lys-tidsfelt blokkert (`""` → firmware tolket «ingen lystid»); (6) delt `feltFukter()` i utils (fukt per FELT, ikke probe — samme telling overalt); (7) sensorHistorikk re-hentes hvert 15. min; (8) firmware `post_sensors` sjekker HTTP-status (4xx/5xx var «sendt» uten lagring); (9) sw.js offline-skall oppdateres per navigasjon. Backend samtidig verifisert (unik potte_id, delvis unik-indeks, advisors kun kjente ting).
- ✅ **Fable-økt: backend-sikkerhet + app-innsikt (3. juli, `4ee083e`..`9026fc1`):** RLS strammet + verifisert (anon = kun SELECT commands / INSERT sensordata); eierskaps-system alle 12 tabeller + `docs/database-kart.md`; retning snudd til utskilling (parkert, gratis-grense); v1-rester slettet (`planteprofiler` + `plantetype`); **`varsler.ts`** (varsel-motor, maks 1/kategori/kasse, 4 døgn historikk); **kalibrerbar PPFD** (settings + lys-ark, erstatter ANTATT_PPFD_MAX=200); diagnose: luftFunn + overvaatHelse; fuktStatus «Svært vått»; vann-trend i PotteKort; vann-konflikt i PlanteVelger; TestSimulator utvidet; SolBue av-samme-minutt; Dyrking-avkrysning huskes; firmware encoder-rampe (må flashes). Tester 99 → 192.
- ✅ **24V-først-beslutningen (25. juli, Markus):** 12V-mellomsteget droppet — potte 1 bygges som 24V fra første stund, og 12V-stripa kan senere bli lys i en *ny* kasse hvis han vil sammenligne variantene. Begrunnelsen: ingen grunn til å gro en runde på ~30 PPFD (10 % av målet) når barene er i posten. App-konsekvens: `bar24` er nå standard lysvariant i `settings.ts` (var `strip12`) + kommentarer/tester oppdatert; velgeren beholder begge variantene. Doc-konsekvens: Kobling-fanen viser variant B som «dette bygges», variant A er referanse/bench-strøm, og Bygg-fanen har fått et oversettelses-kart (fire substitusjoner) til oppskriften skrives om i 24V-form — det venter til barene er i hånda, siden kontakt og evt. rød-kanal er ukjent. Praktisk: lys-kjeden kan først kobles når buck (~30. juli) + FR120N (~13. aug) er inne, mens sensorene ferdigtestes på det gamle 12V-adapter+buck-paret i mellomtiden.
- ✅ **Lysvariant-velger (5. juli, `741ce07`):** appen støtter begge lysvariantene — «Montert lys»-velger i lys-arket (12V-strip ↔ 24V-barer); watt + per-variant PPFD-kalibrering følger valget (strip gjenbruker gammel localStorage-nøkkel). `lysEnergi()` tar watt-parameter. +4 tester → 196.

---

## Vekstlys-utredningen (juli 2026) — full historikk

**Bakgrunn/nåtilstand før byttet:** potte 1 ble doblet til 6×40 cm strip (~1,9 A på delt 12V-skinne) for mer DLI — «doble stripa»-spaken dermed brukt. Photone målte ~30–33 µmol @10 cm (riktig metode: rød/blå-modus + papir-diffusor) → DLI ~1,9 mot mål 12–17/12–20. Måle-usikkerhet: Photone underrapporterer magenta (for lavt), watt-gjetninger (~200 µmol → DLI 6–9) trolig for høyt — ekte DLI ukjent, «bruk plantene som måler» (strekker seg = for lite).

**Gratis-spaker (fortsatt gyldige):** senk lysbjelken (gevinst ~1,5–2× for utstrakt array, ikke 4× — invers-kvadrat gjelder punktkilder); hvite/reflekterende innervegger (PETG hvit ~80 %, mylar ~90–95 % — utsatt av Markus til behovet vises).

**Gammel oppgraderingsvei (foreldet av B7-beslutningen):** (1) flere 12V-strip innenfor adapter-margin; (2) eget 24V lys-delsystem m/LR7843; (3) ferdig hvit bar m/ekte µmol-spec. Vurdert billig-kandidat: pisin 5730 alu-bar 12V/24V ~11 W «Natural White» (AliExpress `1005004951789759`, ~120 kr/10-pk) — forkastet: ~1,0–1,2 µmol/J = ~40 % mindre lys per watt enn LM281B.

**Beslutning 5. juli:** 2× DC24V 25W Samsung LM281B+ 500mm barer (se skillen for aktiv plan). **Vurdert og forkastet:** 230V T5-rør (bryter DC/ESP32-integrasjon, nettsikkerhet) · 48V (unødvendig for 50W, ofte CC-driver) · 6-pakk barer (for dyrt/mye) · LM301B/H (dyrt i småformat) · Alibaba engros (MOQ/frakt).

**Uavhengig gjennomgang 5. juli (verifiserte kjøpet):**
- Bar-spec bekreftet (customledpcb): DC24V konstant-spenning (ingen driver), 250–350 PPFD, 1,8 µmol/J, 500×30 mm, 28×3000K + 10×5000K + 20×660nm + IR/UV, kan kjedes 6 (maks 10). Fotontall: 50 W × 1,8 = 90 µmol/s → ~150–300 PPFD snitt = 5–10× dagens.
- FR120N-datablad: Vgs(th) 2,5–4 V, drives fra 3,3–5 V logikk via opto-modulen; 100V/15A margin. LR7843 (30V) ville teknisk holdt på 24V (resistiv last, 80 % derating) — FR120N til 4 kr riktig forsikring.
- Photone: ±20–30 PAR mot ekte PAR-meter med papir-diffusor + riktig innstilling; leser hvitt langt mer nøyaktig enn magenta.
- Arkitektur: én 24V-skinne enklere enn to; 24V @ 50 W = 2,1 A < 12V-oppsettet → 20 AWG rikelig.
- Standoff-boksen svakeste verdi-linje (lager-bygging, trenger ~12 til barene); adapteren grei pris, bevisst ikke bunnpris (24/7 nær vann, CE).

**Fable-dyp-research 5. juli (svar på Opus' 8 åpne spørsmål) — konklusjon: kjøp.** (1) Billige LM281B-kloner kan levere lavere bins (~1,4–2,0 µmol/J; kvalitets-armaturer måler 2,7–2,9) → 1,8 riktig planleggingstall, verste fall fortsatt 5–6× dagens; (2) **2 barer riktig, ikke 1** (regnestykke: 2 barer ~225–260 PPFD reelt over 0,24 m² footprint = midt i salat-optimum 250–350; 1 bar ~110–130 = under + null margin); (3) plassering ~¼ og ¾ inn på 450mm-bredden, hengehøyde 10–15 cm, metning ~600 = null svi-risiko; (4) spektrum riktig (blått i hvitt hindrer strekking; 2×IR+2×UV neglisjerbart); (5) ingen bedre DC-alternativ i klassen (Procyon 2.0 = ~10× pris; T5/QB = 230V); (6) counterfeit håndteres m/Photone innen Buyer Protection; (7) **termikk eneste aksjonpunkt** (25 W/profil → 50–70 °C, PETG Tg ~80 °C → standoffs + ventilasjon i fase 3-toppen); (8) med ~200–250 reell PPFD nås DLI 14–17 på 14–16 t — 18-timers-kompensasjonen trengs ikke; energi ~0,75 kWh/dag ≈ 25–30 kr/mnd. Full research: `2026-07-05-vekstlys-research-oppdrag.md`.

---

## Diverse historiske beslutninger

- **`3d-design.html` slettet 17. juni 2026** (Markus gjør designet selv i Fusion; trengte ikke siden).
- **Modell-begreper omdøpt 2026-06-14:** «antall_seksjoner» → `skillevegger` bool[]; Blomsterkasse/Potte/Planteplass-hierarkiet innført. DB/firmware-navn uendret.
- **Testmodus/drift (`i_drift`) + myk-sletting (`fjernet_at`) innført 2026-06-19.**
- **Plantebilder fra Wikimedia (2026-06-19):** `bilde_url`/`bilde_kilde` — alle 44 planter har foto, hotlinket, emoji-fallback.
- **Stell-instruksjoner (2026-06-10, F-D spor 1):** `sa_instruks`/`stell_instruks`/`host_instruks` for alle 44 planter.
- **«Anlegget»-badge-innskjerping 20. juni:** oversikt.html-badges hang etter mottakslista → regel om synkron oppdatering innført. (Regelen AVVIKLES når B7 er mottatt — da er bestillings-æraen over og `lager.md` er eneste levende liste.)
- **Dyrkemedium-beslutning 19. juni:** torvfri kokos-jord (Clas Ohlson) + perlite ~70/30, TO-FASE næring (uke 0–6 rent vann/starter-næring i jorda; fra uke 3–6+ Nelson Garden Hydroponisk 250 ml svakt). Kjøpt: medium ×3 + perlite + næring + 5 frøposer (basilikum 'Gustosa', Baby Leaf mix, 'Witte Dunsel', Ruccola 'Wasabi' (*Diplotaxis erucoides*), Hvitløksgressløk (*Allium tuberosum* — flerårig/treg → egen krukke, ikke veke-kassa)). Oppstart: 4 raske vekster, én lysinnstilling ~13 t/~75 %.
