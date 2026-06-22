<script lang="ts">
  /**
   * Gjenbrukbart bunn-ark (bottom sheet). Sklir opp fra bunnen over et halv-
   * gjennomsiktig bakteppe (bakgrunnen synes fortsatt). Lukkes ved: trykk på
   * bakteppet, Escape, eller ved å DRA NEDOVER.
   *
   * Touch-detalj som er lett å trå feil på: nettleseren «kaprer» vertikal touch
   * som scroll med mindre elementet har `touch-action: none`. Derfor:
   *  - en stor topp dra-sone med touch-action:none (virker alltid),
   *  - innhold som IKKE trenger scroll får også touch-action:none → dra hvor
   *    som helst, mens innhold som scroller får pan-y og dras via topp-sonen.
   */
  import type { Snippet } from 'svelte';
  import { overlayOpened } from '../lib/overlayBack';

  let { open, onClose, children }: { open: boolean; onClose: () => void; children?: Snippet } =
    $props();

  // Maskinvare-/nettleser-tilbake lukker arket (registreres mens det er åpent).
  $effect(() => {
    if (open) return overlayOpened(onClose);
  });

  const redusert =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let render = $state(false); // ligger i DOM
  let down = $state(true); // skjøvet ned (lukket posisjon)
  let dragY = $state(0); // dra-offset i px (kun nedover)
  let dragging = $state(false); // aktiv lukk-dra
  let armed = false; // peker er nede, vurderer dra
  let startY = 0;
  let scrollEl = $state<HTMLElement>();
  let kanScrolle = $state(false);
  const LUKKE_GRENSE = 80; // px dratt ned før vi lukker

  $effect(() => {
    if (open) {
      render = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (open) {
            down = false;
            maalScroll();
          }
        }),
      );
    } else {
      down = true;
      const t = setTimeout(() => (render = false), 320);
      return () => clearTimeout(t);
    }
  });

  function maalScroll() {
    if (scrollEl) kanScrolle = scrollEl.scrollHeight - scrollEl.clientHeight > 2;
  }

  function onDown(e: PointerEvent, fraHandtak: boolean) {
    if (!fraHandtak) {
      const t = e.target as HTMLElement;
      // start på en kontroll → la kontrollen få interaksjonen
      if (t.closest?.('input,button,textarea,select,a,label')) {
        armed = false;
        return;
      }
      maalScroll();
      // scrollbart innhold som ikke er på toppen → la det scrolle
      if (kanScrolle && (scrollEl?.scrollTop ?? 0) > 0) {
        armed = false;
        return;
      }
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
      if (dy > 4) {
        dragging = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ignorer */
        }
      } else if (dy < -2) {
        armed = false; // beveger oppover → ikke en lukk-dra
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
    dragY = 0;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  const ty = $derived(down ? '100%' : `${dragY}px`);
  const sheetTransition = $derived(
    dragging || redusert ? 'none' : 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
  );
</script>

<svelte:window onkeydown={onKey} onresize={maalScroll} />

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
  >
    <!-- Stor dra-sone (touch-action:none gjør at touch-drag faktisk virker) -->
    <div
      class="shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      style="height:46px; touch-action:none"
      role="button"
      tabindex="0"
      aria-label="Dra ned for å lukke"
      onpointerdown={(e) => onDown(e, true)}
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
      <div class="w-10 h-1.5 rounded-full bg-border-strong" aria-hidden="true"></div>
    </div>
    <!-- Innhold (scroller når det er høyt; ellers dragbart i hele flaten) -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={scrollEl}
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6"
      style="touch-action:{kanScrolle ? 'pan-y' : 'none'}; padding-bottom: calc(1.75rem + env(safe-area-inset-bottom))"
      onpointerdown={(e) => onDown(e, false)}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
      onlostpointercapture={onUp}
      onscroll={maalScroll}
    >
      {@render children?.()}
    </div>
  </div>
{/if}
