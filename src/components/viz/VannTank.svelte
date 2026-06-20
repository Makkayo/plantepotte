<script lang="ts">
  /**
   * Vanntank — et faktisk kar som fylles til riktig nivå, med en sømløst
   * rennende bølge ved overflaten. Viser nivå (%), liter igjen, en sparkline
   * over de siste dagene, og «holder ~X dager» fra trend-utregningen.
   */
  import { vannKlasse } from '../../lib/utils';
  import type { VannTrend } from '../../lib/trend';

  let { pct, trend }: { pct: number | null; trend: VannTrend } = $props();

  const kl = $derived(vannKlasse(pct));
  const fyllFarge = $derived(kl === 'lav' ? '#f87171' : kl === 'full' ? '#60a5fa' : '#4ade80');
  const topFarge = $derived(kl === 'lav' ? '#fca5a5' : kl === 'full' ? '#93c5fd' : '#86efac');

  const klampet = $derived(pct === null ? 0 : Math.max(0, Math.min(100, pct)));
  const surf = $derived(142 - (klampet / 100) * 134);

  const dagerBadge = $derived.by(() => {
    if (trend.dagerIgjen !== null) {
      const d = trend.dagerIgjen;
      const farge = d >= 3 ? 'text-leaf' : d >= 1 ? 'text-sun' : 'text-rose';
      const tekst = d >= 1 ? `Holder ~${Math.round(d)} ${Math.round(d) === 1 ? 'dag' : 'dager'}` : 'Fyll på snart';
      return { farge, tekst };
    }
    if (!trend.gyldig) return { farge: 'text-text-dim', tekst: 'Samler data…' };
    return { farge: 'text-text-muted', tekst: 'Stabilt nivå' };
  });

  // Sparkline: normaliser tid → x (0..120), nivå → y (28..2).
  const spark = $derived.by(() => {
    const p = trend.sparkline;
    if (p.length < 2) return '';
    const t0 = p[0]!.t;
    const t1 = p[p.length - 1]!.t;
    const spenn = t1 - t0 || 1;
    return p
      .map((pt) => {
        const x = ((pt.t - t0) / spenn) * 120;
        const y = 28 - (Math.max(0, Math.min(100, pt.pct)) / 100) * 26;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
</script>

<div class="flex items-center gap-4">
  <svg viewBox="0 0 100 150" width="68" height="102" role="img" aria-label="Vanntank {pct ?? '–'} prosent full" class="shrink-0">
    <defs>
      <clipPath id="tankklipp"><rect x="18" y="8" width="64" height="134" rx="20" /></clipPath>
    </defs>
    <rect x="18" y="8" width="64" height="134" rx="20" fill="#0d1017" />
    {#if pct !== null}
      <g clip-path="url(#tankklipp)">
        <g class="vann-bolge-2">
          <path
            d="M0,{surf + 2} Q25,{surf - 1} 50,{surf + 2} T100,{surf + 2} T150,{surf + 2} T200,{surf + 2} L200,150 L0,150 Z"
            fill={fyllFarge}
            opacity="0.45"
          />
        </g>
        <g class="vann-bolge">
          <path
            d="M0,{surf} Q25,{surf - 4} 50,{surf} T100,{surf} T150,{surf} T200,{surf} L200,150 L0,150 Z"
            fill={fyllFarge}
            opacity="0.9"
          />
          <path
            d="M0,{surf} Q25,{surf - 4} 50,{surf} T100,{surf} T150,{surf} T200,{surf}"
            fill="none"
            stroke={topFarge}
            stroke-width="2"
            opacity="0.95"
          />
        </g>
      </g>
    {/if}
    {#each [25, 50, 75] as p}
      <line x1="74" y1={142 - (p / 100) * 134} x2="80" y2={142 - (p / 100) * 134} stroke="#2a3045" stroke-width="1.5" stroke-linecap="round" />
    {/each}
    <rect x="18" y="8" width="64" height="134" rx="20" fill="none" stroke="#2a3045" stroke-width="2" />
  </svg>

  <div class="min-w-0 flex-1">
    <div class="flex items-baseline gap-1">
      <span class="font-display text-3xl font-medium leading-none tabular-nums">{pct ?? '—'}</span>
      <span class="text-sm text-text-muted">%</span>
    </div>
    <div class="text-xs text-text-muted mt-1 tabular-nums">≈ {trend.literIgjen.toFixed(1).replace('.', ',')} L igjen</div>
    <div class="text-xs mt-0.5 font-medium {dagerBadge.farge}">{dagerBadge.tekst}</div>

    {#if spark}
      <svg viewBox="0 0 120 30" class="w-full max-w-[140px] h-6 mt-2 overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={spark} fill="none" stroke={fyllFarge} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" vector-effect="non-scaling-stroke" />
      </svg>
    {/if}
  </div>
</div>
