<script lang="ts">
  /**
   * «Anlegget» — hovedstatus-seksjonen i potte-detaljen (design-handoff juni 2026).
   * Viser riggen live: vekstlys (toggle + lysbjelke), vannreservoar med flottør,
   * og pottene som oktagoner der fukten stiger nedenfra. Trykk på et felt eller
   * tanken → bunn-ark med detaljer/handlinger.
   */
  import { supabase } from '../lib/supabase';
  import { potter } from '../lib/stores';
  import {
    jordfuktProsent,
    vannNivaProsent,
    fuktStatus,
    jordSparkline,
    minutterSiden,
    formaterTidssiden,
    OFFLINE_GRENSE_MIN,
    VANN_TOM_MM,
    VANN_FULL_MM,
    foranSeksjon,
    bakSeksjon,
    type PotteOppsett,
  } from '../lib/utils';
  import { beregnDli } from '../lib/lys';
  import type { Plante, Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import type { VannTrend } from '../lib/trend';
  import PotteViz from './Potte.svelte';
  import VannFlottor from './viz/VannFlottor.svelte';
  import Sheet from './Sheet.svelte';

  type SensorRad = { registrert_at: string | null; jord1: number | null; jord2: number | null; jord3: number | null; jord4: number | null };
  type FeltData = { seksjon: number; slotLabel: string; plante: Plante | null; fukt: number | null };

  let {
    potte,
    sensor,
    command,
    trend,
    oppsett,
    pottePlanter,
    sensorHistorikk,
    onAddPlante,
    onFjernPlante,
    onToggleSkille,
    onLagreNotat,
    onCommandLagret,
  }: {
    potte: Potte;
    sensor: PotteSensorData | null;
    command: PotteCommand | null;
    trend: VannTrend;
    oppsett: PotteOppsett[];
    pottePlanter: PottePlanteFull[];
    sensorHistorikk: SensorRad[];
    onAddPlante: (seksjon: number) => void;
    onFjernPlante: (pottePlanteId: string) => void;
    onToggleSkille: (potteIdx: number, nyDelt: boolean) => void;
    onLagreNotat: (pottePlanteId: string, tekst: string) => void;
    onCommandLagret: () => void;
  } = $props();

  // ---------- tilkobling + klima ----------
  const minSiden = $derived(minutterSiden(sensor?.registrert_at));
  const offline = $derived(minSiden !== null && minSiden > OFFLINE_GRENSE_MIN);
  const sist = $derived(formaterTidssiden(sensor?.registrert_at));

  // ---------- jord-verdier per seksjon ----------
  function jordRaa(seksjon: number): number | null {
    if (!sensor) return null;
    return [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4][seksjon - 1] ?? null;
  }

  const pots = $derived(
    oppsett.map((po) => {
      const felt: FeltData[] = po.plasser.map((plass) => {
        if (plass.rolle === 'hel') {
          const front = foranSeksjon(po.potteNr - 1);
          const back = bakSeksjon(po.potteNr - 1);
          const pp = pottePlanter.find((p) => p.seksjon === front);
          const verdier = [jordfuktProsent(jordRaa(front)), jordfuktProsent(jordRaa(back))].filter(
            (x): x is number => x !== null,
          );
          const fukt = verdier.length
            ? Math.round(verdier.reduce((a, b) => a + b, 0) / verdier.length)
            : null;
          return { seksjon: plass.seksjon, slotLabel: 'Hele potta', plante: pp?.plante ?? null, fukt };
        }
        const pp = pottePlanter.find((p) => p.seksjon === plass.seksjon);
        return {
          seksjon: plass.seksjon,
          slotLabel: plass.etikett,
          plante: pp?.plante ?? null,
          fukt: jordfuktProsent(jordRaa(plass.seksjon)),
        };
      });
      return { potteNr: po.potteNr, navn: `Potte ${po.potteNr}`, delt: po.delt, felt };
    }),
  );

  // ---------- vekstlys ----------
  function timerLengde(c: PotteCommand): number {
    const p = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return (h ?? 0) + (m ?? 0) / 60;
    };
    const d = ((p(c.timer_off) - p(c.timer_on)) % 24 + 24) % 24;
    return d === 0 && c.timer_on !== c.timer_off ? 24 : d;
  }

  let lysLagrer = $state(false);
  let sisteIntensitet = $state(100);
  $effect(() => {
    if (command && command.intensitet > 0) sisteIntensitet = command.intensitet;
  });

  const lysPaa = $derived(!!command && command.intensitet > 0);
  const lysDli = $derived(command ? beregnDli(command.intensitet, timerLengde(command)) : 0);
  const lysMeta = $derived(
    !command
      ? 'Ikke satt'
      : lysPaa
        ? `${Math.round(timerLengde(command))} t lys · ${lysDli.toFixed(1).replace('.', ',')} DLI`
        : 'Av',
  );

  async function toggleLys() {
    if (lysLagrer) return;
    lysLagrer = true;
    const nyIntensitet = lysPaa ? 0 : sisteIntensitet || 100;
    const { error } = await supabase.from('potte_commands').upsert(
      {
        potte_id: potte.potte_id,
        intensitet: nyIntensitet,
        timer_on: command?.timer_on ?? '07:00',
        timer_off: command?.timer_off ?? '23:00',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'potte_id' },
    );
    lysLagrer = false;
    if (!error) onCommandLagret();
  }

  // ---------- vann ----------
  const vannPct = $derived(
    vannNivaProsent(sensor?.vann_avstand_mm, potte.vann_tom_mm ?? undefined, potte.vann_full_mm ?? undefined),
  );

  // ---------- bunn-ark ----------
  type Aapent =
    | null
    | {
        type: 'felt';
        seksjon: number;
        pottePlanteId: string;
        plante: string;
        slot: string;
        fukt: number | null;
        adc: number | null;
        hist: number[];
        notater: string | null;
      }
    | { type: 'vann' };
  let aapent = $state<Aapent>(null);
  let notatRediger = $state(false);
  let notatTekst = $state('');
  const lukk = () => {
    aapent = null;
    notatRediger = false;
  };

  function startNotat(naa: string | null) {
    notatTekst = naa ?? '';
    notatRediger = true;
  }
  function lagreNotat(id: string) {
    onLagreNotat(id, notatTekst.trim());
    if (aapent?.type === 'felt') aapent = { ...aapent, notater: notatTekst.trim() || null };
    notatRediger = false;
  }

  function feltTrykk(seksjon: number) {
    const pp = pottePlanter.find((p) => p.seksjon === seksjon);
    if (!pp) {
      onAddPlante(seksjon); // tomt felt → åpne plantevelger direkte
      return;
    }
    // Finn visnings-data (fukt/slot) fra pots for konsistens med oktagonen.
    let fukt: number | null = jordfuktProsent(jordRaa(seksjon));
    let slot = '';
    for (const po of pots) {
      const f = po.felt.find((x) => x.seksjon === seksjon);
      if (f) {
        fukt = f.fukt;
        slot = f.slotLabel;
      }
    }
    const hist = jordSparkline(
      sensorHistorikk.map((r) => ({
        registrert_at: r.registrert_at,
        verdi: jordfuktProsent([r.jord1, r.jord2, r.jord3, r.jord4][seksjon - 1] ?? null),
      })),
    );
    aapent = {
      type: 'felt',
      seksjon,
      pottePlanteId: pp.id,
      plante: pp.plante.navn,
      slot,
      fukt,
      adc: jordRaa(seksjon),
      hist,
      notater: pp.notater,
    };
    notatRediger = false;
  }

  // ---------- vann-kalibrering (i reservoar-arket) ----------
  let kalibrerer = $state<'tom' | 'full' | null>(null);
  let kalibreringsFeil = $state<string | null>(null);

  async function settKalibrering(type: 'tom' | 'full') {
    const mm = sensor?.vann_avstand_mm;
    if (mm == null || kalibrerer !== null) return;
    kalibreringsFeil = null;
    if (type === 'tom') {
      const full = potte.vann_full_mm ?? VANN_FULL_MM;
      if (mm <= full) {
        kalibreringsFeil = `Avlest ${mm} mm er ikke større enn full-punktet (${full} mm). Tom tank skal gi størst avstand.`;
        return;
      }
    } else {
      const tom = potte.vann_tom_mm ?? VANN_TOM_MM;
      if (mm >= tom) {
        kalibreringsFeil = `Avlest ${mm} mm er ikke mindre enn tom-punktet (${tom} mm). Full tank skal gi minst avstand.`;
        return;
      }
    }
    kalibrerer = type;
    const oppdatering: Partial<Potte> = type === 'tom' ? { vann_tom_mm: mm } : { vann_full_mm: mm };
    const { error } = await supabase.from('potter').update(oppdatering).eq('id', potte.id);
    if (!error) {
      potter.update((liste) => liste.map((p) => (p.id === potte.id ? { ...p, ...oppdatering } : p)));
    } else {
      console.error('Kalibrering feilet:', error);
      kalibreringsFeil = 'Lagring feilet — prøv igjen (sjekk at du er innlogget).';
    }
    kalibrerer = null;
  }

  const arkFukt = $derived(aapent?.type === 'felt' ? fuktStatus(aapent.fukt) : null);
