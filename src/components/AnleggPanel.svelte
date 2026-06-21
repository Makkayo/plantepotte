<script lang="ts">
  /**
   * «Anlegget» — hovedstatus-seksjonen i potte-detaljen (design-handoff juni 2026).
   * Viser riggen live: klima-stripe, vekstlys (toggle + tidslinje), vannreservoar
   * med flottør, og pottene som oktagoner der fukten stiger nedenfra. Trykk på et
   * felt / tanken / LUKE-merket / vekstlys-kortet → bunn-ark med detaljer/handlinger.
   */
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '../lib/supabase';
  import { potter } from '../lib/stores';
  import {
    jordfuktProsent,
    vannNivaProsent,
    fuktStatus,
    jordSparkline,
    VANN_TOM_MM,
    VANN_FULL_MM,
    foranSeksjon,
    bakSeksjon,
    type PotteOppsett,
  } from '../lib/utils';
  import { beregnDli } from '../lib/lys';
  import type {
    Plante,
    Potte,
    PotteCommand,
    PotteSensorData,
    PottePlanteFull,
  } from '../lib/database.types';
  import type { VannTrend } from '../lib/trend';
  import PotteViz from './Potte.svelte';
  import VannFlottor from './viz/VannFlottor.svelte';
  import LysSheet from './LysSheet.svelte';
  import Sheet from './Sheet.svelte';

  type SensorRad = {
    registrert_at: string | null;
    jord1: number | null;
    jord2: number | null;
    jord3: number | null;
    jord4: number | null;
  };
  type FeltData = {
    seksjon: number;
    slotLabel: string;
    rolle: 'foran' | 'bak' | 'hel';
    plante: Plante | null;
    fukt: number | null;
  };

  let {
    potte,
    sensor,
    command,
    trend,
    oppsett,
    planter,
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
    planter: Plante[];
    pottePlanter: PottePlanteFull[];
    sensorHistorikk: SensorRad[];
    onAddPlante: (seksjon: number) => void;
    onFjernPlante: (pottePlanteId: string) => void;
    onToggleSkille: (potteIdx: number, nyDelt: boolean) => void;
    onLagreNotat: (pottePlanteId: string, tekst: string) => void;
    onCommandLagret: () => void;
  } = $props();

  // ---------- klokke (driver tidslinje + sol-bue) ----------
  let now = $state(new Date());
  let nowTimer: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    nowTimer = setInterval(() => (now = new Date()), 60_000);
  });
  onDestroy(() => clearInterval(nowTimer));

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
          const verdier = [
            jordfuktProsent(jordRaa(front)),
            jordfuktProsent(jordRaa(back)),
          ].filter((x): x is number => x !== null);
          const fukt = verdier.length
            ? Math.round(verdier.reduce((a, b) => a + b, 0) / verdier.length)
            : null;
          return {
            seksjon: plass.seksjon,
            slotLabel: 'Hele potta',
            rolle: 'hel' as const,
            plante: pp?.plante ?? null,
            fukt,
          };
        }
        const pp = pottePlanter.find((p) => p.seksjon === plass.seksjon);
        return {
          seksjon: plass.seksjon,
          slotLabel: plass.etikett,
          rolle: plass.rolle,
          plante: pp?.plante ?? null,
          fukt: jordfuktProsent(jordRaa(plass.seksjon)),
        };
      });
      return { potteNr: po.potteNr, navn: `Potte ${po.potteNr}`, delt: po.delt, felt };
    }),
  );

  // ---------- vekstlys ----------
  function tMin(s: string): number {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  let lysLagrer = $state(false);
  let sisteIntensitet = $state(100);
  $effect(() => {
    if (command && command.intensitet > 0) sisteIntensitet = command.intensitet;
  });

  const lysPaa = $derived(!!command && command.intensitet > 0);

  const lysVarighet = $derived.by(() => {
    if (!command) return 0;
    const d = ((tMin(command.timer_off) - tMin(command.timer_on)) % 1440 + 1440) % 1440;
    return d === 0 && command.timer_on !== command.timer_off ? 1440 : d;
  });
  const lysRel = $derived(
    command ? ((now.getHours() * 60 + now.getMinutes() - tMin(command.timer_on)) % 1440 + 1440) % 1440 : 0,
  );
  const iLysVindu = $derived(lysPaa && lysVarighet > 0 && lysRel <= lysVarighet);
  const lysNaaPct = $derived(iLysVindu ? (lysRel / lysVarighet) * 100 : 0);

  function fmtVar(min: number): string {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m ? `${h} t ${m} min` : `${h} t`;
  }
  const lysCaption = $derived(
    !command || !lysPaa
      ? 'Slått av'
      : iLysVindu
        ? `Lyser nå · av om ${fmtVar(lysVarighet - lysRel)}`
        : `Av nå · slår på ${command.timer_on}`,
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
    vannNivaProsent(
      sensor?.vann_avstand_mm,
      potte.vann_tom_mm ?? undefined,
      potte.vann_full_mm ?? undefined,
    ),
  );
  const forbrukMaks = $derived(Math.max(0.1, ...(trend.dagligForbruk.length ? trend.dagligForbruk : [0.1])));

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
    | { type: 'vann' }
    | { type: 'lys' };
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
  <!-- Klima-stripe -->
  {#if potte.har_sensorer && sensor && (sensor.temperatur !== null || sensor.luftfuktighet !== null)}
    <div class="flex gap-2.5 stig" style="--d: 30ms">
      <div class="flex-1 flex items-center gap-[11px] card !rounded-[14px] px-3.5 py-[11px]">
        <div
          class="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
          style="background:rgba(232,112,42,0.14)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f0935a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/></svg>
        </div>
        <div>
          <div class="label !text-[10.5px] !tracking-[0.05em]">Temp</div>
          <div class="font-display text-[21px] font-semibold leading-tight">
            {sensor.temperatur?.toFixed(1).replace('.', ',') ?? '–'}°
          </div>
        </div>
      </div>
      <div class="flex-1 flex items-center gap-[11px] card !rounded-[14px] px-3.5 py-[11px]">
        <div
          class="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
          style="background:rgba(59,130,196,0.14)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6aa9e0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7Z"/></svg>
        </div>
        <div>
          <div class="label !text-[10.5px] !tracking-[0.05em]">Luftfukt</div>
          <div class="font-display text-[21px] font-semibold leading-tight">
            {sensor.luftfuktighet?.toFixed(0) ?? '–'}%
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Vekstlys — hele kortet åpner lys-arket; toggle stopper propagering -->
  <div
    class="card px-[15px] py-3.5 stig cursor-pointer hover:brightness-[1.06] transition-[filter] duration-200"
    style="--d: 60ms"
    role="button"
    tabindex="0"
    onclick={() => (aapent = { type: 'lys' })}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        aapent = { type: 'lys' };
      }
    }}
    aria-label="Åpne lysinnstillinger"
  >
    <div class="flex items-center justify-between mb-3">
      <div>
        <div class="text-[13px] font-semibold">Vekstlys</div>
        <div class="font-mono text-[10.5px] text-text-muted mt-0.5">
          {command ? `${command.timer_on} – ${command.timer_off}` : 'Ikke satt'}
        </div>
      </div>
      <button
        class="w-11 h-[25px] rounded-full p-[3px] flex items-center transition-all duration-200 disabled:opacity-50 {lysPaa
          ? 'bg-leaf justify-end'
          : 'bg-border justify-start'}"
        onclick={(e) => {
          e.stopPropagation();
          toggleLys();
        }}
        disabled={lysLagrer}
        role="switch"
        aria-checked={lysPaa}
        aria-label="Skru vekstlyset {lysPaa ? 'av' : 'på'}"
      >
        <span class="w-[19px] h-[19px] rounded-full bg-bg block shadow"></span>
      </button>
    </div>
    <div class="flex items-center gap-2.5">
      <span class="font-mono text-[9.5px] text-text-dim">{command?.timer_on ?? '–'}</span>
      <div
        class="relative flex-1 h-[14px] rounded-[7px] bg-surface-raised border border-border overflow-hidden transition-opacity duration-200"
        style="opacity:{lysPaa ? 1 : 0.3}"
      >
        <div
          class="absolute left-0 top-0 bottom-0 rounded-l-[6px]"
          style="width:{lysNaaPct}%; background:linear-gradient(90deg,rgba(74,222,128,0.2),rgba(74,222,128,0.5))"
        ></div>
        {#if iLysVindu}
          <div
            class="absolute top-1/2 w-[11px] h-[11px] rounded-full bg-leaf breathe-dot"
            style="left:{lysNaaPct}%; transform:translate(-50%,-50%); box-shadow:0 0 0 3px rgba(74,222,128,0.18),0 0 9px rgba(74,222,128,0.7)"
          ></div>
        {/if}
      </div>
      <span class="font-mono text-[9.5px] text-text-dim">{command?.timer_off ?? '–'}</span>
    </div>
    <div class="text-[11px] text-text-muted mt-2">{lysCaption}</div>
  </div>

  <!-- Vannreservoar -->
  {#if potte.har_sensorer}
    <div class="stig" style="--d: 120ms">
      <VannFlottor pct={vannPct} {trend} onClick={() => (aapent = { type: 'vann' })} />
    </div>
  {/if}

  <!-- Pottene -->
  {#if potte.har_sensorer}
    <div class="stig" style="--d: 180ms">
      <div class="flex items-baseline justify-between mb-3">
        <div class="text-[13px] font-semibold">Pottene</div>
        <div class="font-mono text-[11px] text-text-dim">trykk på et felt</div>
      </div>
      <div class="relative">
        <div class="flex gap-10 items-start">
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
        {#if pots.length > 1}
          <div
            class="absolute left-1/2 top-[34px] bottom-0 w-10 -translate-x-1/2 flex flex-col items-center justify-end pointer-events-none"
          >
            <div
              class="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[14px]"
              style="border-left:1px solid rgba(255,228,184,0.14); border-right:1px solid rgba(255,228,184,0.14); background:linear-gradient(180deg,rgba(111,90,66,0.25),rgba(56,43,28,0.25))"
            ></div>
            <button
              class="relative mb-2 flex flex-col items-center gap-1 pointer-events-auto active:brightness-125"
              onclick={() => (aapent = { type: 'vann' })}
              aria-label="Åpne vannreservoar (luke)"
            >
              <div
                class="flex items-center justify-center w-[30px] h-[26px] rounded-[7px]"
                style="background:#0d1320; border:1px solid #60a5fa; box-shadow:0 0 0 2px rgba(11,13,18,0.92),0 0 14px rgba(96,165,250,0.6)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#7cc0ff" stroke="none"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>
              </div>
              <span class="font-mono text-[8px] font-semibold tracking-[0.08em]" style="color:#9ecbff">LUKE</span>
            </button>
          </div>
        {/if}
      </div>
      {#if pots.length > 1}
        <div class="flex items-center justify-center gap-1.5 mt-3 font-mono text-[10px] text-text-dim">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#60a5fa" stroke="none"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>
          Luka sitter mellom pottene, på fronten
        </div>
      {/if}
    </div>
  {/if}
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

    <div class="flex items-start gap-2.5 mt-5 p-3 rounded-xl bg-bg-subtle border border-border">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>
      <div class="text-[12px] text-text-muted leading-snug">
        Selvvannet via veke fra reservoaret. Fukten styres ikke per felt — fyll reservoaret når det er lavt.
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
      <!-- Les f-feltene FØR lukk(): `f` er en reaktiv {@const}; etter at lukk()
           setter aapent=null, vil `f` re-evalueres til null og kaste TypeError. -->
      <button class="btn-secondary flex-1" onclick={() => { const s = f.seksjon; lukk(); onAddPlante(s); }}>Bytt plante</button>
      <button class="btn-danger flex-1" onclick={() => { const id = f.pottePlanteId; lukk(); onFjernPlante(id); }}>Fjern</button>
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

    {#if trend.sistFyltAt}
      <div class="mt-3.5 text-[12px] text-text-muted">
        Sist fylt {trend.sistFyltAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}.
      </div>
    {/if}

    {#if trend.dagligForbruk.length > 0}
      <div class="mt-[18px]">
        <div class="flex items-baseline justify-between mb-2.5">
          <span class="text-[11px] text-text-muted">Forbruk siste 7 dager</span>
          <span class="font-mono text-[10px] text-text-dim">liter/dag</span>
        </div>
        <div class="flex items-end gap-1.5 h-[50px]">
          {#each trend.dagligForbruk as d, i (i)}
            <div class="flex-1 rounded-t-[3px]" style="height:{Math.max(4, (d / forbrukMaks) * 100)}%; background:#3b82c4; opacity:0.85"></div>
          {/each}
        </div>
      </div>
    {/if}

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

<!-- Vekstlys-detalj -->
<Sheet open={aapent?.type === 'lys'} onClose={lukk}>
  {#if aapent?.type === 'lys'}
    <LysSheet
      potteId={potte.potte_id}
      {planter}
      {command}
      {now}
      onLagret={onCommandLagret}
    />
  {/if}
</Sheet>
