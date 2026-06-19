# App-forbedringer — design (19. juni 2026)

Fem forbedringer i plantepotte-web-appen. Bygges samlet, hver verifisert (`npm run check` + nettleser) før push.

## A · Logg ut-bekreftelse + redigeringsvern
- `Header.svelte`: «Logg ut» (desktop-knapp + mobil-ikon) viser bekreftelsesdialog **«Logge ut?»** (Avbryt / Logg ut) før `signOut()`.
- `SensorPanel.svelte`: «Sett som tom/full» (kalibrering) → **to-stegs bekreftelse** før lagring (overskriver stille i dag).
- «Fjern plante» har allerede inline-bekreftelse — uendret.

## D · Flere katalog-filtre
`PlanteKatalog.svelte` får to nye filter-rader:
- **Veke-egnethet** (`veke_egnet`): Alle / Passer godt (utmerket+bra) / Forsiktig+.
- **Vanskelighetsgrad** (`vanskelighetsgrad`): Alle / Lett / Middels / Vanskelig.

Wires inn i `filtrert`-derived. («Vis kun mine planter» + «rask høsting» er mulige neste-steg, ikke nå.)

## Toggle · «I drift» per blomsterkasse
- DB: `potter.i_drift boolean NOT NULL DEFAULT false`.
- `PotteDetalj.svelte`: bryter **Testmodus ↔ I drift**. «Testmodus»-merkelapp vises i test (PotteDetalj + PotteKort).
- Ved flipp til **I drift**: sett `plantet_at = now()` for alle aktive planter i kassa → ren start fra go-live.
- **Gater B og C:** datoer + historikk teller kun når `i_drift = true`.

## B · Plantedato + notater (gated av i_drift)
- `PlanteSlot.svelte`: når kassa er i drift, vis «🌱 Plantet {dato} · {N} dager» fra `plantet_at`. I testmodus: «🧪 Testmodus».
- Notater: redigerbart `notater`-felt per planting (liten input, lagres til `potte_planter.notater`).
- `PotteDetalj` sender `plantet_at`, `notater`, `iDrift` til `PlanteSlot`.

## C · Historikk (myk-sletting, gated av i_drift)
- DB: `potte_planter.fjernet_at timestamptz NULL`. Erstatt unik `(potte_id, seksjon)` med **delvis unik indeks** `WHERE fjernet_at IS NULL`.
- `stores.ts`: aktive spørringer filtrerer `fjernet_at IS NULL`.
- `PotteDetalj.fjernPlante`: i drift → sett `fjernet_at = now()`; i test → hard-slett.
- `planteValgt` (bytte plante i en plass): myk-slett eksisterende aktiv rad i seksjonen (i drift), så insert ny — erstatter dagens `upsert onConflict`.
- Ny **«Historikk»-seksjon** i `PotteDetalj`: planter med `fjernet_at` → «{navn} — stod {N} dager ({fra}–{til})».

## Rekkefølge & verifisering
A → D → toggle → B → C. `npm run check` + nettleser-sjekk per bit, så commit + push.
