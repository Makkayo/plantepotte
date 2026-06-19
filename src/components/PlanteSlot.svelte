<script lang="ts">
  import type { Plante } from '../lib/database.types';
  import { vekeEgnetFarge } from '../lib/lys';

  let {
    etikett,
    plante,
    pottePlanteId,
    plantetAt,
    notater,
    iDrift,
    onLeggTil,
    onFjern,
    onNotat,
  }: {
    /** Rolle-tekst i potta: "Foran" / "Bak" / "" (udelt potte). */
    etikett: string;
    plante: Plante | null;
    pottePlanteId: string | null;
    /** Når planten ble satt (ISO). Vises som alder når kassa er i drift. */
    plantetAt: string | null;
    notater: string | null;
    /** Kassa i ekte drift? Styrer om plantedato teller. */
    iDrift: boolean;
    onLeggTil: () => void;
    onFjern: (id: string) => void;
    onNotat: (id: string, tekst: string) => void;
  } = $props();

  let bekreftFjern = $state(false);
  let redigererNotat = $state(false);
  let notatTekst = $state('');

  function dagerSiden(iso: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  }
  function formaterDato(iso: string): string {
    return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  }
  function startNotat() {
    notatTekst = notater ?? '';
    redigererNotat = true;
  }
  function lagreNotat() {
    if (pottePlanteId) onNotat(pottePlanteId, notatTekst.trim());
    redigererNotat = false;
  }
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
        {#if iDrift && plantetAt}
          <div class="text-[11px] text-text-dim mt-1.5">
            🌱 Plantet {formaterDato(plantetAt)} · {dagerSiden(plantetAt)}
            {dagerSiden(plantetAt) === 1 ? 'dag' : 'dager'}
          </div>
        {:else}
          <div class="text-[11px] text-text-dim mt-1.5">🧪 Testmodus — teller ikke ennå</div>
        {/if}
      </div>
    </div>

    <!-- Notat per planting -->
    {#if redigererNotat}
      <div class="mt-2.5">
        <textarea
          bind:value={notatTekst}
          rows="2"
          placeholder="Notat — f.eks. «sådde 5 frø, spirte 4. juni»"
          class="input !text-xs !py-1.5 resize-none"
        ></textarea>
        <div class="flex gap-2 mt-1.5 justify-end">
          <button class="btn-ghost text-xs !px-2 !py-1" onclick={() => (redigererNotat = false)}>Avbryt</button>
          <button class="btn-secondary text-xs !px-2 !py-1" onclick={lagreNotat}>Lagre notat</button>
        </div>
      </div>
    {:else if notater}
      <button
        class="mt-2.5 text-left w-full text-[11px] text-text-muted italic hover:text-text transition-colors"
        onclick={startNotat}
        title="Rediger notat"
      >
        📝 {notater}
      </button>
    {:else}
      <button
        class="mt-2.5 text-[11px] text-text-dim hover:text-text transition-colors"
        onclick={startNotat}
      >
        + Legg til notat
      </button>
    {/if}

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
