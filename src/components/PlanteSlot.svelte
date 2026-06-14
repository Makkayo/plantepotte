<script lang="ts">
  import type { Plante } from '../lib/database.types';
  import { vekeEgnetFarge } from '../lib/lys';

  let {
    etikett,
    plante,
    pottePlanteId,
    onLeggTil,
    onFjern,
  }: {
    /** Rolle-tekst i potta: "Foran" / "Bak" / "" (udelt potte). */
    etikett: string;
    plante: Plante | null;
    pottePlanteId: string | null;
    onLeggTil: () => void;
    onFjern: (id: string) => void;
  } = $props();

  let bekreftFjern = $state(false);
</script>

{#if plante && pottePlanteId}
  <div class="card-raised p-4 relative group">
    {#if etikett}
      <div class="text-[10px] uppercase tracking-wider text-text-dim mb-2">{etikett}</div>
    {/if}
    <div class="flex items-start gap-3">
      <span class="text-3xl">{plante.emoji ?? '🌿'}</span>
      <div class="flex-1 min-w-0">
        <div class="font-semibold leading-tight">{plante.navn}</div>
        {#if plante.vitenskapelig}
          <div class="text-xs italic text-text-dim mt-0.5">{plante.vitenskapelig}</div>
        {/if}
        <div class="text-xs mt-2 {vekeEgnetFarge(plante.veke_egnet)}">
          {#if plante.veke_egnet === 'utmerket'}
            ✓ Trives i veke-potte
          {:else if plante.veke_egnet === 'bra'}
            ✓ Fungerer bra
          {:else if plante.veke_egnet === 'forsiktig'}
            ⚠ Hold øye med fukt
          {:else}
            ✕ Anbefales ikke
          {/if}
        </div>
      </div>
    </div>

    <div class="mt-3 pt-3 border-t border-border flex items-center justify-end gap-2">
      {#if bekreftFjern}
        <span class="text-xs text-text-muted mr-auto">Sikker?</span>
        <button class="btn-ghost text-xs !px-2 !py-1" onclick={() => (bekreftFjern = false)}>Avbryt</button>
        <button
          class="btn-danger text-xs !px-2 !py-1"
          onclick={() => {
            onFjern(pottePlanteId);
            bekreftFjern = false;
          }}>Fjern</button
        >
      {:else}
        <button class="btn-ghost text-xs !px-2 !py-1" onclick={() => (bekreftFjern = true)}>Fjern</button>
      {/if}
    </div>
  </div>
{:else}
  <button
    class="card-raised p-4 border-dashed text-center text-text-muted hover:border-leaf hover:text-leaf transition-colors flex flex-col items-center justify-center min-h-[120px]"
    onclick={onLeggTil}
  >
    <div class="text-2xl mb-1.5">+</div>
    {#if etikett}
      <div class="text-xs uppercase tracking-wider">{etikett}</div>
    {/if}
    <div class="text-xs mt-1">Legg til plante</div>
  </button>
{/if}
