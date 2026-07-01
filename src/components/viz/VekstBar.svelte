<script lang="ts">
  /**
   * Vekst-/høstingsbjelke — fyller fra frø (venstre) mot høsteklar (høyre) etter
   * `prosent`. Har en «vekst-token» (liten dot ved fronten) som mirror-motiv til
   * sol-dotten i SolBue og flottøren i VannTank, så høsting taler samme visuelle
   * språk. Reuses BÅDE mini (oversikts-kortene) og full (felt-arket) → likt uttrykk.
   */
  let {
    prosent,
    klar = false,
    pulser = false,
    size = 'mini',
  }: { prosent: number; klar?: boolean; pulser?: boolean; size?: 'mini' | 'full' } = $props();

  const p = $derived(Math.max(0, Math.min(100, prosent)));
  const h = $derived(size === 'full' ? 'h-2' : 'h-1.5');
  const dot = $derived(size === 'full' ? 'w-3 h-3' : 'w-2.5 h-2.5');
</script>

<div class="relative w-full" role="img" aria-label="Vekst {p}%{klar ? ', høsteklar' : ''}">
  <div class="w-full rounded-full bg-surface-raised overflow-hidden {h}">
    <div
      class="h-full rounded-full transition-[width] duration-700"
      style="width:{p}%; background:linear-gradient(90deg,#166534,#4ade80 65%,#86efac)"
    ></div>
  </div>
  <!-- Vekst-token: dot ved fronten (matcher sol-dot / flottør). Gløder når klar,
       og «puster» mykt når planten er i løpende (kontinuerlig) høste-fase. -->
  <div
    class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-[left] duration-700 {dot} {pulser
      ? 'breathe-dot'
      : ''}"
    style="left:{p}%; background:{klar ? '#86efac' : '#4ade80'}; border:2px solid #0b0d12;{klar
      ? ' box-shadow:0 0 8px rgba(134,239,172,0.85)'
      : ''}"
  ></div>
</div>
