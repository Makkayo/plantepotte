# Design-spec: «Anlegget»-handoff — total implementering

**Dato:** 2026-06-21
**Status:** Til godkjenning
**Kilde:** Design-Claude-handoff i `Potteplanten på GitHub.zip` (`Anlegget mobil.dc.html`, `Vekstlys alternativer.dc.html`, `README.md`)

## Mål

Implementere hele den nye mobil-first design-handoffen i den eksisterende Svelte 5 + TypeScript + Tailwind-appen. Handoffen er en **høy-fidelity HTML-mockup** (ikke produksjonskode) som skal gjenskapes i kodebasen med eksisterende mønstre. Tre skjermer dekkes: **Oversikt** (blomsterkasse-liste), **Detalj** (én kasse) og tre **bunn-ark** (Felt, Vannreservoar, Vekstlys).

All eksisterende forretningslogikk i `src/lib/` (lys-kompatibilitet, DLI, kalibrering, trend) beholdes urørt med mindre spec-en eksplisitt sier noe annet. Implementeringen er **komponent-for-komponent** (lav risiko, testbart trinnvis).

## Brukerbeslutning som styrer alt

Lys-kontrollen flyttes **helt** inn i et bunn-ark (valgt: alternativ A). Den gamle `LysKontroll.svelte`-seksjonen på detalj-siden fjernes. Ingen dobbel UI, «intet annet enn perfeksjon, vil ikke ha ekstra unødvendige greier».

---

## Arkitektur — filendringer

### Nye filer
| Fil | Ansvar |
|-----|--------|
| `src/components/viz/SolBue.svelte` | Sol-bue SVG (halvsirkel) — viser sol-dot langs buen ut fra klokkeslett. Ren visningskomponent. |
| `src/components/LysSheet.svelte` | Innholdet i vekstlys-arket: sol-bue, DLI-tall, intensitet-slider, lys på/av, anbefalt-boks, plante-statusliste, lagre-til-Supabase. |

### Endrede filer
| Fil | Endring |
|-----|---------|
| `src/components/PotteOversikt.svelte` | `max-w-[430px]` sentrert kolonne, enkelt-kolonne liste (ikke grid), header restyle (Fraunces 25px + mono undertekst), rise-animasjon. |
| `src/components/PotteKort.svelte` | Full redesign per mock: plant-ikon (38×38 grønn ramme) + navn + chevron, online-dot + status + «N felt trenger vann»-badge, plante-chips m/grønn dot, 3-kol mikro-stats (Temp / Jord lavest / Vann) eller «Uten sensorer», sol-ikon + lysplan-tekst. |
| `src/components/AnleggPanel.svelte` | Legg til klima-stripe (2 kort), gjør om vekstlys-kortet til tidslinje-pill (gradient + pulserende nå-dot), legg til LUKE-merke mellom pottene + undertekst, koble inn nytt LysSheet, `now`-tikk hvert minutt. |
| `src/components/Potte.svelte` | Høyde 232px (fra 206), send «foran/bak/hel»-rolle videre til Felt for badge. |
| `src/components/Felt.svelte` | Badge-pille (Bak = mørk, Foran = blå, Hele = mørk) øverst, plantenavn under, fukt nede. Probe-indikator beholdes. |
| `src/components/PotteDetalj.svelte` | Fjern `LysKontroll`-import/-bruk; gi `planter` (Plante[]) til AnleggPanel for lys-arket; sticky header restyle; `max-w-[430px]`-wrapper. Drift-kort + historikk **beholdes** under AnleggPanel (ekte features, ikke i mock men ikke fjernes). |
| `src/lib/trend.ts` | Legg til `sistFyltAt: Date \| null` (utledet fra påfyll-deteksjon) og `dagligForbruk: number[]` (liter/dag siste 7 dager) i `VannTrend`. |

### Slettede filer (blir død kode etter flytting)
| Fil | Hvorfor |
|-----|---------|
| `src/components/LysKontroll.svelte` | Erstattet av `LysSheet.svelte`. |
| `src/components/viz/LysDognRing.svelte` | Erstattet av `SolBue.svelte`. Designet velger eksplisitt sol-bue av de 3 lys-visualiseringene. |

