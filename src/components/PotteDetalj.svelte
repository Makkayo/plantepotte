<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { potter, pottePlanter, loadPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import type { PotteCommand, PotteSensorData } from '../lib/database.types';
  import SensorPanel from './SensorPanel.svelte';
  import LysKontroll from './LysKontroll.svelte';
  import PlanteSlot from './PlanteSlot.svelte';
  import PlanteVelger from './PlanteVelger.svelte';

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { potteId, onNavigate }: { potteId: string; onNavigate: (v: View) => void } = $props();

  const potte = $derived($potter.find((p) => p.potte_id === potteId));
  const planter = $derived($pottePlanter[potteId] ?? []);

  let command = $state<PotteCommand | null>(null);
  let sensor = $state<PotteSensorData | null>(null);
  let velgerSeksjon = $state<number | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;

  async function refresh() {
    const [cmd, sens] = await Promise.all([
      supabase
        .from('potte_commands')
        .select('*')
        .eq('potte_id', potteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('potte_sensor_data')
        .select('*')
        .eq('potte_id', potteId)
        .order('registrert_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (cmd.data) command = cmd.data;
    if (sens.data) sensor = sens.data;
  }

  onMount(async () => {
    await Promise.all([refresh(), loadPottePlanter(potteId)]);
    timer = setInterval(refresh, 10000);
  });
  onDestroy(() => clearInterval(timer));

  async function fjernPlante(pottePlanteId: string) {
    await supabase.from('potte_planter').delete().eq('id', pottePlanteId);
    await loadPottePlanter(potteId);
  }

  function apneVelger(seksjon: number) {
    velgerSeksjon = seksjon;
  }

  async function planteValgt(planteId: string) {
    if (velgerSeksjon === null) return;
    await supabase.from('potte_planter').upsert(
      {
        potte_id: potteId,
        plante_id: planteId,
        seksjon: velgerSeksjon,
      },
      { onConflict: 'potte_id,seksjon' },
    );
    velgerSeksjon = null;
    await loadPottePlanter(potteId);
  }
</script>

{#if !potte}
  <div class="text-text-muted text-sm">Potte ikke funnet.</div>
{:else}
  <div class="flex flex-col gap-6">
    <!-- Tilbake-knapp + tittel -->
    <div class="flex items-center gap-3">
      <button
        class="btn-ghost !px-2 !py-2 -ml-2"
        onclick={() => onNavigate({ name: 'oversikt' })}
        aria-label="Tilbake"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <span>{potte.emoji ?? '🪴'}</span>
          {potte.navn}
        </h1>
        {#if potte.notater}
          <p class="text-text-muted text-sm mt-0.5">{potte.notater}</p>
        {/if}
      </div>
    </div>

    <!-- Planter i potten -->
    <section class="card p-5">
      <div class="flex items-end justify-between mb-4">
        <div>
          <h2 class="font-semibold text-lg">Planter</h2>
          <p class="text-text-muted text-xs mt-0.5">
            {planter.length} av {potte.antall_seksjoner} seksjoner i bruk
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each Array(potte.antall_seksjoner) as _, idx}
          {@const seksjon = idx + 1}
          {@const eksisterende = planter.find((p) => p.seksjon === seksjon)}
          <PlanteSlot
            {seksjon}
            plante={eksisterende?.plante ?? null}
            pottePlanteId={eksisterende?.id ?? null}
            onLeggTil={() => apneVelger(seksjon)}
            onFjern={(id) => fjernPlante(id)}
          />
        {/each}
      </div>
    </section>

    <!-- Lyskontroll med kompatibilitet -->
    <LysKontroll
      {potteId}
      planter={planter.map((p) => p.plante)}
      {command}
      onLagret={refresh}
    />

    <!-- Sensorer -->
    {#if potte.har_sensorer}
      <SensorPanel {sensor} />
    {/if}
  </div>

  {#if velgerSeksjon !== null}
    <PlanteVelger
      seksjon={velgerSeksjon}
      eksisterendePlanter={planter.map((p) => p.plante)}
      onLukk={() => (velgerSeksjon = null)}
      onValgt={planteValgt}
    />
  {/if}
{/if}
