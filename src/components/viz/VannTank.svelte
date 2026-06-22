<script lang="ts">
  /**
   * Vertikal vanntank — fyller fra bunn (topp = 100 %, bunn = 0 %), flottør på
   * overflaten som synker med nivået, valgfri %-avlesning og laser-strek.
   * Fyller forelderens bredde/høyde, så samme komponent brukes både stor
   * (midt i detaljen) og mini (oversikts-kortene) → garantert likt uttrykk.
   */
  let {
    pct,
    visProsent = true,
    visLaser = true,
  }: { pct: number | null; visProsent?: boolean; visLaser?: boolean } = $props();

  const fyll = $derived(pct === null ? 0 : Math.max(0, Math.min(100, pct)));
</script>

<div
  class="relative w-full h-full rounded-[10px] overflow-hidden border border-border-strong"
  style="background:rgba(255,255,255,0.03)"
>
  {#if visLaser}
    <div class="absolute top-1.5 bottom-0 left-1/2 -translate-x-1/2 border-l border-dashed border-sky/30"></div>
  {/if}
  <div
    class="absolute inset-x-0 bottom-0 transition-[height] duration-700"
    style="height:{fyll}%; background:linear-gradient(180deg,#7cc0ff,#3b82c4)"
  ></div>
  <div class="absolute top-1.5 left-1 w-[3px] h-[55%] rounded bg-white/[0.06]"></div>
  {#if pct !== null}
    <div
      class="absolute left-1/2 transition-[bottom] duration-700"
      style="bottom:{fyll}%; transform:translate(-50%,50%)"
    >
      <div class="flott-bob w-[60%] min-w-[12px] h-2 rounded-[4px] mx-auto" style="background:#eef2f8; box-shadow:0 2px 0 #9fb0c8"></div>
    </div>
  {/if}
  {#if visProsent}
    <div
      class="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-black/40 font-mono text-[9px] font-semibold text-white whitespace-nowrap"
    >
      {pct ?? '–'}%
    </div>
  {/if}
</div>
