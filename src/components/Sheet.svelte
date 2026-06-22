<script lang="ts">
  /**
   * Gjenbrukbart bunn-ark (bottom sheet) — sklir opp fra bunnen over et mørkt
   * bakteppe. Lukkes ved: trykk på bakteppet, Escape, ELLER ved å dra håndtaket
   * (eller topp-stripa) nedover forbi en terskel. Innhold er scrollbart når det
   * er høyere enn skjermen (max 92vh). Brukes av alle ark i appen.
   */
  import type { Snippet } from 'svelte';

  let { open, onClose, children }: { open: boolean; onClose: () => void; children?: Snippet } =
    $props();

  const redusert =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let render = $state(false); // ligger i DOM
  let down = $state(true); // skjøvet ned (lukket posisjon)
  let dragY = $state(0); // dra-offset i px (kun nedover)
  let dragging = $state(false);
  let startY = 0;
  const LUKKE_GRENSE = 90; // px dratt ned før vi lukker

  $effect(() => {
    if (open) {
      render = true;
      // to rAF: garanter at lukket-posisjon (100%) males FØR vi glir opp,
      // ellers hopper arket rett opp uten animasjon.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (open) down = false; // hopp over hvis arket alt er lukket igjen
        }),
      );
    } else {
      down = true;
      const t = setTimeout(() => (render = false), 320);
      return () => clearTimeout(t);
    }
  });

  function onDown(e: PointerEvent) {
    dragging = true;
    startY = e.clientY;
    dragY = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    if (dragging) dragY = Math.max(0, e.clientY - startY);
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    if (dragY > LUKKE_GRENSE) onClose();
    dragY = 0; // snap tilbake (eller overstyres av down=true ved lukking)
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  const ty = $derived(down ? '100%' : `${dragY}px`);
  const sheetTransition = $derived(
    dragging || redusert ? 'none' : 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
  );
</script>

<svelte:window onkeydown={onKey} />

{#if render}
  <div
    class="fixed inset-0 z-40 bg-black/60"
    style="opacity:{down ? 0 : 1}; transition:{redusert ? 'none' : 'opacity 0.3s ease'}"
    onclick={onClose}
    role="presentation"
  ></div>
  <div
    class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] bg-surface border-t border-border rounded-t-[22px] shadow-2xl flex flex-col max-h-[92vh]"
    style="transform: translateY({ty}); transition:{sheetTransition}"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="shrink-0 pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing select-none"
      style="touch-action:none"
      role="button"
      tabindex="0"
      aria-label="Dra ned for å lukke (eller trykk Enter / Escape)"
      onpointerdown={onDown}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
      onlostpointercapture={onUp}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div class="w-[38px] h-1 rounded-full bg-border-strong" aria-hidden="true"></div>
    </div>
    <div
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6"
      style="padding-bottom: calc(1.75rem + env(safe-area-inset-bottom))"
    >
      {@render children?.()}
    </div>
  </div>
{/if}
