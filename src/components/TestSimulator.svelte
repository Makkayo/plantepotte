<script lang="ts">
  /**
   * Testmodus-simulator — skru på alt selv og se hver funksjon spille seg ut før
   * potta er live. Skriver KUN til localStorage (sim-store); detalj-visningen
   * bruker syntetiske data når «Simuler data» er på. Vises kun i testmodus.
   */
  import { simStore, hentSim, settSim, type SimState } from '../lib/simulering';

  let { potteId }: { potteId: string } = $props();

  const sim = $derived(hentSim($simStore, potteId));
  const set = (patch: Partial<SimState>) => settSim(potteId, patch);

  // Presets som treffer distinkte funksjoner på ett klikk.
  const presets: { navn: string; emoji: string; patch: Partial<SimState> }[] = [
    { navn: 'Frisk & ung', emoji: '🌱', patch: { plantealderDager: 10, vannPct: 85, jordPct: 68, temp: 22, rh: 55, frakoblet: false } },
    { navn: 'Høsteklar', emoji: '🧺', patch: { plantealderDager: 60, jordPct: 62, frakoblet: false } },
    { navn: 'Tørr jord', emoji: '🏜️', patch: { jordPct: 22, frakoblet: false } },
    { navn: 'Lavt vann', emoji: '💧', patch: { vannPct: 12, frakoblet: false } },
    { navn: 'Tørr luft', emoji: '🔥', patch: { temp: 26, rh: 28, frakoblet: false } },
    { navn: 'Frakoblet', emoji: '📵', patch: { frakoblet: true } },
  ];

  // Slider-oppsett: [label, felt, min, max, enhet, format]
  type Rad = { label: string; felt: keyof SimState; min: number; max: number; enhet: string; fmt?: (v: number) => string };
  const rader: Rad[] = [
    { label: 'Plantealder', felt: 'plantealderDager', min: 0, max: 120, enhet: 'd' },
    { label: 'Vannivå', felt: 'vannPct', min: 0, max: 100, enhet: '%' },
    { label: 'Jordfukt', felt: 'jordPct', min: 0, max: 100, enhet: '%' },
    { label: 'Temperatur', felt: 'temp', min: 10, max: 35, enhet: '°', fmt: (v) => v.toFixed(0) },
    { label: 'Luftfuktighet', felt: 'rh', min: 20, max: 90, enhet: '%' },
  ];

  const pctAv = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;
</script>

<div class="card p-4 border-sun/25 bg-sun/[0.04]">
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-base">🧪</span>
        <h2 class="font-display text-sm font-semibold">Simulator</h2>
      </div>
      <p class="text-text-muted text-xs mt-0.5 leading-snug">
        Skru på alt selv og se hver funksjon før potta er live. Endrer ingenting i databasen eller på potta.
      </p>
    </div>
    <button
      class="shrink-0 w-11 h-[25px] rounded-full p-[3px] flex items-center transition-all duration-200 {sim.aktiv
        ? 'bg-leaf justify-end'
        : 'bg-border justify-start'}"
      onclick={() => set({ aktiv: !sim.aktiv })}
      role="switch"
      aria-checked={sim.aktiv}
      aria-label="Skru simulering {sim.aktiv ? 'av' : 'på'}"
    >
      <span class="w-[19px] h-[19px] rounded-full bg-bg block shadow"></span>
    </button>
  </div>

  {#if sim.aktiv}
    <div class="mt-4 flex flex-col gap-4">
      <!-- Presets -->
      <div class="flex flex-wrap gap-1.5">
        {#each presets as p (p.navn)}
          <button
            class="chip border-border bg-surface-raised text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
            onclick={() => set(p.patch)}
          >
            <span>{p.emoji}</span><span>{p.navn}</span>
          </button>
        {/each}
      </div>

      <!-- Sliders -->
      <div class="flex flex-col gap-3.5">
        {#each rader as r (r.felt)}
          {@const v = sim[r.felt] as number}
          <div>
            <div class="flex items-baseline justify-between mb-1.5">
              <span class="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">{r.label}</span>
              <span class="font-display text-sm font-semibold text-leaf">
                {r.fmt ? r.fmt(v) : v}{r.enhet}
              </span>
            </div>
            <input
              type="range"
              min={r.min}
              max={r.max}
              value={v}
              class="slider-lys w-full"
              style="--pct: {pctAv(v, r.min, r.max)}%"
              oninput={(e) => set({ [r.felt]: +e.currentTarget.value } as Partial<SimState>)}
              aria-label={r.label}
            />
          </div>
        {/each}
      </div>

      <!-- Frakoblet -->
      <div class="flex items-center justify-between pt-1">
        <div class="min-w-0">
          <div class="text-[13px] font-medium">📵 Frakoblet</div>
          <p class="text-text-muted text-[11px] mt-0.5">Simuler at potta mister kontakt (gammel avlesning).</p>
        </div>
        <button
          class="shrink-0 w-11 h-[25px] rounded-full p-[3px] flex items-center transition-all duration-200 {sim.frakoblet
            ? 'bg-sun justify-end'
            : 'bg-border justify-start'}"
          onclick={() => set({ frakoblet: !sim.frakoblet })}
          role="switch"
          aria-checked={sim.frakoblet}
          aria-label="Simuler frakoblet {sim.frakoblet ? 'av' : 'på'}"
        >
          <span class="w-[19px] h-[19px] rounded-full bg-bg block shadow"></span>
        </button>
      </div>
    </div>
  {/if}
</div>
