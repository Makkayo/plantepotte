<script lang="ts">
  import type { Potte, PotteCommand, PotteSensorData, PottePlanteFull } from '../lib/database.types';
  import { formaterTidssiden, jordfuktProsent, vannNivaProsent, vannKlasse } from '../lib/utils';

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
  const ledig = $derived(potte.antall_seksjoner - fyltSeksjoner);

  const harData = $derived(!!sensor);
  const sistOppdatert = $derived(formaterTidssiden(sensor?.registrert_at ?? command?.updated_at));

  const jordfuktAvg = $derived.by(() => {
    if (!sensor) return null;
    const verdier = [sensor.jord1, sensor.jord2, sensor.jord3]
      .map((r) => jordfuktProsent(r))
      .filter((x): x is number => x !== null);
    if (verdier.length === 0) return null;
    return Math.round(verdier.reduce((a, b) => a + b, 0) / verdier.length);
  });

  const vannStatus = $derived.by(() => {
    if (!sensor) return null;
    const pct = vannNivaProsent(sensor.vann_avstand_mm);
    if (pct === null) return null;
    const kl = vannKlasse(pct);
    const farge = kl === 'lav' ? 'text-rose' : kl === 'full' ? 'text-sky' : 'text-leaf';
    const dot = kl === 'lav' ? 'bg-rose' : kl === 'full' ? 'bg-sky' : 'bg-leaf';
    return { tekst: `${pct} %`, farge, dot };
  });
</script>

<button
  class="card p-5 text-left hover:border-border-strong hover:bg-surface-hover transition-all duration-200 group"
  onclick={onClick}
>
  <div class="flex items-start gap-3 mb-4">
    <span class="text-2xl">{potte.emoji ?? '🪴'}</span>
    <div class="flex-1 min-w-0">
      <h2 class="font-semibold text-lg leading-tight">{potte.navn}</h2>
      <p class="text-xs text-text-muted mt-0.5">{sistOppdatert}</p>
    </div>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-text-dim group-hover:text-text-muted group-hover:translate-x-0.5 transition-all"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </div>

  <!-- Planter -->
  <div class="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
    {#each planter as pp (pp.id)}
      <span class="chip border-border bg-surface-raised text-text">
        <span>{pp.plante.emoji ?? '🌿'}</span>
        <span>{pp.plante.navn}</span>
      </span>
    {/each}
    {#if ledig > 0}
      <span class="chip border-dashed border-border text-text-dim">+{ledig} ledig</span>
    {/if}
  </div>

  <!-- Sensor-strip -->
  {#if potte.har_sensorer}
    {#if harData}
      <div class="grid grid-cols-3 gap-3 pt-4 border-t border-border">
        <div>
          <div class="text-xs text-text-muted mb-0.5">Temp</div>
          <div class="text-lg font-semibold">
            {sensor?.temperatur?.toFixed(1) ?? '—'}<span class="text-xs text-text-muted ml-0.5"
              >°C</span
            >
          </div>
        </div>
        <div>
          <div class="text-xs text-text-muted mb-0.5">Jord</div>
          <div class="text-lg font-semibold">
            {jordfuktAvg ?? '—'}<span class="text-xs text-text-muted ml-0.5">%</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-text-muted mb-0.5">Vann</div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full {vannStatus?.dot ?? 'bg-border'}"></span>
            <span class="text-sm font-medium {vannStatus?.farge ?? 'text-text-muted'}">
              {vannStatus?.tekst ?? '—'}
            </span>
          </div>
        </div>
      </div>
    {:else}
      <div class="pt-4 border-t border-border text-xs text-text-dim">Venter på første sensoravlesning…</div>
    {/if}
  {:else}
    <div class="pt-4 border-t border-border text-xs text-text-dim">Uten sensorer — kun lyskontroll</div>
  {/if}

  {#if command}
    <div class="mt-3 flex items-center gap-2 text-xs text-text-muted">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <span>{command.intensitet}%</span>
      <span class="text-text-dim">•</span>
      <span>{command.timer_on}–{command.timer_off}</span>
    </div>
  {/if}
</button>