> **Merk:** Sletting av disse to skiller seg fra resten — bekreft i spec-gjennomgang at sol-bue helt erstatter ringen (ingen ønske om å beholde ring-varianten et sted).

### Urørt
`Header.svelte` (har allerede mobil bunn-nav Kasser/Katalog/Dyrking = dekker mockens bunn-meny), `Shell.svelte`, `Sheet.svelte` (allerede `max-w-[430px]`), `lys.ts`, `utils.ts` (med mindre en liten hjelpefunksjon trengs), alle plante-katalog-komponenter, `database.types.ts` (ingen skjemaendring).

---

## Skjerm 1 — Oversikt (`PotteOversikt` + `PotteKort`)

**Layout:** `max-w-[430px] mx-auto`, enkelt kolonne, `gap-14px`. Header: «Mine blomsterkasser» (Fraunces 25px) + «N blomsterkasser» (mono 11px). Hele skjermen `pp-rise` fade+rise ved mount (bruk eksisterende `.stig`/`riseIn`).

**PotteKort — radstruktur:**
1. Plant-ikon (38×38, radius 11, grønn ramme `rgba(74,222,128,0.1)` + border `rgba(74,222,128,0.2)`, lucide-løv-SVG grønn) + navn (Fraunces 18px) + «›» chevron.
2. Online-dot (grønn = tilkoblet, rød/grå = offline) + status-mono-tekst + **«N felt trenger vann»-badge** (rød pille, kun når noe felt < 35 % fukt) + evt. dato.
3. Plante-chips: pille `#1f2433` + grønn dot 6px + navn. (Beholder emoji-fri stil per mock; emoji droppes i chip her — se merknad.)
4. Hvis sensorer: skillelinje + 3-kol mikro-stats: **Temp** (Fraunces 19px), **Jord lavest** (laveste felt-fukt, farget etter `fuktStatus`), **Vann** (blå %). Hvis ikke: «Uten sensorer — kun lyskontroll».
5. Sol-ikon (gul `#d4a017`) + lysplan-tekst (f.eks. «07:00–23:00 · 70 %» eller «Av»).

**Egen forbedring (utover spec):** «N felt trenger vann»-badge regnes fra laveste jordfukt blant aktive felt. Ikke i mock-dataene eksplisitt, men åpenbart nyttig og matcher mockens `harTorr`-felt.

**Bevisst avvik:** Mocken viser plantenavn i chips uten emoji. Jeg beholder mockens rene stil (grønn dot, ikke emoji) for chips i oversikten. Mikro-stat «Jord lavest» farges via eksisterende `fuktStatus()`-terskler (55/35).

---

## Skjerm 2 — Detalj (`PotteDetalj` + `AnleggPanel`)

**Sticky header:** tilbake-knapp (34×34, `#171b26`), kassenavn (Fraunces 22px), tilkoblet-dot høyre. Wrappes i `max-w-[430px]`.

**AnleggPanel-seksjoner (rekkefølge):**

1. **Klima-stripe** (kun m/sensorer): 2 like kort side-om-side. Temp-kort: orange ikon-boks (`rgba(232,112,42,0.14)` + termometer-SVG) + «TEMP» label + Fraunces 21px. Luftfukt-kort: blå ikon-boks + dråpe-SVG + «LUFTFUKT» + Fraunces 21px.

2. **Vekstlys-kort** (trykk → lys-ark): «Vekstlys» bold 13px + tidsskjema mono («07:00 – 23:00»), toggle-pille 44×25 høyre (grønn på / grå av, stopper propagasjon så kortet ikke åpner arket ved toggle). **Tidslinje-pill-bar** (erstatter dots): grå pille m/grønn gradient-fyll fra venstre til nå-punktet + pulserende grønn dot (`pp-breathe` 2.6s) ved nåværende klokkeslett (kun når lyset er på og vi er i lys-vinduet). Undertekst: «Lyser nå · av om X t» / «Av nå · slår på HH:MM» / «Slått av».

3. **Vannreservoar-kort** (kun m/sensorer, trykk → vann-ark): beholder eksisterende `VannFlottor.svelte` (flaske + flottør + %/liter/dager). Ingen endring nødvendig der.

