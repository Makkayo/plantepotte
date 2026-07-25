# Utskilling: Plantepotte → eget Supabase-prosjekt

*Retningsvalg 3. juli 2026: Plantepotte skilles fra Matplanlegger-prosjektet og
får sin egen Supabase. Sammenslåing («egen fase senere» i README) er skrinlagt.*

> **STATUS: PARKERT (3. juli 2026).** Forsøkt i praksis: gratis-grensen på
> 2 aktive prosjekter er **per bruker på tvers av organisasjoner**, ikke per
> organisasjon — en ny gratis org («Plantepotte») ble opprettet, men
> prosjektopprettelse ble blokkert («members who have exceeded their free
> project limits»). Kontoen har alt MørkeZ + Matplanlegger/Plantepotte.
> Utskilling krever dermed Pro (~25 USD/mnd) eller at et eksisterende prosjekt
> slettes/pauses — ingen av delene verdt det nå. **Sikkerhetsargumentet er
> uansett løst**: RLS-strammingen (se `sql/2026-07-03-rls-stramming.sql`) er
> kjørt i det delte prosjektet, så deling er trygt. Planen under beholdes i
> tilfelle situasjonen endrer seg (Pro, ledig plass, eller Supabase endrer
> kvotene). Den tomme «Plantepotte»-organisasjonen kan slettes eller stå.

## Hvorfor

- **Egen blast-radius.** I dag deler de prosjekt: en for løs policy hos den ene
  eksponerer den andre (verifisert 3. juli — se `docs/sql/2026-07-03-rls-stramming.sql`).
  Adskilt kan Plantepotte ha strenge, enkle policyer uten å måtte teste
  Matplanleggers skriveflyt hver gang.
- **Frihet til å rydde.** Egen database kan resettes/migreres uten frykt for å
  treffe matdata. Sensor-historikk kan få egen retention uten kompromisser.
- ~~**Gratis-tier holder.**~~ **Avkreftet i praksis** (se status øverst):
  grensen på 2 aktive gratis-prosjekter gjelder per bruker på tvers av alle
  organisasjoner, og begge plassene er brukt (MørkeZ + Matplanlegger/Plantepotte).

## Ny motforestilling (25. juli 2026): delingen holder prosjektet vått

Sjekket status i dag: prosjektet er `ACTIVE_HEALTHY` selv etter **35 dager uten
ESP32-trafikk** (siste avlesning 20. juni 16:38 UTC — ESP32-en har stått av). Det
er **Matplanleggers daglige bruk** som holder gratis-prosjektet fra å pauses, ikke
potta. Et utskilt Plantepotte-prosjekt mister den livlinen: står ESP32-en av i en
uke (som nå, mellom byggetrinn), pauses prosjektet og appen møter en død backend
til noen vekker det manuelt. Ikke en showstopper, men et reelt minus som ikke var
med i regnestykket da retningen ble valgt — og et argument for å vente til potta
faktisk står og poster døgnet rundt.

## Hva som flytter

| Ressurs | Innhold | Merknad |
|---|---|---|
| `lys_familier` | 5 rader | ren kopi |
| `planter` | 44 rader (katalogen) | ren kopi |
| `potter` | 1–2 kasser | ren kopi |
| `potte_planter` | aktive + historikk | ren kopi |
| `potte_commands` | 1 rad per kasse | ren kopi |
| `potte_sensor_data` | historikk | **valgfritt** — appen bruker kun siste 7 døgn; eldre kan droppes |
| Storage-bucket `plantebilder` | ESP32-CAM-bilder | opprett bucket (public) + policies; kopier filer hvis noen finnes |
| Auth | din bruker | opprettes på nytt (e-post + passord) |

Matplanlegger-tabellene (`recipes`, `shopping_list`, `pantry`, `price_history`,
`cooked_log`, `planteprofiler`, …) blir stående urørt i det gamle prosjektet.

## Rekkefølge (null nedetid for potta)

Potta fortsetter å poste til det gamle prosjektet helt til ESP32-en reflashes —
begge prosjektene lever side om side i overgangen.

1. **Opprett nytt prosjekt** (region `eu-north-1` / nærmest, free tier).
2. **Skjema + RLS riktig fra dag 1**: kjør tabell-DDL og policyene fra
   `2026-07-03-rls-stramming.sql`-prinsippet (anon = kun INSERT sensordata +
   SELECT kommandoer; alt annet authenticated). `owner_id`-feltene beholdes.
3. **Kopier data** (rekkefølgen over; sensor-historikk: siste 7–30 døgn holder).
4. **Storage**: bucket `plantebilder` (public) + les-policy; ESP32-CAM-nøkkelen
   får INSERT.
5. **Auth**: opprett brukeren din i det nye prosjektet.
6. **Appen**: bytt `SUPABASE_URL` + `ANON_KEY` i `src/lib/supabase.ts`,
   push → Cloudflare deployer. (Appen viser nå det nye prosjektet.)
7. **Firmware**: oppdater `SUPABASE_URL` + `ANON_KEY` i `firmware/config.py`
   (og `esp32cam/secrets.h` når kameraet kommer), flash ESP32-en. **Eneste
   steget som krever fysisk tilgang.**
8. **Verifiser**: «Sensordata sendt.» i seriell logg, ny avlesning i appen,
   lys-styring rundtur. Sjekk security advisor = grønn.
9. **Rydd**: slett plantepotte-tabellene + bucket fra det gamle prosjektet
   (da er Matplanlegger-prosjektet kun matplanlegger).

## Hva kan gjøres herfra vs. hva som trenger deg

- **Herfra (via Supabase MCP + repo):** steg 1–6 og 9 — prosjektopprettelse har
  en kostnadsbekreftelse, og selve byttet i steg 6 deployes først når du sier gå.
- **Deg fysisk:** steg 7 (flash av ESP32 med ny config) + passordvalg i steg 5.

## Uavhengig av utskillingen

RLS-hullet i dagens delte prosjekt er live til det tettes. Utskillingen tar den
tiden den tar (krever reflash) — kjør `docs/sql/2026-07-03-rls-stramming.sql`
i det gamle prosjektet **nå**, så er potta trygg i mellomtiden.
