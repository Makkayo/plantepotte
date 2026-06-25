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
- ✅ Innsikt-motorer: VPD (luftklima), to-fase nærings-påminnelse, maskinvare-diagnose (løs/død jordprobe + veke-kontakt), strømoverslag for lyset
- ✅ Komplett flashbar firmware i `firmware/` (watchdog, NTP-resynk + auto-sommertid, valgfri myk soloppgang/-nedgang, 4 jordfukt-plasser, **44 logikk-tester** på PC)
- ✅ **99 enhetstester (Vitest)** for app-logikken: lys/DLI, vann- og jordfukt-kalibrering, blomsterkasse-oppsett, vanntrend, VPD, næringsfase, diagnose
- ✅ CI (GitHub Actions) speiler Cloudflare-bygget og vokter at Wokwi-koden holdes i synk med firmwaren
- ✅ **Full integrasjon live (20. juni):** ESP32 kjører selvgående på buck — WiFi + NTP + Supabase, alle sensorer i appen, appen styrer lyset. MOSFET-PWM-dimming og VL53L0X-laser verifisert på ekte hardware
- 🟡 Neste: ESP32-CAM (kamera → vekst-tidslinje) + 3D-print og montering av potte 1
- 🔴 Før potta eksponeres utenfor eget nett: lås `potte_commands`-skriving til innlogget eier (se prosjekt-skillen, «Sikkerhet før live»)
- 🟡 Multi-user-arkitektur forberedt (`owner_id`-felt klart), ikke aktivert
- ⬜ Sammenslåing med Matplanlegger (egen fase senere)
