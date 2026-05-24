<script lang="ts">
  import { supabase } from '../lib/supabase';

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let feilmelding = $state('');

  async function loggInn(e: Event) {
    e.preventDefault();
    if (!email || !password) return;
    busy = true;
    feilmelding = '';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) feilmelding = oversettFeil(error.message);
    busy = false;
  }

  function oversettFeil(msg: string): string {
    if (/invalid login/i.test(msg)) return 'Feil e-post eller passord';
    if (/email not confirmed/i.test(msg)) return 'E-post ikke bekreftet ennå';
    return msg;
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
  <!-- bakgrunns-glow -->
  <div class="absolute inset-0 -z-10">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-leaf/8 rounded-full blur-3xl"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky/6 rounded-full blur-3xl"></div>
  </div>

  <div class="card p-8 sm:p-10 w-full max-w-md animate-fade-in">
    <div class="flex items-center gap-3 mb-1">
      <span class="text-3xl">🌱</span>
      <h1 class="text-2xl font-bold tracking-tight">Plantepotte</h1>
    </div>
    <p class="text-text-muted text-sm mb-8">Logg inn for å styre pottene</p>

    <form onsubmit={loggInn} class="flex flex-col gap-4">
      <div>
        <label for="email" class="label block mb-1.5">E-post</label>
        <input
          id="email"
          type="email"
          autocomplete="email"
          bind:value={email}
          placeholder="din@epost.no"
          required
          class="input"
        />
      </div>
      <div>
        <label for="password" class="label block mb-1.5">Passord</label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          bind:value={password}
          required
          class="input"
        />
      </div>

      {#if feilmelding}
        <div class="text-rose text-sm bg-rose/10 border border-rose/30 rounded-lg px-3 py-2">
          {feilmelding}
        </div>
      {/if}

      <button type="submit" disabled={busy} class="btn-primary mt-2">
        {busy ? 'Logger inn…' : 'Logg inn'}
      </button>
    </form>
  </div>
</div>
