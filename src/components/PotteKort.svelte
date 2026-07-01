<script lang="ts">
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import {
    feltFukter,
    vannNivaProsent,
    fuktStatus,
    antallPlasser,
    minutterSiden,
    formaterTidssiden,
    OFFLINE_GRENSE_MIN,
    TORR_GRENSE,
  } from '../lib/utils';
  import { beregnDli } from '../lib/lys';
  import { lysVarighetTimer } from '../lib/tid';
  import { mestAktuelleHosting } from '../lib/hosting';
  import SolBue from './viz/SolBue.svelte';
  import VannTank from './viz/VannTank.svelte';
  import VekstBar from './viz/VekstBar.svelte';

  let {
    potte,
    command,
    sensor,
    planter,
    now = new Date(),
    onClick,
    simulert = false,
  }: {
    potte: Potte;
    command: PotteCommand | undefined;
    sensor: PotteSensorData | undefined;
    planter: PottePlanteFull[];
    now?: Date;
    onClick: () => void;
    /** Kortet viser syntetiske sim-data (testmodus-simulator) — merkes tydelig
     * så det aldri kan forveksles med ekte drift. `potte.i_drift` er «later som
     * true» i sim, så vi trenger dette som egen kilde til sannhet for badgen. */
    simulert?: boolean;
  } = $props();

  const fyltSeksjoner = $derived(planter.length);
  const ledig = $derived(antallPlasser(potte.skillevegger) - fyltSeksjoner);

  const harData = $derived(!!sensor);

  // «Offline»-flagg: en sensor-potte som ikke har postet på en stund.
  const minSidenKontakt = $derived(minutterSiden(sensor?.registrert_at));
  const offline = $derived(
    potte.har_sensorer && minSidenKontakt !== null && minSidenKontakt > OFFLINE_GRENSE_MIN,
  );

  // Per FELT (planteplass), ikke per probe — udelt potte med to prober snittes,
  // så «N felt trenger vann» teller det samme som detaljens oktagoner viser.
  const jordVerdier = $derived.by(() => {
    if (!sensor) return [] as number[];
    return feltFukter(
      [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4],
      potte.skillevegger,
    ).filter((x): x is number => x !== null);
  });
  const jordLavest = $derived(jordVerdier.length ? Math.min(...jordVerdier) : null);
  const torreFelt = $derived(jordVerdier.filter((v) => v < TORR_GRENSE).length);

  const vannPct = $derived.by(() => {
    if (!sensor) return null;
    return vannNivaProsent(
      sensor.vann_avstand_mm,
      potte.vann_tom_mm ?? undefined,
      potte.vann_full_mm ?? undefined,
    );
  });

  // Neste høsting (kun i drift, kun når plantene har et dager_til_hosting-anslag)
  const hosting = $derived(
    potte.i_drift
      ? mestAktuelleHosting(
          planter.map((pp) => ({
            navn: pp.plante.navn,
            plantet_at: pp.plantet_at,
            dager_til_hosting: pp.plante.dager_til_hosting,
            kategori: pp.plante.kategori,
          })),
        )
      : null,
  );

  // Lys (samme språk som detaljens vekstlys-kort)
  const lysT = $derived(command ? lysVarighetTimer(command.timer_on, command.timer_off) : 0);
  const lysDli = $derived(beregnDli(command?.intensitet ?? 0, lysT));
  const lysPaa = $derived(!!command && command.intensitet > 0);
</script>

<button
  class="card p-4 text-left w-full hover:brightness-[1.07] transition-all duration-200 stig {simulert
    ? '!border-sun/40 !border-dashed'
    : ''}"
  onclick={onClick}
