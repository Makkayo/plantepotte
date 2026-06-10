<script lang="ts">
  import type { PotteSensorData } from '../lib/database.types';
  import {
    formaterTidssiden,
    jordfuktProsent,
    jordfuktKlasse,
    vannNivaProsent,
    vannKlasse,
  } from '../lib/utils';

  let { sensor }: { sensor: PotteSensorData | null } = $props();

  // Inntil 4 jordsensor-plasser. Vis bare de som faktisk har en avlesning —
  // en plass uten sensor sender null fra ESP32 og skjules her.
  const jord = $derived.by(() => {
    const raa = sensor ? [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4] : [];
    return raa
      .map((r, idx) => ({ nr: idx + 1, pct: jordfuktProsent(r) }))
      .filter((j) => j.pct !== null);
  });

  const vannPct = $derived(vannNivaProsent(sensor?.vann_avstand_mm));
  const vannKl = $derived(vannKlasse(vannPct));

  const sistOppdatert = $derived(formaterTidssiden(sensor?.registrert_at));
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
