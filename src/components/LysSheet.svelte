<script lang="ts">
  /**
   * Vekstlys-arket — flyttet ut av gamle LysKontroll og presentert i ark-form
   * (design-handoff juni 2026). Sol-bue + DLI + intensitet/timer + anbefaling +
   * per-plante helsesjekk. Lagrer til potte_commands ved «Ferdig».
   */
  import { supabase } from '../lib/supabase';
  import type { Plante, PotteCommand } from '../lib/database.types';
  import {
    anbefaltInnstilling,
    beregnDli,
    vurderLysKompatibilitet,
    vurderVannKompatibilitet,
  } from '../lib/lys';
  import { visFeil, visOk } from '../lib/toast';
  import SolBue from './viz/SolBue.svelte';

  let {
    potteId,
    planter,
    command,
    now = new Date(),
    onLagret,
  }: {
    potteId: string;
    planter: Plante[];
    command: PotteCommand | null;
    now?: Date;
    onLagret: () => void;
  } = $props();

  let intensitet = $state(70);
  let timer_on = $state('07:00');
  let timer_off = $state('23:00');
  let lagrer = $state(false);

  let lastCommandId = $state<string | null>(null);
  $effect(() => {
    if (command && command.id !== lastCommandId) {
      intensitet = command.intensitet;
      timer_on = command.timer_on;
      timer_off = command.timer_off;
      lastCommandId = command.id;
    }
  });

  const beregnetTimer = $derived.by(() => {
    const [hOn, mOn] = timer_on.split(':').map(Number);
    const [hOff, mOff] = timer_off.split(':').map(Number);
    if (hOn === undefined || mOn === undefined || hOff === undefined || mOff === undefined) return 0;
    let diff = hOff * 60 + mOff - (hOn * 60 + mOn);
    if (diff <= 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  });
  const dliEstimat = $derived(beregnDli(intensitet, beregnetTimer));
  const anbefalt = $derived(anbefaltInnstilling(planter));
  const lysRapport = $derived(vurderLysKompatibilitet(planter));
  const vannRapport = $derived(vurderVannKompatibilitet(planter));
  // Slank advarsel kun ved reelt problem (bevart fra gamle LysKontroll).
  const visAdvarsel = $derived(
    lysRapport.niva === 'risikabel' ||
      lysRapport.niva === 'inkompatibel' ||
      vannRapport.niva !== 'ok',
  );

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

  function brukAnbefaling() {
    intensitet = anbefalt.intensitet;
    timer_on = anbefalt.timer_on;
    timer_off = anbefalt.timer_off;
  }

  async function lagre() {
    lagrer = true;
    const { error } = await supabase.from('potte_commands').upsert(
      { potte_id: potteId, intensitet, timer_on, timer_off, updated_at: new Date().toISOString() },
      { onConflict: 'potte_id' },
    );
    lagrer = false;
    if (error) {
      visFeil('Kunne ikke lagre lysinnstillingen.');
    } else {
      visOk('Lysinnstilling lagret — potta henter innen 5 sek');
      onLagret();
    }
  }

  const statusBadge: Record<string, string> = {
    optimal: 'bg-leaf/[0.12] text-leaf-glow border-leaf/30',
    akseptabel: 'bg-sun/[0.12] text-sun border-sun/30',
    lavt: 'bg-rose/[0.12] text-rose border-rose/30',
    hoyt: 'bg-rose/[0.12] text-rose border-rose/30',
  };
  const statusTekst: Record<string, string> = {
    optimal: 'Bra',
    akseptabel: 'Akseptabelt',
    lavt: 'For lite',
    hoyt: 'For mye',
  };
</script>

<div class="flex items-start justify-between gap-3.5">
  <div>
    <div class="font-display text-[25px] font-semibold leading-[1.05]">Vekstlys</div>
    <div class="font-mono text-[11px] text-text-muted mt-1">Lyslist · {beregnetTimer.toFixed(0)} t lys</div>
  </div>
  <div
    class="inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full bg-leaf/[0.12] border border-leaf/30 font-mono text-[11px] text-leaf-glow whitespace-nowrap"
  >
    {dliEstimat.toFixed(1).replace('.', ',')} DLI
  </div>
</div>

{#if visAdvarsel}
  <div
    class="mt-3 p-2.5 rounded-lg border text-[12px] leading-snug {lysRapport.niva === 'inkompatibel' ||
    vannRapport.niva === 'inkompatibel'
      ? 'border-rose/30 bg-rose/10 text-rose'
      : 'border-sun/30 bg-sun/[0.08] text-sun'}"
  >
    {#if lysRapport.niva === 'risikabel' || lysRapport.niva === 'inkompatibel'}
      <div>⚠ {lysRapport.melding}</div>
    {/if}
    {#if vannRapport.niva !== 'ok'}
      <div class="mt-0.5">💧 {vannRapport.melding}</div>
    {/if}
  </div>
{/if}

<div class="mt-[18px]">
  <SolBue timerOn={timer_on} timerOff={timer_off} {now} />
  <div class="text-center mt-1">
    <div class="font-display text-[46px] font-semibold leading-none">
      {dliEstimat.toFixed(1).replace('.', ',')}
    </div>
    <div class="font-mono text-[10px] text-text-muted mt-0.5">DLI mol/m²</div>
  </div>
</div>
<div class="text-center text-[11px] text-text-dim mt-1.5 mb-4">
  Forhåndsvisning oppdateres mens du justerer
</div>

<div class="flex items-baseline justify-between mb-2">
  <span class="font-mono text-[11px] tracking-[0.08em] text-text-muted">INTENSITET</span>
  <span class="font-display text-lg font-semibold text-leaf">{intensitet}%</span>
</div>
<input type="range" min="0" max="100" bind:value={intensitet} class="w-full" />

<div class="grid grid-cols-2 gap-3 mt-3.5">
  <div>
    <div class="font-mono text-[11px] tracking-[0.08em] text-text-muted mb-1.5">LYS PÅ</div>
    <input type="time" bind:value={timer_on} class="input font-mono" />
  </div>
  <div>
    <div class="font-mono text-[11px] tracking-[0.08em] text-text-muted mb-1.5">LYS AV</div>
    <input type="time" bind:value={timer_off} class="input font-mono" />
  </div>
</div>

{#if planter.length > 0}
  <div
    class="mt-[18px] flex items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-subtle border border-border"
  >
    <div>
      <div class="label mb-0.5">Anbefalt intensitet</div>
      <div class="font-display text-[24px] font-semibold leading-none">{anbefalt.intensitet}%</div>
      <div class="font-mono text-[9.5px] text-text-dim mt-1">Basert på dine planters DLI-behov</div>
    </div>
    <button class="btn-secondary !py-2 text-xs whitespace-nowrap" onclick={brukAnbefaling}>
      Bruk anbefaling
    </button>
  </div>

  <div class="mt-4">
    <div class="label mb-2.5">Plantene med denne innstillingen</div>
    {#each planteHelse as { plante, status, dliOpt } (plante.id)}
      <div class="flex items-center gap-2.5 py-2.5 border-b border-surface-raised">
        <span class="w-[7px] h-[7px] rounded-full bg-leaf shrink-0"></span>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-semibold truncate">{plante.navn}</div>
          <div class="font-mono text-[9.5px] text-text-dim mt-px">DLI opt {dliOpt}</div>
        </div>
        <span
          class="shrink-0 px-2.5 py-[3px] rounded-full text-[11px] font-semibold border {statusBadge[status]}"
        >
          {statusTekst[status]}
        </span>
      </div>
    {/each}
  </div>
{:else}
  <div class="mt-4 text-sm text-text-muted">Legg til planter for å se anbefalte innstillinger.</div>
{/if}

<button class="btn-primary w-full mt-[18px]" onclick={lagre} disabled={lagrer}>
  {lagrer ? 'Lagrer…' : 'Ferdig'}
</button>
