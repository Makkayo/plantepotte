# 🔴 Go-live-sikkerhet — lås lys-kommandoer før URL-en deles

**Problem:** `potte_commands` har i dag `anon all`-policy. Anon-nøkkelen ligger åpent
i web-appens kildekode (slik må det være — frontend trenger den). Så lenge potta
står på ditt eget nett uten at URL-en er delt, kjenner ingen til den — men **i det
øyeblikket du deler URL-en kan hvem som helst med anon-nøkkelen legge inn kommandoer
→ ESP32 leser dem hvert 5. sek → styrer lysene dine.** Akkurat det du vil unngå.

**Fiksen (minimum):** la ESP32 (anon) fortsatt LESE kommandoer, men lås SKRIVING til
innlogget bruker. Siden bare du har konto er «innlogget» = deg. Dette fjerner
«fremmed styrer potta»-risikoen uten å røre ESP32-firmware.

> ⚠️ **Rekkefølge er kritisk.** Ikke fjern anon-lesing før den nye read-policyen er
> på plass, ellers slutter ESP32 å hente kommandoer. Kjør stegene i rekkefølge, og
> **test mot potte1 før du deler URL-en.**

---

## Steg 1 — se hva som finnes nå

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'potte_commands';
```

Noter navnet på den åpne policyen (den med `cmd = ALL` og `roles = {anon}` eller
`{public}`) — du trenger det i steg 2.

## Steg 2 — bytt «anon all» med split (les vs. skriv)

```sql
-- BYTT UT '<anon_all_policy_navn>' med det faktiske navnet fra steg 1:
drop policy if exists "<anon_all_policy_navn>" on public.potte_commands;

-- ESP32 (anon) skal fortsatt LESE sine kommandoer — lav risiko.
create policy "anon read commands"
  on public.potte_commands
  for select
  to anon
  using (true);

-- Kun innloggede (= du) kan SKRIVE kommandoer. Dette lukker hovedhullet.
create policy "auth write commands"
  on public.potte_commands
  for all
  to authenticated
  using (true)
  with check (true);
```

## Steg 3 — verifiser

- **Web-appen:** logg inn, endre lysinnstilling → skal lagre (du er `authenticated`).
- **ESP32:** skal fortsatt hente kommandoer og reagere på lys av/på innen 5 sek.
- **Fremmed (uten innlogging):** et anon-INSERT mot `potte_commands` skal nå avvises.

Test-INSERT som SKAL feile (kjør i SQL Editor som anon-rolle, eller fra en
uinnlogget klient):

```sql
-- Skal gi «new row violates row-level security policy»
insert into public.potte_commands (potte_id, intensitet, timer_on, timer_off)
values ('potte1', 50, '07:00', '23:00');
```

## Rollback (hvis noe bryter)

```sql
drop policy if exists "anon read commands" on public.potte_commands;
drop policy if exists "auth write commands" on public.potte_commands;
create policy "anon all commands" on public.potte_commands
  for all to anon using (true) with check (true);
```

---

## Senere (ikke nødvendig for go-live)

- **`potte_sensor_data`** har også `anon all`. ESP32 må INSERTe sensordata med
  anon-nøkkelen, så den kan ikke låses like enkelt. Risikoen er lavere (bare falske
  avlesninger, ikke kontroll). Skikkelig fiks = gi ESP32 en egen Supabase-bruker
  (epost/passord i `config.py`, firmware logger inn + henter JWT) og lås INSERT til
  `authenticated`. Gjør dette først hvis sensordata-spamming blir et reelt problem.
- **Owner-scoping** (`owner_id = auth.uid()`) på `potter`/`potte_planter`/
  `potte_commands` hører til multi-user-fasen (fase 6), når familie-deling skrus på.
- **Supabase-dashboard:** skru på «Leaked password protection» (Auth → Settings) —
  gratis HaveIBeenPwned-sjekk ved innlogging. Kan ikke settes via SQL.
```
