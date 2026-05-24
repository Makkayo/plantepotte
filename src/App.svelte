<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from './lib/stores';
  import { loadReferenceData } from './lib/stores';
  import Login from './components/Login.svelte';
  import Shell from './components/Shell.svelte';

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };

  let currentView: View = $state({ name: 'oversikt' });
  let dataLoaded = $state(false);

  $effect(() => {
    if ($user && !dataLoaded) {
      loadReferenceData().then(() => {
        dataLoaded = true;
      });
    }
    if (!$user) {
      dataLoaded = false;
    }
  });

  function navigate(view: View) {
    currentView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    // Hash routing for shareable URLs (kept simple — single-level)
    const fromHash = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (!h || h === 'oversikt') return navigate({ name: 'oversikt' });
      if (h === 'katalog') return navigate({ name: 'katalog' });
      if (h.startsWith('potte/')) return navigate({ name: 'potte', potteId: h.slice(6) });
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  });

  $effect(() => {
    const view = currentView;
    const hash =
      view.name === 'oversikt'
        ? ''
        : view.name === 'katalog'
          ? '#/katalog'
          : `#/potte/${view.potteId}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, '', window.location.pathname + (hash || ''));
    }
  });
</script>

{#if !$user}
  <Login />
{:else if !dataLoaded}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-text-muted text-sm animate-pulse">Laster…</div>
  </div>
{:else}
  <Shell view={currentView} onNavigate={navigate} />
{/if}
