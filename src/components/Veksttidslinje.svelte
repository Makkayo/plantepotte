<script lang="ts">
  /**
   * Veksttidslinje — henter bildene ESP32-CAM laster opp til Supabase Storage
   * (bucket `plantebilder`, mappe = potte_id) og viser dem kronologisk i en
   * scrollbar stripe. Trykk på et bilde → forstørret visning (lukkes også av
   * maskinvare-tilbake via overlayBack).
   */
  import { onMount } from 'svelte';
  import { supabase } from '../lib/supabase';
  import { overlayOpened } from '../lib/overlayBack';

  let { potteId }: { potteId: string } = $props();

  type Bilde = { url: string; dato: Date };
  let bilder = $state<Bilde[]>([]);
  let laster = $state(true);
  let feil = $state(false);
  let strip = $state<HTMLElement>();
  let aapent = $state<Bilde | null>(null);

  // Maskinvare-/nettleser-tilbake lukker den forstørrede visningen.
  $effect(() => {
    if (aapent) return overlayOpened(() => (aapent = null));
  });

  function datoFraNavn(navn: string): Date {
    const m = navn.match(/(\d{10,13})/);
    if (m) {
      const n = Number(m[1]);
      return new Date(n < 1e12 ? n * 1000 : n);
    }
    return new Date(0);
  }

  function formatDato(d: Date): string {
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  }
  function formatFull(d: Date): string {
    return d.toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  onMount(async () => {
    const { data, error } = await supabase.storage.from('plantebilder').list(potteId, {
      limit: 300,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      feil = true;
      laster = false;
      return;
    }
    const filer = (data ?? []).filter(
      (f) => f.name && !f.name.startsWith('.') && /\.(jpe?g|png|webp)$/i.test(f.name),
    );
    bilder = filer
      .map((f) => {
        const { data: pub } = supabase.storage
          .from('plantebilder')
          .getPublicUrl(`${potteId}/${f.name}`);
        const dato = f.created_at ? new Date(f.created_at) : datoFraNavn(f.name);
        return { url: pub.publicUrl, dato };
      })
      .sort((a, b) => a.dato.getTime() - b.dato.getTime());
    laster = false;
    // Hopp til nyeste bilde (høyre ende av stripa).
    requestAnimationFrame(() => strip?.scrollTo({ left: strip.scrollWidth }));
  });
</script>

<section class="card p-5">
  <h2 class="font-display text-lg font-semibold">Veksttidslinje</h2>
  <p class="text-text-muted text-xs mt-0.5 mb-4">Bilder fra kameraet — se plantene vokse over tid.</p>

  {#if laster}
    <div class="text-text-dim text-sm animate-pulse py-4">Henter bilder…</div>
  {:else if feil}
    <div class="text-text-muted text-sm py-2">Kunne ikke hente bilder akkurat nå.</div>
  {:else if bilder.length === 0}
    <div class="text-text-dim text-sm py-2">
      Ingen bilder ennå — kameraet laster opp et par ganger om dagen.
    </div>
  {:else}
    <div bind:this={strip} class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 overscroll-x-contain">
      {#each bilder as b (b.url)}
        <button class="shrink-0 group" onclick={() => (aapent = b)}>
          <img
            src={b.url}
            alt="Plantebilde {formatDato(b.dato)}"
            loading="lazy"
            class="w-32 h-32 object-cover rounded-xl border border-border group-hover:border-border-strong transition-colors bg-surface-raised"
          />
          <div class="font-mono text-[10px] text-text-muted mt-1.5 text-center">{formatDato(b.dato)}</div>
        </button>
      {/each}
    </div>
    <p class="font-mono text-[10px] text-text-dim mt-1">{bilder.length} bilder · eldste → nyeste</p>
  {/if}
</section>

{#if aapent}
  {@const a = aapent}
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    role="presentation"
    onclick={() => (aapent = null)}
  >
    <img src={a.url} alt="Plantebilde {formatFull(a.dato)}" class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
    <div class="font-mono text-xs text-text-muted mt-3">{formatFull(a.dato)}</div>
  </div>
{/if}
