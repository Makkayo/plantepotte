# Plantepotte

Modulær, selvvannende innendørs plantepotte med app-styrte vekstlys og fakta-basert plante-katalog.

- **Live web-app:** https://plantepotte.pages.dev/
- **Prosjektoversikt:** [`/oversikt.html`](public/oversikt.html) (kopiert til `dist/` ved build)
- **ESP32-firmware:** [`firmware/`](firmware/) (MicroPython — se [`firmware/README.md`](firmware/README.md))
- **Wokwi-simulator:** [`wokwi/`](wokwi/) (test lys-timer/encoder i nettleseren)
- **Mottaksliste (hardware-status):** [`docs/mottaksliste.md`](docs/mottaksliste.md)
- **Original spec:** [`docs/2026-05-23-plantepotte-design.md`](docs/2026-05-23-plantepotte-design.md)
- **Gammel v1-app (arkivert):** [`docs/legacy/index-v1.html`](docs/legacy/index-v1.html)

## Stack

- **Hardware:** ESP32 (MicroPython) + LR7843 MOSFET + phyto LED-strip + sensorer
- **Backend:** Supabase (`ebjbxfwtwrahuokydvtj`) — delt med Matplanlegger
- **Frontend:** Svelte 5 + TypeScript + Vite + Tailwind 3, hostet på Cloudflare Pages
- **Deploy:** `git push` til `main` → Cloudflare Pages bygger og publiserer

## Lokal utvikling

```bash
npm install
npm run dev      # dev-server på http://localhost:5173
npm run build    # produksjonsbygg til dist/
npm run preview  # preview av produksjonsbygg
npm run check    # svelte-check (typer)
npm run test     # vitest (app-logikk: lys, kalibrering, oppsett, vanntrend)
```

Node 20+ kreves (`.nvmrc` setter dette). Firmware-logikken testes separat med
`python firmware/test_logic.py` (ingen hardware nødvendig).

> ⚠️ Ikke oppgrader `vitest` forbi `^2` — v4 drar inn `rolldown`/native-bindinger
> som Cloudflares build-image ikke svelger, og deploy blir rød.

## Database (Supabase)

Prosjektet deles med Matplanlegger — **fullt eierskaps-kart, tilgangsregler og
konvensjoner for nye tabeller: [`docs/database-kart.md`](docs/database-kart.md)**
(hver tabell er også merket med eier-app i tabellkommentaren i dashbordet).
Plantepottas tabeller:

| Tabell | Bruk |
|--------|------|
| `lys_familier` | 5 lys-grupper (skygge-tolerante → solhungrige) |
| `planter` | Katalog med 44 planter — DLI, timer, vann, veke-egnethet, kilder |
| `potter` | Blomsterkasser (potte_id, `skillevegger` bool[] per potte, sensorer, drift-status) |
| `potte_planter` | Mange-til-mange: hvilke planter er i hvilken planteplass (myk-sletting via `fjernet_at`) |
| `potte_commands` | Lys-innstillinger som ESP32 leser hvert 5. sek |
| `potte_sensor_data` | Sensoravlesninger fra ESP32 — `jord1`–`jord4` (rå ADC, inntil 4 sensorer) + `vann_avstand_mm` (rå mm fra VL53L0X-laser) |

Alle nye tabeller har `owner_id uuid` (nullable) for fremtidig multi-user-støtte.
Vannmålingen ble byttet fra XKC-Y25 (boolean) til VL53L0X-laser (`vann_avstand_mm`) 2026-05-30 — `main.py` i spec-en er oppdatert tilsvarende.

## Cloudflare Pages-oppsett

Hvis appen ikke deployer automatisk etter første push, må Cloudflare Pages-prosjektet
konfigureres med:

- **Framework preset:** Svelte (eller None)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version (env var `NODE_VERSION`):** `20`

## Status (juni 2026)

