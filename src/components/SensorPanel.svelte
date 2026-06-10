<script lang="ts">
  import type { Potte, PotteSensorData } from '../lib/database.types';
  import { supabase } from '../lib/supabase';
  import { potter } from '../lib/stores';
  import {
    formaterTidssiden,
    jordfuktProsent,
    jordfuktKlasse,
    vannNivaProsent,
    vannKlasse,
    VANN_TOM_MM,
    VANN_FULL_MM,
  } from '../lib/utils';

  let { sensor, potte }: { sensor: PotteSensorData | null; potte: Potte } = $props();

  // Inntil 4 jordsensor-plasser. Vis bare de som faktisk har en avlesning —
  // en plass uten sensor sender null fra ESP32 og skjules her.
  const jord = $derived.by(() => {
    const raa = sensor ? [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4] : [];
    return raa
      .map((r, idx) => ({ nr: idx + 1, pct: jordfuktProsent(r) }))
      .filter((j) => j.pct !== null);
  });

  // Per-potte kalibrering hvis satt («sett tom/full»-knappene), ellers global standard.
  const vannPct = $derived(
    vannNivaProsent(
      sensor?.vann_avstand_mm,
      potte.vann_tom_mm ?? undefined,
      potte.vann_full_mm ?? undefined,
    ),
  );
  const vannKl = $derived(vannKlasse(vannPct));

  const sistOppdatert = $derived(formaterTidssiden(sensor?.registrert_at));

  // «Livstegn»: ESP32 poster jevnlig — lenge siden siste avlesning = trolig
  // strøm/WiFi-trøbbel. Re-evalueres hver gang refresh() henter nytt sensor-objekt.
  const minSidenKontakt = $derived.by(() => {
    if (!sensor?.registrert_at) return null;
    return Math.round((Date.now() - new Date(sensor.registrert_at).getTime()) / 60000);
  });

  // Kalibrering: lagre gjeldende laser-avstand som tom-/full-punkt for denne potta.
  let kalibrerer = $state<'tom' | 'full' | null>(null);

  async function settKalibrering(type: 'tom' | 'full') {
    const mm = sensor?.vann_avstand_mm;
    if (mm == null || kalibrerer !== null) return;
    kalibrerer = type;
    const oppdatering: Partial<Potte> =
      type === 'tom' ? { vann_tom_mm: mm } : { vann_full_mm: mm };
    const { error } = await supabase.from('potter').update(oppdatering).eq('id', potte.id);
    if (!error) {
      potter.update((liste) =>
        liste.map((p) => (p.id === potte.id ? { ...p, ...oppdatering } : p)),
      );
    } else {
      console.error('Kalibrering feilet:', error);
    }
    kalibrerer = null;
  }
</script>