4. **Pottene** (kun m/sensorer): «Pottene» + «trykk på et felt» (mono). To oktagoner side-om-side med **`gap-40px`** for å gi plass til midtdeleren. Mellom dem: absolutt-posisjonert **midtdeler** (14px trestripe) med **LUKE-merke** nederst (30×26, blå border + glow, dråpe-ikon, «LUKE» mono 8px) → trykk åpner vann-arket. Under pottene: sentrert undertekst «🛢 Luka sitter mellom pottene, på fronten».

**`now`-tikk:** AnleggPanel holder `now = $state(new Date())` oppdatert hvert 60. sek (`setInterval`, ryddes i `onDestroy`) — driver tidslinje-dot og sol-bue. Respekterer `prefers-reduced-motion` ved at puls-animasjonen allerede er gated i CSS.

---

## Pottene — `Potte.svelte` + `Felt.svelte`

**Potte:** oktagon clip-path (uendret formel), høyde **232px** (mocken). Med skillevegg: Bak-felt (øverst) + 16px treskillevegg + Foran-felt (nederst). Udelt: ett «Hele»-felt.

**Felt:** «våt front» stiger nedenfra (uendret veke-metafor). Nytt: **badge-pille** øverst venstre — «Bak» (mørk pille `#1f2433`-aktig), «Foran» (blå `rgba(96,165,250,0.2)` + lys blå tekst), «Hele potta» (mørk). Badgene er **kun etiketter** (hvilken fysisk side feltet er) — ikke noe man bytter. Plantenavn under badge, fukt-% (Fraunces, farget) nederst venstre, probe-strek + farget dot høyre. Tomt felt: «+ Legg til»-affordans (uendret).

**«Snu potta» droppet helt** (brukerbeslutning 2026-06-21): ingen `snudd`-state, ingen snu-knapp, ingen felt-reordering. Riktige urter settes på riktig plass fra start. Sparer DB-kolonne, lokal state og en knapp.

---

## Skjerm 3a — Felt-ark

Trigger: trykk på et felt (med plante). Tomt felt → åpner plantevelger direkte (uendret).

Innhold (per mock): plantenavn (Fraunces 25px) + «Potte N · Bak/Foran · jordfukt» (mono) + fukt-% (Fraunces 38px, farget). Status-badge (pille). 7-dagers jordfukt-bar-chart (`#323a52`, 56px). Info-boks: «Selvvannet via veke …» (blå dråpe-ikon). Lukk-knapp. Probe-ADC mono nederst. (Mockens «Snu potta»-knapp droppes — se Pottene over.)

Notat-redigering (eksisterende funksjon) beholdes — plasseres før knappe-raden. «Bytt plante» / «Fjern» beholdes (eksisterende handlinger, ikke i mock men ekte features). Vi beholder Bytt/Fjern/Notat fordi de er reell funksjonalitet brukeren har i dag.

---

## Skjerm 3b — Vannreservoar-ark

Innhold (per mock): tittel «Vannreservoar» + «Lasermålt nivå · flottør». 3 stats-bokser: **Fylt %** (blå Fraunces 26px) / **Liter igjen** / **Dager**. **«Sist fylt {dato}.»** Forbruksgraf siste 7 dager (blå `#3b82c4` barer, 50px, liter/dag). «Marker som fylt» (grønn primær) + «Lukk». Kalibrering «Tanken er tom nå» beholdes som diskret sekundær-tekstknapp + avlest-mm-linje + feilmelding (eksisterende kalibreringslogikk uendret).

**Ny data fra `trend.ts`:**
- `sistFyltAt: Date | null` — tidspunktet for siste detekterte påfylling (hoppet > 12 pp). `null` hvis ingen påfylling i 7-dagers-vinduet → vis «Sist fylt: ukjent» eller skjul linja.
- `dagligForbruk: number[]` — opptil 7 verdier, liter forbrukt per døgn (bøtte per dag, `max(0, startPct − sluttPct)` × tankliter). Påfyll-døgn viser ~0. Tom historikk → tomt array → grafen skjules eller viser flate stubber.

**«Marker som fylt»** kaller eksisterende `settKalibrering('full')` (re-baseliner `vann_full_mm`) — beholdes som i dag.

---

## Skjerm 3c — Vekstlys-ark (`LysSheet` + `SolBue`)

