# Veikart og oppsett

Faser, brukeroppsett og parkerte ideer. Løpende status står i [README.md](../README.md);
datert historikk i [HISTORIKK.md](HISTORIKK.md); lagerbeholdning i [lager.md](lager.md).

*Overført fra prosjektskillen 9. august 2026 — innholdet er per 7. august 2026.*

---

## Brukeroppsett

- **2 potter planlagt — potte 1 bygges først.** Potte 2 = samme design, revurderes
  når potte 1 funker.
- **Potte 1:** full sensor-suite — OLED, DHT22, jordfukt ×3 (plass til 4), vannstand
  (VL53L0X ToF-laser + 3D-printet flottør), KY-040, vekstlys, ESP32-CAM.
- **Jordsensor-plan (10. juli 2026):** starter med alle 3, men Markus ser for seg å
  trappe ned/fjerne dem etter hvert — kablene skjemmer. Hele kjeden er verifisert
  valgfri: `AKTIVE_JORDSENSORER` i config tåler `[]`, appen viser «—», og alle
  jord-varsler/diagnoser hopper over null-kanaler.
  **Men:** minst én sensor per potte er eneste veke-svikt-deteksjon (full tank +
  tørr jord). Fase 3-designet bør uansett gi pen kabelføring (kanal/spor mot stolpe).
- **XKC-Y25 ×4 er RESERVE** (erstattet av laseren) — ikke planlegg rundt dem.
- Begge potter deler **én adapter + buck** — **24V fra start** (avgjort 25. juli 2026).
  12V-utstyret er reserve, og stripa kan bli lys i en senere kasse hvis Markus vil
  sammenligne variantene i praksis.
- **Vannreservoar:** IKEA 365+ 5,2L (×2 innkjøpt). **3D-printer:** Bambu Lab P2S, PETG.
- **Dyrking (potte 1-oppstart):** kokos-jord + perlite ~70/30, to-fase næring (rent
  vann uke 0–6, så Nelson Garden Hydroponisk svakt). 4 vekster: basilikum 'Gustosa',
  Baby Leaf mix, 'Witte Dunsel', Ruccola 'Wasabi' — alt kjøpt. Én lysinnstilling
  ~13 t / ~75 %. Detaljer: [handleliste-dyrking.md](handleliste-dyrking.md) +
  «Dyrking»-fanen i appen.

**Potte 1 er eksperimentet som avgjør potte 2.** Kjør begge lysbarene, dim ned til
én-bar-nivå, se om plantene merker det → kjøp til potte 2 basert på data. Sparer
125 kr/potte hvis én bar holder.

---

## Faseoversikt

| Fase | Innhold | Status |
|------|---------|--------|
| 1–2 | Infrastruktur + breadboard-testing av alle moduler + full integrasjon (app styrer lys, sensorer live) | ✅ Ferdig 20. juni |
| 3 | 3D-design: lokk-på-tank, fyllerør, elektronikk-skuff, klips, berolings-brønn + flottør, laser-lokk, kamera-feste, **lysbjelke for 2 stive barer (termikk!)** | 🟡 Pågår i Fusion |
| 4 | Print + montering potte 1 (perfboard-layout landes her) | ⬜ Etter fase 3 |
| 4a | Vannmåling: sensor + driver ✅ · ⬜ drop-teste flottør | 🟡 |
| 4b | Kamera: kjede verifisert ✅, tidslinje bygget ✅ · ⬜ montering + visuell sjekk med ekte bilder i bucketen | 🟡 |
| 4c | Sikkerhet: RLS strammet ✅ · ⬜ bekreft ESP32-INSERT ved neste oppstart | ✅ |
| 4d | Lys-oppgradering 24V (B7) — alle deler mottatt 7. aug. Gjenstår: lodde FR120N-klemmer, måle buck (~5V), strømmåling ~1,0 A/bar | 🟡 |
| 5 | Potte 2 (reservelageret har det meste) + evt. pumpe | ⬜ Fremtid |
| 6 | Multi-user (familie-deling; `owner_id`-RLS + `potte_planter`-migrasjon) | ⬜ Fremtid |
| 7 | Utskilling til eget Supabase-prosjekt | ⏸️ Parkert (gratis-grense) |
| F-C | Auto-justerende lys (stepper + lead screw) | ⬜ Fremtid |
| F-D | Smart potte: stell-instruksjoner ✅ · AI-bildeanalyse ⬜ (venter på 4b) | 🟡 |

**Merk om fase 7:** et eget Plantepotte-prosjekt mister gratis-livlinen. Verifisert
25. juli 2026 at det delte prosjektet holdes våkent av **Matplanleggers daglige bruk**,
ikke av potta — Supabase pauser gratisprosjekter etter ~7 dager uten aktivitet, og
ESP32-en står ofte avslått.

---

## Fremtidsideer (ikke bygget)

### Auto-justerende lys (F-C)

VL53L0X på lysbjelken pekende vannrett stolpe-til-stolpe («er bladene i lyshøyde?»)
+ lead screw (T8 + messingmutter, holder posisjon strømløst) drevet av stepper.

- Stolpe A = gjengestang (massiv → kabelen MÅ gå i stolpe B).
- Glatt stålstang 8mm + LM8UU-lager, ikke plast-mot-plast.
- Krøllkabel anbefalt.
- Krever stolpe-ombygging → sen fase.

### Topp-hjerne — vurdert 20. juni, PARKERT

Flytte lys-styringen til en egen ESP32 i toppen? **Nei.** Strømkabel opp trengs
uansett, KY-040 bor i basen, og én hjerne er robustere. Revurder hvis toppen får
stepper eller flere aktuatorer.

### AI-bildeanalyse (F-D, spor 2)

Storage-bilde → Supabase Edge Function (API-nøkkel der, aldri i appen) → vision-LLM
med plantekontekst og stell-instrukser → `potte_analyser`-tabell → «Dagens vurdering»
i appen.

Realistisk ambisjonsnivå: vekst, slapphet, gulning, handlingsråd. **IKKE** presis
diagnose fra 2MP. Kostnad ~5–10 kr/mnd (akseptert). Venter på fase 4b.

⬜ Før dette: ta bildet når vekstlyset er AV (les timer fra `potte_commands`) eller
bruk flash-LED. Magenta-problemet forsvinner uansett med de hvite barene.

### Servo-luke for vannfylling

Knapp → MG90S åpner luke i tank-lokket (Markus heller selv). Senere: pumpe fra dunk
når laseren melder lavt → lukket vann-løkke. Krever oversvømmelses-sikring.

### Småting

- ⬜ Per-plante `hosting_kontinuerlig`-kolonne. I dag utledes kontinuerlig vs.
  engangs-høsting fra en kategori-heuristikk.
- ⬜ Data-retention på `potte_sensor_data` (~105k rader/år/potte). Ikke satt opp,
  uproblematisk første året.
- ⬜ «Leaked password protection» kan skrus på gratis i Supabase-dashbordet
  (Auth → Settings).
