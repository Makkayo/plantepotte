<script lang="ts">
  /**
   * Gjenbrukbart bunn-ark (bottom sheet). Sklir opp fra bunnen over et halv-
   * gjennomsiktig bakteppe (bakgrunnen synes fortsatt). Lukkes ved: trykk på
   * bakteppet, Escape, ELLER ved å dra NEDOVER hvor som helst på arket (så lenge
   * innholdet er scrollet til toppen — ellers scroller man). Høyt innhold (maks
   * 85vh) scroller internt. Brukes av alle ark i appen.
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
  let dragging = $state(false); // aktiv lukk-dra
  let armed = false; // peker er nede, vurderer scroll vs. dra
  let startY = 0;
  let scrollEl = $state<HTMLElement>();
  const LUKKE_GRENSE = 90; // px dratt ned før vi lukker

  $effect(() => {
    if (open) {
      render = true;
      // to rAF: garanter at lukket-posisjon (100%) males FØR vi glir opp.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (open) down = false;
        }),
      );
    } else {
      down = true;
      const t = setTimeout(() => (render = false), 320);
      return () => clearTimeout(t);
    }
  });

  function onDown(e: PointerEvent) {
    // Start på en kontroll (slider/knapp/input) → la kontrollen få interaksjonen.
    if ((e.target as HTMLElement).closest?.('input,button,textarea,select,a,label')) {
      armed = false;
      return;
    }
    armed = true;
    dragging = false;
    startY = e.clientY;
    dragY = 0;
  }
  function onMove(e: PointerEvent) {
    if (!armed) return;
    const dy = e.clientY - startY;
    if (!dragging) {
      const vedTopp = (scrollEl?.scrollTop ?? 0) <= 0;
      if (dy > 4 && vedTopp) {
        dragging = true; // dra nedover fra toppen = lukk-dra
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignorer */
        }
      } else if (dy < -2 || !vedTopp) {
        armed = false; // dette er en scroll, ikke en lukk-dra
        return;
      } else {
        return;
      }
    }
    dragY = Math.max(0, dy);
  }
  function onUp() {
    armed = false;
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
    class="fixed inset-0 z-40 bg-black/55"
    style="opacity:{down ? 0 : 1}; transition:{redusert ? 'none' : 'opacity 0.3s ease'}"
    onclick={onClose}
    role="presentation"
  ></div>
  <div
    class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] bg-surface border-t border-border rounded-t-[22px] shadow-2xl flex flex-col max-h-[85vh]"
    style="transform: translateY({ty}); transition:{sheetTransition}; touch-action:none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
    onlostpointercapture={onUp}
  >
    <div class="shrink-0 pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing select-none">
      <div class="w-[38px] h-1 rounded-full bg-border-strong" aria-hidden="true"></div>
    </div>
    <div
      bind:this={scrollEl}
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6"
      style="touch-action:pan-y; padding-bottom: calc(1.75rem + env(safe-area-inset-bottom))"
    >
      {@render children?.()}
    </div>
  </div>
{/if}
