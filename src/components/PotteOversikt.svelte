<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
    const [cmd, sens] = await Promise.all([
      supabase.from('potte_commands').select('*'),
      supabase
        .from('potte_sensor_data')
        .select('*')
        .order('registrert_at', { ascending: false })
        .limit(50),
    ]);

    if (cmd.data) {
      const m: Record<string, PotteCommand> = {};
      for (const c of cmd.data) m[c.potte_id] = c;
      commands = m;
    }
    if (sens.data) {
      // Behold kun nyeste per potte
      const m: Record<string, PotteSensorData> = {};
      for (const s of sens.data) {
        if (!m[s.potte_id]) m[s.potte_id] = s;
      }
      sensors = m;
    }
  }

  onMount(async () => {
    await Promise.all([refresh(), loadAllPottePlanter()]);
    timer = setInterval(refresh, 10000);
  });
  onDestroy(() => clearInterval(timer));
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-end justify-between">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Mine potter</h1>
      <p class="text-text-muted text-sm mt-1">Oversikt over alle potter og deres status</p>
    </div>
  </div>

  {#if $potter.length === 0}
    <div class="card p-10 text-center text-text-muted">
      <div class="text-3xl mb-3">🪴</div>
      <p>Ingen potter registrert ennå</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      {#each $potter as p (p.id)}
        <PotteKort
          potte={p}
          command={commands[p.potte_id]}
          sensor={sensors[p.potte_id]}
          planter={$pottePlanter[p.potte_id] ?? []}
          onClick={() => onNavigate({ name: 'potte', potteId: p.potte_id })}
        />
      {/each}
    </div>
  {/if}
</div>