</script>

<div class="flex flex-col gap-3">
  <!-- Tilkobling + klima -->
  {#if potte.har_sensorer}
    <div class="flex items-center justify-between text-[11px] font-mono">
      <span class="inline-flex items-center gap-2 {offline ? 'text-sun' : 'text-text-muted'}">
        <span
          class="w-[7px] h-[7px] rounded-full {offline ? 'bg-sun' : 'bg-leaf'}"
          style="box-shadow: 0 0 0 3px {offline ? 'rgba(251,191,36,0.16)' : 'rgba(74,222,128,0.16)'}"
        ></span>
        {offline ? `Ingen kontakt · ${sist}` : 'Tilkoblet'}
      </span>
      {#if sensor && (sensor.temperatur !== null || sensor.luftfuktighet !== null)}
        <span class="text-text-muted tabular-nums">
          {sensor.temperatur?.toFixed(1).replace('.', ',') ?? '–'}° · {sensor.luftfuktighet?.toFixed(0) ?? '–'}%
        </span>
      {/if}
    </div>
  {/if}

  <!-- Vekstlys -->
  <div class="card px-[15px] py-3.5 stig" style="--d: 60ms">
    <div class="flex items-center justify-between mb-3">
      <div>
        <div class="text-[13px] font-semibold">Vekstlys</div>
        <div class="font-mono text-[10.5px] text-text-muted mt-0.5">{lysMeta}</div>
      </div>
      <button
        class="w-11 h-[25px] rounded-full p-[3px] flex items-center transition-all duration-200 disabled:opacity-50 {lysPaa
          ? 'bg-leaf justify-end'
          : 'bg-border justify-start'}"
        onclick={toggleLys}
        disabled={lysLagrer}
        role="switch"
        aria-checked={lysPaa}
        aria-label="Skru vekstlyset {lysPaa ? 'av' : 'på'}"
      >
        <span class="w-[19px] h-[19px] rounded-full bg-bg block shadow"></span>
      </button>
    </div>
    <div class="flex items-center gap-2.5">
      <span class="font-mono text-[9.5px] text-text-dim">07</span>
      <div
        class="flex-1 h-[13px] rounded-[7px] bg-surface-raised border border-border flex items-center justify-around px-1.5 transition-opacity duration-200"
        style="opacity: {lysPaa ? 1 : 0.25}"
      >
        {#each Array.from({ length: 12 }) as _, i (i)}
          <span class="w-1 h-1 rounded-full bg-leaf-glow"></span>
        {/each}
      </div>
      <span class="font-mono text-[9.5px] text-text-dim">23</span>
    </div>
  </div>

  <!-- Vannreservoar -->
  {#if potte.har_sensorer}
    <div class="stig" style="--d: 120ms">
      <VannFlottor pct={vannPct} {trend} onClick={() => (aapent = { type: 'vann' })} />
    </div>
  {/if}

  <!-- Pottene -->
  <div class="stig" style="--d: 180ms">
    <div class="flex items-baseline justify-between mb-3">
      <div class="text-[13px] font-semibold">Pottene</div>
      <div class="font-mono text-[11px] text-text-dim">trykk på et felt</div>
    </div>
    <div class="flex gap-3.5 items-start">
      {#each pots as p (p.potteNr)}
        <PotteViz
          navn={p.navn}
          delt={p.delt}
          felt={p.felt}
          onToggleSkille={() => onToggleSkille(p.potteNr - 1, !p.delt)}
          onFelt={feltTrykk}
        />
      {/each}
    </div>
  </div>
</div>

<!-- Felt-detalj -->
<Sheet open={aapent?.type === 'felt'} onClose={lukk}>
  {#if aapent?.type === 'felt'}
    {@const f = aapent}
    <div class="flex items-start justify-between gap-3.5">
      <div>
        <div class="font-display text-[25px] font-semibold leading-[1.05]">{f.plante}</div>
        <div class="font-mono text-[11px] text-text-muted mt-1">{f.slot} · jordfukt</div>
      </div>
      <div class="font-display text-[38px] font-semibold leading-none" style="color:{arkFukt?.farge}">
        {f.fukt ?? '—'}{#if f.fukt !== null}%{/if}
      </div>
    </div>

    <div class="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white/[0.04] text-xs">
      <span class="w-2 h-2 rounded-full" style="background:{arkFukt?.farge}"></span>{arkFukt?.tekst}
    </div>

    <div class="mt-5">
      <div class="flex items-baseline justify-between mb-2">
        <span class="text-[11px] text-text-muted">Siste 7 dager</span>
        <span class="font-mono text-[10px] text-text-dim">jordfukt %</span>
      </div>
      <div class="flex items-end gap-1.5 h-14">
        {#each f.hist as h, i (i)}
          <div class="flex-1 rounded-t-[3px] bg-[#323a52]" style="height: {Math.max(4, h)}%"></div>
        {/each}
      </div>
    </div>

    <div class="mt-5">
      {#if notatRediger}
        <textarea
          bind:value={notatTekst}
          rows="2"
          placeholder="Notat — f.eks. «sådde 5 frø, spirte 4. juni»"
          class="input !text-sm resize-none"
        ></textarea>
        <div class="flex gap-2 mt-2 justify-end">
          <button class="btn-ghost text-xs !px-2 !py-1" onclick={() => (notatRediger = false)}>Avbryt</button>
          <button class="btn-secondary text-xs !px-2 !py-1" onclick={() => lagreNotat(f.pottePlanteId)}>Lagre notat</button>
        </div>
      {:else if f.notater}
        <button
          class="text-left text-sm text-text-muted italic hover:text-text transition-colors"
          onclick={() => startNotat(f.notater)}
        >
          📝 {f.notater}
        </button>
      {:else}
        <button class="text-xs text-text-dim hover:text-text transition-colors" onclick={() => startNotat(null)}>
          + Legg til notat
        </button>
      {/if}
    </div>

    <div class="flex gap-2.5 mt-5">
      <button class="btn-secondary flex-1" onclick={() => { lukk(); onAddPlante(f.seksjon); }}>Bytt plante</button>
      <button class="btn-danger flex-1" onclick={() => { lukk(); onFjernPlante(f.pottePlanteId); }}>Fjern</button>
    </div>
    <button class="btn-secondary w-full mt-2.5" onclick={lukk}>Lukk</button>

    <div class="mt-3.5 font-mono text-[10.5px] text-text-dim text-center">
      Probe {f.slot.toLowerCase()} · {f.adc ?? '—'} ADC (rå)
    </div>
  {/if}
</Sheet>

<!-- Reservoar-detalj -->
<Sheet open={aapent?.type === 'vann'} onClose={lukk}>
  {#if aapent?.type === 'vann'}
    <div class="font-display text-[25px] font-semibold leading-[1.05]">Vannreservoar</div>
    <div class="font-mono text-[11px] text-text-muted mt-1">Lasermålt nivå · flottør</div>

    <div class="flex gap-2.5 mt-[18px]">
      <div class="flex-1 bg-bg-subtle border border-border rounded-xl py-3.5 px-2 text-center">
        <div class="font-display text-[26px] font-semibold leading-none text-sky">{vannPct ?? '—'}%</div>
        <div class="font-mono text-[10px] text-text-muted mt-1.5">fylt</div>
      </div>
      <div class="flex-1 bg-bg-subtle border border-border rounded-xl py-3.5 px-2 text-center">
        <div class="font-display text-[26px] font-semibold leading-none tabular-nums">{trend.literIgjen.toFixed(1).replace('.', ',')}</div>
        <div class="font-mono text-[10px] text-text-muted mt-1.5">liter igjen</div>
      </div>
      <div class="flex-1 bg-bg-subtle border border-border rounded-xl py-3.5 px-2 text-center">
        <div class="font-display text-[26px] font-semibold leading-none tabular-nums">{trend.dagerIgjen !== null ? Math.round(trend.dagerIgjen) : '–'}</div>
        <div class="font-mono text-[10px] text-text-muted mt-1.5">dager</div>
      </div>
    </div>

    {#if sensor?.vann_avstand_mm != null}
      <div class="flex gap-2.5 mt-5">
        <button class="btn-primary flex-1" disabled={kalibrerer !== null} onclick={() => settKalibrering('full')}>
          {kalibrerer === 'full' ? 'Lagrer…' : 'Marker som fylt'}
        </button>
        <button class="btn-secondary flex-1" onclick={lukk}>Lukk</button>
      </div>
      <button
        class="w-full mt-2.5 text-[11px] text-text-dim hover:text-text-muted transition-colors"
        disabled={kalibrerer !== null}
        onclick={() => settKalibrering('tom')}
      >
        {kalibrerer === 'tom' ? 'Lagrer…' : 'Tanken er tom nå (kalibrer bunn-nivå)'}
      </button>
      <div class="mt-2 font-mono text-[10px] text-text-dim text-center tabular-nums">
        Avlest {sensor.vann_avstand_mm} mm · tom {potte.vann_tom_mm ?? `${VANN_TOM_MM}*`} · full {potte.vann_full_mm ?? `${VANN_FULL_MM}*`}
      </div>
      {#if kalibreringsFeil}
        <div class="mt-2 p-2 rounded-md bg-rose/10 border border-rose/30 text-rose text-[11px]">{kalibreringsFeil}</div>
      {/if}
    {:else}
      <button class="btn-secondary w-full mt-5" onclick={lukk}>Lukk</button>
    {/if}
  {/if}
</Sheet>
