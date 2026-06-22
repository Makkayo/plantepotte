<script lang="ts">
  /**
   * Globalt toast-lag — vises øverst, over alt annet (z-60). Lytter på toasts-
   * storen. Auto-lukkes av storen; kan også lukkes manuelt.
   */
  import { fly } from 'svelte/transition';
  import { toasts, lukkToast } from '../lib/toast';
</script>

<div
  class="fixed top-0 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
  style="padding-top: calc(0.75rem + env(safe-area-inset-top))"
>
  {#each $toasts as t (t.id)}
    <div
      transition:fly={{ y: -24, duration: 240 }}
      class="pointer-events-auto w-full max-w-[414px] flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md {t.type ===
      'feil'
        ? 'bg-rose/15 border-rose/40'
        : 'bg-leaf/15 border-leaf/40'}"
    >
      <span class="text-base leading-none mt-0.5">{t.type === 'feil' ? '⚠️' : '✓'}</span>
      <span class="flex-1 text-sm text-text leading-snug">{t.melding}</span>
      <button
        class="text-text-dim hover:text-text transition-colors text-sm leading-none mt-0.5"
        onclick={() => lukkToast(t.id)}
        aria-label="Lukk varsel"
      >
        ✕
      </button>
    </div>
  {/each}
</div>
