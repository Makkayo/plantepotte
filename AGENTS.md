# Plantepotte

Modulær, selvvannende innendørs plantekasse med app-styrte vekstlys. To deler:
en **Svelte-webapp** og **MicroPython-firmware** på en ESP32, koblet via Supabase.

**Markus er nybegynner på elektronikk, MicroPython, 3D-print av elektronikkbokser og
webapp-deploy.** Forklar fra bunnen av, ikke ta noe for gitt.

- **Live:** https://plantepotte.pages.dev (PWA, installerbar)
- **GitHub:** `Makkayo/plantepotte` · **Spec:** `docs/2026-05-23-plantepotte-design.md`
- **3D-modell:** `3d-modell/Plantekassa.3mf`

## ⚠️ Denne fila beskriver det som er varig

Status, fremdrift, bestillinger og lagerbeholdning står **ikke** her — de rotner.
Slå opp i repoets egne dokumenter:

| Dokument | Innhold |
|---|---|
| `README.md` | Løpende status: hva som er ferdig, hva som er neste |
| `docs/veikart.md` | Faseoversikt, brukeroppsett (2 potter, dyrking), parkerte ideer |
| `docs/lager.md` | Hva som eies nå — **eneste levende liste** |
| `docs/mottaksliste.md` | Bestilt → ankommet → testet, per bestilling, m/ordrenumre |
| `docs/onskeliste.md` | Identifiserte behov, ikke bestilt |
| `docs/HISTORIKK.md` | All datert historikk — «når/hvorfor ble X gjort» |
| `docs/database-kart.md` | DB-eierskap + regler for alt nytt (kilde-sannhet) |
| `docs/handleliste-dyrking.md` | Jord/frø/næring (speiles i appens Dyrking-fane) |
| `docs/go-live-sikkerhet.md` | SQL Markus kjører ved go-live |
| `public/oversikt.html` | Visuell prosjektside Markus faktisk leser i nettleseren |

Flyt for deler: ønskeliste → (bestilt) mottaksliste → (ankommet) lager. Ved større
endringer: oppdater nå-tilstanden i riktig dokument og legg dateringen i HISTORIKK.md.

❄️ **Komponenter-fanen i `oversikt.html` er frosset** — den forklarer *hva delene er*.
Ikke gjenoppta badge-synk mot mottakslista med mindre en ny bestilling legges inn.

## Webapp

**Stack:** Svelte 5 + TypeScript + Vite 5 + Tailwind 3. Push til `main` → Cloudflare Pages.

```bash
npm install
npm run dev     # 5173
npm run build
npm run test    # vitest — node-lib + jsdom-komponenttester samlet
npm run check   # svelte-check
```

### ⚠️ Feller som har kostet tid før — ikke gjenta

- **vitest MÅ pinnes `^2`.** vitest 4 drar inn rolldown-native-bindings som
  Cloudflares build-image ikke svelger → deploy RØD. Lokal build merker det ikke.
  Verifiser Cloudflare-deployen ved enhver oppgradering.
- **`package-lock.json` MÅ committes** ved nye deps — Cloudflare kjører `npm ci`.
- **Svelte 5: `{@const}` er REAKTIV.** Les feltene FØR du muterer kilden i samme
  handler (snapshot først), ellers TypeError.
- **Touch-drag i `Sheet`:** dra-sonen MÅ ha `touch-action:none`, ellers kaprer
  nettleseren gesten som scroll. Virker på PC, feiler på mobil.
- **`public/sw.js`:** navigasjons-fetch bruker `{cache:'no-store'}`. Uten den serverer
  nettleserens HTTP-cache gammel `index.html` etter deploy.
- **Sim-regelen:** enhver ny «effektiv»-refleksjon av simulering MÅ ha egen
  `simulert`-markør. Gate-flip alene ser ut som ekte drift og lurer brukeren.
- **Komponenttester:** `*.svelte.test.ts` med `// @vitest-environment jsdom` øverst.
- **Innloggede visninger kan ikke verifiseres av en agent** (ingen passord) — verifiser
  logikk med tester, visuelt tas av Markus.
- `vite.config.ts` er KUN for build — rør den ikke. Testoppsettet ligger isolert i
  `vitest.config.ts`.

### Modellbegreper

- **Blomsterkasse** = hele enheten (1 rad i `potter`), vises som «Mine blomsterkasser».
- **Potte** = de 2 åttekantede beholderne; hver kan ha skillevegg → 2/3/4 planteplasser
  (`potter.skillevegger`).
- **Planteplass** = `potte_planter.seksjon` 1–4 (Potte 1 = 1/2, Potte 2 = 3/4;
  foran = oddetall).

