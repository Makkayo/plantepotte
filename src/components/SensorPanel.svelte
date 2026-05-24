<script lang="ts">
  import type { PotteSensorData } from '../lib/database.types';
  import { formaterTidssiden, jordfuktProsent, jordfuktKlasse } from '../lib/utils';

  let { sensor }: { sensor: PotteSensorData | null } = $props();

  const jord = $derived.by(() => {
    if (!sensor) return [null, null, null];
    return [sensor.jord1, sensor.jord2, sensor.jord3].map((r) => jordfuktProsent(r));
  });

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

      <!-- Vann lav -->
      <div class="card-raised p-4">
        <div class="text-xs text-text-muted mb-1">Vann lav</div>
        <div class="flex items-center gap-2 mt-1">
          <span
            class="w-3 h-3 rounded-full {sensor.vann_lav
              ? 'bg-sky shadow-[0_0_8px_theme(colors.sky)]'
              : 'bg-rose shadow-[0_0_8px_theme(colors.rose)]'}"
          ></span>
          <span class="text-sm font-medium">{sensor.vann_lav ? 'Detektert' : 'Ikke detektert'}</span>
        </div>
      </div>

      <!-- Vann mid -->
      <div class="card-raised p-4">
        <div class="text-xs text-text-muted mb-1">Vann mid</div>
        <div class="flex items-center gap-2 mt-1">
          <span
            class="w-3 h-3 rounded-full {sensor.vann_mid
              ? 'bg-sky shadow-[0_0_8px_theme(colors.sky)]'
              : 'bg-border'}"
          ></span>
          <span class="text-sm font-medium">{sensor.vann_mid ? 'Detektert' : 'Ikke detektert'}</span>
        </div>
      </div>
    </div>

    <!-- Jordfukt-stolper -->
    <div class="mt-5">
      <div class="text-xs text-text-muted mb-2">Jordfuktighet</div>
      <div class="space-y-2">
        {#each [1, 2, 3] as n, idx}
          {@const pct = jord[idx]}
          {@const kl = jordfuktKlasse(pct)}
          <div class="flex items-center gap-3">
            <div class="text-xs text-text-muted w-20">Sensor {n}</div>
            <div class="flex-1 h-2 bg-border rounded-full overflow-hidden">
              {#if pct !== null}
                <div
                  class="h-full rounded-full transition-all duration-500 {kl === 'dry'
                    ? 'bg-rose'
                    : kl === 'wet'
                      ? 'bg-sky'
                      : 'bg-leaf'}"
                  style="width: {pct}%"
                ></div>
              {/if}
            </div>
            <div class="text-xs font-medium w-12 text-right tabular-nums">
              {pct !== null ? `${pct}%` : '—'}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Advarsler -->
    {#if sensor.vann_lav === false}
      <div class="mt-4 p-3 rounded-lg bg-rose/10 border border-rose/30 text-rose text-sm">
        ⚠ Vannreservoaret er tomt — fyll på vann.
      </div>
    {:else if sensor.vann_mid === false}
      <div class="mt-4 p-3 rounded-lg bg-sun/10 border border-sun/30 text-sun text-sm">
        Vannreservoaret er halvfullt — vurder å fylle på snart.
      </div>
    {/if}
  {/if}
</section>
