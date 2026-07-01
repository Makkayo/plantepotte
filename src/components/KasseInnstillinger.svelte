<script lang="ts">
  /**
   * Innstillinger for en blomsterkasse — brukes både til Å OPPRETTE en ny kasse
   * (kasse = null) og REDIGERE en eksisterende. Vises i et bunn-ark (Sheet).
   * Redigerbart: navn, emoji, notat, har_sensorer. Ved opprettelse i tillegg
   * potte_id (må matche ESP32-ens POTTE_ID) + skillevegger. Sletting i rediger.
   */
  import { supabase } from '../lib/supabase';
  import { potter, user } from '../lib/stores';
  import { visFeil, visOk } from '../lib/toast';
  import type { Potte } from '../lib/database.types';

  let {
    kasse,
    onLukk,
    onLagret,
  }: { kasse: Potte | null; onLukk: () => void; onLagret: () => void } = $props();

  // Skjemaet kopierer kasse-feltene ÉN gang ved åpning (komponenten remountes
  // hver gang arket åpnes via {#if} i forelderen), så engangs-kopi er riktig.
  // k0 = plain const (ikke-reaktiv) → unngår «state_referenced_locally».
  // svelte-ignore state_referenced_locally
  const k0 = kasse;
  const erNy = k0 === null;
  let potteId = $state(k0?.potte_id ?? '');
  let navn = $state(k0?.navn ?? '');
  let emoji = $state(k0?.emoji ?? '🪴');
  let notater = $state(k0?.notater ?? '');
  let harSensorer = $state(k0?.har_sensorer ?? true);
  let skille = $state<boolean[]>(k0 ? [...k0.skillevegger] : [false, false]);
  let lagrer = $state(false);
  let bekreftSlett = $state(false);

  const hurtigEmoji = ['🪴', '🌿', '🌱', '🥬', '🍅', '🌺', '🌶️', '🍓'];

  async function lagre() {
    if (!navn.trim()) {
      visFeil('Gi kassa et navn.');
      return;
    }
    if (erNy && !/^[a-z0-9_-]+$/i.test(potteId.trim())) {
      visFeil('potte_id må fylles ut (bokstaver/tall, må matche ESP32-en).');
      return;
    }
    lagrer = true;
    if (erNy) {
      const { data, error } = await supabase
        .from('potter')
        .insert({
          potte_id: potteId.trim(),
          navn: navn.trim(),
          emoji: emoji.trim() || '🪴',
          notater: notater.trim() || null,
          har_sensorer: harSensorer,
          skillevegger: skille,
          i_drift: false,
          owner_id: $user?.id ?? null,
        })
        .select()
        .single();
      lagrer = false;
      if (error) {
        visFeil(
          /duplicate|unique/i.test(error.message)
            ? `Det finnes allerede en kasse med potte_id «${potteId.trim()}».`
            : 'Kunne ikke opprette kassa.',
        );
        return;
      }
      if (data) potter.update((l) => [...l, data as Potte]);
      visOk('Blomsterkasse opprettet');
    } else {
      const oppd = {
        navn: navn.trim(),
        emoji: emoji.trim() || '🪴',
        notater: notater.trim() || null,
        har_sensorer: harSensorer,
      };
      const { error } = await supabase.from('potter').update(oppd).eq('id', kasse!.id);
      lagrer = false;
      if (error) {
        visFeil('Kunne ikke lagre endringene.');
        return;
      }
      potter.update((l) => l.map((p) => (p.id === kasse!.id ? { ...p, ...oppd } : p)));
      visOk('Lagret');
    }
    onLagret();
    onLukk();
  }

  async function slett() {
    if (!kasse) return;
    lagrer = true;
    // Rydd også kommandoer og sensordata: de har ingen FK til potter, så uten
    // dette blir de liggende igjen — og gjenoppretter man en kasse med samme
    // potte_id, våkner den gamle lyskommandoen og gammel sensordata «arves».
    await Promise.all([
      supabase.from('potte_planter').delete().eq('potte_id', kasse.potte_id),
      supabase.from('potte_commands').delete().eq('potte_id', kasse.potte_id),
      supabase.from('potte_sensor_data').delete().eq('potte_id', kasse.potte_id),
    ]);
    const { error } = await supabase.from('potter').delete().eq('id', kasse.id);
    lagrer = false;
    if (error) {
      visFeil('Kunne ikke slette kassa.');
      return;
    }
    potter.update((l) => l.filter((p) => p.id !== kasse.id));
    visOk('Blomsterkasse slettet');
    onLagret();
    onLukk();
  }
