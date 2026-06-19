<script lang="ts">
  import Header from './Header.svelte';
  import PotteOversikt from './PotteOversikt.svelte';
  import PotteDetalj from './PotteDetalj.svelte';
  import PlanteKatalog from './PlanteKatalog.svelte';
  import Dyrking from './Dyrking.svelte';

  type View =
    | { name: 'oversikt' }
    | { name: 'potte'; potteId: string }
    | { name: 'katalog' }
    | { name: 'dyrking' };

  let { view, onNavigate }: { view: View; onNavigate: (v: View) => void } = $props();
</script>

<div class="min-h-screen flex flex-col">
  <Header active={view.name} {onNavigate} />

  <main class="flex-1 px-4 sm:px-6 pt-6 sm:pt-8 pb-24 sm:pb-8 mx-auto w-full max-w-5xl">
    {#if view.name === 'oversikt'}
      <PotteOversikt {onNavigate} />
    {:else if view.name === 'potte'}
      <PotteDetalj potteId={view.potteId} {onNavigate} />
    {:else if view.name === 'katalog'}
      <PlanteKatalog {onNavigate} />
    {:else if view.name === 'dyrking'}
      <Dyrking {onNavigate} />
    {/if}
  </main>
</div>