>
  <!-- Rad 1: ikon + navn + chevron -->
  <div class="flex items-center justify-between gap-2.5">
    <div class="flex items-center gap-[11px] min-w-0">
      <div
        class="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0 text-xl"
        style="background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2)"
      >
        {potte.emoji ?? '🌿'}
      </div>
      <div class="font-display text-[18px] font-semibold leading-tight truncate">{potte.navn}</div>
    </div>
    <span class="text-text-dim text-[22px] font-light leading-none shrink-0" aria-hidden="true">›</span>
  </div>

  <!-- Rad 2: status + badges -->
  <div class="flex items-center gap-3 mt-2.5 flex-wrap">
    {#if simulert}
      <span
        class="inline-flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-full"
        style="background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.35); color:#fbbf24"
        title="Viser syntetiske data fra simulatoren — ikke ekte målinger"
      >
        🧪 Simulert forhåndsvisning
      </span>
    {:else if !potte.i_drift}
      <span class="inline-flex items-center font-mono text-[10.5px] text-sun">🧪 Testmodus</span>
    {/if}
    {#if potte.har_sensorer}
      <span class="inline-flex items-center gap-1.5 font-mono text-[10.5px] {offline ? 'text-sun' : 'text-text-muted'}">
        <span class="w-[7px] h-[7px] rounded-full {offline ? 'bg-sun' : 'bg-leaf'}"></span>
        {offline ? `Frakoblet · sist sett ${formaterTidssiden(sensor?.registrert_at)}` : 'Tilkoblet'}
      </span>
      {#if torreFelt > 0 && !offline}
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px]"
          style="background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.32); color:#fca5a5"
        >
          {torreFelt} felt trenger vann
        </span>
      {/if}
    {/if}
  </div>

  <!-- Rad 3: plante-chips -->
  {#if planter.length > 0 || ledig > 0}
    <div class="flex flex-wrap gap-[7px] mt-3">
      {#each planter as pp (pp.id)}
        <span class="inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full bg-surface-raised border border-border text-[11.5px]">
          <span class="w-1.5 h-1.5 rounded-full bg-leaf"></span>{pp.plante.navn}
        </span>
      {/each}
      {#if ledig > 0}
        <span class="inline-flex items-center px-3 py-[5px] rounded-full border border-dashed border-border-strong text-[11.5px] text-text-muted">+{ledig} ledig</span>
      {/if}
    </div>
  {/if}

  <!-- Neste høsting: egen seksjon med samme vekst-viz som felt-arket (cohesion) -->
  {#if hosting}
    <div class="pt-3.5 mt-3.5 border-t border-border">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span
          class="inline-flex items-center gap-1.5 text-[11.5px] min-w-0 {hosting.status.klar
            ? 'text-leaf-glow font-medium'
            : 'text-text-muted'}"
        >
          <span class="shrink-0">🧺</span>
          <span class="truncate">{hosting.navn}</span>
        </span>
        <span
          class="font-mono text-[10px] shrink-0 {hosting.status.klar ? 'text-leaf-glow' : 'text-text-dim'}"
        >
          {hosting.status.tekst}
        </span>
      </div>
      <VekstBar
        prosent={hosting.status.prosent}
        klar={hosting.status.klar}
        pulser={hosting.status.klar && hosting.status.kontinuerlig}
        size="mini"
      />
    </div>
  {/if}

  <!-- Lys: mini sol-bue + intensitet/DLI -->
  <div class="flex items-center gap-3 pt-3.5 mt-3.5 border-t border-border">
    <div class="w-[112px] shrink-0" style="opacity:{lysPaa ? 1 : 0.4}">
      <SolBue timerOn={command?.timer_on ?? '07:00'} timerOff={command?.timer_off ?? '23:00'} {now} />
    </div>
    <div class="min-w-0">
      <div class="font-display text-xl font-semibold leading-none">
        {command?.intensitet ?? 0}<span class="text-xs text-text-muted ml-0.5">%</span>
      </div>
      <div class="font-mono text-[10px] text-text-muted mt-1">
        {lysDli.toFixed(1).replace('.', ',')} DLI · lys
      </div>
    </div>
  </div>

  <!-- Sensorer: vanntank + jord-«våt front» + klima -->
  {#if potte.har_sensorer}
    {#if harData}
      <!-- Frakoblet: tallene er siste kjente avlesning og kan være timer gamle —
           demp dem så de ikke leses som live. Status-pillen sier «sist sett …». -->
      <div class="flex items-center gap-4 pt-3 mt-3 border-t border-border transition-opacity" class:opacity-40={offline}>
        <div class="flex items-center gap-2">
          <div class="w-4 h-11 shrink-0"><VannTank pct={vannPct} visLaser={false} visProsent={false} /></div>
          <div>
            <div class="font-display text-base font-semibold leading-none text-sky">
              {vannPct ?? '–'}<span class="text-[11px]">%</span>
            </div>
            <div class="font-mono text-[9px] text-text-dim mt-0.5">vann</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div
            class="w-4 h-11 shrink-0 relative rounded-[8px] overflow-hidden border border-[#3b4264]"
            style="background:linear-gradient(180deg,#6e573f,#473829)"
          >
            {#if jordLavest !== null}
              <div
                class="absolute inset-x-0 bottom-0"
                style="height:{jordLavest}%; background:linear-gradient(180deg,#2f5a4a,#173430); border-top:2px solid rgba(134,239,172,0.22)"
              ></div>
            {/if}
          </div>
          <div>
            <div
              class="font-display text-base font-semibold leading-none"
              style="color:{jordLavest !== null ? fuktStatus(jordLavest).farge : '#e6e9f2'}"
            >
              {jordLavest ?? '–'}<span class="text-[11px]">%</span>
            </div>
            <div class="font-mono text-[9px] text-text-dim mt-0.5">jord</div>
          </div>
        </div>
        <div class="ml-auto text-right">
          <div class="font-display text-base font-semibold leading-none">
            {sensor?.temperatur?.toFixed(1).replace('.', ',') ?? '–'}°
          </div>
          <div class="font-mono text-[9px] text-text-dim mt-0.5">
            {sensor?.luftfuktighet?.toFixed(0) ?? '–'}% luft
          </div>
        </div>
      </div>
    {:else}
      <div class="pt-3 mt-3 border-t border-border text-xs text-text-dim">Venter på første sensoravlesning…</div>
    {/if}
  {:else}
    <div class="pt-3 mt-3 border-t border-border text-[12px] text-text-muted">Uten sensorer — kun lyskontroll</div>
  {/if}
</button>