DB- og firmware-navn (`potte_id`, `jord1–4`) er uendret. Layout-logikk i `utils.ts`.

### Filstruktur

```
src/lib/   ren, vitest-dekket logikk:
  supabase.ts  database.types.ts  stores.ts
  utils.ts     (feltFukter, fuktStatus, vannNivaProsent, sparklines)
  lys.ts       (DLI + anbefaling + fotoperiode-kompensasjon, kalibrerbar PPFD)
  tid.ts (lysvindu)   trend.ts (vannforbruk/påfyll)   klima.ts (VPD)
  naering.ts (to-fase)   diagnose.ts (probe-/veke-diagnose)
  energi.ts (strømoverslag)   hosting.ts (kontinuerlig høst)
  settings.ts  (strømpris + LYSVARIANT m/per-variant PPFD, localStorage)
  simulering.ts (sim-state + effektivKasse())   varsler.ts (handlingsfeed-motor)
  overlayBack.ts (maskinvare-tilbake)   toast.ts
src/components/  Login Shell Header PotteOversikt PotteKort PotteDetalj AnleggPanel
  Potte Felt Sheet LysSheet PlanteVelger PlanteKatalog PlanteDetalj Dyrking
  Veksttidslinje TestSimulator Toaster KasseInnstillinger
  viz/  SolBue VannTank VekstBar   (delt viz-språk, brukt i både oversikt og detalj)
public/  oversikt.html, sw.js, manifest, icons
```

## Firmware (MicroPython)

`firmware/` er **fasit, ikke snippets** — komplett flashbar firmware.

| Fil | Rolle |
|---|---|
| `config.py` | **Gitignored.** Mal: `config.example.py` |
| `boot.py` / `main.py` | WiFi m/gjenoppkobling, Supabase-poll, watchdog, NTP, KY-040-dimming, OLED |
| `logic.py` | Ren, testbar logikk |
| `ssd1306.py`, `vl53l0x.py` | Drivere, verifisert mot ekte sensor |
| `test_logic.py` | 44 tester — **kjør ved enhver endring** |
| `wokwi/` | Simulator (vann-pot på GPIO 39/VN der) |
| `esp32cam/` | ESP32-CAM, **Arduino IDE** — ikke MicroPython |

Kjør testene med full Python-sti (bar `python` treffer WindowsApps-stubben):

```bash
"C:\Users\marku\AppData\Local\Programs\Python\Python312\python.exe" firmware/test_logic.py
```

### config.py-nøkler

```python
WIFI_SSID / WIFI_PASS        # kun 2.4GHz — ESP32 tar ikke 5GHz
SUPABASE_URL / ANON_KEY
POTTE_ID = "potte1"          # "potte2" for den andre
AUTO_SOMMERTID = True        # CET/CEST etter EU-reglene, automatisk
TZ_OFFSET_HOURS = 2          # kun ved AUTO_SOMMERTID = False
AKTIVE_JORDSENSORER = [1,2,3]  # av plassene GPIO 34/35/32/33 — tåler []
BRUK_WATCHDOG = False        # True i drift (restart >2 min heng); False i Thonny
POST_INTERVALL_SEK = 300     # sensordata hvert 5. min; kommandoer leses hvert 5. sek
```

**Rådata-prinsippet:** jordfukt sendes som **rå ADC 0–4095**, vann som rå
`vann_avstand_mm`. **Appen kalibrerer, ikke firmwaren.** Behold dette skillet.

Norsk tid regnes automatisk (`logic.norsk_utc_offset`). Lys-logikken støtter vindu
som krysser midnatt. Frekvens-filosofi: sensordata ~5 min, kamera ~2 bilder/dag.

**ESP32-CAM:** WiFi-passord i `secrets.h` (gitignored, mal `secrets.example.h`) —
**ALDRI i `.ino`-fila**, den er git-tracket.

## Supabase

Prosjekt `ebjbxfwtwrahuokydvtj` — **delt med Matplanlegger og galleriet.**
MørkeZ (`udabzkunvagqavllcffw`) er et annet prosjekt og skal aldri brukes her.

