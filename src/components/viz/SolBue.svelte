<script lang="ts">
  /**
   * Sol-bue — en halvsirkel der sola (gul dot) står langs buen ut fra hvor langt
   * vi er i lys-vinduet. Ren visning; tar klokkeslett som `now`. Formel (fra
   * design-handoff): sunFrac=elapsed/varighet (0=lys på, 1=lys av),
   * angle=(1−sunFrac)·π, x=128+96·cos(angle), y=124−96·sin(angle).
   */
  import { hhmmTilMin, lysVarighetMin } from '../../lib/tid';

  let {
    timerOn,
    timerOff,
    now = new Date(),
  }: { timerOn: string; timerOff: string; now?: Date } = $props();

  const aMin = $derived(hhmmTilMin(timerOn));
  const varighet = $derived(lysVarighetMin(timerOn, timerOff));
  const nowMin = $derived(now.getHours() * 60 + now.getMinutes());
  const rel = $derived.by(() => {
    let r = nowMin - aMin;
    if (r < 0) r += 1440;
    return r;
  });
  const iVindu = $derived(varighet > 0 && rel <= varighet);
  const sunFrac = $derived(iVindu ? rel / varighet : 0);
  const angle = $derived((1 - sunFrac) * Math.PI);
  const sunX = $derived((128 + 96 * Math.cos(angle)).toFixed(1));
  const sunY = $derived((124 - 96 * Math.sin(angle)).toFixed(1));
</script>

<svg
  viewBox="0 0 256 148"
  width="100%"
  style="display:block; overflow:visible;"
  role="img"
  aria-label="Lys-vindu {timerOn}–{timerOff}, sola {iVindu ? 'oppe' : 'nede'}"
>
  <defs>
    <linearGradient id="sb-lys" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4ade80" stop-opacity="0.18" />
      <stop offset="1" stop-color="#4ade80" stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d="M 32 124 A 96 96 0 0 1 224 124 Z" fill="url(#sb-lys)" />
  <path d="M 32 124 A 96 96 0 0 1 224 124" fill="none" stroke="#1f2433" stroke-width="4" stroke-linecap="round" />
  <path
    d="M 32 124 A 96 96 0 0 1 {sunX} {sunY}"
    fill="none"
    stroke="#4ade80"
    stroke-width="4"
    stroke-linecap="round"
    style="filter:drop-shadow(0 0 5px rgba(74,222,128,0.5));"
  />
  <line x1="22" y1="124" x2="234" y2="124" stroke="#2a3045" stroke-width="1" />
  <circle
    cx={sunX}
    cy={sunY}
    r="10"
    fill="#fbbf24"
    stroke="#0b0d12"
    stroke-width="2.5"
    style="opacity:{iVindu ? 1 : 0.3}; filter:drop-shadow(0 0 8px rgba(251,191,36,0.7));"
  />
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#5a6376">
    <text x="32" y="142" text-anchor="middle">{timerOn}</text>
    <text x="224" y="142" text-anchor="middle">{timerOff}</text>
  </g>
</svg>
