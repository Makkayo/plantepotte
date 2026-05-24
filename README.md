# Plantepotte

Modulær, selvvannende innendørs plantepotte med app-styrte vekstlys.

- **Live web-app:** https://plantepotte.pages.dev/
- **Prosjektoversikt (start her):** åpne [`oversikt.html`](oversikt.html) i nettleser
- **3D-design:** [`3d-design.html`](3d-design.html)
- **Original spec:** [`docs/2026-05-23-plantepotte-design.md`](docs/2026-05-23-plantepotte-design.md)

## Stack

- **Hardware:** ESP32 (MicroPython) + LR7843 MOSFET + phyto LED-strip + sensorer
- **Backend:** Supabase (`ebjbxfwtwrahuokydvtj`) — delt med Matplanlegger
- **Frontend:** Vanilla HTML/CSS/JS i `index.html`, hostet på Cloudflare Pages
- **Deploy:** `git push` til `main` → auto-deploy

## Status (mai 2026)

Backend ferdig. Hardware bestilt fra AliExpress, ankommer ~2. juni.
Se `oversikt.html` for full status og neste steg.
