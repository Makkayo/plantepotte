<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { potter, pottePlanter, loadPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import { blomsterkasseOppsett, bakSeksjon, vannNivaProsent } from '../lib/utils';
  import { beregnVannTrend } from '../lib/trend';
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import AnleggPanel from './AnleggPanel.svelte';
  import LysKontroll from './LysKontroll.svelte';
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
  let timer: ReturnType<typeof setInterval> | undefined;
  let historikk = $state<PottePlanteFull[]>([]);
  let iDriftLagrer = $state(false);
  let bekreftDrift = $state(false);

  // Sensorhistorikk (siste 7 dager) → vanntrend + jordfukt-sparkline per felt.
  type SensorRad = {
    registrert_at: string | null;
    vann_avstand_mm: number | null;
    jord1: number | null;
    jord2: number | null;
    jord3: number | null;
    jord4: number | null;
  };
  let sensorHistorikk = $state<SensorRad[]>([]);

  const naaVannPct = $derived(
    vannNivaProsent(sensor?.vann_avstand_mm, potte?.vann_tom_mm ?? undefined, potte?.vann_full_mm ?? undefined),
  );
  const vannTrend = $derived(
    beregnVannTrend(sensorHistorikk, naaVannPct, potte?.vann_tom_mm ?? undefined, potte?.vann_full_mm ?? undefined),
  );

  async function loadSensorHistorikk() {
    const sjuDagerSiden = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await supabase
      .from('potte_sensor_data')
      .select('registrert_at, vann_avstand_mm, jord1, jord2, jord3, jord4')
      .eq('potte_id', potteId)
      .gte('registrert_at', sjuDagerSiden)
      .order('registrert_at', { ascending: true })
      .limit(2200);
    if (data) sensorHistorikk = data as SensorRad[];
  }

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
    await Promise.all([refresh(), loadPottePlanter(potteId), loadHistorikk(), loadSensorHistorikk()]);
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
    const { error } = await supabase.from('potter').update({ skillevegger: ny }).eq('id', kasse.id);
    if (!error) {
      potter.update((liste) => liste.map((p) => (p.id === kasse.id ? { ...p, skillevegger: ny } : p)));
    } else {
      console.error('Lagring av skillevegg feilet:', error);
      skilleveggFeil = 'Kunne ikke lagre — prøv igjen (sjekk at du er innlogget).';
    }
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

    <!-- Anlegget: vekstlys + vannreservoar + pottene (oktagoner) -->
    <AnleggPanel
      {potte}
      {sensor}
      {command}
      trend={vannTrend}
      {oppsett}
      pottePlanter={planter}
      {sensorHistorikk}
      onAddPlante={apneVelger}
      onFjernPlante={fjernPlante}
      onToggleSkille={settSkillevegg}
      onLagreNotat={lagreNotat}
      onCommandLagret={refresh}
    />

    {#if skilleveggFeil}
      <div class="p-3 rounded-lg bg-rose/10 border border-rose/30 text-rose text-sm">
        {skilleveggFeil}
      </div>
    {/if}

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

    <!-- Lyskontroll med kompatibilitet -->
    <LysKontroll
      {potteId}
      planter={planter.map((p) => p.plante)}
      {command}
      onLagret={refresh}
    />

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