| Tabell | Bruk | RLS |
|---|---|---|
| `lys_familier` | 5 lys-grupper | anon read |
| `planter` | Katalog, 44 planter: DLI/timer/vann/veke-egnethet, så-/stell-/høst-instruks, `bilde_url` | anon read, auth write |
| `potter` | `potte_id`, `skillevegger bool[2]`, `har_sensorer`, `i_drift`, `vann_tom_mm`/`vann_full_mm` | anon read, auth write |
| `potte_planter` | Plante per planteplass (`seksjon` 1–4), `plantet_at`, `notater`, `fjernet_at` (myk-sletting, delvis unik-indeks `WHERE fjernet_at IS NULL`) | anon read, auth write |
| `potte_commands` | Lys-innstillinger, ESP32 leser hvert 5. sek. Unik `potte_id` (upsert trygt) | **anon kun SELECT** |
| `potte_sensor_data` | `jord1–4` (rå ADC), `vann_avstand_mm`, `temperatur`, `luftfuktighet` | **anon kun INSERT** |

`i_drift=false` = testmodus (hard-slett, ingen historikk). `true` = drift (myk-sletting
+ historikk; go-live nullstiller `plantet_at`).

**Storage:** bucket `plantebilder` (public) — anon upload (ESP32-CAM), anon read,
authenticated read (kreves for listing til veksttidslinja).

### Regler

- **Aldri endre RLS uten å legge inn ny policy samtidig** — feil rekkefølge blokkerer
  ESP32 eller appen.
- Alt nytt i delt DB: prefiks, eier-kommentar på tabellen, RLS fra dag 1, ingen
  kryss-FK. Se `docs/database-kart.md`.
- ESP32 bruker anon-nøkkelen direkte; webappen krever innlogging (Supabase Auth).
- Multi-user er forberedt med `owner_id uuid`; aktivering = bytt `USING(true)` →
  `owner_id = auth.uid()`. ESP32-kontrakten er uendret. `potte_planter` mangler
  `owner_id` og trenger en liten migrasjon først.
- Kjente bevisste rest-advarsler: `rls_policy_always_true` (én bruker),
  `public_bucket_allows_listing`.

## Maskinvare

### GPIO (Potte 1)

| GPIO | Komponent | Funksjon |
|---|---|---|
| 26 | MOSFET SIG (FR120N ved 24V) | Lys-PWM 1 kHz |
| 21 / 22 | OLED + VL53L0X (I2C) | SDA / SCL — OLED `0x3C`, laser `0x29` |
| 4 | DHT22 DATA | Temp/fukt |
| 34 / 35 / 32 / 33 | Jordfuktsensor 1–4 | ADC, styres av `AKTIVE_JORDSENSORER` |
| 16 / 17 / 18 | KY-040 | CLK / DT / SW |
| 19, 23 | — | Ledige (f.eks. separat rød-kanal eller stepper) |

ESP32-CAM er et eget kort: kun 5V + GND fra buck, all kommunikasjon over WiFi.

### Strømkjede — 24V (det som bygges)

```
24V adapter → DC inline switch → 3A slow-blow → female pigtail
   ├─→ 24V → FR120N VIN+GND → 2× LM281B-barer (via Wago i tak/base + stolpekabel)
   └─→ male pigtail → 24V→5V-buck → 5V → ESP32 VIN + ESP32-CAM

ESP32 3.3V → KY-040, OLED, VL53L0X, DHT22, jordfukt ×3
Alle GND → felles rail. MOSFET SIG ← GPIO26 (PWM)
```

12V-varianten (gammel phyto-strip, LR7843, fast-5V-buck) er **reserve** — samme
struktur, tre deler byttet. Appens lysvariant-velger lar begge leve side om side.
Fullt strømtre for begge: `oversikt.html` → Kobling-fanen.

### ⚠️ Sikkerhet — les før du kobler noe

- **12V- og 24V-adapterne har samme 5,5×2,1mm plugg og ligger i samme skuff.** 24V i
  den gamle bucken (12V-inn), i en LR7843 (30V) eller rett i phyto-stripa ødelegger
  delen umiddelbart. Merkelapp på pluggen er billig forsikring.
- **KY-040: VCC til 3.3V, IKKE 5V** — ellers ryker ESP32.
- **VL53L0X: VIN til 3.3V.** Deler I2C-buss med OLED. Ikke pek mot øyne på kloss hold.
- **ESP32-CAM tåler ikke 3.3V-drift** — 5V fra buck, ~200–300mA.
- **ESP32 GPIO = 3.3V-logikk**, tåler ikke 5V inn.
- **MOSFET SIG må aldri henge løs** — den står åpen og varmes.
- **Felles GND for ALT**, også ESP32-CAM mot buck-GND.
- **Mål buck-utgangen (~5V) FØR ESP32 kobles på.** Sjekk om kortet har trim-potmeter.
- Frakobling: trekk ut adapteren FØRST. Polaritet: rød = +, svart = −.
- **Barene blir 50–70 °C.** Alu-profilen ER kjøleribba — oversiden må stå fritt
  eksponert, ikke bygges tett inn. PETG mykner ~80 °C: standoffs for luftspalte +
  ventilasjon rett over barene.
