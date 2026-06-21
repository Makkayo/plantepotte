<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { potter, pottePlanter, loadAllPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import type { PotteCommand, PotteSensorData } from '../lib/database.types';
  import PotteKort from './PotteKort.svelte';

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { onNavigate }: { onNavigate: (v: View) => void } = $props();

  let commands = $state<Record<string, PotteCommand>>({});
  let sensors = $state<Record<string, PotteSensorData>>({});
  let timer: ReturnType<typeof setInterval> | undefined;

  async function refresh() {
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
</script>

<div class="max-w-[430px] mx-auto w-full flex flex-col gap-3.5">
  <div class="mb-1">
    <h1 class="font-display text-[25px] font-semibold leading-tight tracking-tight">Mine blomsterkasser</h1>
    <p class="font-mono text-[11px] text-text-muted mt-1.5">
      {$potter.length} {$potter.length === 1 ? 'blomsterkasse' : 'blomsterkasser'}
    </p>
  </div>

  {#if $potter.length === 0}
    <div class="card p-10 text-center text-text-muted">
      <div class="text-3xl mb-3">🪴</div>
      <p>Ingen blomsterkasser registrert ennå</p>
    </div>
  {:else}
    {#each $potter as p (p.id)}
      <PotteKort
        potte={p}
        command={commands[p.potte_id]}
        sensor={sensors[p.potte_id]}
        planter={$pottePlanter[p.potte_id] ?? []}
        onClick={() => onNavigate({ name: 'potte', potteId: p.potte_id })}
      />
    {/each}
  {/if}
</div>