- ✅ Backend ferdig — 44 planter med dokumenterte DLI-krav, ekte plantebilder, så-/stell-/høste-instrukser
- ✅ Mobil-først PWA (installerbar) — blomsterkasse-oversikt, «Anlegget»-detalj (vekstlys, vannreservoar, oktagon-potter), plante-katalog, dyrkeguide og vekst-tidslinje
- ✅ Innsikt-motorer: VPD (luftklima), to-fase nærings-påminnelse, maskinvare-diagnose (løs/død jordprobe, probe-i-lufta, veke-kontakt, vedvarende våt jord), strømoverslag for lyset
- ✅ Varsel-motor (`lib/varsler.ts`): hele handlingsfeeden som ren, testet logikk — frakoblet (med siste kjente krise), vann (nivå + forbruks-prognose), jord (tørr/overvåt), klima (temp + VPD), lys (gjeldende plan mot plantenes DLI-behov), næring og høsting. Maks ett varsel per kategori per kasse
- ✅ Kalibrerbar PPFD i lys-arket: DLI-tallene bygger på din målte verdi (PAR-meter/Photone) i stedet for 200 µmol-antagelsen
- ✅ Komplett flashbar firmware i `firmware/` (watchdog, NTP-resynk + auto-sommertid, valgfri myk soloppgang/-nedgang, 4 jordfukt-plasser, **44 logikk-tester** på PC)
- ✅ **192 enhetstester (Vitest)** for app-logikken: lys/DLI, vann- og jordfukt-kalibrering, blomsterkasse-oppsett, vanntrend, VPD, næringsfase, diagnose, varsler
- ✅ CI (GitHub Actions) speiler Cloudflare-bygget og vokter at Wokwi-koden holdes i synk med firmwaren
- ✅ **Full integrasjon live (20. juni):** ESP32 kjører selvgående på buck — WiFi + NTP + Supabase, alle sensorer i appen, appen styrer lyset. MOSFET-PWM-dimming og VL53L0X-laser verifisert på ekte hardware
- 🟡 Neste: fase 3 i Fusion (lysbjelke for to stive barer, lokk-på-tank, brønn + flottør, elektronikk-skuff) → print og montering av potte 1. Byggesjekker når det kobles: lodd FR120N-klemmer, mål buck-utgang (~5V) FØR ESP32, mål ~1,0 A/bar @24V
- 💡 **Lys-beslutning (25. juli):** potte 1 bygges som **24V fra start** — 12V-mellomsteget droppet, og `bar24` er nå standard lysvariant i appen. 12V-stripa er reserve (bench-strøm under bygging, evt. lys i en senere kasse)
- ✅ **Hardware komplett (7. august):** Bestilling 7 (24V lys-oppgradering) er fullt mottatt — Samsung LM281B-barer ×2, 24V 5A-adapter, 24V→5V buck ×2, FR120N ×4 og M3-standoffs ligger på lager. **Ingen bestilling har utestående leveranser; prosjektet er kun begrenset av design- og byggetid.** Detaljer: [`docs/mottaksliste.md`](docs/mottaksliste.md). ⚠️ 24V-adapteren har samme plugg som 12V-adapterne — merk pluggen, og hold 24V unna den gamle 12V-riggen (fast-5V-buck, LR7843, phyto-stripa dør av 24V)
- 📏 **Vekstlyset målt (28. juli):** ~208 PPFD @10 cm per bar (Photone «LED Full+Red»), ~213 snitt for to barer — 5–6× den gamle magenta-stripa. To justeringer mot tidligere antagelser: fotoperioden må opp til **16–18 t** (ikke 13) for DLI-målet, og hengehøyden ned til **~10 cm**. Lyset faller som 1/d (linjekilde), ikke 1/d²
- ✅ **RLS strammet 3. juli 2026** ([`docs/sql/2026-07-03-rls-stramming.sql`](docs/sql/2026-07-03-rls-stramming.sql), kjørt og verifisert med security advisor): anon-nøkkelen kan nå kun poste sensordata + lese lysplanen (det ESP32-en trenger) — all annen skriving krever innlogging. Før kunne hvem som helst med app-URL-en styre lyset. NB: ESP32 har ikke postet siden 20. juni (avslått) — første «Sensordata sendt.» etter oppstart bekrefter at insert-flyten er intakt
- 🟡 Multi-user-arkitektur forberedt (`owner_id`-felt klart), ikke aktivert
- ⏸️ Utskilling til eget Supabase-prosjekt — **parkert**: gratis-grensen (2 aktive prosjekter) er per bruker på tvers av organisasjoner, og begge plassene er brukt. Krever Pro eller ledig plass; deling er trygt etter RLS-strammingen. Plan klar i [`docs/2026-07-03-utskilling-plan.md`](docs/2026-07-03-utskilling-plan.md). (Sammenslåing med Matplanlegger er uansett skrinlagt.)
