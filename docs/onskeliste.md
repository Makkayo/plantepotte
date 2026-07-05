# Ønskeliste — fremtidige kjøp

Ting vi har funnet ut at Markus **bør eller vil ha**, men som ikke er bestilt ennå.
Når noe bestilles → flyttes til `mottaksliste.md`. Når det ankommer → inn i `lager.md`.

**Prioritet:** 🔴 trengs snart · 🟡 fint å ha · 🟢 nice-to-have / framtid

*Sist oppdatert: 2026-07-05*

---

## 🎮 Lek & sideprosjekter (pultlys m.m.)

| Pri | Del | Hvorfor | Ca. pris |
|:---:|-----|---------|---------|
| 🟡 | **USB-lader 5V 2A+** | Pultlyset er strøm-sultet på 1A-laderen → kapper lysstyrken på full hvit. 2A låser opp full effekt. (Sjekk om en telefon-/nettbrett-lader eller powerbank hjemme allerede gir 2A) | hjemme? / ~50 kr |
| 🟢 | **USB inline switch-kabel** | Ekte av/på-bryter på pultlyset uten å plugge ut. (Knapp-trykket gir myk av i dag — holder egentlig.) Barrel-bryterne fra B2 passer IKKE USB | ~€2 |
| 🟢 | **Tettere/lengre WS2812B-stripe** | Hvis han vil ha *skikkelig* mye arbeidslys — 30 LED/1m er beskjedent. Eget lite oppgraderingsprosjekt | ~€5–10 |

## 🧠 Kort & reserve

| Pri | Del | Hvorfor | Ca. pris |
|:---:|-----|---------|---------|
| 🟡 | **ESP32 DevKit — 30-pin, WROOM-32D, Type-C, CP2102** (samme type som eksisterende) | Trenger flere generelt (potte 2 + lek + reserve). ⚠️ **Velg variant «30S Type-C»** = plain 30-pin, PCB-antenne (= B1-kortet). IKKE «32U … KIT A» (38-pin + ekstern IPEX-antenne) og IKKE «32D … KIT A» (38-pin + skrueklemme-breakout) — 38-pin har annen footprint/pinout enn 30-pin → bryter identisk potte 1/2. Kjennetegn på riktig: ingen antenneledning i bildet, 15 pinner/side, ingen ekstra D2/D3/CMD nederst, uten KIT. (38-pin+KIT er OK til ren lek.) (På denne listinga var multipakke **dyrere** per stk, ikke billigere → kjøp 1 om gangen.) **Status 5. juli:** 1× «32D Type-C KIT A» (38-pin, Choice/gratis frakt, NEVER GIVE UP Store) i handlekurv — bevisst valgt til **lek/reserve** (30-pin-anbefalingen gjelder fortsatt for potte-hjerner) | ~70 kr/stk |

## 🔧 Verktøy

*(ingen åpne verktøy-ønsker — Markus håndterer verktøy-kjøp selv)*

## 🌱 Plantepotte (hardware)

**Lys-oppgradering (24V hvite Samsung-barer) — planlagt kurv, IKKE bestilt (per 5. juli 2026).** Uavhengig gjennomgått og verifisert sunn/riktig 5. juli (se «Vekstlys» i skill-en). ⚠️ Ikke betalt — Markus sjekker ut selv.

| Pri | Del | Hvorfor | Ca. pris |
|:---:|-----|---------|---------|
| 🟡 | **2× Samsung LM281B+ 24V 25W alu-bar (500mm)** | Erstatter svak magenta 12V-strip → ~10× lys, hvit fikser kamera-magenta. Konstant-spenning (plugg rett i 24V) | 141,69 kr |
| 🟡 | **24V 5A adapter (EU, CE)** | Én skinne til bar+buck; dimensjonert for 2 potter. Velg god kvalitet (24/7 nær vann) | 147,15 kr |
| 🟡 | **FR120N MOSFET-modul (100V, opto-isolert)** | Bytter LR7843 (30V for tett på 24V). Samme modul-type du alt bruker | 4,05 kr |
| 🟡 | **24V→5V buck 2-pk (synkron, ≥1,5 A)** | Ny 5V-kilde (gammel buck er 12V-inn, tåler ikke 24V) | 16,31 kr |
| 🟢 | **M3 standoff-sett** | Bar-montering m/luftspalte + perfboard. 250-boks er lager-bygging — mindre/billigere sett holder | ~74 kr (billigere finnes) |

> Kurven er **komplett for lys-oppgraderingen** — alt annet (silikonledning, Wago, 3A/5A slow-blow-sikring, barrel-jack pigtail, inline-switch, heat shrink, heat-set inserts) eies. Eneste gjenstående *arbeid*: re-designe lysbjelken i 3D for to stive barer (fase 3), + sjekk om baren har separat rød-inngang.

## 🪴 Dyrking (jord/frø/utstyr)

| Pri | Del | Hvorfor | Ca. pris |
|:---:|-----|---------|---------|
| 🟢 | **pH-strips / pH-måler** | Kokos-systemer går best ~5,8–6,2. Klarer seg uten i starten, gir kontroll senere | ~50–150 kr |
| 🟢 | **EC/TDS-måler** | Måler næringskonsentrasjonen i vannbadet. Avansert finjustering | ~100–200 kr |

> Se [`handleliste-dyrking.md`](handleliste-dyrking.md) for hva som skal kjøpes nå (jord, frø, næring, perlite, spray).

---

> Legg til nye linjer her etter hvert som vi finner ut hva som trengs.