Erstatter `LysKontroll` fullstendig. Henter `planter: Plante[]` + `command` + `potteId` + `onLagret` (samme kontrakt som gamle LysKontroll).

**SolBue.svelte:** SVG `viewBox 0 0 256 148`. Grå bakgrunnsbue `M 32 124 A 96 96 0 0 1 224 124` (stroke `#1f2433`, bredde 4) + grønn fyll-gradient under + grønn progress-bue fra start til sol-dot + gul sol-dot (r=10, glow). Posisjon: `sunFrac = elapsed/duration` (0 ved lys-på, 1 ved lys-av), `angle = (1 − sunFrac)·π`, `x = 128 + 96·cos(angle)`, `y = 124 − 96·sin(angle)`. Sol-dot dimmes (`opacity 0.3`) når utenfor lys-vinduet. Tidslabels (lysPå venstre, lysAv høyre, mono 9px). Tar `now`-prop.

**LysSheet-innhold:** header «Vekstlys» + «Lyslist · N t lys» + grønn DLI-badge. SolBue. DLI-tall (Fraunces 46px) + «DLI mol/m²». «Forhåndsvisning oppdateres mens du justerer». Intensitet-slider (0–100, grønn accent) med «INTENSITET» mono-label + Fraunces 18px %-verdi. Lys på/av time-inputs (mono, dark scheme). **Anbefalt intensitet-boks** (Fraunces 24px % + «Bruk anbefaling»-knapp m/sol-ikon) — bruker eksisterende `anbefaltInnstilling()`. **Plante-statusliste**: grønn dot + navn + «DLI opt N» + status-badge (Bra/Akseptabelt/For lite/For mye) via eksisterende per-plante-helse-logikk. «Ferdig»-knapp (grønn) lagrer til Supabase (`potte_commands` upsert, samme som i dag) + `onLagret()`.

**Egen forbedring — bevart advarsel:** Mocken dropper de gamle kompatibilitets-rapport-kortene. Per-plante-statusradene dekker «for lite/for mye lys». MEN vann-/veke-kompatibilitetsadvarselen (f.eks. «denne planten råtner i veke-system») har ingen annen plass. Jeg viser derfor en **slank advarsels-banner øverst i lys-arket KUN når det finnes et reelt problem** (`lysRapport.niva` = risikabel/inkompatibel, eller `vannRapport.niva` ≠ ok). Når alt er bra: ingen banner (ren mock-stil). Dette er en bevisst, liten forbedring som bevarer verdifulle advarsler uten å gjeninnføre alltid-synlige kort.

---

## Verifisering

- `npm run check` (svelte-check) — 0 feil.
- `npm run test` (vitest) — alle eksisterende tester grønne; legg til tester for `trend.ts`-tilleggene (`sistFyltAt`, `dagligForbruk`) og evt. sol-bue-posisjon hvis ren funksjon ekstraheres.
- `npm run build` — grønn (samme vite5/rollup-kjede; **ikke** rør vitest-versjon, må stå på `^2` pga. Cloudflare-deploy-fellen).
- Manuell røyktest i `npm run dev`: oversikt → detalj → hvert av de tre arkene; toggle lys; snu potta; marker som fylt; offline-tilstand.

## Risiko / fallgruver

- **Vitest-pinning:** Ikke oppgrader vitest forbi `^2` (rolldown-binding-tre dreper Cloudflare-bygget).
- **Sol-bue utenfor vindu:** Når lyset er av / utenfor vinduet må `sunFrac` håndteres trygt (0) så buen ikke får NaN.
- **`stopPropagation` på lys-toggle:** Toggle-knappen ligger inni det klikkbare kortet → må stoppe bobling så toggle ikke også åpner arket.
- **Tom/manglende sensordata:** Alle %-/mm-/trend-felt må tåle `null` (offline potte) uten å krasje — behold eksisterende null-vakter.

## YAGNI / utelatt bevisst

- Ingen ny bunn-nav (Header har den).
- Ingen «snu potta» (droppet — riktige urter på riktig plass fra start).
- Ingen DB-skjemaendring.
- Ingen kamera-tidslinje (egen fremtidig oppgave, fase 4b).
- Drift-kort + historikk beholdes uendret (ikke i mock, men ekte features).
