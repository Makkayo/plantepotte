# Plantepotte — ESP32-CAM (kamera)

Eget kort som tar bilder av plantene og laster dem opp til Supabase Storage.
Programmeres i **Arduino IDE** (ikke MicroPython — kamerastøtten er best i Arduino).

## Før første opplasting: lag bucket i Supabase

ESP32-CAM laster opp til en Storage-bucket. Lag den én gang:

**Enklest (dashboard):** Supabase → *Storage* → *New bucket* → navn `plantebilder`,
huk av **Public bucket** → *Create*. Deretter *Policies* → la `anon` få **INSERT**.

**Eller med SQL** (Supabase → *SQL Editor*):

```sql
-- 1) bucket (public lese, så web-appen kan vise bildene)
insert into storage.buckets (id, name, public)
values ('plantebilder', 'plantebilder', true)
on conflict (id) do nothing;

-- 2) la ESP32-CAM (anon-nøkkel) laste opp
create policy "anon upload plantebilder"
on storage.objects for insert to anon
with check (bucket_id = 'plantebilder');
```

## Arduino IDE-oppsett

1. *File → Preferences →* legg til ESP32 board-URL, installer **esp32 by Espressif** i Boards Manager.
2. *Tools → Board →* **AI Thinker ESP32-CAM**.
3. *Tools → Partition Scheme →* **Huge APP (3MB No OTA/1MB SPIFFS)**.
4. Åpne `esp32cam.ino`, **endre WiFi-navn og passord** øverst.
5. Koble til via ESP32-CAM-MB-bordet (USB) eller en USB-TTL-adapter, last opp.

## Slik virker den

- Våkner, tar ett bilde, laster opp som `plantebilder/potte1/ÅÅÅÅMMDD-TTMMSS.jpg`,
  og går i **deep sleep** i `CAPTURE_INTERVAL_MIN` minutter (standard 60).
- Bruker 5 V + GND fra buck converter (samme som hoved-ESP32). Ingen datakabel
  mellom kortene — alt går via WiFi/skyen.

## Notater

- Filnavnet bruker internett-tid (NTP). Får den ikke tid, brukes et `boot-…`-navn.
- `setInsecure()` brukes for enkel TLS (ingen sertifikat-sjekk) — greit for dette
  hjemmeprosjektet, men ikke «banksikkert».
- Vil du ha bilder oftere/sjeldnere: endre `CAPTURE_INTERVAL_MIN`.
- Neste steg i web-appen: en komponent som henter fra `plantebilder`-bucketen og
  viser dem kronologisk (vekst-tidslinje).
