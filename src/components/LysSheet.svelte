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
  import { lysVarighetTimer } from '../lib/tid';
  import { lysEnergi } from '../lib/energi';
  import { strompris, settStrompris } from '../lib/settings';
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

  const beregnetTimer = $derived(Math.round(lysVarighetTimer(timer_on, timer_off) * 10) / 10);
  const dliEstimat = $derived(beregnDli(intensitet, beregnetTimer));
  const energi = $derived(lysEnergi(intensitet, beregnetTimer, $strompris));

  // Redigerbar strømpris (kr/kWh) — lagres lokalt via settings-store.
  let redigererPris = $state(false);
  let prisUtkast = $state('');
  let prisInput = $state<HTMLInputElement>();
  function apneprisRediger() {
    prisUtkast = $strompris.toString().replace('.', ',');
    redigererPris = true;
  }
  // Fokuser + marker feltet når editoren åpnes (så tastaturet spretter på mobil).
  $effect(() => {
    if (redigererPris && prisInput) {
      prisInput.focus();
      prisInput.select();
    }
  });
  function lagrePris() {
    if (settStrompris(prisUtkast)) {
      visOk('Strømpris oppdatert');
      redigererPris = false; // lukk kun ved gyldig lagring — ellers står feltet åpent
    } else {
      visFeil('Ugyldig pris — skriv f.eks. 1,50');
    }
  }
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
    // Tomt time-felt (bruker slettet innholdet) ville lagret "" → firmware
    // tolker det som «ingen lystid» og lyset blir bare stående av uten forklaring.
    if (!timer_on || !timer_off) {
      visFeil('Sett både «Lys på» og «Lys av» før du lagrer.');
      return;
    }
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
<div class="relative">
  <input
    type="range"
    min="0"
    max="100"
    bind:value={intensitet}
    class="slider-lys w-full relative z-10"
    style="--pct: {intensitet}%"
    aria-label="Lysintensitet i prosent"
  />
  {#if planter.length > 0}
    <!-- Markør for anbefalt intensitet — se ditt valg mot fasiten på ett blikk. -->
    <div
      class="absolute inset-y-0 flex items-center pointer-events-none"
      style="left: {anbefalt.intensitet}%; transform: translateX(-50%)"
      aria-hidden="true"
    >
      <div class="w-[3px] h-3.5 rounded-full bg-sun/80 ring-1 ring-bg"></div>
    </div>
  {/if}
</div>
<div class="flex justify-between font-mono text-[10px] text-text-dim mt-1 px-0.5">
  <span>Svak</span>
  {#if planter.length > 0}
    <span class="text-sun/90">▲ anbefalt {anbefalt.intensitet}%</span>
  {/if}
  <span>Sterk</span>
</div>

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

<!-- Strømoverslag, grunnet i målt LED-effekt (0,94 A × 12 V). Ærlig estimat.
     Prisen er redigerbar (lagres lokalt) fordi norsk spot + nettleie svinger. -->
<div class="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 font-mono text-[10.5px] text-text-dim">
  <span>⚡ ≈ {energi.kwhPerManed.toFixed(1).replace('.', ',')} kWh/mnd · ~{energi.krPerManed} kr/mnd</span>
  {#if redigererPris}
    <span class="inline-flex items-center gap-1.5">
      <input
        type="text"
        inputmode="decimal"
        bind:this={prisInput}
        bind:value={prisUtkast}
        onkeydown={(e) => {
          if (e.key === 'Enter') lagrePris();
          if (e.key === 'Escape') redigererPris = false;
        }}
        class="w-14 px-2 py-1 bg-bg-subtle border border-leaf/40 rounded text-text text-center focus:outline-none focus:ring-2 focus:ring-leaf/20"
        aria-label="Strømpris i kroner per kWh"
      />
      <span class="text-text-dim">kr/kWh</span>
      <button
        class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-leaf/15 text-leaf hover:bg-leaf/25 transition-colors"
        onclick={lagrePris}
        aria-label="Lagre pris"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </button>
    </span>
  {:else}
    <button
      class="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-text-muted hover:text-text hover:border-border-strong transition-colors"
      onclick={apneprisRediger}
      aria-label="Endre strømpris"
    >
      {$strompris.toFixed(2).replace('.', ',')} kr/kWh
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
    </button>
  {/if}
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
