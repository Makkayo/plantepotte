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
```

Node 20+ kreves (`.nvmrc` setter dette).

## Database (Supabase)

| Tabell | Bruk |
|--------|------|
| `lys_familier` | 5 lys-grupper (skygge-tolerante → solhungrige) |
| `planter` | Katalog med 44 planter — DLI, timer, vann, veke-egnethet, kilder |
| `potter` | Fysiske potter (potte_id, antall seksjoner, sensorer) |
| `potte_planter` | Mange-til-mange: hvilke planter er i hvilken seksjon |
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

## Status (10. juni 2026)

- ✅ Backend ferdig — 44 planter med dokumenterte DLI-krav
- ✅ Ny Svelte-app med plante-katalog, kompatibilitets-advarsler og lyskontroll
- ✅ Komplett flashbar firmware i `firmware/` (watchdog, NTP-resynk, 4 jordfukt-plasser, 18 logikk-tester)
- ✅ Breadboard-testet: ESP32, OLED, DHT22, KY-040, jordfukt ×3 (kalibrert), buck (fast 5V, målt 5,26V), LED-strip tent (0,94 A/potte målt)
- 🟡 Neste: `main.py` + WiFi + Supabase end-to-end; MOSFET-lys venter på loddebolt (modulen er et byggesett)
- 🟡 Bestilling 3 (laser + kamera), 4 (loddeutstyr) og 5 (påfyll) i posten — se `docs/mottaksliste.md`
- 🟡 Multi-user-arkitektur forberedt (owner_id-felt klart), ikke aktivert
- ⬜ Sammenslåing med Matplanlegger (egen fase senere)