<section class="card p-5">
  <div class="flex items-end justify-between mb-4">
    <div>
      <h2 class="font-semibold text-lg">Sensorer</h2>
      <p class="text-text-muted text-xs mt-0.5">Oppdatert {sistOppdatert}</p>
    </div>
  </div>

  {#if !sensor}
    <div class="text-text-muted text-sm py-4">Venter på første sensoravlesning fra ESP32…</div>
  {:else}
    {#if minSidenKontakt !== null && minSidenKontakt > 15}
      <div class="mb-4 p-3 rounded-lg bg-sun/10 border border-sun/30 text-sun text-sm">
        ⚠ Ingen kontakt med potta på {minSidenKontakt < 120
          ? `${minSidenKontakt} min`
          : `${Math.round(minSidenKontakt / 60)} timer`} — sjekk strøm og WiFi. Verdiene under er siste kjente avlesning.
      </div>
    {/if}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Temp -->
      <div class="card-raised p-4">
        <div class="text-xs text-text-muted mb-1">Temperatur</div>
        <div class="text-2xl font-bold">
          {sensor.temperatur?.toFixed(1) ?? '—'}<span class="text-sm text-text-muted ml-0.5">°C</span>
        </div>
      </div>

      <!-- Fukt -->
      <div class="card-raised p-4">
        <div class="text-xs text-text-muted mb-1">Luftfuktighet</div>
        <div class="text-2xl font-bold">
          {sensor.luftfuktighet?.toFixed(0) ?? '—'}<span class="text-sm text-text-muted ml-0.5">%</span>
        </div>
      </div>

      <!-- Vannstand (laser → flottør) -->
      <div class="card-raised p-4 col-span-2">
        <div class="flex items-baseline justify-between mb-1">
          <div class="text-xs text-text-muted">Vannstand</div>
          {#if sensor.vann_avstand_mm !== null}
            <div class="text-xs text-text-dim tabular-nums">{sensor.vann_avstand_mm} mm</div>
          {/if}
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl font-bold tabular-nums">
            {vannPct !== null ? `${vannPct}` : '—'}<span class="text-sm text-text-muted ml-0.5">%</span>
          </div>
          <div class="flex-1 h-2 bg-border rounded-full overflow-hidden">
            {#if vannPct !== null}
              <div
                class="h-full rounded-full transition-all duration-500 {vannKl === 'lav'
                  ? 'bg-rose'
                  : vannKl === 'full'
                    ? 'bg-sky'
                    : 'bg-leaf'}"
                style="width: {vannPct}%"
              ></div>
            {/if}
          </div>
        </div>

        <!-- Per-potte kalibrering: stå ved tanken, gjør den tom/full, trykk knappen -->
        {#if sensor.vann_avstand_mm !== null}
          <div class="flex items-center gap-2 mt-3 flex-wrap">
            <button
              class="text-[11px] px-2 py-1 rounded-md border border-border text-text-muted hover:text-text hover:border-border-strong transition-colors disabled:opacity-50"
              disabled={kalibrerer !== null}
              onclick={() => settKalibrering('tom')}
              title="Lagre nåværende avstand ({sensor.vann_avstand_mm} mm) som tom tank"
            >
              {kalibrerer === 'tom' ? 'Lagrer…' : 'Sett som tom'}
            </button>
            <button
              class="text-[11px] px-2 py-1 rounded-md border border-border text-text-muted hover:text-text hover:border-border-strong transition-colors disabled:opacity-50"
              disabled={kalibrerer !== null}
              onclick={() => settKalibrering('full')}
              title="Lagre nåværende avstand ({sensor.vann_avstand_mm} mm) som full tank"
            >
              {kalibrerer === 'full' ? 'Lagrer…' : 'Sett som full'}
            </button>
            <span class="text-[10px] text-text-dim">
              Kalibrering: tom {potte.vann_tom_mm ?? `${VANN_TOM_MM} (standard)`} mm · full
              {potte.vann_full_mm ?? `${VANN_FULL_MM} (standard)`} mm
            </span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Jordfukt-stolper (kun tilkoblede sensorer) -->
    {#if jord.length > 0}
      <div class="mt-5">
        <div class="text-xs text-text-muted mb-2">Jordfuktighet</div>
        <div class="space-y-2">
          {#each jord as j}
            {@const kl = jordfuktKlasse(j.pct)}
            <div class="flex items-center gap-3">
              <div class="text-xs text-text-muted w-20">Sensor {j.nr}</div>
              <div class="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500 {kl === 'dry'
                    ? 'bg-rose'
                    : kl === 'wet'
                      ? 'bg-sky'
                      : 'bg-leaf'}"
                  style="width: {j.pct}%"
                ></div>
              </div>
              <div class="text-xs font-medium w-12 text-right tabular-nums">
                {j.pct}%
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Advarsler -->
    {#if vannKl === 'lav'}
      <div class="mt-4 p-3 rounded-lg bg-rose/10 border border-rose/30 text-rose text-sm">
        ⚠ Vannreservoaret er nesten tomt ({vannPct} %) — fyll på vann.
      </div>
    {:else if vannPct !== null && vannPct < 40}
      <div class="mt-4 p-3 rounded-lg bg-sun/10 border border-sun/30 text-sun text-sm">
        Vannreservoaret er under halvfullt ({vannPct} %) — vurder å fylle på snart.
      </div>
    {/if}
  {/if}
</section>
