<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { potter, pottePlanter, loadPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import { blomsterkasseOppsett, antallPlasser, bakSeksjon } from '../lib/utils';
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import SensorPanel from './SensorPanel.svelte';
  import LysKontroll from './LysKontroll.svelte';
  import PlanteSlot from './PlanteSlot.svelte';
  import PlanteVelger from './PlanteVelger.svelte';

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { potteId, onNavigate }: { potteId: string; onNavigate: (v: View) => void } = $props();

  const potte = $derived($potter.find((p) => p.potte_id === potteId));
  const planter = $derived($pottePlanter[potteId] ?? []);
  // Oppsettet (potter + plasser) regnes ut fra skillevegg-lista — én sannhet.
  const oppsett = $derived(potte ? blomsterkasseOppsett(potte.skillevegger) : []);

  let command = $state<PotteCommand | null>(null);
  let sensor = $state<PotteSensorData | null>(null);
  let velgerSeksjon = $state<number | null>(null);
  let skilleveggFeil = $state<string | null>(null);
  let lagrerSkillevegg = $state<number | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;
  let historikk = $state<PottePlanteFull[]>([]);
  let iDriftLagrer = $state(false);
  let bekreftDrift = $state(false);

  async function refresh() {
    const [cmd, sens] = await Promise.all([
      supabase
        .from('potte_commands')
        .select('*')
        .eq('potte_id', potteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('potte_sensor_data')
        .select('*')
        .eq('potte_id', potteId)
        .order('registrert_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (cmd.data) command = cmd.data;
    if (sens.data) sensor = sens.data;
  }

  onMount(async () => {
    await Promise.all([refresh(), loadPottePlanter(potteId), loadHistorikk()]);
    timer = setInterval(refresh, 10000);
  });

  async function loadHistorikk() {
    const { data } = await supabase
      .from('potte_planter')
      .select('*, plante:planter(*)')
      .eq('potte_id', potteId)
      .not('fjernet_at', 'is', null)
      .order('fjernet_at', { ascending: false });
    if (data) historikk = data as unknown as PottePlanteFull[];
  }
  onDestroy(() => clearInterval(timer));

  async function fjernPlante(pottePlanteId: string) {
    // I drift: myk-slett (behold for historikk). I testmodus: slett helt.
    if (potte?.i_drift) {
      await supabase
        .from('potte_planter')
        .update({ fjernet_at: new Date().toISOString() })
        .eq('id', pottePlanteId);
    } else {
      await supabase.from('potte_planter').delete().eq('id', pottePlanteId);
    }
    await Promise.all([loadPottePlanter(potteId), loadHistorikk()]);
  }

  async function lagreNotat(pottePlanteId: string, tekst: string) {
    await supabase.from('potte_planter').update({ notater: tekst || null }).eq('id', pottePlanteId);
    await loadPottePlanter(potteId);
  }

  async function settIDrift(ny: boolean) {
    const kasse = potte;
    if (!kasse || iDriftLagrer) return;
    iDriftLagrer = true;
    const { error } = await supabase.from('potter').update({ i_drift: ny }).eq('id', kasse.id);
    if (!error) {
      // Go-live: nullstill plantedato til nå for aktive planter → ren start.
      if (ny && planter.length > 0) {
        await supabase
          .from('potte_planter')
          .update({ plantet_at: new Date().toISOString() })
          .eq('potte_id', potteId)
          .is('fjernet_at', null);
        await loadPottePlanter(potteId);
      }
      potter.update((liste) => liste.map((p) => (p.id === kasse.id ? { ...p, i_drift: ny } : p)));
    } else {
      console.error('Lagring av i_drift feilet:', error);
    }
    iDriftLagrer = false;
  }

  function klikkDrift() {
    if (potte?.i_drift) {
      settIDrift(false); // tilbake til test — harmløst, ingen bekreftelse
    } else if (bekreftDrift) {
      bekreftDrift = false;
      settIDrift(true);
    } else {
      bekreftDrift = true; // armér: andre klikk går i drift (nullstiller datoer)
    }
  }

  function formaterDato(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  }
  function varighet(fra: string, til: string | null): string {
    const slutt = til ? new Date(til).getTime() : Date.now();
    const dager = Math.max(0, Math.floor((slutt - new Date(fra).getTime()) / 86400000));
    return `${dager} ${dager === 1 ? 'dag' : 'dager'}`;
  }

  function apneVelger(seksjon: number) {
    velgerSeksjon = seksjon;
  }

  /** Visningsnavn for en plass, f.eks. «Potte 1 · foran» eller «Potte 2» (udelt). */
  function plassLabelFor(seksjon: number): string {
    for (const po of oppsett) {
      const pl = po.plasser.find((x) => x.seksjon === seksjon);
      if (pl) {
        return pl.rolle === 'hel'
          ? `Potte ${po.potteNr}`
          : `Potte ${po.potteNr} · ${pl.etikett.toLowerCase()}`;
      }
    }
    return `plass ${seksjon}`;
  }

  async function planteValgt(planteId: string) {
    if (velgerSeksjon === null) return;
    const seksjon = velgerSeksjon;
    // Den delvise unik-indeksen tillater bare én AKTIV plante per plass, så en
    // evt. eksisterende må fjernes først (myk-slett i drift, ellers hard-slett).
    const eksisterende = planter.find((pp) => pp.seksjon === seksjon);
    if (eksisterende) {
      if (potte?.i_drift) {
        await supabase
          .from('potte_planter')
          .update({ fjernet_at: new Date().toISOString() })
          .eq('id', eksisterende.id);
      } else {
        await supabase.from('potte_planter').delete().eq('id', eksisterende.id);
      }
    }
    await supabase.from('potte_planter').insert({ potte_id: potteId, plante_id: planteId, seksjon });
    velgerSeksjon = null;
    await Promise.all([loadPottePlanter(potteId), loadHistorikk()]);
  }

  /** Slå skillevegg av/på for én potte (beholder). */
  async function settSkillevegg(potteIdx: number, nyDelt: boolean) {
    const kasse = potte;
    if (!kasse) return;
    skilleveggFeil = null;
    // Slår man av skilleveggen, må den bakre plassen være tom — ellers ville
    // planten der blitt usynlig (seksjonen finnes fortsatt i databasen).
    if (!nyDelt && planter.some((p) => p.seksjon === bakSeksjon(potteIdx))) {
      skilleveggFeil = `Fjern planten i «bak» på Potte ${potteIdx + 1} før du tar bort skilleveggen.`;
      return;
    }
    const ny = [...kasse.skillevegger];
    ny[potteIdx] = nyDelt;
    lagrerSkillevegg = potteIdx;
    const { error } = await supabase.from('potter').update({ skillevegger: ny }).eq('id', kasse.id);
    if (!error) {
      potter.update((liste) => liste.map((p) => (p.id === kasse.id ? { ...p, skillevegger: ny } : p)));
    } else {
      console.error('Lagring av skillevegg feilet:', error);
      skilleveggFeil = 'Kunne ikke lagre — prøv igjen (sjekk at du er innlogget).';
    }
    lagrerSkillevegg = null;
  }
</script>

{#if !potte}
  <div class="text-text-muted text-sm">Blomsterkasse ikke funnet.</div>
{:else}
  <div class="flex flex-col gap-6">
    <!-- Tilbake-knapp + tittel -->
    <div class="flex items-center gap-3">
      <button
        class="btn-ghost !px-2 !py-2 -ml-2"
        onclick={() => onNavigate({ name: 'oversikt' })}
        aria-label="Tilbake"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <span>{potte.emoji ?? '🪴'}</span>
          {potte.navn}
        </h1>
        {#if potte.notater}
          <p class="text-text-muted text-sm mt-0.5">{potte.notater}</p>
        {/if}
      </div>
    </div>

    <!-- Drift-status: testmodus vs ekte drift -->
    <div class="card p-4 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="font-medium text-sm">{potte.i_drift ? '🌱 I drift' : '🧪 Testmodus'}</div>
        <p class="text-text-muted text-xs mt-0.5">
          {potte.i_drift
            ? 'Plantedato og historikk teller for ekte.'
            : 'Lek fritt — plantedato og historikk lagres ikke før du går i drift.'}
        </p>
      </div>
      <button
        class="shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 {potte.i_drift
          ? 'border-border text-text-muted hover:text-text hover:border-border-strong'
          : bekreftDrift
            ? 'border-sun/50 bg-sun/10 text-sun'
            : 'border-leaf/40 bg-leaf/10 text-leaf hover:bg-leaf/15'}"
        disabled={iDriftLagrer}
        onclick={klikkDrift}
      >
        {iDriftLagrer
          ? 'Lagrer…'
          : potte.i_drift
            ? 'Sett i testmodus'
            : bekreftDrift
              ? 'Bekreft — nullstiller datoer'
              : 'Sett i drift →'}
      </button>
    </div>

    <!-- Planter: 2 potter (beholdere), hver med valgfri skillevegg (foran/bak) -->
    <section class="card p-5">
      <div class="flex items-end justify-between mb-4">
        <div>
          <h2 class="font-semibold text-lg">Planter</h2>
          <p class="text-text-muted text-xs mt-0.5">
            {planter.length} av {antallPlasser(potte.skillevegger)} planteplasser i bruk
          </p>
        </div>
      </div>

      {#if skilleveggFeil}
        <div class="mb-4 p-3 rounded-lg bg-rose/10 border border-rose/30 text-rose text-sm">
          {skilleveggFeil}
        </div>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each oppsett as po (po.potteNr)}
          <div class="rounded-xl border border-border p-3">
            <!-- Potte-header med skillevegg-bryter -->
            <div class="flex items-center justify-between mb-3">
              <span class="font-medium text-sm">Potte {po.potteNr}</span>
              <button
                class="text-[11px] px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 {po.delt
                  ? 'border-leaf/40 bg-leaf/10 text-leaf'
                  : 'border-border text-text-muted hover:text-text hover:border-border-strong'}"
                disabled={lagrerSkillevegg === po.potteNr - 1}
                onclick={() => settSkillevegg(po.potteNr - 1, !po.delt)}
                aria-pressed={po.delt}
                title={po.delt
                  ? 'Fjern skilleveggen (slå sammen til én plass)'
                  : 'Sett inn skillevegg (del i foran/bak)'}
              >
                {po.delt ? '✓ Skillevegg' : 'Ingen skillevegg'}
              </button>
            </div>

            <!-- Planteplasser: 1 (hel) eller 2 (foran/bak) med skillevegg-strek imellom -->
            <div class="flex items-stretch gap-2">
              {#each po.plasser as plass, i (plass.seksjon)}
                {#if i > 0}
                  <div class="w-[3px] self-stretch bg-border rounded-full my-1" aria-hidden="true"></div>
                {/if}
                {@const eksisterende = planter.find((pp) => pp.seksjon === plass.seksjon)}
                <div class="flex-1 min-w-0">
                  <PlanteSlot
                    etikett={plass.etikett}
                    plante={eksisterende?.plante ?? null}
                    pottePlanteId={eksisterende?.id ?? null}
                    plantetAt={eksisterende?.plantet_at ?? null}
                    notater={eksisterende?.notater ?? null}
                    iDrift={potte.i_drift}
                    onLeggTil={() => apneVelger(plass.seksjon)}
                    onFjern={(id) => fjernPlante(id)}
                    onNotat={(id, tekst) => lagreNotat(id, tekst)}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Lyskontroll med kompatibilitet -->
    <LysKontroll
      {potteId}
      planter={planter.map((p) => p.plante)}
      {command}
      onLagret={refresh}
    />

    <!-- Sensorer -->
    {#if potte.har_sensorer}
      <SensorPanel {sensor} {potte} />
    {/if}

    <!-- Historikk: tidligere planter (kun samlet i drift-modus) -->
    {#if historikk.length > 0}
      <section class="card p-5">
        <h2 class="font-semibold text-lg">Historikk</h2>
        <p class="text-text-muted text-xs mt-0.5 mb-4">Planter som har stått i denne kassa tidligere.</p>
        <div class="space-y-2.5">
          {#each historikk as h (h.id)}
            <div class="flex items-center gap-3">
              <span class="text-xl shrink-0">{h.plante.emoji ?? '🌿'}</span>
              <span class="flex-1 min-w-0 truncate text-sm">{h.plante.navn}</span>
              <span class="text-xs text-text-dim shrink-0 text-right leading-tight">
                stod {varighet(h.plantet_at, h.fjernet_at)}<br />
                <span class="text-[11px]">{formaterDato(h.plantet_at)}–{formaterDato(h.fjernet_at)}</span>
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>

  {#if velgerSeksjon !== null}
    <PlanteVelger
      plassLabel={plassLabelFor(velgerSeksjon)}
      eksisterendePlanter={planter.map((p) => p.plante)}
      onLukk={() => (velgerSeksjon = null)}
      onValgt={planteValgt}
    />
  {/if}
{/if}