</script>

<div class="font-display text-[25px] font-semibold leading-[1.05]">
  {erNy ? 'Ny blomsterkasse' : 'Innstillinger'}
</div>
<div class="font-mono text-[11px] text-text-muted mt-1">
  {erNy ? 'Sett opp en ny kasse' : potteId}
</div>

<div class="flex flex-col gap-4 mt-5">
  {#if erNy}
    <div>
      <label for="potteid" class="label block mb-1.5">potte_id</label>
      <input id="potteid" bind:value={potteId} placeholder="f.eks. potte2" class="input font-mono" />
      <p class="text-[11px] text-text-dim mt-1">Må være lik <code>POTTE_ID</code> i ESP32-ens config.py.</p>
    </div>
  {/if}

  <div>
    <label for="navn" class="label block mb-1.5">Navn</label>
    <input id="navn" bind:value={navn} placeholder="f.eks. Kjøkkenkassa" class="input" />
  </div>

  <div>
    <span class="label block mb-1.5">Emoji</span>
    <div class="flex items-center gap-2">
      <input bind:value={emoji} maxlength="4" class="input !w-16 text-center text-xl" aria-label="Emoji" />
      <div class="flex gap-1 flex-wrap">
        {#each hurtigEmoji as e (e)}
          <button
            class="w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors {emoji ===
            e
              ? 'bg-leaf/15 border border-leaf/30'
              : 'bg-surface-raised border border-border hover:bg-surface-hover'}"
            onclick={() => (emoji = e)}
          >
            {e}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div>
    <label for="notat" class="label block mb-1.5">Notat (valgfritt)</label>
    <textarea id="notat" bind:value={notater} rows="2" placeholder="f.eks. står på kjøkkenbenken" class="input resize-none"></textarea>
  </div>

  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-medium">Har sensorer</div>
      <div class="text-[11px] text-text-muted">Jordfukt, vann, temp/luftfukt</div>
    </div>
    <button
      class="w-11 h-[25px] rounded-full p-[3px] flex items-center transition-all {harSensorer
        ? 'bg-leaf justify-end'
        : 'bg-border justify-start'}"
      onclick={() => (harSensorer = !harSensorer)}
      role="switch"
      aria-checked={harSensorer}
      aria-label="Har sensorer"
    >
      <span class="w-[19px] h-[19px] rounded-full bg-bg block shadow"></span>
    </button>
  </div>

  {#if erNy}
    <div>
      <span class="label block mb-2">Skillevegger</span>
      <div class="flex flex-col gap-2">
        {#each skille as _, i (i)}
          <div class="flex items-center justify-between bg-bg-subtle border border-border rounded-lg px-3 py-2">
            <span class="text-sm">Potte {i + 1}</span>
            <button
              class="text-xs px-2.5 py-1 rounded-full border transition-colors {skille[i]
                ? 'bg-leaf/10 text-leaf-glow border-leaf/30'
                : 'bg-surface-raised text-text-muted border-border'}"
              onclick={() => (skille[i] = !skille[i])}
            >
              {skille[i] ? 'Delt (2 felt)' : 'Udelt (1 felt)'}
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <button class="btn-primary w-full mt-1" onclick={lagre} disabled={lagrer}>
    {lagrer ? 'Lagrer…' : erNy ? 'Opprett kasse' : 'Lagre'}
  </button>
  <button class="btn-secondary w-full" onclick={onLukk}>Avbryt</button>

  {#if !erNy}
    <div class="pt-2 mt-1 border-t border-border">
      {#if bekreftSlett}
        <div class="text-[12px] text-rose mb-2 text-center">Sletter kassa og dens planter. Sikker?</div>
        <div class="flex gap-2.5">
          <button class="btn-secondary flex-1" onclick={() => (bekreftSlett = false)}>Nei</button>
          <button class="btn-danger flex-1" onclick={slett} disabled={lagrer}>Ja, slett</button>
        </div>
      {:else}
        <button class="text-[12px] text-rose hover:underline w-full text-center" onclick={() => (bekreftSlett = true)}>
          Slett blomsterkasse
        </button>
      {/if}
    </div>
  {/if}
</div>
