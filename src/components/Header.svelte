<script lang="ts">
  import { supabase } from '../lib/supabase';
  import { user } from '../lib/stores';
  import { overlayOpened } from '../lib/overlayBack';

  type View =
    | { name: 'oversikt' }
    | { name: 'potte'; potteId: string }
    | { name: 'katalog' }
    | { name: 'dyrking' };
  let { active, onNavigate }: { active: View['name']; onNavigate: (v: View) => void } = $props();

  async function loggUt() {
    await supabase.auth.signOut();
  }

  let bekreftLoggUt = $state(false);

  // Maskinvare-/nettleser-tilbake lukker logg-ut-bekreftelsen.
  $effect(() => {
    if (bekreftLoggUt) return overlayOpened(() => (bekreftLoggUt = false));
  });

  // «Kasser» dekker både oversikten og en åpnet blomsterkasse-detalj.
  const kasserAktiv = $derived(active === 'oversikt' || active === 'potte');
</script>

<header class="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border">
  <div class="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center gap-4">
    <button
      class="flex items-center gap-2 text-text hover:text-leaf transition-colors"
      onclick={() => onNavigate({ name: 'oversikt' })}
    >
      <span class="text-xl">🌱</span>
      <span class="font-semibold tracking-tight">Plantepotte</span>
    </button>

    <!-- Desktop-nav -->
    <nav class="ml-auto hidden sm:flex items-center gap-1">
      <button
        class="px-3 py-1.5 rounded-lg text-sm transition-colors {kasserAktiv
          ? 'bg-surface-raised text-text'
          : 'text-text-muted hover:text-text hover:bg-surface-raised/50'}"
        onclick={() => onNavigate({ name: 'oversikt' })}
      >
        Mine blomsterkasser
      </button>
      <button
        class="px-3 py-1.5 rounded-lg text-sm transition-colors {active === 'katalog'
          ? 'bg-surface-raised text-text'
          : 'text-text-muted hover:text-text hover:bg-surface-raised/50'}"
        onclick={() => onNavigate({ name: 'katalog' })}
      >
        Plantekatalog
      </button>
      <button
        class="px-3 py-1.5 rounded-lg text-sm transition-colors {active === 'dyrking'
          ? 'bg-surface-raised text-text'
          : 'text-text-muted hover:text-text hover:bg-surface-raised/50'}"
        onclick={() => onNavigate({ name: 'dyrking' })}
      >
        Dyrking
      </button>
      <div class="flex items-center ml-2 pl-3 border-l border-border">
        <span class="text-xs text-text-dim mr-3">{$user?.email}</span>
        <button class="btn-ghost text-xs" onclick={() => (bekreftLoggUt = true)}>Logg ut</button>
      </div>
    </nav>

    <!-- Mobil: kun «logg ut» til høyre (navigasjon ligger i bunnlinja) -->
    <button
      class="ml-auto sm:hidden btn-ghost !px-2 !py-2"
      onclick={() => (bekreftLoggUt = true)}
      aria-label="Logg ut"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    </button>
  </div>
</header>

<!-- Mobil bunn-navigasjon (tommel-vennlig) -->
<nav
  class="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border"
  style="padding-bottom: env(safe-area-inset-bottom);"
>
  <div class="flex">
    <button
      class="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors {kasserAktiv ? 'text-leaf' : 'text-text-muted'}"
      onclick={() => onNavigate({ name: 'oversikt' })}
      aria-current={kasserAktiv ? 'page' : undefined}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
      <span class="text-[11px] font-medium">Kasser</span>
    </button>
    <button
      class="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors {active === 'katalog' ? 'text-leaf' : 'text-text-muted'}"
      onclick={() => onNavigate({ name: 'katalog' })}
      aria-current={active === 'katalog' ? 'page' : undefined}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      <span class="text-[11px] font-medium">Katalog</span>
    </button>
    <button
      class="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors {active === 'dyrking' ? 'text-leaf' : 'text-text-muted'}"
      onclick={() => onNavigate({ name: 'dyrking' })}
      aria-current={active === 'dyrking' ? 'page' : undefined}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
      <span class="text-[11px] font-medium">Dyrking</span>
    </button>
  </div>
</nav>

{#if bekreftLoggUt}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
    <button
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      aria-label="Avbryt"
      onclick={() => (bekreftLoggUt = false)}
    ></button>
    <div class="relative card p-6 w-full max-w-sm text-center">
      <div class="text-3xl mb-2">👋</div>
      <h2 class="font-semibold text-lg">Logge ut?</h2>
      <p class="text-text-muted text-sm mt-1">Du må logge inn igjen for å styre pottene.</p>
      <div class="flex gap-2 mt-5">
        <button class="btn-secondary flex-1" onclick={() => (bekreftLoggUt = false)}>Avbryt</button>
        <button class="btn-primary flex-1" onclick={loggUt}>Logg ut</button>
      </div>
    </div>
  </div>
{/if}
