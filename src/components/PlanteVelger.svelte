<script lang="ts">
  import { onMount } from 'svelte';
  import { planter, lysFamilier } from '../lib/stores';
  import { overlayOpened } from '../lib/overlayBack';
  import type { Plante, LysFamilieId, PlanteKategori } from '../lib/database.types';
  import { vurderLysKompatibilitet, vurderVannKompatibilitet, vekeEgnetFarge } from '../lib/lys';

  let {
    plassLabel,
    eksisterendePlanter,
    onLukk,
    onValgt,
  }: {
    /** Visningsnavn for plassen, f.eks. "Potte 1 · foran". */
    plassLabel: string;
    eksisterendePlanter: Plante[];
    onLukk: () => void;
    onValgt: (planteId: string) => void;
  } = $props();

  let sok = $state('');
  let bildeFeilet = $state<Record<string, boolean>>({});
  let kategoriFilter = $state<PlanteKategori | 'alle'>('alle');
  // svelte-ignore state_referenced_locally
  let familieFilter = $state<LysFamilieId | 'alle' | 'kompatible'>(
    eksisterendePlanter.length > 0 ? 'kompatible' : 'alle',
  );

  const kategorier: { id: PlanteKategori | 'alle'; navn: string; emoji: string }[] = [
    { id: 'alle', navn: 'Alle', emoji: '🌿' },
    { id: 'urt', navn: 'Urter', emoji: '🌱' },
    { id: 'salat', navn: 'Salat', emoji: '🥬' },
    { id: 'frukt', navn: 'Frukt', emoji: '🍅' },
    { id: 'gronnsak', navn: 'Grønnsak', emoji: '🥒' },
    { id: 'blomst', navn: 'Blomst', emoji: '🌺' },
    { id: 'mikrogront', navn: 'Mikrogrønt', emoji: '🌾' },
  ];

  // Hvilke familier er kompatible med eksisterende planter?
  const kompatibleFamilier = $derived.by(() => {
    if (eksisterendePlanter.length === 0) return new Set<LysFamilieId>();
    const familier = new Set<LysFamilieId>();
    for (const f of $lysFamilier) {
      const test = [...eksisterendePlanter, { lys_familie: f.id } as Plante];
      const rap = vurderLysKompatibilitet(test);
      if (rap.niva === 'perfekt' || rap.niva === 'god') familier.add(f.id);
    }
    return familier;
  });

  const filtrert = $derived.by(() => {
    let liste = $planter.filter((p) => p.publisert);
    if (kategoriFilter !== 'alle') liste = liste.filter((p) => p.kategori === kategoriFilter);
    if (familieFilter === 'kompatible' && kompatibleFamilier.size > 0) {
      liste = liste.filter((p) => kompatibleFamilier.has(p.lys_familie));
    } else if (familieFilter !== 'alle' && familieFilter !== 'kompatible') {
      liste = liste.filter((p) => p.lys_familie === familieFilter);
    }
    if (sok.trim()) {
      const q = sok.toLowerCase().trim();
      liste = liste.filter(
        (p) =>
          p.navn.toLowerCase().includes(q) ||
          (p.vitenskapelig?.toLowerCase().includes(q) ?? false) ||
          (p.varianter?.some((v) => v.toLowerCase().includes(q)) ?? false),
      );
    }
    return liste;
  });

  // Maskinvare-/nettleser-tilbake lukker velgeren.
  onMount(() => overlayOpened(onLukk));

  function lukk(e?: KeyboardEvent) {
    if (e && e.key !== 'Escape') return;
    onLukk();
  }

  function previewKompatibilitet(p: Plante) {
    const test = [...eksisterendePlanter, p];
    return vurderLysKompatibilitet(test);
  }
</script>

<svelte:window onkeydown={lukk} />

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
  <button
    class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    aria-label="Lukk"
    onclick={onLukk}
  ></button>

  <div class="relative w-full max-w-3xl bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
    <!-- Header -->
    <div class="p-5 border-b border-border flex items-center gap-4">
      <div class="flex-1">
        <h2 class="font-display text-lg font-semibold">Velg plante til {plassLabel}</h2>
        <p class="text-text-muted text-xs mt-0.5">
          {filtrert.length} planter passer dine valg
        </p>
      </div>
      <button class="btn-ghost !px-2 !py-2" onclick={onLukk} aria-label="Lukk">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Filter -->
    <div class="p-5 border-b border-border space-y-3">
      <input
        type="search"
        placeholder="Søk… (f.eks. «basilikum» eller «tomat»)"
        bind:value={sok}
        class="input"
      />

      <!-- Kategorier -->
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

      <!-- Lys-familier -->
      <div class="flex gap-1.5 flex-wrap items-center">
        <span class="text-xs text-text-dim mr-1">Lysbehov:</span>
        {#if eksisterendePlanter.length > 0}
          <button
            class="chip border-border transition-colors {familieFilter === 'kompatible'
              ? 'bg-leaf/15 text-leaf border-leaf/30'
              : 'bg-surface-raised text-text-muted hover:bg-surface-hover'}"
            onclick={() => (familieFilter = 'kompatible')}
          >
            ✓ Kompatible
          </button>
        {/if}
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
    </div>

    <!-- Liste -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-5">
      {#if filtrert.length === 0}
        <div class="text-center py-12 text-text-muted text-sm">
          Ingen planter matcher disse filtrene
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {#each filtrert as p (p.id)}
            {@const komp = eksisterendePlanter.length > 0 ? previewKompatibilitet(p) : null}
            <button
              class="card-raised p-3 text-left hover:bg-surface-hover hover:border-border-strong transition-colors flex items-start gap-3"
              onclick={() => onValgt(p.id)}
            >
              {#if p.bilde_url && !bildeFeilet[p.id]}
                <img
                  src={p.bilde_url}
                  alt={p.navn}
                  loading="lazy"
                  onerror={() => (bildeFeilet[p.id] = true)}
                  class="w-11 h-11 rounded-lg object-cover shrink-0 bg-surface-raised"
                />
              {:else}
                <span class="text-2xl">{p.emoji ?? '🌿'}</span>
              {/if}
              <div class="flex-1 min-w-0">
                <div class="font-medium leading-tight">{p.navn}</div>
                {#if p.vitenskapelig}
                  <div class="text-xs italic text-text-dim mt-0.5 truncate">{p.vitenskapelig}</div>
                {/if}
                <div class="mt-1.5 flex flex-wrap gap-1.5 items-center">
                  <span class="text-[10px] {vekeEgnetFarge(p.veke_egnet)}">
                    {p.veke_egnet === 'utmerket'
                      ? '✓ Veke'
                      : p.veke_egnet === 'bra'
                        ? '✓ Veke OK'
                        : p.veke_egnet === 'forsiktig'
                          ? '⚠ Veke risiko'
                          : '✕ Ikke veke'}
                  </span>
                  {#if p.dli_optimal}
                    <span class="text-[10px] text-text-dim">DLI {p.dli_optimal}</span>
                  {/if}
                  {#if p.dager_til_hosting}
                    <span class="text-[10px] text-text-dim">{p.dager_til_hosting}d</span>
                  {/if}
                  {#if komp && komp.niva !== 'perfekt'}
                    <span
                      class="text-[10px] {komp.niva === 'god'
                        ? 'text-leaf'
                        : komp.niva === 'risikabel'
                          ? 'text-sun'
                          : 'text-rose'}"
                    >
                      {komp.niva === 'god' ? '✓' : komp.niva === 'risikabel' ? '⚠' : '✕'}
                      {komp.niva}
                    </span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
