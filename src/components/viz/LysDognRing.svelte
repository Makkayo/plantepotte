<script lang="ts">
  /**
   * Lys-døgnring — et 24-timers urskive der den opplyste delen (timer på→av)
   * er markert, en sol/måne-prikk viser hvor i døgnet vi er NÅ, og DLI står i
   * midten. Brukes både som visning (hero) og som live-forhåndsvisning i
   * lyskontrollen (dra glidebryteren → ringen oppdateres).
   */
  let {
    timerOn,
    timerOff,
    intensitet,
    dli,
    now = new Date(),
    size = 136,
    animate = true,
  }: {
    timerOn: string;
    timerOff: string;
    intensitet: number;
    dli: number;
    now?: Date;
    size?: number;
    animate?: boolean;
  } = $props();

  const R = 48;
  const CX = 60;
  const SW = 9;
  const CIRC = 2 * Math.PI * R; // ≈ 301.59

  function parseTime(s: string): number {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) + (m ?? 0) / 60;
  }

  const hOn = $derived(parseTime(timerOn));
  const hOff = $derived(parseTime(timerOff));
  const timerLengde = $derived.by(() => {
    const d = ((hOff - hOn) % 24 + 24) % 24;
    return d === 0 && timerOn !== timerOff ? 24 : d;
  });

  const lit = $derived((timerLengde / 24) * CIRC);
  const gap = $derived(CIRC - lit);
  const rotasjon = $derived((hOn / 24) * 360 - 90);

  const nowH = $derived(now.getHours() + now.getMinutes() / 60);
  const nowRad = $derived((nowH / 24) * 360 * (Math.PI / 180));
  const markX = $derived(CX + R * Math.sin(nowRad));
  const markY = $derived(CX - R * Math.cos(nowRad));

  const isOn = $derived.by(() => {
    if (timerLengde <= 0) return false;
    const rel = ((nowH - hOn) % 24 + 24) % 24;
    return rel < timerLengde;
  });

  function tick(h: number) {
    const a = (h / 24) * 360 * (Math.PI / 180);
    return { x1: CX + (R - 3) * Math.sin(a), y1: CX - (R - 3) * Math.cos(a), x2: CX + (R + 3) * Math.sin(a), y2: CX - (R + 3) * Math.cos(a) };
  }
</script>

<svg
  viewBox="0 0 120 120"
  width={size}
  height={size}
  role="img"
  aria-label="Lys-døgn: på {timerLengde.toFixed(0)} timer, DLI {dli.toFixed(1)}, lyset er {isOn ? 'på' : 'av'} nå"
>
  <circle cx={CX} cy={CX} r={R} fill="none" stroke="#232838" stroke-width={SW} />

  {#each [0, 6, 12, 18] as h}
    {@const t = tick(h)}
    <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#3b4264" stroke-width="1.5" stroke-linecap="round" />
  {/each}

  {#if lit > 0}
    <circle
      cx={CX}
      cy={CX}
      r={R}
      fill="none"
      stroke="#4ade80"
      stroke-width={SW + 6}
      stroke-linecap="round"
      stroke-dasharray="{lit} {gap}"
      opacity="0.14"
      transform="rotate({rotasjon} {CX} {CX})"
    />
    <circle
      class={animate ? 'arc-anim' : ''}
      cx={CX}
      cy={CX}
      r={R}
      fill="none"
      stroke="#4ade80"
      stroke-width={SW}
      stroke-linecap="round"
      stroke-dasharray="{lit} {gap}"
      stroke-dashoffset="0"
      transform="rotate({rotasjon} {CX} {CX})"
      style="--arc-dash: {lit}px"
    />
  {/if}

  <circle cx={markX} cy={markY} r="9" fill="#0b0d12" />
  <circle cx={markX} cy={markY} r="5.5" fill={isOn ? '#fbbf24' : '#5a6376'} />
  {#if isOn}
    <circle cx={markX} cy={markY} r="9" fill="none" stroke="#fbbf24" stroke-width="1.5" opacity="0.5" />
  {/if}

  <text
    x={CX}
    y="55"
    text-anchor="middle"
    fill="#e6e9f2"
    style="font-family: 'Fraunces', serif; font-size: 23px; font-weight: 500; letter-spacing: -0.02em;"
  >{dli.toFixed(1)}</text>
  <text x={CX} y="70" text-anchor="middle" fill="#8891a8" style="font-size: 9.5px;">DLI mol/m²</text>
</svg>
