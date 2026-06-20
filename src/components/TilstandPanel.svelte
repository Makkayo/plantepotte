<script lang="ts">
  /**
   * «Tilstand nå» — hovedseksjonen i potte-detaljen. Samler alt om hvordan
   * blomsterkassa har det akkurat nå til ett sammenhengende, levende bilde:
   *  - en plain-language helse-dom (hero) med stemnings-glød
   *  - lys-døgnring + vanntank (med trend) side om side
   *  - jordfukt-målere + klima (temp/luftfuktighet)
   *  - vann-kalibrering og offline-varsel
   */
  import { supabase } from '../lib/supabase';
  import { potter } from '../lib/stores';
  import {
    jordfuktProsent,
    jordfuktKlasse,
    vannNivaProsent,
    vannKlasse,
    sensorEtikett,
    formaterTidssiden,
    minutterSiden,
    OFFLINE_GRENSE_MIN,
    VANN_TOM_MM,
    VANN_FULL_MM,
  } from '../lib/utils';
  import { beregnDli } from '../lib/lys';
  import type { Potte, PotteCommand, PotteSensorData } from '../lib/database.types';
  import type { VannTrend } from '../lib/trend';
  import LysDognRing from './viz/LysDognRing.svelte';
  import VannTank from './viz/VannTank.svelte';
  import JordMaler from './viz/JordMaler.svelte';

  let {
    potte,
    sensor,
    command,
    trend,
  }: {
    potte: Potte;
    sensor: PotteSensorData | null;
    command: PotteCommand | null;
    trend: VannTrend;
  } = $props();

  const sistOppdatert = $derived(formaterTidssiden(sensor?.registrert_at));
  const minSiden = $derived(minutterSiden(sensor?.registrert_at));
  const offline = $derived(minSiden !== null && minSiden > OFFLINE_GRENSE_MIN);

  const vannPct = $derived(
    vannNivaProsent(sensor?.vann_avstand_mm, potte.vann_tom_mm ?? undefined, potte.vann_full_mm ?? undefined),
  );
  const vannKl = $derived(vannKlasse(vannPct));

  const jord = $derived.by(() => {
    const raa = sensor ? [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4] : [];
    return raa
      .map((r, idx) => ({ etikett: sensorEtikett(idx + 1, potte.skillevegger), pct: jordfuktProsent(r) }))
      .filter((j): j is { etikett: string; pct: number } => j.pct !== null)
      .map((j) => ({ ...j, klasse: jordfuktKlasse(j.pct) }));
  });
  const harTorrJord = $derived(jord.some((j) => j.klasse === 'dry'));

  function parseT(s: string): number {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) + (m ?? 0) / 60;
  }
  const timerLengde = $derived.by(() => {
    if (!command) return 0;
    const d = ((parseT(command.timer_off) - parseT(command.timer_on)) % 24 + 24) % 24;
    return d === 0 && command.timer_on !== command.timer_off ? 24 : d;
  });
  const dli = $derived(command ? beregnDli(command.intensitet, timerLengde) : 0);
  const lysPa = $derived.by(() => {
    if (!command || timerLengde <= 0) return false;
    const n = new Date();
    const nowH = n.getHours() + n.getMinutes() / 60;
    const rel = ((nowH - parseT(command.timer_on)) % 24 + 24) % 24;
    return rel < timerLengde;
  });

  const status = $derived.by(() => {
    if (offline) return { tekst: 'Ingen kontakt', under: 'Sjekk strøm og WiFi', farge: 'text-sun', glow: 'rgba(251,191,36,0.16)' };
    if (vannKl === 'lav') return { tekst: 'Trenger vann', under: 'Reservoaret er nesten tomt', farge: 'text-rose', glow: 'rgba(248,113,113,0.16)' };
    if (harTorrJord) return { tekst: 'Tørr jord', under: 'En planteplass er i tørreste laget', farge: 'text-sun', glow: 'rgba(251,191,36,0.16)' };
    if (!sensor) return { tekst: 'Venter på data', under: 'Ingen avlesning fra ESP32 ennå', farge: 'text-text-muted', glow: 'rgba(74,222,128,0.10)' };
    return { tekst: 'Alt trives', under: 'Lys, vann og jord ser bra ut', farge: 'text-leaf', glow: 'rgba(74,222,128,0.18)' };
  });

  // ---- Vann-kalibrering (stå ved tanken, gjør den tom/full, trykk) ----
  let kalibrerer = $state<'tom' | 'full' | null>(null);
  let kalibreringsFeil = $state<string | null>(null);
  let bekreftKalib = $state<'tom' | 'full' | null>(null);
  let visKalib = $state(false);

  function klikkKalib(type: 'tom' | 'full') {
    if (bekreftKalib === type) {
      bekreftKalib = null;
      settKalibrering(type);
    } else {
      bekreftKalib = type;
    }
  }

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
</script>

