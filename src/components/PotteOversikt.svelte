<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { potter, pottePlanter, loadAllPottePlanter } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import { kasseVarsler, type VarselAlvor, type VarselHistorikkRad } from '../lib/varsler';
  import { vannNivaProsent } from '../lib/utils';
  import { beregnVannTrend } from '../lib/trend';
  import { ppfdMaks } from '../lib/settings';
  import { simStore, hentSim, simHistorikk, effektivKasse } from '../lib/simulering';
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import PotteKort from './PotteKort.svelte';
  import Sheet from './Sheet.svelte';
  import KasseInnstillinger from './KasseInnstillinger.svelte';

  let visNy = $state(false);

  type View = { name: 'oversikt' } | { name: 'potte'; potteId: string } | { name: 'katalog' };
  let { onNavigate }: { onNavigate: (v: View) => void } = $props();

  let commands = $state<Record<string, PotteCommand>>({});
  let sensors = $state<Record<string, PotteSensorData>>({});
  let historikk = $state<Record<string, VarselHistorikkRad[]>>({});
  let now = $state(new Date()); // driver sol-buen i kortene
  let timer: ReturnType<typeof setInterval> | undefined;

  // Historikken (4 døgn, kun kolonnene varsel-motoren trenger) driver trend-
  // («holder ~X dager») og overvåt-varslene i feeden. Den endrer seg sakte
  // (én ny rad per 5 min), så vi henter den ved mount + hvert kvarter — ikke
  // i hver 10-sekunders refresh.
  let sistHistorikkHentet = 0;
  const HISTORIKK_REFRESH_MS = 15 * 60_000;
  const HISTORIKK_DOGN = 4; // trend trenger ≥6 t, overvåt 3 døgn + margin

  async function loadHistorikk() {
    sistHistorikkHentet = Date.now();
    const fra = new Date(Date.now() - HISTORIKK_DOGN * 86_400_000).toISOString();
    const potteListe = get(potter).filter((p) => p.har_sensorer);
    const svar = await Promise.all(
      potteListe.map((p) =>
        supabase
          .from('potte_sensor_data')
          .select('registrert_at, vann_avstand_mm, jord1, jord2, jord3, jord4')
          .eq('potte_id', p.potte_id)
          .gte('registrert_at', fra)
          .order('registrert_at', { ascending: true })
          .limit(1300),
      ),
    );
    const m: Record<string, VarselHistorikkRad[]> = {};
    svar.forEach((res, idx) => {
      if (res.data) m[potteListe[idx]!.potte_id] = res.data as VarselHistorikkRad[];
    });
    historikk = m;
  }

  async function refresh() {
    now = new Date();
    // Nyeste avlesning hentes PER potte (limit 1 hver). En felles
    // «siste 50 rader»-spørring ville latt en aktiv potte skvise en
    // offline potte helt ut av lista etter noen timer — da så det ut som
    // den aldri hadde sendt data, akkurat når man trenger å se at noe er galt.
    const potteListe = get(potter);
    const [cmd, sensSvar] = await Promise.all([
      supabase.from('potte_commands').select('*'),
      Promise.all(
        potteListe.map((p) =>
          supabase
            .from('potte_sensor_data')
            .select('*')
            .eq('potte_id', p.potte_id)
            .order('registrert_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ),
      ),
    ]);

    if (cmd.data) {
      const m: Record<string, PotteCommand> = {};
      for (const c of cmd.data) m[c.potte_id] = c;
      commands = m;
    }
    const m: Record<string, PotteSensorData> = {};
    sensSvar.forEach((res, idx) => {
      if (res.data) m[potteListe[idx]!.potte_id] = res.data;
    });
    sensors = m;
    if (Date.now() - sistHistorikkHentet > HISTORIKK_REFRESH_MS) {
      loadHistorikk(); // bevisst uten await — feeden kan oppdatere i bakgrunnen
    }
  }

  onMount(async () => {
    await Promise.all([refresh(), loadAllPottePlanter()]);
    timer = setInterval(refresh, 10000);
  });
  onDestroy(() => clearInterval(timer));

  // Testmodus-simulator: bruker DEN ENE delte effektivKasse()-implementasjonen
  // (samme som PotteDetalj, se simulering.ts) — så en simulert kasse
  // forhåndsviser konsistent i BÅDE kortet og handlingsfeeden under, akkurat
  // som i detaljen. Aldri kopier denne logikken lokalt igjen.
  interface Kasse {
    potte: Potte;
    effektivPotte: Potte;
    effektivSensor: PotteSensorData | undefined;
    effektivePlanter: PottePlanteFull[];
    effektivHistorikk: VarselHistorikkRad[];
    /** Trend-prognose («holder ~X dager») til kortet. null = ukjent/fylles. */
    dagerIgjen: number | null;
    simAktiv: boolean;
  }
  const kasser = $derived.by((): Kasse[] =>
    $potter.map((p) => {
      const e = effektivKasse(p, $pottePlanter[p.potte_id] ?? [], sensors[p.potte_id], $simStore);
      // Sim-kasser får syntetisk historikk (samme kilde som detaljen) så trend-
      // og diagnose-funksjonene også kan forhåndsvises i testmodus.
      const hist = e.simAktiv
        ? simHistorikk(hentSim($simStore, p.potte_id), p)
        : historikk[p.potte_id] ?? [];
      const vannPct = vannNivaProsent(
        e.sensor?.vann_avstand_mm,
        e.potte.vann_tom_mm ?? undefined,
        e.potte.vann_full_mm ?? undefined,
      );
      const trend = beregnVannTrend(hist, vannPct, e.potte.vann_tom_mm ?? undefined, e.potte.vann_full_mm ?? undefined);
      return {
        potte: p,
        effektivPotte: e.potte,
        effektivSensor: e.sensor,
        effektivePlanter: e.planter,
        effektivHistorikk: hist,
        dagerIgjen: trend.gyldig ? trend.dagerIgjen : null,
        simAktiv: e.simAktiv,
      };
    }),
  );

  // Handlingsfeed: hele regelverket bor i lib/varsler.ts (kasseVarsler) — REN,
  // testet logikk med maks ett varsel per kategori per kasse. Komponenten gjør
  // bare to ting: velger effektive data (sim eller ekte) og render.
  const varsler = $derived.by(() => {
    const ut: { potteId: string; navn: string; melding: string; alvor: VarselAlvor; ikon: string; simulert: boolean }[] = [];
    for (const { potte: p, effektivPotte, effektivSensor, effektivePlanter, effektivHistorikk, simAktiv } of kasser) {
      for (const v of kasseVarsler({
        potte: effektivPotte,
        sensor: effektivSensor,
        command: commands[p.potte_id],
        planter: effektivePlanter,
        historikk: effektivHistorikk,
        ppfdMaks: $ppfdMaks,
      })) {
        ut.push({ potteId: p.potte_id, navn: p.navn, ...v, simulert: simAktiv });
      }
    }
    return ut;
  });

  // Fire tydelige betydninger: rød = problem, gul = frakoblet, blå = oppgave
  // (næring), grønn = klar til høsting. Distinkte toner så feed-en er lesbar.
  const varselStil: Record<VarselAlvor, string> = {
    hoy: 'bg-rose/[0.12] border-rose/35',
    mid: 'bg-sun/[0.12] border-sun/35',
    gjøremål: 'bg-sky/[0.12] border-sky/35',
    positiv: 'bg-leaf/[0.12] border-leaf/35',
  };
</script>

<div class="max-w-[430px] md:max-w-4xl mx-auto w-full flex flex-col gap-3.5">
  <div class="mb-1">
    <h1 class="font-display text-[25px] font-semibold leading-tight tracking-tight">Mine blomsterkasser</h1>
    <p class="font-mono text-[11px] text-text-muted mt-1.5">
      {$potter.length} {$potter.length === 1 ? 'blomsterkasse' : 'blomsterkasser'}
    </p>
  </div>

  <!-- Advarsler (kun i appen — ingen telefon-varsler) -->
  {#if varsler.length > 0}
    <div class="flex flex-col gap-2">
      {#each varsler as v (v.potteId + v.melding)}
        <button
          class="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-xl border transition-all hover:brightness-110 {varselStil[
            v.alvor
          ]} {v.simulert ? '!border-dashed' : ''}"
          onclick={() => onNavigate({ name: 'potte', potteId: v.potteId })}
        >
          <span class="text-base leading-none">{v.ikon}</span>
          <span class="flex-1 text-sm leading-snug">
            <span class="font-semibold">{v.navn}:</span>
            <span class="text-text-muted">{v.melding}</span>
            {#if v.simulert}
              <span class="text-text-dim">· 🧪 simulert</span>
            {/if}
          </span>
          <span class="text-text-dim text-lg leading-none" aria-hidden="true">›</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if $potter.length === 0}
    <div class="card p-10 text-center text-text-muted">
      <div class="text-3xl mb-3">🪴</div>
      <p>Ingen blomsterkasser registrert ennå</p>
    </div>
  {:else}
    <!-- Mobil: én kolonne (uendret). Desktop: kortene i et 2-kolonners grid så
         den brede skjermen faktisk brukes i stedet for døde sidemarger. -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
      {#each kasser as k (k.potte.id)}
        <PotteKort
          potte={k.effektivPotte}
          command={commands[k.potte.potte_id]}
          sensor={k.effektivSensor}
          planter={k.effektivePlanter}
          dagerIgjen={k.dagerIgjen}
          {now}
          onClick={() => onNavigate({ name: 'potte', potteId: k.potte.potte_id })}
          simulert={k.simAktiv}
        />
      {/each}
    </div>
  {/if}

  <button
    class="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl border border-dashed border-border-strong text-text-muted hover:text-text hover:bg-surface-raised/40 transition-colors"
    onclick={() => (visNy = true)}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    <span class="text-sm font-medium">Legg til blomsterkasse</span>
  </button>
</div>

<Sheet open={visNy} onClose={() => (visNy = false)}>
  {#if visNy}
    <KasseInnstillinger kasse={null} onLukk={() => (visNy = false)} onLagret={() => {}} />
  {/if}
</Sheet>
