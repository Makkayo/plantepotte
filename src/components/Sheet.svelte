<script lang="ts">
  /**
   * Gjenbrukbart bunn-ark (bottom sheet). Sklir opp over et halv-gjennomsiktig
   * bakteppe (bakgrunnen synes). Lukkes ved: trykk på bakteppet, Escape, eller
   * ved å DRA NEDOVER — hvor som helst på arket NÅR innholdet er scrollet til
   * toppen (ellers scroller man). Høyt innhold (maks 85vh) scroller internt.
   *
   * Touch håndteres med native touch-events (non-passive `touchmove` så vi kan
   * `preventDefault()` på dra-lukk); mus/pen via pointer-events. På den måten
   * slipper man å treffe håndtaket nøyaktig.
   */
  import type { Snippet } from 'svelte';
  import { overlayOpened } from '../lib/overlayBack';

  let { open, onClose, children }: { open: boolean; onClose: () => void; children?: Snippet } =
    $props();

  // Maskinvare-/nettleser-tilbake lukker arket.
  $effect(() => {
    if (open) return overlayOpened(onClose);
  });

  const redusert =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let render = $state(false);
  let down = $state(true);
  let dragY = $state(0);
  let dragging = $state(false);
  let scrollEl = $state<HTMLElement>();
  let handleEl = $state<HTMLElement>();

  let startY = 0;
  let startOnHandle = false;
  let pending = false;
  const LUKKE_GRENSE = 80;

  $effect(() => {
    if (open) {
      render = true;
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

  function atTopp(): boolean {
    return startOnHandle || (scrollEl?.scrollTop ?? 0) <= 0;
  }
  function begin(y: number, target: EventTarget | null) {
    const el = target as HTMLElement | null;
    startOnHandle = !!handleEl && !!el && handleEl.contains(el);
    // Dra som starter på en kontroll (utenfor håndtaket) → la kontrollen virke.
    if (!startOnHandle && el?.closest?.('input,textarea,select,button,a')) {
      pending = false;
      return;
    }
    startY = y;
    pending = true;
    dragging = false;
  }
  /** Returnerer true når draget er en aktiv lukk-dra (kall preventDefault da). */
  function move(y: number): boolean {
    if (!pending) return false;
    const dy = y - startY;
    if (!dragging) {
      if (dy > 6 && atTopp()) {
        dragging = true;
      } else if (dy < -2 || !atTopp()) {
        pending = false; // det er en scroll (eller drag oppover)
        return false;
      } else {
        return false;
      }
    }
    dragY = Math.max(0, y - startY);
    return true;
  }
  function end() {
    pending = false;
    if (!dragging) return;
    dragging = false;
    if (dragY > LUKKE_GRENSE) onClose();
    dragY = 0;
  }

  // ---- Touch (non-passive move så preventDefault virker) ----
  function touchGest(node: HTMLElement) {
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 1) begin(e.touches[0]!.clientY, e.target);
    };
    const tm = (e: TouchEvent) => {
      if (pending && move(e.touches[0]!.clientY)) e.preventDefault();
    };
    const te = () => end();
    node.addEventListener('touchstart', ts, { passive: true });
    node.addEventListener('touchmove', tm, { passive: false });
    node.addEventListener('touchend', te, { passive: true });
    node.addEventListener('touchcancel', te, { passive: true });
    return {
      destroy() {
        node.removeEventListener('touchstart', ts);
        node.removeEventListener('touchmove', tm);
        node.removeEventListener('touchend', te);
        node.removeEventListener('touchcancel', te);
      },
    };
  }

  // ---- Mus/pen (touch håndteres over) ----
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    begin(e.clientY, e.target);
    if (pending) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignorer */
      }
    }
  }
  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== 'touch') move(e.clientY);
  }
  function onPointerUp(e: PointerEvent) {
    if (e.pointerType !== 'touch') end();
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
    class="fixed bottom-0 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[414px] bg-surface border border-border rounded-t-[22px] shadow-2xl flex flex-col max-h-[85vh]"
    style="transform: translate(-50%, {ty}); transition:{sheetTransition}"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    use:touchGest
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div
      bind:this={handleEl}
      class="shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      style="height:42px; touch-action:none"
      role="button"
      tabindex="0"
      aria-label="Dra ned for å lukke"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div class="w-10 h-1.5 rounded-full bg-border-strong" aria-hidden="true"></div>
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
