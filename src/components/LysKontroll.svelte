<script lang="ts">
  import { supabase } from '../lib/supabase';
  import type { Plante, PotteCommand } from '../lib/database.types';
  import {
    anbefaltInnstilling,
    beregnDli,
    vurderLysKompatibilitet,
    vurderVannKompatibilitet,
  } from '../lib/lys';
  import { lysFamilier } from '../lib/stores';

  let {
    potteId,
    planter,
    command,
    onLagret,
  }: {
    potteId: string;
    planter: Plante[];
    command: PotteCommand | null;
    onLagret: () => void;
  } = $props();

  let intensitet = $state(70);
  let timer_on = $state('07:00');
  let timer_off = $state('23:00');
  let lagrer = $state(false);
  let lagretSekund = $state(0);
  let kompromissApplisert = $state(false);

  // Hold lokal state synkronisert når server-data lastes
  let lastCommandId = $state<string | null>(null);
  $effect(() => {
    if (command && command.id !== lastCommandId) {
      intensitet = command.intensitet;
      timer_on = command.timer_on;
      timer_off = command.timer_off;
      lastCommandId = command.id;
    }
  });

  const anbefalt = $derived(anbefaltInnstilling(planter));
  const lysRapport = $derived(vurderLysKompatibilitet(planter));
  const vannRapport = $derived(vurderVannKompatibilitet(planter));

  const beregnetTimer = $derived.by(() => {
    const [hOn, mOn] = timer_on.split(':').map(Number);
    const [hOff, mOff] = timer_off.split(':').map(Number);
    if (
      hOn === undefined ||
      mOn === undefined ||
      hOff === undefined ||
      mOff === undefined
    )
      return 0;
    let start = hOn * 60 + mOn;
    let slutt = hOff * 60 + mOff;
    let diff = slutt - start;
    if (diff <= 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  });

  const dliEstimat = $derived(beregnDli(intensitet, beregnetTimer));

  // Per-plante helsesjekk under nåværende innstilling
  const planteHelse = $derived(
    planter.map((p) => {
      const dliMin = p.dli_min ?? p.dli_optimal ?? 0;
      const dliOpt = p.dli_optimal ?? 0;
      const dliMaks = p.dli_maks ?? p.dli_optimal ?? Infinity;
      let status: 'optimal' | 'akseptabel' | 'lavt' | 'hoyt' = 'optimal';
      if (dliEstimat < dliMin * 0.7) status = 'lavt';
      else if (dliEstimat < dliMin) status = 'akseptabel';
      else if (dliEstimat > dliMaks * 1.3) status = 'hoyt';
      else if (dliEstimat > dliMaks) status = 'akseptabel';
      return { plante: p, status, dliOpt };
    }),
  );

  function applisRanbefalt() {
    intensitet = anbefalt.intensitet;
    timer_on = anbefalt.timer_on;
    timer_off = anbefalt.timer_off;
    kompromissApplisert = true;
  }

  async function lagre() {
    lagrer = true;
    const { error } = await supabase
      .from('potte_commands')
      .upsert(
        {
          potte_id: potteId,
          intensitet,
          timer_on,
          timer_off,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'potte_id' },
      );
    lagrer = false;
    if (!error) {
      lagretSekund = 3;
      const id = setInterval(() => {
        lagretSekund -= 1;
        if (lagretSekund <= 0) clearInterval(id);
      }, 1000);
      onLagret();
    }
  }

  const rapportFarge: Record<string, string> = {
    perfekt: 'border-leaf/30 bg-leaf/8 text-leaf',
    god: 'border-leaf/25 bg-leaf/5 text-leaf',
    risikabel: 'border-sun/30 bg-sun/8 text-sun',
    inkompatibel: 'border-rose/30 bg-rose/10 text-rose',
  };

  const rapportIkon: Record<string, string> = {
    perfekt: '✓',
    god: '✓',
    risikabel: '⚠',
    inkompatibel: '✕',
  };
</script>

<section class="card p-5">
  <div class="flex items-end justify-between mb-4">
    <div>
      <h2 class="font-semibold text-lg">Vekstlys</h2>
      <p class="text-text-muted text-xs mt-0.5">
        DLI ≈ {dliEstimat.toFixed(1)} mol/m²/d · {beregnetTimer.toFixed(1)} timer/dag
      </p>
    </div>
  </div>

  {#if planter.length === 0}
    <div class="text-text-muted text-sm py-4">
      Legg til planter for å se anbefalte lysinnstillinger.
    </div>
  {:else}
    <!-- Kompatibilitets-rapporter -->
    <div class="flex flex-col gap-2 mb-4">
      <div class="rounded-lg border px-3 py-2.5 text-sm {rapportFarge[lysRapport.niva]}">
        <div class="flex items-center gap-2 font-medium">
          <span>{rapportIkon[lysRapport.niva]}</span>
          <span>Lys: {lysRapport.melding}</span>
        </div>
        {#if lysRapport.detaljer.length > 0}
          <ul class="mt-1.5 ml-5 text-xs opacity-90 list-disc space-y-0.5">
            {#each lysRapport.detaljer as d}
              <li>{d}</li>
            {/each}
          </ul>
        {/if}
      </div>
      {#if vannRapport.niva !== 'ok'}
        <div
          class="rounded-lg border px-3 py-2.5 text-sm {vannRapport.niva === 'inkompatibel'
            ? rapportFarge.inkompatibel
            : rapportFarge.risikabel}"
        >
          <div class="flex items-center gap-2 font-medium">
            <span>{vannRapport.niva === 'inkompatibel' ? '✕' : '⚠'}</span>
            <span>Vann: {vannRapport.melding}</span>
          </div>
          {#if vannRapport.detaljer.length > 0}
            <ul class="mt-1.5 ml-5 text-xs opacity-90 list-disc space-y-0.5">
              {#each vannRapport.detaljer as d}
                <li>{d}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Anbefaling -->
    {#if !kompromissApplisert || intensitet !== anbefalt.intensitet || timer_on !== anbefalt.timer_on || timer_off !== anbefalt.timer_off}
      <div
        class="mb-4 p-3 rounded-lg border border-leaf/25 bg-leaf/5 flex items-start gap-3 flex-wrap"
      >
        <div class="flex-1 min-w-0">
          <div class="text-leaf text-sm font-medium">Anbefalt for dine planter</div>
          <div class="text-text-muted text-xs mt-0.5">
            {anbefalt.intensitet}% intensitet · {anbefalt.timer_on}–{anbefalt.timer_off} · DLI {anbefalt.dli.toFixed(
              1,
            )} mol/m²/d
          </div>
        </div>
        <button class="btn-secondary text-xs !py-1.5" onclick={applisRanbefalt}>Bruk anbefaling</button>
      </div>
    {/if}
  {/if}

  <!-- Intensitet -->
  <div class="space-y-4">
    <div>
      <div class="flex items-center justify-between mb-2">
        <label for="intensitet" class="label">Intensitet</label>
        <span class="text-lg font-bold text-leaf tabular-nums">{intensitet}%</span>
      </div>
      <input
        id="intensitet"
        type="range"
        min="0"
        max="100"
        bind:value={intensitet}
        class="w-full"
      />
    </div>

    <!-- Timer -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="on" class="label block mb-1.5">Lys på</label>
        <input id="on" type="time" bind:value={timer_on} class="input" />
      </div>
      <div>
        <label for="off" class="label block mb-1.5">Lys av</label>
        <input id="off" type="time" bind:value={timer_off} class="input" />
      </div>
    </div>

    <!-- Per-plante helsesjekk -->
    {#if planter.length > 0}
      <div class="pt-3 border-t border-border">
        <div class="text-xs text-text-muted mb-2">Hvordan plantene har det med denne innstillingen:</div>
        <div class="space-y-1.5">
          {#each planteHelse as { plante, status, dliOpt } (plante.id)}
            <div class="flex items-center gap-2 text-xs">
              <span class="text-base">{plante.emoji ?? '🌿'}</span>
              <span class="flex-1 truncate">{plante.navn}</span>
              <span class="text-text-dim tabular-nums">DLI opt {dliOpt}</span>
              {#if status === 'optimal'}
                <span class="chip border-leaf/30 bg-leaf/10 text-leaf">Optimalt</span>
              {:else if status === 'akseptabel'}
                <span class="chip border-sun/30 bg-sun/10 text-sun">Akseptabelt</span>
              {:else if status === 'lavt'}
                <span class="chip border-rose/30 bg-rose/10 text-rose">For lite lys</span>
              {:else}
                <span class="chip border-rose/30 bg-rose/10 text-rose">For mye lys</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Lagre -->
    <div class="flex items-center gap-3 pt-2">
      <button class="btn-primary" onclick={lagre} disabled={lagrer}>
        {lagrer ? 'Lagrer…' : 'Lagre'}
      </button>
      {#if lagretSekund > 0}
        <span class="text-sm text-leaf">✓ Lagret — ESP32 henter innen 5 sek</span>
      {/if}
    </div>
  </div>
</section>
