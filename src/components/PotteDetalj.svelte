<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { potter, pottePlanter, loadPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import {
    blomsterkasseOppsett,
    bakSeksjon,
    vannNivaProsent,
    jordfuktProsent,
    sensorEtikett,
    minutterSiden,
    OFFLINE_GRENSE_MIN,
  } from '../lib/utils';
  import { beregnVannTrend } from '../lib/trend';
  import { kasseNaering } from '../lib/naering';
  import { probeHelse, vekeHelse } from '../lib/diagnose';
  import { simStore, hentSim, simSensor, simHistorikk, simPlantetAt } from '../lib/simulering';
  import { visFeil } from '../lib/toast';
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import AnleggPanel from './AnleggPanel.svelte';
  import PlanteVelger from './PlanteVelger.svelte';
  import Veksttidslinje from './Veksttidslinje.svelte';
  import TestSimulator from './TestSimulator.svelte';
  import Sheet from './Sheet.svelte';
  import KasseInnstillinger from './KasseInnstillinger.svelte';

  let { potteId }: { potteId: string } = $props();

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
  let visInnstillinger = $state(false);

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

  // ---- Testmodus-simulator: syntetiske data + gate-flip så ALT forhåndsvises ----
  const sim = $derived(hentSim($simStore, potteId));
  const simAktiv = $derived(!!potte && !potte.i_drift && sim.aktiv);
  // I sim later vi som om kassa er i drift + har sensorer, så høsting, næring,
  // sensorkort og diagnose alle spiller på syntetiske data.
  const effektivPotte = $derived(potte && simAktiv ? { ...potte, i_drift: true, har_sensorer: true } : potte);
  const effektivSensor = $derived(simAktiv && potte ? simSensor(sim, potte) : sensor);
  const effektivHistorikk = $derived(
    simAktiv && potte ? (simHistorikk(sim, potte) as SensorRad[]) : sensorHistorikk,
  );
  const effektivePlanter = $derived(
    simAktiv ? planter.map((p) => ({ ...p, plantet_at: simPlantetAt(sim) })) : planter,
  );
  const naaVannPct = $derived(
    vannNivaProsent(effektivSensor?.vann_avstand_mm, effektivPotte?.vann_tom_mm ?? undefined, effektivPotte?.vann_full_mm ?? undefined),
  );
  const vannTrend = $derived(
    beregnVannTrend(effektivHistorikk, naaVannPct, effektivPotte?.vann_tom_mm ?? undefined, effektivPotte?.vann_full_mm ?? undefined),
  );

  const detaljOffline = $derived.by(() => {
    const m = minutterSiden(effektivSensor?.registrert_at);
    return m !== null && m > OFFLINE_GRENSE_MIN;
  });

  // To-fase næring: i ekte drift, eller i sim-forhåndsvisning.
  const naering = $derived(
    effektivPotte?.i_drift ? kasseNaering(effektivePlanter.map((p) => p.plantet_at)) : null,
  );

  // Maskinvare-diagnose fra 7-dagers historikken (løs/død probe + veke-kontakt).
  const probeFunn = $derived.by(() => {
    if (!effektivPotte?.har_sensorer) return [] as { label: string; melding: string }[];
    const ut: { label: string; melding: string }[] = [];
    for (let kanal = 1; kanal <= 4; kanal++) {
      const punkter = effektivHistorikk.map((r) => ({
        t: new Date(r.registrert_at ?? 0).getTime(),
        raw: [r.jord1, r.jord2, r.jord3, r.jord4][kanal - 1] ?? null,
      }));
      const f = probeHelse(punkter);
      if (f.melding && (f.status === 'frakoblet' || f.status === 'fastlast')) {
        ut.push({ label: sensorEtikett(kanal, effektivPotte.skillevegger), melding: f.melding });
      }
    }
    return ut;
  });

  const vekeFunn = $derived.by(() => {
    if (!effektivPotte?.har_sensorer) return { advar: false, melding: null as string | null };
    const jordSerie = effektivHistorikk.map((r) => {
      const verdier = [r.jord1, r.jord2, r.jord3, r.jord4]
        .map((x) => jordfuktProsent(x))
        .filter((x): x is number => x !== null);
      return {
        t: new Date(r.registrert_at ?? 0).getTime(),
        pct: verdier.length ? verdier.reduce((a, b) => a + b, 0) / verdier.length : NaN,
      };
    });
    return vekeHelse(jordSerie, vannTrend.sistFyltAt);
  });

  const harDiagnose = $derived(probeFunn.length > 0 || vekeFunn.advar);

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
    const { error } = potte?.i_drift
      ? await supabase
          .from('potte_planter')
          .update({ fjernet_at: new Date().toISOString() })
          .eq('id', pottePlanteId)
      : await supabase.from('potte_planter').delete().eq('id', pottePlanteId);
    if (error) {
      visFeil('Kunne ikke fjerne planten — prøv igjen.');
      return;
    }
    await Promise.all([loadPottePlanter(potteId), loadHistorikk()]);
  }

  async function lagreNotat(pottePlanteId: string, tekst: string) {
    const { error } = await supabase
      .from('potte_planter')
      .update({ notater: tekst || null })
      .eq('id', pottePlanteId);
    if (error) {
      visFeil('Kunne ikke lagre notatet.');
      return;
    }
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
      visFeil('Kunne ikke endre drift-status.');
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
    const { error } = await supabase
      .from('potte_planter')
      .insert({ potte_id: potteId, plante_id: planteId, seksjon });
    velgerSeksjon = null;
    if (error) {
      visFeil('Kunne ikke legge til planten — prøv igjen.');
      return;
    }
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
  <div class="max-w-[430px] mx-auto w-full flex flex-col gap-5">
    <!-- Header: tilbake + kassenavn + tilkoblet-dot -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <button
          class="w-[34px] h-[34px] rounded-[10px] card flex items-center justify-center shrink-0 hover:brightness-125 transition-all"
          onclick={() => window.history.back()}
          aria-label="Tilbake"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 class="font-display text-[22px] font-semibold leading-none truncate">{potte.navn}</h1>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        {#if effektivPotte?.har_sensorer}
          <span class="inline-flex items-center gap-1.5 font-mono text-[11px] {detaljOffline ? 'text-sun' : 'text-text-muted'}">
            <span
              class="w-[7px] h-[7px] rounded-full {detaljOffline ? 'bg-sun' : 'bg-leaf'}"
              style="box-shadow:0 0 0 3px {detaljOffline ? 'rgba(251,191,36,0.16)' : 'rgba(74,222,128,0.16)'}"
            ></span>
            {detaljOffline ? 'Frakoblet' : 'Tilkoblet'}
          </span>
        {/if}
        <button
          class="w-[34px] h-[34px] rounded-[10px] card flex items-center justify-center hover:brightness-125 transition-all text-text-muted"
          onclick={() => (visInnstillinger = true)}
          aria-label="Innstillinger for kassa"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
        </button>
      </div>
    </div>

    <!-- Anlegget: vekstlys + vannreservoar + pottene (oktagoner).
         I sim peker alt på syntetiske «effektiv»-data. -->
    <AnleggPanel
      potte={effektivPotte ?? potte}
      sensor={effektivSensor}
      {command}
      trend={vannTrend}
      {oppsett}
      planter={effektivePlanter.map((p) => p.plante)}
      pottePlanter={effektivePlanter}
      sensorHistorikk={effektivHistorikk}
      onAddPlante={apneVelger}
      onFjernPlante={fjernPlante}
      onToggleSkille={settSkillevegg}
      onLagreNotat={lagreNotat}
      onCommandLagret={refresh}
      simulert={simAktiv}
    />

    {#if skilleveggFeil}
      <div class="p-3 rounded-lg bg-rose/10 border border-rose/30 text-rose text-sm">
        {skilleveggFeil}
      </div>
    {/if}

    <!-- Maskinvare-sjekk: løs/død jordprobe eller veke uten kontakt -->
    {#if harDiagnose}
      <div class="card p-4 border-sun/30 bg-sun/[0.06]">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-base">🔧</span>
          <h2 class="font-display text-sm font-semibold">Maskinvare-sjekk</h2>
        </div>
        <ul class="space-y-1.5">
          {#each probeFunn as f (f.label)}
            <li class="text-xs text-text-muted leading-snug">
              <span class="text-text font-medium">{f.label}:</span> {f.melding}
            </li>
          {/each}
          {#if vekeFunn.advar}
            <li class="text-xs text-text-muted leading-snug">
              <span class="text-text font-medium">Veke:</span> {vekeFunn.melding}
            </li>
          {/if}
        </ul>
      </div>
    {/if}

    <!-- To-fase næring: minner om overgangen fra rent vann til næring -->
    {#if naering}
      <div class="card p-4 flex items-start gap-3 {naering.handlingNaa ? 'border-leaf/40' : ''}">
        <span class="text-xl shrink-0">{naering.handlingNaa ? '🧪' : '🌱'}</span>
        <div class="min-w-0">
          <div class="font-medium text-sm {naering.handlingNaa ? 'text-leaf-glow' : ''}">{naering.tittel}</div>
          <p class="text-text-muted text-xs mt-0.5 leading-snug">{naering.melding}</p>
        </div>
      </div>
    {/if}

    <!-- Veksttidslinje: kamerabilder fra Storage. Kun for kasser med sensor-
         /kamera-rigg — en ren lys-kasse har ikke kamera og skal ikke vise en
         evig «ingen bilder ennå». -->
    {#if effektivPotte?.har_sensorer}
      <Veksttidslinje {potteId} />
    {/if}

    <!-- Historikk: tidligere planter (kun samlet i drift-modus) -->
    {#if historikk.length > 0}
      <section class="card p-5">
        <h2 class="font-display text-lg font-semibold">Historikk</h2>
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

    <!-- Drift-status + simulator: ETT felt, alltid nederst. Simulatoren er en
         del av testmodus (samme kort), ikke et eget kort — den er skjult
         automatisk når kassa er i drift (klikk «Sett i testmodus» viser den igjen). -->
    <div class="card p-4">
      <div class="flex items-center justify-between gap-3">
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

      {#if !potte.i_drift}
        <TestSimulator {potteId} />
      {/if}
    </div>
  </div>

  {#if velgerSeksjon !== null}
    <PlanteVelger
      plassLabel={plassLabelFor(velgerSeksjon)}
      eksisterendePlanter={planter.map((p) => p.plante)}
      onLukk={() => (velgerSeksjon = null)}
      onValgt={planteValgt}
    />
  {/if}

  <Sheet open={visInnstillinger} onClose={() => (visInnstillinger = false)}>
    {#if visInnstillinger && potte}
      <KasseInnstillinger
        kasse={potte}
        onLukk={() => (visInnstillinger = false)}
        onLagret={() => {
          // Slettet kasse → gå tilbake til oversikten.
          if (!$potter.find((p) => p.potte_id === potteId)) window.history.back();
        }}
      />
    {/if}
  </Sheet>
{/if}
