<script lang="ts">
  /**
   * Ett planteplass-felt inne i en oktagon-potte. Jorda er en brun gradient, og
   * fukten tegnes som en «våt front» som stiger nedenfra (veke-metaforen) —
   * høyden = fukt %. Probe-glyph til høyre, plante + plass øverst, fukt % nede.
   * Tomt felt viser en «legg til»-affordans.
   */
  import type { Plante } from '../lib/database.types';
  import { fuktStatus } from '../lib/utils';

  let {
    plante,
    slotLabel,
    fukt,
    onClick,
  }: {
    plante: Plante | null;
    slotLabel: string;
    fukt: number | null;
    onClick: () => void;
  } = $props();

  const status = $derived(fuktStatus(fukt));
  const fyllH = $derived(fukt === null ? 0 : Math.max(0, Math.min(100, fukt)));
</script>

<button
  class="relative flex-1 w-full text-left overflow-hidden active:brightness-90 transition-all"
  style="background: linear-gradient(180deg, #6e573f, #473829)"
  onclick={onClick}
>
  {#if plante}
    <div
      class="absolute left-0 right-0 bottom-0 transition-[height] duration-700"
      style="height: {fyllH}%; background: linear-gradient(180deg, #2f5a4a, #173430); border-top: 2px solid rgba(134,239,172,0.22)"
    ></div>

    <div class="absolute w-[3px] rounded-[2px]" style="right:13px; top:13px; height:46%; background:#cdd6e6"></div>
    <div
      class="absolute w-3 h-3 rounded-full"
      style="right:8.5px; top:calc(13px + 46%); transform:translateY(-50%); box-shadow:0 0 0 4px rgba(255,255,255,0.05); background:{status.farge}"
    ></div>

    <div class="absolute left-3 top-[11px]" style="right:30px">
      <div class="text-[13px] font-semibold leading-[1.05] truncate" style="color:#f3f5fa">{plante.navn}</div>
      <div class="font-mono text-[9px] mt-0.5" style="color:#aeb6c8">{slotLabel}</div>
    </div>

    <div
      class="absolute left-3 bottom-[9px] font-display font-semibold text-[27px] leading-none tabular-nums"
      style="color:{status.farge}"
    >
      {fukt ?? '—'}{#if fukt !== null}<span class="text-base">%</span>{/if}
    </div>
  {:else}
    <div class="absolute inset-0 flex flex-col items-center justify-center text-text-dim gap-0.5">
      <span class="text-2xl leading-none">+</span>
      {#if slotLabel}
        <span class="font-mono text-[9px] uppercase tracking-wide">{slotLabel}</span>
      {/if}
      <span class="text-[11px]">Legg til</span>
    </div>
  {/if}
</button>
