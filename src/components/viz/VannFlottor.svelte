<script lang="ts">
  /**
   * Vannreservoar-kort med flottør — viser tanken «live»: en laserstråle ned
   * mot vannflaten, vannfyll til riktig nivå, og en flottør-puck som duver på
   * overflaten. Tappbar → åpner reservoar-arket. Liter/dager fra trend-motoren.
   */
  import type { VannTrend } from '../../lib/trend';

  let { pct, trend, onClick }: { pct: number | null; trend: VannTrend; onClick: () => void } =
    $props();

  const klampet = $derived(pct === null ? 0 : Math.max(0, Math.min(100, pct)));
  const dagerTekst = $derived(
    trend.dagerIgjen !== null ? `~${Math.round(trend.dagerIgjen)} dager igjen · flottør` : 'flottør',
  );
</script>

<button
  class="card w-full text-left flex items-center gap-4 px-[15px] py-3.5 hover:brightness-110 active:scale-[0.99] transition-all"
  onclick={onClick}
>
  <div
    class="relative w-[52px] h-[86px] flex-none rounded-[11px] border border-border-strong overflow-hidden"
    style="background: rgba(255,255,255,0.03)"
  >
    <div
      class="absolute top-[5px] bottom-0 border-l-[1.5px] border-dashed border-leaf opacity-45"
      style="left: calc(50% - 1px)"
    ></div>
    <div
      class="absolute left-0 right-0 bottom-0 transition-[height] duration-700"
      style="height: {klampet}%; background: linear-gradient(180deg, #7cc0ff, #3b82c4)"
    ></div>
    <div class="absolute top-2 left-[5px] w-[5px] h-[70px] rounded-[3px] bg-white opacity-[0.06]"></div>
    {#if pct !== null}
      <div
        class="absolute left-1/2 transition-[bottom] duration-700"
        style="bottom: {klampet}%; transform: translate(-50%, 50%)"
      >
        <div class="flott-bob w-[26px] h-[9px] rounded-[5px]" style="background:#eef2f8; box-shadow:0 2px 0 #9fb0c8"></div>
      </div>
    {/if}
  </div>

  <div class="flex-1 min-w-0">
    <div class="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">Vannreservoar</div>
    <div class="flex items-baseline gap-2.5 mt-1">
      <span class="font-display text-[32px] font-semibold leading-none tabular-nums">
        {pct ?? '—'}<span class="text-base font-normal">%</span>
      </span>
      <span class="font-mono text-xs text-sky">≈ {trend.literIgjen.toFixed(1).replace('.', ',')} L</span>
    </div>
    <div class="text-[11.5px] text-text-muted mt-1">{dagerTekst}</div>
  </div>

  <div class="text-text-dim text-[22px] font-light" aria-hidden="true">›</div>
</button>
