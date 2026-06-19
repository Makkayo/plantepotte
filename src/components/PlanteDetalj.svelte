<script lang="ts">
  import type { Plante } from '../lib/database.types';
  import { lysFamilier } from '../lib/stores';
  import { vekeEgnetTekst, vekeEgnetFarge, vannBehovTekst } from '../lib/lys';

  let { plante, onLukk }: { plante: Plante; onLukk: () => void } = $props();

  const familie = $derived($lysFamilier.find((f) => f.id === plante.lys_familie));
  let bildeFeilet = $state(false);

  function lukk(e?: KeyboardEvent) {
    if (e && e.key !== 'Escape') return;
    onLukk();
  }
</script>

<svelte:window onkeydown={lukk} />

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
  <button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={onLukk} aria-label="Lukk"
  ></button>

  <div
    class="relative w-full max-w-2xl bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
  >
    {#if plante.bilde_url && !bildeFeilet}
      <div class="relative shrink-0">
        <img
          src={plante.bilde_url}
          alt={plante.navn}
          onerror={() => (bildeFeilet = true)}
          class="w-full h-48 sm:h-60 object-cover rounded-t-2xl"
        />
        <button
          class="absolute top-3 right-3 p-2 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors"
          onclick={onLukk}
          aria-label="Lukk"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="p-5 border-b border-border">
        <h2 class="text-xl font-bold leading-tight">{plante.navn}</h2>
        {#if plante.vitenskapelig}
          <p class="text-sm italic text-text-muted mt-0.5">{plante.vitenskapelig}</p>
        {/if}
      </div>
    {:else}
      <div class="p-5 border-b border-border flex items-center gap-4">
        <span class="text-4xl">{plante.emoji ?? '🌿'}</span>
        <div class="flex-1">
          <h2 class="text-xl font-bold leading-tight">{plante.navn}</h2>
          {#if plante.vitenskapelig}
            <p class="text-sm italic text-text-muted mt-0.5">{plante.vitenskapelig}</p>
          {/if}
        </div>
        <button class="btn-ghost !px-2 !py-2" onclick={onLukk} aria-label="Lukk">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-5 space-y-5">
      {#if plante.beskrivelse}
        <p class="text-text leading-relaxed">{plante.beskrivelse}</p>
      {/if}

      <!-- Krav-grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {#if plante.dli_optimal}
          <div class="card-raised p-3">
            <div class="text-xs text-text-muted mb-1">DLI optimal</div>
            <div class="text-xl font-bold">{plante.dli_optimal}</div>
            <div class="text-[10px] text-text-dim">mol/m²/d</div>
            {#if plante.dli_min && plante.dli_maks}
              <div class="text-[10px] text-text-dim mt-0.5">
                ({plante.dli_min}–{plante.dli_maks})
              </div>
            {/if}
          </div>
        {/if}
        {#if plante.timer_optimal}
          <div class="card-raised p-3">
            <div class="text-xs text-text-muted mb-1">Lys-timer</div>
            <div class="text-xl font-bold">{plante.timer_optimal}</div>
            <div class="text-[10px] text-text-dim">timer/dag</div>
          </div>
        {/if}
        {#if plante.intensitet_optimal}
          <div class="card-raised p-3">
            <div class="text-xs text-text-muted mb-1">Intensitet</div>
            <div class="text-xl font-bold">{plante.intensitet_optimal}%</div>
            <div class="text-[10px] text-text-dim">av LED max</div>
          </div>
        {/if}
        {#if plante.dager_til_hosting}
          <div class="card-raised p-3">
            <div class="text-xs text-text-muted mb-1">Til høsting</div>
            <div class="text-xl font-bold">{plante.dager_til_hosting}</div>
            <div class="text-[10px] text-text-dim">dager</div>
          </div>
        {/if}
      </div>

      <!-- Chips -->
      <div class="flex gap-2 flex-wrap">
        {#if familie}
          <span class="chip border-border bg-surface-raised text-text-muted">
            <span>{familie.emoji}</span>
            <span>{familie.navn}</span>
          </span>
        {/if}
        <span class="chip border-border bg-surface-raised text-text-muted">
          💧 {vannBehovTekst(plante.vann_behov)}
        </span>
        <span class="chip border-border bg-surface-raised {vekeEgnetFarge(plante.veke_egnet)}">
          🪴 {vekeEgnetTekst(plante.veke_egnet)}
        </span>
        {#if plante.vanskelighetsgrad}
          <span class="chip border-border bg-surface-raised text-text-muted">
            {plante.vanskelighetsgrad === 'lett'
              ? '🟢 Lett'
              : plante.vanskelighetsgrad === 'middels'
                ? '🟡 Middels'
                : '🔴 Vanskelig'}
          </span>
        {/if}
        {#if plante.hoyde_maks_cm}
          <span class="chip border-border bg-surface-raised text-text-muted">
            📏 Maks {plante.hoyde_maks_cm} cm
          </span>
        {/if}
      </div>

      <!-- Stell-guide: så → stell → høst -->
      {#if plante.sa_instruks || plante.stell_instruks || plante.host_instruks}
        <div>
          <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
            Slik gjør du det
          </h3>
          <div class="space-y-2.5">
            {#if plante.sa_instruks}
              <div class="card-raised p-3 flex gap-3">
                <span class="text-lg shrink-0">🌱</span>
                <div>
                  <div class="text-xs font-semibold text-text-muted mb-0.5">Såing</div>
                  <p class="text-text text-sm leading-relaxed">{plante.sa_instruks}</p>
                </div>
              </div>
            {/if}
            {#if plante.stell_instruks}
              <div class="card-raised p-3 flex gap-3">
                <span class="text-lg shrink-0">✂️</span>
                <div>
                  <div class="text-xs font-semibold text-text-muted mb-0.5">Stell underveis</div>
                  <p class="text-text text-sm leading-relaxed">{plante.stell_instruks}</p>
                </div>
              </div>
            {/if}
            {#if plante.host_instruks}
              <div class="card-raised p-3 flex gap-3">
                <span class="text-lg shrink-0">🧺</span>
                <div>
                  <div class="text-xs font-semibold text-text-muted mb-0.5">Høsting</div>
                  <p class="text-text text-sm leading-relaxed">{plante.host_instruks}</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Tips -->
      {#if plante.dyrking_tips}
        <div>
          <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Dyrking
          </h3>
          <p class="text-text text-sm leading-relaxed">{plante.dyrking_tips}</p>
        </div>
      {/if}

      <!-- Næring -->
      {#if plante.nering_notat}
        <div>
          <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Næring
          </h3>
          <p class="text-text text-sm leading-relaxed">{plante.nering_notat}</p>
        </div>
      {/if}

      <!-- Varianter -->
      {#if plante.varianter && plante.varianter.length > 0}
        <div>
          <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Varianter
          </h3>
          <div class="flex gap-1.5 flex-wrap">
            {#each plante.varianter as v}
              <span class="chip border-border bg-surface-raised text-text-muted">{v}</span>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Kilder -->
      {#if plante.kilder && plante.kilder.length > 0}
        <div>
          <h3 class="text-xs font-semibold text-text-dim uppercase tracking-wider mb-1.5">
            Kilder
          </h3>
          <ul class="text-xs text-text-dim space-y-0.5">
            {#each plante.kilder as k}
              <li>· {k}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if plante.bilde_url && plante.bilde_kilde && !bildeFeilet}
        <p class="text-[11px] text-text-dim pt-1">Bilde: {plante.bilde_kilde}</p>
      {/if}
    </div>
  </div>
</div>
