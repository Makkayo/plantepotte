<script lang="ts">
  import { planter, lysFamilier } from '../lib/stores';
  import type { LysFamilieId, PlanteKategori, Plante } from '../lib/database.types';
  import PlanteDetalj from './PlanteDetalj.svelte';

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { onNavigate }: { onNavigate: (v: View) => void } = $props();

  let sok = $state('');
  let kategoriFilter = $state<PlanteKategori | 'alle'>('alle');
  let familieFilter = $state<LysFamilieId | 'alle'>('alle');
  let aktivPlante = $state<Plante | null>(null);

  const kategorier: { id: PlanteKategori | 'alle'; navn: string; emoji: string }[] = [
    { id: 'alle', navn: 'Alle', emoji: '🌿' },
    { id: 'urt', navn: 'Urter', emoji: '🌱' },
    { id: 'salat', navn: 'Salat', emoji: '🥬' },
    { id: 'frukt', navn: 'Frukt', emoji: '🍅' },
    { id: 'gronnsak', navn: 'Grønnsak', emoji: '🥒' },
    { id: 'blomst', navn: 'Blomst', emoji: '🌺' },
    { id: 'mikrogront', navn: 'Mikrogrønt', emoji: '🌾' },
  ];

  const filtrert = $derived.by(() => {
    let liste = $planter.filter((p) => p.publisert);
    if (kategoriFilter !== 'alle') liste = liste.filter((p) => p.kategori === kategoriFilter);
    if (familieFilter !== 'alle') liste = liste.filter((p) => p.lys_familie === familieFilter);
    if (sok.trim()) {
      const q = sok.toLowerCase().trim();
      liste = liste.filter(
        (p) =>
          p.navn.toLowerCase().includes(q) ||
          (p.vitenskapelig?.toLowerCase().includes(q) ?? false) ||
          (p.beskrivelse?.toLowerCase().includes(q) ?? false),
      );
    }
    return liste;
  });
</script>

<div class="flex flex-col gap-6">
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Plantekatalog</h1>
    <p class="text-text-muted text-sm mt-1">
      {$planter.length} planter med dokumenterte krav fra forskning og dyrkingsguider
    </p>
  </div>

  <!-- Filter -->
  <div class="card p-4 space-y-3">
    <input
      type="search"
      placeholder="Søk i navn, vitenskapelig navn eller beskrivelse…"
      bind:value={sok}
      class="input"
    />

    <div class="flex gap-1.5 flex-wrap">
      {#each kategorier as k}
        <button
          class="chip border-border transition-colors {kategoriFilter === k.id
            ? 'bg-leaf/15 text-leaf border-leaf/30'
            : 'bg-surface-raised text-text-muted hover:bg-surface-hover'}"
          onclick={() => (kategoriFilter = k.id)}
        >
          <span>{k.emoji}</span>
          <span>{k.navn}</span>
        </button>
      {/each}
    </div>

    <div class="flex gap-1.5 flex-wrap items-center">
      <span class="text-xs text-text-dim mr-1">Lysbehov:</span>
      <button
        class="chip border-border transition-colors {familieFilter === 'alle'
          ? 'bg-surface-hover text-text border-border-strong'
          : 'bg-surface-raised text-text-muted hover:bg-surface-hover'}"
        onclick={() => (familieFilter = 'alle')}
      >
        Alle
      </button>
      {#each $lysFamilier as f (f.id)}
        <button
          class="chip border-border transition-colors {familieFilter === f.id
            ? 'bg-surface-hover text-text border-border-strong'
            : 'bg-surface-raised text-text-muted hover:bg-surface-hover'}"
          onclick={() => (familieFilter = f.id)}
        >
          <span>{f.emoji}</span>
          <span>{f.navn.split(' ')[0]}</span>
        </button>
      {/each}
    </div>

    <div class="text-xs text-text-dim pt-1">{filtrert.length} planter</div>
  </div>

  <!-- Liste -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {#each filtrert as p (p.id)}
      <button
        class="card p-4 text-left hover:border-border-strong hover:bg-surface-hover transition-colors flex items-start gap-3"
        onclick={() => (aktivPlante = p)}
      >
        <span class="text-3xl">{p.emoji ?? '🌿'}</span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold leading-tight">{p.navn}</div>
          {#if p.vitenskapelig}
            <div class="text-xs italic text-text-dim mt-0.5 truncate">{p.vitenskapelig}</div>
          {/if}
          {#if p.beskrivelse}
            <p class="text-xs text-text-muted mt-2 line-clamp-2">{p.beskrivelse}</p>
          {/if}
          <div class="mt-2 flex gap-1.5 flex-wrap">
            {#if p.dli_optimal}
              <span class="chip border-border bg-surface-raised text-text-dim">
                DLI {p.dli_optimal}
              </span>
            {/if}
            {#if p.timer_optimal}
              <span class="chip border-border bg-surface-raised text-text-dim">
                {p.timer_optimal}t
              </span>
            {/if}
          </div>
        </div>
      </button>
    {/each}
  </div>

  {#if filtrert.length === 0}
    <div class="text-center py-12 text-text-muted text-sm">Ingen treff</div>
  {/if}
</div>

{#if aktivPlante}
  <PlanteDetalj plante={aktivPlante} onLukk={() => (aktivPlante = null)} />
{/if}
