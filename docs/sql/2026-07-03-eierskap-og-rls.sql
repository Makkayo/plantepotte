-- Eierskaps-merking + RLS-komplettering i delt prosjekt (2026-07-03)
-- KJØRT som migrasjon `eierskap_merking_og_rls_komplettering` 3. juli 2026.
-- Arkivert her som fasit; se docs/database-kart.md for hele kartet.
--
-- Prinsipp: prosjektet deles av Plantepotte og Matplanlegger. Hver tabell
-- merkes med eier-app i tabellkommentaren (synlig i dashbordets Table Editor),
-- så det aldri er tvil om hva som hører hjemme hvor. Ingen tabeller omdøpes —
-- begge appene fortsetter uendret.

-- ── [Plantepotte] ──────────────────────────────────────────────────────────
comment on table public.lys_familier      is '[Plantepotte] 5 lys-familier (skygge-tolerante → solhungrige)';
comment on table public.planter           is '[Plantepotte] Plantekatalog (44 arter) — DLI/timer/vann/veke-krav med kilder';
comment on table public.potter            is '[Plantepotte] Blomsterkasser: skillevegger, sensorer, drift-status, vann-kalibrering';
comment on table public.potte_planter     is '[Plantepotte] Plantinger per planteplass (myk-sletting via fjernet_at)';
comment on table public.potte_commands    is '[Plantepotte] Lys-innstillinger som ESP32 poller hvert 5. sek (anon: kun SELECT)';
comment on table public.potte_sensor_data is '[Plantepotte] Sensoravlesninger fra ESP32: jord1-4 (ADC), vann-mm, temp/RH (anon: kun INSERT)';
comment on column public.potte_commands.plantetype is '[UTGATT - Plantepotte v1] Erstattet av potte_planter/planter. Ubrukt av dagens app og firmware.';

-- ── [Matplanlegger] ────────────────────────────────────────────────────────
comment on table public.recipes       is '[Matplanlegger] Oppskrifter';
comment on table public.shopping_list is '[Matplanlegger] Handleliste';
comment on table public.pantry        is '[Matplanlegger] Matvarelager';
comment on table public.price_history is '[Matplanlegger] Prishistorikk';
comment on table public.cooked_log    is '[Matplanlegger] Logg over laget mat';

-- ── [Utgått] ───────────────────────────────────────────────────────────────
comment on table public.planteprofiler is '[UTGATT - Plantepotte v1] Erstattet av lys_familier + planter. Kun arkivert v1-app (docs/legacy/index-v1.html) leser denne. Kandidat for sletting.';

-- ── RLS-komplettering: Matplanlegger-tabellene som manglet RLS ─────────────
-- Policyene bevarer NØYAKTIG dagens åpne oppførsel (RLS av = alt tillatt for
-- alle), så Matplanlegger-appen påvirkes ikke. Gevinsten er at tilgangen nå er
-- et dokumentert VALG (ERROR-lintene forsvinner) i stedet for en glemsel.
-- Stramming à la plantepotte gjøres når Matplanleggers skriveflyt (innlogget
-- vs. anonym) er kartlagt — recipes-policyene tyder på anonym skriving i dag.
alter table public.shopping_list enable row level security;
alter table public.pantry        enable row level security;
alter table public.price_history enable row level security;
alter table public.cooked_log    enable row level security;

create policy "apen tilgang (bevart oppforsel - stram ved innlogging)"
  on public.shopping_list for all using (true) with check (true);
create policy "apen tilgang (bevart oppforsel - stram ved innlogging)"
  on public.pantry for all using (true) with check (true);
create policy "apen tilgang (bevart oppforsel - stram ved innlogging)"
  on public.price_history for all using (true) with check (true);
create policy "apen tilgang (bevart oppforsel - stram ved innlogging)"
  on public.cooked_log for all using (true) with check (true);

-- Rollback (om Matplanlegger mot formodning skulle hikke):
--   drop policy "apen tilgang (bevart oppforsel - stram ved innlogging)" on public.<tabell>;
--   alter table public.<tabell> disable row level security;
