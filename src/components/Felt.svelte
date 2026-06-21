<script lang="ts">
  /**
   * Ett planteplass-felt i en oktagon-potte. «Våt front» (fukt) stiger nedenfra
   * (veke-metaforen). Badge-pille øverst venstre viser orientering (Bak/Foran/
   * Hele) — kun etikett, ikke noe man bytter. Probe-glyph til høyre.
   */
  import type { Plante } from '../lib/database.types';
  import { fuktStatus } from '../lib/utils';

  let {
    plante,
    rolle,
    fukt,
    onClick,
  }: {
    plante: Plante | null;
    rolle: 'foran' | 'bak' | 'hel';
    fukt: number | null;
    onClick: () => void;
  } = $props();

  const status = $derived(fuktStatus(fukt));
  const fyllH = $derived(fukt === null ? 0 : Math.max(0, Math.min(100, fukt)));
  const badgeTekst = $derived(rolle === 'foran' ? 'Foran' : rolle === 'bak' ? 'Bak' : 'Hele potta');
  // Foran = blå (tilgjengelig side), Bak/Hele = mørk.
  const badgeKlasse = $derived(
    rolle === 'foran' ? 'bg-sky/20 text-[#9ecbff]' : 'bg-[#1f2433] text-text-muted',
  );
</script>

<button
  class="relative flex-1 w-full text-left overflow-hidden active:brightness-90 transition-all"
  style="background: linear-gradient(180deg, #6e573f, #473829)"
  onclick={onClick}
>
  <span
    class="absolute left-[11px] top-[10px] z-10 inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-medium tracking-[0.1em] {badgeKlasse}"
    >{badgeTekst}</span
  >

  {#if plante}
    <div
      class="absolute left-0 right-0 bottom-0 transition-[height] duration-700"
      style="height: {fyllH}%; background: linear-gradient(180deg, #2f5a4a, #173430); border-top: 2px solid rgba(134,239,172,0.22)"
    ></div>

    <div
      class="absolute w-[3px] rounded-[2px]"
      style="right:13px; top:13px; height:42%; background:#cdd6e6"
    ></div>
    <div
      class="absolute w-3 h-3 rounded-full"
      style="right:8.5px; top:calc(13px + 42%); transform:translateY(-50%); box-shadow:0 0 0 4px rgba(255,255,255,0.05); background:{status.farge}"
    ></div>

    <div class="absolute left-3 top-[31px]" style="right:30px">
      <div class="text-[13px] font-semibold leading-[1.05] truncate" style="color:#f3f5fa">
        {plante.navn}
      </div>
    </div>

    <div
      class="absolute left-3 bottom-[9px] font-display font-semibold leading-none tabular-nums"
      style="color:{status.farge}; font-size:{rolle === 'hel' ? 27 : 25}px"
    >
      {fukt ?? '—'}{#if fukt !== null}<span class="text-base">%</span>{/if}
    </div>
  {:else}
    <div class="absolute inset-0 flex flex-col items-center justify-center text-text-dim gap-0.5">
      <span class="text-2xl leading-none">+</span>
      <span class="text-[11px]">Legg til</span>
    </div>
  {/if}
</button>
