<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from './lib/stores';
  import { loadReferenceData } from './lib/stores';
  import { handleOverlayBack } from './lib/overlayBack';
  import Login from './components/Login.svelte';
  import Shell from './components/Shell.svelte';
  import Toaster from './components/Toaster.svelte';

  type View =
    | { name: 'oversikt' }
    | { name: 'potte'; potteId: string }
    | { name: 'katalog' }
    | { name: 'dyrking' };

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

  function viewToHash(v: View): string {
    return v.name === 'oversikt'
      ? '#/'
      : v.name === 'katalog'
        ? '#/katalog'
        : v.name === 'dyrking'
          ? '#/dyrking'
          : `#/potte/${v.potteId}`;
  }
  function hashToView(): View {
    const h = window.location.hash.replace(/^#\/?/, '');
    if (!h || h === 'oversikt') return { name: 'oversikt' };
    if (h === 'katalog') return { name: 'katalog' };
    if (h === 'dyrking') return { name: 'dyrking' };
    if (h.startsWith('potte/')) return { name: 'potte', potteId: h.slice(6) };
    return { name: 'oversikt' };
  }
  function sameView(a: View, b: View): boolean {
    if (a.name !== b.name) return false;
    if (a.name === 'potte' && b.name === 'potte') return a.potteId === b.potteId;
    return true;
  }

  // Forover-navigasjon: legg en ny history-oppføring (maskinvare-tilbake ↩).
  function navigate(view: View) {
    if (sameView(view, currentView)) return;
    window.history.pushState({}, '', window.location.pathname + viewToHash(view));
    currentView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    const initial = hashToView();
    // Sørg for en oversikt-base å gå tilbake til ved direkte dyplenke,
    // slik at tilbake aldri «hopper rett ut» av en detalj-/katalog-side.
    if (initial.name !== 'oversikt') {
      window.history.replaceState({}, '', window.location.pathname + '#/');
      window.history.pushState({}, '', window.location.pathname + viewToHash(initial));
    }
    currentView = initial;

    const onPop = () => {
      // Tilbake lukker først et åpent overlegg (ark/modal); ellers naviger.
      if (handleOverlayBack()) return;
      const v = hashToView();
      if (!sameView(v, currentView)) {
        currentView = v;
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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

<Toaster />
