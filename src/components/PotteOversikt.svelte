<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { potter, pottePlanter, loadAllPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import {
    vannNivaProsent,
    jordfuktProsent,
    minutterSiden,
    OFFLINE_GRENSE_MIN,
    TORR_GRENSE,
  } from '../lib/utils';
  import type { PotteCommand, PotteSensorData } from '../lib/database.types';
  import PotteKort from './PotteKort.svelte';
  import Sheet from './Sheet.svelte';
  import KasseInnstillinger from './KasseInnstillinger.svelte';

  let visNy = $state(false);

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { onNavigate }: { onNavigate: (v: View) => void } = $props();

  let commands = $state<Record<string, PotteCommand>>({});
  let sensors = $state<Record<string, PotteSensorData>>({});
  let now = $state(new Date()); // driver sol-buen i kortene
  let timer: ReturnType<typeof setInterval> | undefined;

  async function refresh() {
    now = new Date();
    // Nyeste avlesning hentes PER potte (limit 1 hver). En felles
    // «siste 50 rader»-spørring ville latt en aktiv potte skvise en
    // offline potte helt ut av lista etter noen timer — da så det ut som
    // den aldri hadde sendt data, akkurat når man trenger å se at noe er galt.
    const potteListe = get(potter);
    const [cmd, sensSvar] = await Promise.all([
      supabase.from('potte_commands').select('*'),
      Promise.all(
        potteListe.map((p) =>
          supabase
            .from('potte_sensor_data')
            .select('*')
            .eq('potte_id', p.potte_id)
            .order('registrert_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ),
      ),
    ]);

    if (cmd.data) {
      const m: Record<string, PotteCommand> = {};
      for (const c of cmd.data) m[c.potte_id] = c;
      commands = m;
    }
    const m: Record<string, PotteSensorData> = {};
    sensSvar.forEach((res, idx) => {
      if (res.data) m[potteListe[idx]!.potte_id] = res.data;
    });
    sensors = m;
  }

  onMount(async () => {
    await Promise.all([refresh(), loadAllPottePlanter()]);
    timer = setInterval(refresh, 10000);
  });
  onDestroy(() => clearInterval(timer));

  // Én advarsel per kasse (mest alvorlige): frakoblet → lavt vann → tørr jord.
  const varsler = $derived.by(() => {
    const ut: { potteId: string; navn: string; melding: string; alvor: 'hoy' | 'mid' }[] = [];
    for (const p of $potter) {
      if (!p.har_sensorer) continue;
      const s = sensors[p.potte_id];
      const min = minutterSiden(s?.registrert_at);
      if (min !== null && min > OFFLINE_GRENSE_MIN) {
        ut.push({ potteId: p.potte_id, navn: p.navn, melding: 'Frakoblet — sjekk strøm og WiFi', alvor: 'mid' });
        continue;
      }
      if (!s) continue;
      const vann = vannNivaProsent(
        s.vann_avstand_mm,
        p.vann_tom_mm ?? undefined,
        p.vann_full_mm ?? undefined,
      );
      if (vann !== null && vann < 20) {
        ut.push({ potteId: p.potte_id, navn: p.navn, melding: `Vann lavt (${vann} %) — fyll snart`, alvor: 'hoy' });
        continue;
      }
      const jord = [s.jord1, s.jord2, s.jord3, s.jord4]
        .map((r) => jordfuktProsent(r))
        .filter((x): x is number => x !== null);
      if (jord.length && Math.min(...jord) < TORR_GRENSE) {
        ut.push({ potteId: p.potte_id, navn: p.navn, melding: 'Jord tørr — trenger vann', alvor: 'hoy' });
      }
    }
    return ut;
  });
</script>

<div class="max-w-[430px] md:max-w-4xl mx-auto w-full flex flex-col gap-3.5">
  <div class="mb-1">
    <h1 class="font-display text-[25px] font-semibold leading-tight tracking-tight">Mine blomsterkasser</h1>
    <p class="font-mono text-[11px] text-text-muted mt-1.5">
      {$potter.length} {$potter.length === 1 ? 'blomsterkasse' : 'blomsterkasser'}
    </p>
  </div>

  <!-- Advarsler (kun i appen — ingen telefon-varsler) -->
  {#if varsler.length > 0}
    <div class="flex flex-col gap-2">
      {#each varsler as v (v.potteId + v.melding)}
        <button
          class="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-xl border transition-all hover:brightness-110 {v.alvor ===
          'hoy'
            ? 'bg-rose/[0.12] border-rose/35'
            : 'bg-sun/[0.12] border-sun/35'}"
          onclick={() => onNavigate({ name: 'potte', potteId: v.potteId })}
        >
          <span class="text-base leading-none">{v.alvor === 'hoy' ? '💧' : '⚠️'}</span>
          <span class="flex-1 text-sm leading-snug">
            <span class="font-semibold">{v.navn}:</span>
            <span class="text-text-muted">{v.melding}</span>
          </span>
          <span class="text-text-dim text-lg leading-none" aria-hidden="true">›</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if $potter.length === 0}
    <div class="card p-10 text-center text-text-muted">
      <div class="text-3xl mb-3">🪴</div>
      <p>Ingen blomsterkasser registrert ennå</p>
    </div>
  {:else}
    <!-- Mobil: én kolonne (uendret). Desktop: kortene i et 2-kolonners grid så
         den brede skjermen faktisk brukes i stedet for døde sidemarger. -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
      {#each $potter as p (p.id)}
        <PotteKort
          potte={p}
          command={commands[p.potte_id]}
          sensor={sensors[p.potte_id]}
          planter={$pottePlanter[p.potte_id] ?? []}
          {now}
          onClick={() => onNavigate({ name: 'potte', potteId: p.potte_id })}
        />
      {/each}
    </div>
  {/if}

  <button
    class="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl border border-dashed border-border-strong text-text-muted hover:text-text hover:bg-surface-raised/40 transition-colors"
    onclick={() => (visNy = true)}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    <span class="text-sm font-medium">Legg til blomsterkasse</span>
  </button>
</div>

<Sheet open={visNy} onClose={() => (visNy = false)}>
  {#if visNy}
    <KasseInnstillinger kasse={null} onLukk={() => (visNy = false)} onLagret={() => {}} />
  {/if}
</Sheet>
