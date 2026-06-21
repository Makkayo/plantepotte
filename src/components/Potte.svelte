<script lang="ts">
  /**
   * Én potte (beholder) tegnet som en oktagon-«planter». Skillevegg-pillen viser
   * antall felt og slår skilleveggen av/på. Feltene stables med en tynn glipe som
   * avslører skillevegg-linja under. Data-drevet på 1–N felt.
   */
  import type { Plante } from '../lib/database.types';
  import Felt from './Felt.svelte';

  type FeltData = {
    seksjon: number;
    slotLabel: string;
    plante: Plante | null;
    fukt: number | null;
  };

  let {
    navn,
    delt,
    felt,
    lagrer = false,
    onToggleSkille,
    onFelt,
  }: {
    navn: string;
    delt: boolean;
    felt: FeltData[];
    lagrer?: boolean;
    onToggleSkille: () => void;
    onFelt: (seksjon: number) => void;
  } = $props();
</script>

<div class="flex-1 min-w-0">
  <div class="flex items-center justify-between mb-2.5 gap-1.5">
    <div class="text-[13px] font-semibold flex-none">{navn}</div>
    <button
      class="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10.5px] font-semibold border whitespace-nowrap flex-none transition-all disabled:opacity-50 {delt
        ? 'bg-leaf/10 text-leaf-glow border-leaf/30'
        : 'bg-surface-raised text-text-muted border-border'}"
      onclick={onToggleSkille}
      disabled={lagrer}
      aria-pressed={delt}
      title={delt ? 'Fjern skilleveggen (slå sammen til ett felt)' : 'Sett inn skillevegg (del i to felt)'}
    >
      {delt ? `${felt.length} felt` : '1 felt'}
    </button>
  </div>

  <div
    class="p-[1.5px]"
    style="background:#3b4264; clip-path:polygon(15px 0,calc(100% - 15px) 0,100% 15px,100% calc(100% - 15px),calc(100% - 15px) 100%,15px 100%,0 calc(100% - 15px),0 15px)"
  >
    <div
      class="flex flex-col gap-[1.5px] h-[206px]"
      style="background:#2a3045; clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)"
    >
      {#each felt as f (f.seksjon)}
        <Felt plante={f.plante} slotLabel={f.slotLabel} fukt={f.fukt} onClick={() => onFelt(f.seksjon)} />
      {/each}
    </div>
  </div>
</div>
