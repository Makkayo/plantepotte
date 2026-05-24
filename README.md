# Plantepotte

Modulær, selvvannende innendørs plantepotte med app-styrte vekstlys og fakta-basert plante-katalog.

- **Live web-app:** https://plantepotte.pages.dev/
- **Prosjektoversikt:** [`/oversikt.html`](public/oversikt.html) (kopiert til `dist/` ved build)
- **3D-design:** [`/3d-design.html`](public/3d-design.html)
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
| `potte_commands` | Lys-innstillinger som ESP32 leser hvert 5. sek (uendret format) |
| `potte_sensor_data` | Sensoravlesninger fra ESP32 (uendret format) |

Alle nye tabeller har `owner_id uuid` (nullable) for fremtidig multi-user-støtte.
ESP32-kontrakten er uendret — ingen MicroPython-kode trenger oppdatering.

## Cloudflare Pages-oppsett

Hvis appen ikke deployer automatisk etter første push, må Cloudflare Pages-prosjektet
konfigureres med:

- **Framework preset:** Svelte (eller None)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version (env var `NODE_VERSION`):** `20`

## Status (mai 2026)

- ✅ Backend ferdig — 44 planter med dokumenterte DLI-krav
- ✅ Ny Svelte-app med plante-katalog, kompatibilitets-advarsler og lyskontroll
- 🟡 Hardware bestilt fra AliExpress, ankommer ~2. juni
- 🟡 Multi-user-arkitektur forberedt (owner_id-felt klart), ikke aktivert
- ⬜ Sammenslåing med Matplanlegger (egen fase senere)
