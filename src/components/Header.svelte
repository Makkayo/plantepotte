<script lang="ts">
  import { supabase } from '../lib/supabase';
  import { user } from '../lib/stores';

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { active, onNavigate }: { active: View['name']; onNavigate: (v: View) => void } = $props();

  async function loggUt() {
    await supabase.auth.signOut();
  }
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

    <nav class="ml-auto flex items-center gap-1">
      <button
        class="px-3 py-1.5 rounded-lg text-sm transition-colors {active === 'oversikt'
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
      <div class="hidden sm:flex items-center ml-2 pl-3 border-l border-border">
        <span class="text-xs text-text-dim mr-3">{$user?.email}</span>
        <button class="btn-ghost text-xs" onclick={loggUt}>Logg ut</button>
      </div>
      <button class="sm:hidden btn-ghost text-xs ml-1" onclick={loggUt} title="Logg ut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </nav>
  </div>
</header>
