<script lang="ts">
  /**
   * Gjenbrukbart bunn-ark (bottom sheet) — sklir opp fra bunnen over et mørkt
   * bakteppe. Lukkes ved trykk på bakteppet eller Escape. Innholdet kommer som
   * children-snippet. Respekterer prefers-reduced-motion via korte varigheter.
   */
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Snippet } from 'svelte';

  let { open, onClose, children }: { open: boolean; onClose: () => void; children?: Snippet } =
    $props();

  const redusert =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const inn = redusert ? 0 : 280;
  const bak = redusert ? 0 : 200;

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="fixed inset-0 z-40 bg-black/60"
    transition:fade={{ duration: bak }}
    onclick={onClose}
    role="presentation"
  ></div>
  <div
    class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] bg-surface border-t border-border rounded-t-[22px] px-6 pb-8 pt-2.5 shadow-2xl"
    transition:fly={{ y: 500, duration: inn, easing: cubicOut }}
    role="dialog"
    aria-modal="true"
    style="padding-bottom: calc(2rem + env(safe-area-inset-bottom))"
  >
    <div class="w-[38px] h-1 rounded-full bg-border-strong mx-auto mb-4" aria-hidden="true"></div>
    {@render children?.()}
  </div>
{/if}
