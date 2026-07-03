-- RLS-stramming for plantepotte-tabellene (2026-07-03)
-- ====================================================
-- Bakgrunn (verifisert med Supabase security advisor 3. juli 2026):
--   potte_commands og potte_sensor_data hadde policyen «anon all» — ALL
--   operasjoner med USING(true)/WITH CHECK(true) for alle roller. Anon-nøkkelen
--   ligger i den offentlige JS-bundelen på plantepotte.pages.dev, så i praksis
--   kunne hvem som helst på internett styre lyset og skrive/slette sensordata.
--
-- Prinsipp: minste privilegium rundt det ESP32-en FAKTISK gjør med anon-nøkkelen:
--   * potte_sensor_data: ESP32 poster avlesninger  -> anon får KUN INSERT
--   * potte_commands:    ESP32 leser lysplanen     -> anon får KUN SELECT
--   Alt annet (lese sensordata, skrive kommandoer, slette) krever innlogget
--   bruker — appen er alltid innlogget, så ingenting endres i app-flyten.
--
-- Kjøres i Supabase SQL-editoren (eller via MCP apply_migration). Ingen
-- nedetid: ESP32-ens insert/select fortsetter å virke gjennom hele kjøringen.
-- NB: Matplanlegger-tabellene (shopping_list, pantry, price_history,
-- cooked_log — RLS helt AV) er bevisst IKKE rørt her; de er Matplanleggers
-- egen opprydding og må sjekkes mot dens skriveflyt.

-- ── potte_commands: anon leser, kun innlogget skriver ──────────────────────
drop policy if exists "anon all" on public.potte_commands;

-- (ESP32 + evt. uinnlogget app-last leser lysplanen)
create policy "anon les kommandoer"
  on public.potte_commands for select
  using (true);

create policy "auth sett inn kommandoer"
  on public.potte_commands for insert
  to authenticated
  with check (true);

create policy "auth oppdater kommandoer"
  on public.potte_commands for update
  to authenticated
  using (true) with check (true);

create policy "auth slett kommandoer"
  on public.potte_commands for delete
  to authenticated
  using (true);

-- ── potte_sensor_data: anon poster, kun innlogget leser/sletter ────────────
drop policy if exists "anon all" on public.potte_sensor_data;

-- (ESP32 poster avlesninger — trenger verken lese eller slette)
create policy "anon post sensordata"
  on public.potte_sensor_data for insert
  with check (true);

create policy "auth les sensordata"
  on public.potte_sensor_data for select
  to authenticated
  using (true);

create policy "auth slett sensordata"
  on public.potte_sensor_data for delete
  to authenticated
  using (true);

-- ── Verifisering etter kjøring ──────────────────────────────────────────────
-- 1) Supabase advisor (security) skal ikke lenger vise «rls_policy_always_true»
--    for potte_commands/potte_sensor_data med rolle «-».
-- 2) ESP32: neste «Sensordata sendt.» i seriell logg = insert virker fortsatt.
-- 3) Appen: endre lysstyrke -> «potta henter innen 5 sek» = auth-skriving virker.
-- 4) Negativ test (valgfri): curl med kun anon-nøkkel mot
--    /rest/v1/potte_commands med PATCH skal nå få 401/403.
