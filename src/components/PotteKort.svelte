<script lang="ts">
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import {
    formaterTidssiden,
    jordfuktProsent,
    vannNivaProsent,
    fuktStatus,
    antallPlasser,
    minutterSiden,
    OFFLINE_GRENSE_MIN,
  } from '../lib/utils';

  let {
    potte,
    command,
    sensor,
    planter,
    onClick,
  }: {
    potte: Potte;
    command: PotteCommand | undefined;
    sensor: PotteSensorData | undefined;
    planter: PottePlanteFull[];
    onClick: () => void;
  } = $props();

  const fyltSeksjoner = $derived(planter.length);
  const ledig = $derived(antallPlasser(potte.skillevegger) - fyltSeksjoner);

  const harData = $derived(!!sensor);
  const sistOppdatert = $derived(formaterTidssiden(sensor?.registrert_at ?? command?.updated_at));

  // «Offline»-flagg: en sensor-potte som ikke har postet på en stund er trolig
  // uten strøm/WiFi.
  const minSidenKontakt = $derived(minutterSiden(sensor?.registrert_at));
  const offline = $derived(
    potte.har_sensorer && minSidenKontakt !== null && minSidenKontakt > OFFLINE_GRENSE_MIN,
  );

  const jordVerdier = $derived.by(() => {
    if (!sensor) return [] as number[];
    return [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4]
      .map((r) => jordfuktProsent(r))
      .filter((x): x is number => x !== null);
  });
  const jordLavest = $derived(jordVerdier.length ? Math.min(...jordVerdier) : null);
  const torreFelt = $derived(jordVerdier.filter((v) => v < 35).length);

  const vannStatus = $derived.by(() => {
    if (!sensor) return null;
    const pct = vannNivaProsent(
      sensor.vann_avstand_mm,
      potte.vann_tom_mm ?? undefined,
      potte.vann_full_mm ?? undefined,
    );
    return pct === null ? null : `${pct} %`;
  });

  const lysPlan = $derived(
    command ? (command.intensitet > 0 ? `${command.timer_on}–${command.timer_off} · ${command.intensitet} %` : 'Av') : 'Ikke satt',
  );
</script>

<button
  class="card p-4 text-left w-full hover:brightness-[1.07] transition-all duration-200 stig"
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
    {#if !potte.i_drift}
      <span class="inline-flex items-center font-mono text-[10.5px] text-sun">🧪 Testmodus</span>
    {/if}
    {#if potte.har_sensorer}
      <span class="inline-flex items-center gap-1.5 font-mono text-[10.5px] {offline ? 'text-sun' : 'text-text-muted'}">
        <span class="w-[7px] h-[7px] rounded-full {offline ? 'bg-sun' : 'bg-leaf'}"></span>
        {offline ? 'Frakoblet' : 'Tilkoblet'}
      </span>
      {#if torreFelt > 0}
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px]"
          style="background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.32); color:#fca5a5"
        >
          {torreFelt} felt trenger vann
        </span>
      {/if}
    {:else}
      <span class="font-mono text-[10.5px] text-text-dim">{sistOppdatert}</span>
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

  <!-- Rad 4: mikro-stats / uten sensorer -->
  {#if potte.har_sensorer}
    <div class="h-px bg-border my-[13px]"></div>
    {#if harData}
      <div class="flex gap-2">
        <div class="flex-1">
          <div class="label !text-[9.5px] !tracking-[0.05em]">Temp</div>
          <div class="font-display text-[19px] font-semibold mt-0.5">{sensor?.temperatur?.toFixed(1).replace('.', ',') ?? '—'}°</div>
        </div>
        <div class="flex-1">
          <div class="label !text-[9.5px] !tracking-[0.05em]">Jord, lavest</div>
          <div class="font-display text-[19px] font-semibold mt-0.5" style="color:{jordLavest !== null ? fuktStatus(jordLavest).farge : '#e6e9f2'}">
            {jordLavest ?? '—'}{#if jordLavest !== null}%{/if}
          </div>
        </div>
        <div class="flex-1">
          <div class="label !text-[9.5px] !tracking-[0.05em]">Vann</div>
          <div class="font-display text-[19px] font-semibold mt-0.5 text-sky">{vannStatus ?? '—'}</div>
        </div>
      </div>
    {:else}
      <div class="text-xs text-text-dim">Venter på første sensoravlesning…</div>
    {/if}
  {:else}
    <div class="h-px bg-border my-[13px]"></div>
    <div class="text-[12px] text-text-muted">Uten sensorer — kun lyskontroll</div>
  {/if}

  <!-- Rad 5: lysplan -->
  <div class="flex items-center gap-[7px] mt-3 font-mono text-[11px] text-text-muted">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4a017" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    {lysPlan}
  </div>
</button>