- **LM281B-klemmer tar bar strippet ledning 8–10 mm, IKKE Dupont-pinner.** Merking:
  `W/UV/IR+` (hvit), `R+` (660nm rød), `GND` (felles). Rød har egen inngang men deler
  retur → begge `+` til 24V+, én MOSFET på GND-siden dimmer begge. 20 AWG permanent.

### Wago-strategi

Lever-connectors ved alle frakoblings-/forlengelsespunkter; ellers Dupont direkte på
pinner/breadboard.

| Sted | Tilkobling |
|---|---|
| ESP32 / MOSFET pin-ender | Dupont direkte |
| Adapter inn til base, sikring, stolpe topp+bunn | Wago |
| VL53L0X → base (4-leder), ESP32-CAM → base (2-leder) | Wago |
| 5V/GND-distribusjon | Breadboard rails → perfboard-skinner |
| LED-strip-ender (12V-variant) | 8mm clip connector |

Per Wago-skjøt: klipp av Dupont-pinnen, strip 10mm, tvinn strendene, sett i.
**Løsner en Wago? Du satte inn en Dupont-pinne.**

### 3D-print

PETG (tåler fukt), ≥3mm vegg rundt heat-set-hull, M3 er hovedstørrelse for
perfboard-montering. Alle deler passer Bambu P2S (256³). IKEA 365+ 5,2L-boksen er
referanse — printes ikke, og **ingenting festes på den**.

Vannmåling: laser peker ned en berolings-brønn mot en hul printet flottør.
**Flottør: enkel sylinder, PETG, 4 vegger, 0 % infill, dome-topp, vanntett.**
Drop-test i vann over natten før commit.

## Lys — regnestykket som gjelder

- Lyset fra en bar faller som **1/d (linjekilde), ikke 1/d²**. Verifisert: 28 → 14 →
  7,6 mol ved 5,5 → 11 → 21 cm.
- Målt (Photone, modul «LED Full+Red»): ~208 PPFD @10 cm per bar, ~213 snitt for to.
- **Hengehøyde ~10 cm** og **fotoperiode 16–18 t** for å nå DLI 12–17.
- **Photone-felle:** appen står default på 24 timers fotoperiode. Regn om til PPFD
  (`= DLI₂₄ / 0,0864`), som er fotoperiode-uavhengig — ellers blir avlesningene
  nesten dobbelt for høye.
- De to oktagon-pottene ligger **på linje under lysbjelken**, som spenner langs
  lengden mellom stolpene. Sidefall bare i dybderetningen.
- Standard-PPFD i `settings.ts` er den målte 213. Har brukeren kalibrert manuelt,
  overstyrer localStorage.

### Lys-familier

| ID | Familie | DLI | Timer | Intensitet |
|---|---|---|---|---|
| `skygge-tolerante` | Skygge-tolerante urter | 8–14 | 10–12 | 50–65 % |
| `standard-urter` | Standard urter | 12–20 | 12–14 | 70–85 % |
| `salat-blader` | Salater/bladgrønnsaker | 12–17 | 12–14 | 60–75 % |
| `solhungrige` | Solhungrige | 18–30 | 14–18 | 90–100 % |
| `mikrogront` | Mikrogrønt | 6–12 | 12–16 | 60–80 % |

## Debugging

| Symptom | Sjekk |
|---|---|
| LED lyser ikke | Felles GND mellom ESP32 og lyskretsen |
| MOSFET varmes | SIG henger løs |
| WiFi kobler ikke | SSID/passord; ESP32 tar kun 2.4GHz |
| Supabase 401 | anon key + at RLS-policy finnes |
| Tid feil | NTP gir UTC; sjekk at NTP synket (`rtc.datetime()`) |
| OLED svart | `i2c.scan()` skal gi `[60]` (0x3C) |
| DHT22 feil | Trenger ~2 sek oppvarming |
| Jordfukt rart | Kalibrér: tørr luft ~3190 (maks), vann ~1140 (min) |
| VL53L0X svarer ikke | `i2c.scan()` skal vise BÅDE 0x29 og 0x3C. Rare avstander → matt flottør, fri siktlinje |
| Flottør synker | For mye plast — hul, 4 vegger, 0 % infill |
| ESP32-CAM brownout | Trenger stabil 5V ~300mA; flash via MB-boardet |
| Sikring blåser ofte | Slow-blow tåler inrush — let etter kortslutning |