<div class="flex flex-col gap-3">
  <!-- Hero: helse-dom med stemnings-glød -->
  <div class="card relative overflow-hidden p-5 stig" style="--d: 0ms">
    <div
      class="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full blur-2xl animate-breathe"
      style="background: radial-gradient(circle, {status.glow}, transparent 70%)"
    ></div>
    <div class="relative flex items-center justify-between gap-4">
      <div class="min-w-0">
        <div class="text-xs text-text-muted mb-1">Tilstand nå · {sistOppdatert}</div>
        <div class="font-display text-2xl sm:text-[28px] font-medium leading-none {status.farge}">
          {status.tekst}
        </div>
        <div class="text-sm text-text-muted mt-1.5">{status.under}</div>
      </div>
      <div class="shrink-0 text-right">
        {#if command}
          <div
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border {lysPa
              ? 'bg-sun/10 border-sun/30 text-sun'
              : 'bg-surface-raised border-border text-text-muted'}"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            {lysPa ? `Lyset på · ${command.intensitet}%` : 'Lyset av'}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Lys-døgn + Vann side om side -->
  <div class="grid grid-cols-2 gap-3">
    <div class="card p-4 flex flex-col items-center stig" style="--d: 80ms">
      <div class="self-start text-xs text-text-muted mb-1">Lys-døgn</div>
      {#if command}
        <LysDognRing timerOn={command.timer_on} timerOff={command.timer_off} intensitet={command.intensitet} {dli} />
        <div class="flex items-center justify-between w-full text-[11px] text-text-muted mt-2 px-1">
          <span>{command.timer_on}</span>
          <span>{timerLengde.toFixed(0)} t lys</span>
          <span>{command.timer_off}</span>
        </div>
      {:else}
        <div class="text-text-dim text-sm py-10 text-center">Ingen lysplan satt ennå</div>
      {/if}
    </div>

    <div class="card p-4 flex flex-col stig" style="--d: 140ms">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-text-muted">Vannreservoar</span>
        {#if sensor?.vann_avstand_mm != null}
          <button class="text-[11px] text-text-dim hover:text-text-muted transition-colors" onclick={() => (visKalib = !visKalib)}>
            {visKalib ? 'Lukk' : 'Kalibrer'}
          </button>
        {/if}
      </div>
      <VannTank pct={vannPct} {trend} />

      {#if visKalib && sensor?.vann_avstand_mm != null}
        <div class="mt-3 pt-3 border-t border-border">
          <div class="text-[11px] text-text-muted mb-2">Stå ved tanken, gjør den tom/full og trykk:</div>
          <div class="flex gap-2">
            <button
              class="flex-1 text-[11px] px-2 py-1.5 rounded-md border transition-colors disabled:opacity-50 {bekreftKalib === 'tom'
                ? 'border-sun/50 bg-sun/10 text-sun'
                : 'border-border text-text-muted hover:text-text hover:border-border-strong'}"
              disabled={kalibrerer !== null}
              onclick={() => klikkKalib('tom')}
            >
              {kalibrerer === 'tom' ? 'Lagrer…' : bekreftKalib === 'tom' ? 'Bekreft tom?' : 'Sett tom'}
            </button>
            <button
              class="flex-1 text-[11px] px-2 py-1.5 rounded-md border transition-colors disabled:opacity-50 {bekreftKalib === 'full'
                ? 'border-sun/50 bg-sun/10 text-sun'
                : 'border-border text-text-muted hover:text-text hover:border-border-strong'}"
              disabled={kalibrerer !== null}
              onclick={() => klikkKalib('full')}
            >
              {kalibrerer === 'full' ? 'Lagrer…' : bekreftKalib === 'full' ? 'Bekreft full?' : 'Sett full'}
            </button>
          </div>
          <div class="text-[10px] text-text-dim mt-2 tabular-nums">
            Avlest nå: {sensor.vann_avstand_mm} mm · tom {potte.vann_tom_mm ?? `${VANN_TOM_MM}*`} · full {potte.vann_full_mm ?? `${VANN_FULL_MM}*`}
          </div>
          {#if kalibreringsFeil}
            <div class="mt-2 p-2 rounded-md bg-rose/10 border border-rose/30 text-rose text-[11px]">{kalibreringsFeil}</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Jordfukt + klima -->
  {#if sensor}
    <div class="card p-4 stig" style="--d: 200ms">
      <div class="flex items-stretch gap-4">
        {#if jord.length > 0}
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-muted mb-3">Jordfukt per plass</div>
            <JordMaler plasser={jord} />
          </div>
        {/if}
        <div class="flex flex-col justify-center gap-3 {jord.length > 0 ? 'pl-4 border-l border-border' : 'flex-1'}">
          <div class="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
            <div>
              <div class="text-base font-semibold leading-none tabular-nums">{sensor.temperatur?.toFixed(1) ?? '—'}<span class="text-xs text-text-muted ml-0.5">°C</span></div>
              <div class="text-[10px] text-text-dim mt-0.5">Temperatur</div>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            <div>
              <div class="text-base font-semibold leading-none tabular-nums">{sensor.luftfuktighet?.toFixed(0) ?? '—'}<span class="text-xs text-text-muted ml-0.5">%</span></div>
              <div class="text-[10px] text-text-dim mt-0.5">Luftfuktighet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Varsler -->
  {#if offline}
    <div class="rounded-lg bg-sun/10 border border-sun/30 text-sun text-sm px-3 py-2.5 stig">
      ⚠ Ingen kontakt med potta på {minSiden !== null && minSiden < 120 ? `${minSiden} min` : `${Math.round((minSiden ?? 0) / 60)} timer`} — verdiene over er siste kjente avlesning.
    </div>
  {:else if vannKl === 'lav'}
    <div class="rounded-lg bg-rose/10 border border-rose/30 text-rose text-sm px-3 py-2.5 stig">
      ⚠ Vannreservoaret er nesten tomt ({vannPct} %) — fyll på vann.
    </div>
  {:else if vannPct !== null && vannPct < 40}
    <div class="rounded-lg bg-sun/10 border border-sun/30 text-sun text-sm px-3 py-2.5 stig">
      Vannreservoaret er under halvfullt ({vannPct} %) — vurder å fylle på snart.
    </div>
  {/if}
</div>
