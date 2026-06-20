<script lang="ts">
  /**
   * Jordfukt-målere — én stående søyle per planteplass som fylles til fuktnivået,
   * fargekodet tørr/ok/våt. Animerer opp ved innlasting.
   */
  import { onMount } from 'svelte';

  type Klasse = 'dry' | 'ok' | 'wet' | 'unknown';
  let { plasser }: { plasser: { etikett: string; pct: number; klasse: Klasse }[] } = $props();

  let montert = $state(false);
  onMount(() => {
    montert = true;
  });

  function farge(k: Klasse): string {
    return k === 'dry' ? 'bg-sun' : k === 'wet' ? 'bg-sky' : k === 'unknown' ? 'bg-border' : 'bg-leaf';
  }
  function tekstFarge(k: Klasse): string {
    return k === 'dry' ? 'text-sun' : k === 'wet' ? 'text-sky' : 'text-text';
  }
</script>

<div class="flex gap-3 items-end">
  {#each plasser as p, i (i)}
    <div class="flex-1 min-w-0 text-center">
      <div class="text-sm font-medium tabular-nums {tekstFarge(p.klasse)}">{p.pct}%</div>
      <div class="h-16 w-full bg-bg-subtle rounded-lg mt-1.5 overflow-hidden flex items-end">
        <div
          class="w-full rounded-b-lg transition-[height] duration-700 ease-out {farge(p.klasse)}"
          style="height: {montert ? p.pct : 0}%"
        ></div>
      </div>
      <div class="text-[11px] text-text-muted mt-1.5 truncate">{p.etikett}</div>
    </div>
  {/each}
</div>
