# Database-kart: delt Supabase-prosjekt

*Prosjekt `ebjbxfwtwrahuokydvtj` («Matplanlegger/ Plantepotte»). Sist kartlagt
og ryddet 3. juli 2026 — hver tabell er også merket med eier i selve databasen
(tabellkommentar, synlig i dashbordets Table Editor).*

## Prinsippet: én sikkerhetssone per prosjekt

Kontoen har 2 gratis prosjekter (grensen er per bruker, på tvers av organisasjoner):

| Prosjekt | Innhold | Regel |
|---|---|---|
| **MørkeZ** | (eget) | Røres ALDRI av hobby-prosjektene. Egen sone. |
| **Matplanlegger/ Plantepotte** | alle hobby-apper | Alt nytt havner her, med reglene under. |

## Hvem eier hva (per 3. juli 2026)

### 🪴 Plantepotte — repo `makkayo/plantepotte`

| Tabell | Innhold | anon-tilgang (ESP32) |
|---|---|---|
| `lys_familier` | 5 lys-familier | les |
| `planter` | katalog, 44 arter | les |
| `potter` | blomsterkassene | les |
| `potte_planter` | plantinger per plass | les |
| `potte_commands` | lysplan (ESP32 poller) | **kun les** |
| `potte_sensor_data` | sensoravlesninger | **kun skriv (INSERT)** |

Storage: bucket **`plantebilder`** (public — ESP32-CAM → veksttidslinja).
All skriving utover ESP32-ens INSERT krever innlogget bruker
(strammet 3. juli, se `sql/2026-07-03-rls-stramming.sql`).

### 🍽️ Matplanlegger — (eget repo)

| Tabell | Innhold |
|---|---|
| `recipes` | oppskrifter |
| `shopping_list` | handleliste |
| `pantry` | matvarelager |
| `price_history` | prishistorikk |
| `cooked_log` | logg over laget mat |

Storage: bucket **`recipe-images`** (public).
RLS ble slått PÅ 3. juli med bevisst åpne policyer («apen tilgang (bevart
oppforsel - stram ved innlogging)») — nøyaktig samme tilgang som før, men nå
som et dokumentert valg i stedet for glemt RLS. **TODO for Matplanlegger:**
policyene tyder på at appen skriver anonymt (uten innlogging); når/hvis den
får innlogging, stram på samme måte som plantepotte.

### 🪦 Utgått

| Objekt | Status |
|---|---|
| `planteprofiler` (5 rader) | Plantepotte **v1** — erstattet av `lys_familier` + `planter`. Kun den arkiverte v1-appen (`docs/legacy/index-v1.html`) leser den. **Kan slettes** — innholdet (5 profiler: Urter/Kaktus/Grønnsaker/Blomstrende/Tropisk) er trivielt å gjenskape. |
| `potte_commands.plantetype` (kolonne) | v1-rest, ubrukt av dagens app/firmware. Kan droppes ved neste anledning. |

## Regler for alt nytt i prosjektet

1. **Prefiks eller umiskjennelig navn.** Nye Plantepotte-tabeller heter
   `potte_*`. Et nytt prosjekt «X» bruker `x_*` — aldri generiske navn som
   `items` eller `log` (det er slik `planteprofiler`-forvirring oppstår).
2. **Tabellkommentar med eier, alltid:**
   `comment on table public.x_tabell is '[AppNavn] hva den inneholder';`
3. **RLS på fra dag 1, minste privilegium:** start fra hva hver klient FAKTISK
   gjør (jf. ESP32: kun INSERT + SELECT), ikke fra «alt åpent, strammer
   senere» — det «senere» kom aldri av seg selv her heller.
4. **Ingen kryss-referanser mellom appene.** Ingen foreign keys eller
   spørringer på tvers av eiergrensene — da forblir de flyttbare hver for seg.
5. **Oppdater dette kartet** når tabeller kommer til eller fjernes.

## Kjente rest-advarsler (bevisste, per 3. juli)

- `rls_policy_always_true` på diverse tabeller: forventet — én-bruker-oppsett
  der «innlogget = deg». Blir relevant først ved multi-user (`owner_id` finnes
  alt på plantepotte-tabellene).
- `public_bucket_allows_listing` på begge buckets: hvem som helst kan LISTE
  filnavnene (innholdet er uansett offentlig via URL). Ufarlig for plantebilder
  og matbilder.
- `auth_leaked_password_protection` avslått: kan skrus på gratis i dashbordet
  (Auth → Settings) — sjekker passord mot HaveIBeenPwned ved innlogging/registrering.
- Gratis-prosjekter **pauses etter ~7 dager uten aktivitet**: Plantepottas
  ESP32 (poll hvert 5. sek) holder prosjektet våkent; faller riggen ut i
  ukesvis, våkner prosjektet med et klikk i dashbordet.
