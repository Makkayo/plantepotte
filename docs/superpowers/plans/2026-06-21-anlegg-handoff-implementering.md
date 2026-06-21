# «Anlegget»-handoff — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gjenskape design-Claudes mobil-first handoff (Oversikt + Detalj + tre bunn-ark) i den eksisterende Svelte 5-appen, og erstatte hele den gamle lys-kontrollen med et sol-bue-ark.

**Architecture:** Komponent-for-komponent på plass. All `lib/`-logikk (lys, kalibrering, trend) beholdes; `trend.ts` utvides med to felt. Nye komponenter: `viz/SolBue.svelte`, `LysSheet.svelte`. `LysKontroll.svelte` + `viz/LysDognRing.svelte` slettes. «Snu potta» bygges ikke.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind CSS 3, Vite 5, vitest 2 (pinnet — IKKE oppgrader), Supabase-js.

**Avvik fra standard TDD:** `lib/`-endringer får ekte vitest-tester (TDD). Svelte-komponenter verifiseres med `npm run check` (svelte-check) + `npm run build` + manuell røyktest i `npm run dev`. Commits samles til **én** på slutten (brukerpreferanse «commit til slutt»).

**Design-tokens (fra spec/mock):** bg `#0b0d12`, surface `#171b26`, surface-raised `#1f2433`, bg-subtle `#11141c`, border `#2a3045`, border-strong `#3b4264`, tekst `#e6e9f2`/muted `#8891a8`/dim `#5a6376`, leaf `#4ade80`/glow `#86efac`, sky `#60a5fa`, sun `#fbbf24`, rose `#f87171`, tre `#6e573f→#473829`, skillevegg `#6f5a42→#382b1c`. Disse finnes allerede som Tailwind-tokens (`bg`, `surface`, `leaf`, `sky`, `sun`, `rose`, …) — bruk klassene der mulig, rå hex kun for de tre-/jord-gradientene mocken spesifiserer.

---

## Filstruktur

| Fil | Ansvar | Handling |
|-----|--------|----------|
| `src/lib/trend.ts` | Vanntrend + nytt `sistFyltAt` + `dagligForbruk` | Modify |
| `src/lib/trend.test.ts` | Tester for de to nye feltene | Create |
| `src/components/viz/SolBue.svelte` | Sol-bue SVG (halvsirkel + sol-dot) | Create |
| `src/components/LysSheet.svelte` | Vekstlys-arkets innhold | Create |
| `src/components/Felt.svelte` | Oktagon-felt m/orienterings-badge | Modify |
| `src/components/Potte.svelte` | Oktagon, høyde 232, rolle→Felt | Modify |
| `src/components/AnleggPanel.svelte` | Klima + vekstlys-tidslinje + LUKE + lys-ark + vann-ark | Modify |
| `src/components/PotteDetalj.svelte` | Fjern LysKontroll, header, wrapper, gi planter til AnleggPanel | Modify |
| `src/components/PotteKort.svelte` | Oversikts-kort redesign | Modify |
| `src/components/PotteOversikt.svelte` | Mobil-layout + «trenger vann»-badge | Modify |
| `src/components/LysKontroll.svelte` | Erstattet | Delete |
| `src/components/viz/LysDognRing.svelte` | Erstattet av SolBue | Delete |

---

## Task 1: `trend.ts` — `sistFyltAt` + `dagligForbruk` (TDD)

**Files:**
- Modify: `src/lib/trend.ts`
- Create: `src/lib/trend.test.ts`

- [ ] **Step 1: Utvid `VannTrend`-interfacet**

I `src/lib/trend.ts`, legg til to felt i `interface VannTrend` (etter `literPerDag`):

```ts
  /** Tidspunkt for siste detekterte påfylling (hopp > 12 pp). null = ingen i vinduet. */
  sistFyltAt: Date | null;
  /** Liter forbrukt per døgn, eldste→nyeste, opptil 7 verdier. Tom = for lite data. */
  dagligForbruk: number[];
```

- [ ] **Step 2: Skriv hjelpefunksjonen `dagligForbruk`**

Legg til nederst i `trend.ts` (ren funksjon, eksportert for test):

```ts
/**
 * Liter forbrukt per døgn de siste `antallDager` dagene (eldste→nyeste).
 * Per døgn: max(0, nivå ved døgnstart − nivå ved døgnslutt) × tankliter.
 * Påfyll-døgn (nivået stiger) gir ~0. Tomme døgn hoppes over (utelates ikke —
 * settes 0 så grafen har faste 7 stolper). Krever ≥1 punkt i døgnet for et tall.
 */
export function dagligForbruk(punkter: VannPunkt[], antallDager = 7): number[] {
  if (punkter.length < 2) return [];
  const naa = Date.now();
  const ut: number[] = [];
  for (let d = antallDager - 1; d >= 0; d--) {
    const fra = naa - (d + 1) * 86_400_000;
    const til = naa - d * 86_400_000;
    const iDognet = punkter.filter((p) => p.t >= fra && p.t < til).sort((a, b) => a.t - b.t);
    if (iDognet.length < 2) {
      ut.push(0);
      continue;
    }
    const forbrukPct = Math.max(0, iDognet[0]!.pct - iDognet[iDognet.length - 1]!.pct);
    ut.push(Math.round(TANK_LITER * (forbrukPct / 100) * 100) / 100);
  }
  return ut;
}
```

- [ ] **Step 3: Beregn `sistFyltAt` + `dagligForbruk` i `beregnVannTrend`**

I `beregnVannTrend`: etter at `punkter` er bygget og sortert, men før retur-grenene. Finn påfyll-tidspunkt og daglig forbruk én gang, bruk i begge retur-objektene.

Erstatt den eksisterende påfyll-løkka (`let start = 0; for …`) slik at den også fanger tidspunktet:

```ts
  // Finn siste påfylling: et hopp opp > 12 prosentpoeng mellom to nabopunkter.
  let start = 0;
  let sistFyltAt: Date | null = null;
  for (let i = 1; i < punkter.length; i++) {
    const naaP = punkter[i]!;
    const forrige = punkter[i - 1]!;
    if (naaP.pct - forrige.pct > 12) {
      start = i;
      sistFyltAt = new Date(naaP.t);
    }
  }
  const forbrukSerie = dagligForbruk(punkter);
```

Legg `sistFyltAt` og `dagligForbruk: forbrukSerie` til i **begge** retur-objektene (det tidlige «for lite data»-objektet og det fulle). I det tidlige objektet: `sistFyltAt` (allerede beregnet over hvis vi flytter løkka opp) — men det tidlige returneres når `punkter.length < 4`, FØR påfyll-løkka. Derfor: i det tidlige objektet sett `sistFyltAt: null, dagligForbruk: dagligForbruk(punkter)`.

Konkret — tidlig retur (`punkter.length < 4`) får:
```ts
      sistFyltAt: null,
      dagligForbruk: dagligForbruk(punkter),
```
Full retur får:
```ts
    sistFyltAt,
    dagligForbruk: forbrukSerie,
```

- [ ] **Step 4: Skriv testene (skal feile først)**

Create `src/lib/trend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { beregnVannTrend, dagligForbruk, type VannPunkt } from './trend';

// Standardkalibrering: tom=200mm, full=40mm → spenn 160mm. avstand = full + (1-pct/100)*spenn.
function mm(pct: number): number {
  return Math.round(40 + (1 - pct / 100) * 160);
}
function rad(dagerSiden: number, pct: number) {
  return { registrert_at: new Date(Date.now() - dagerSiden * 86_400_000).toISOString(), vann_avstand_mm: mm(pct) };
}

describe('dagligForbruk', () => {
  it('returnerer tomt array ved for få punkter', () => {
    expect(dagligForbruk([])).toEqual([]);
    expect(dagligForbruk([{ t: Date.now(), pct: 50 } as VannPunkt])).toEqual([]);
  });

  it('regner positivt forbruk når nivået synker i et døgn', () => {
    const naa = Date.now();
    const punkter: VannPunkt[] = [
      { t: naa - 0.9 * 86_400_000, pct: 80 },
      { t: naa - 0.1 * 86_400_000, pct: 60 },
    ];
    const ut = dagligForbruk(punkter, 1);
    // 20 pp av 5,2 L = 1,04 L
    expect(ut).toHaveLength(1);
    expect(ut[0]).toBeCloseTo(1.04, 2);
  });

  it('gir 0 på påfyll-døgn (nivået stiger)', () => {
    const naa = Date.now();
    const punkter: VannPunkt[] = [
      { t: naa - 0.9 * 86_400_000, pct: 30 },
      { t: naa - 0.1 * 86_400_000, pct: 95 },
    ];
    expect(dagligForbruk(punkter, 1)[0]).toBe(0);
  });
});

describe('beregnVannTrend — nye felt', () => {
  it('detekterer sistFyltAt ved et hopp opp > 12 pp', () => {
    const rader = [rad(3, 70), rad(2.5, 55), rad(2, 40), rad(1.5, 92), rad(1, 85), rad(0.5, 78)];
    const t = beregnVannTrend(rader, 78);
    expect(t.sistFyltAt).toBeInstanceOf(Date);
  });

  it('sistFyltAt er null uten påfylling', () => {
    const rader = [rad(3, 90), rad(2, 80), rad(1, 70), rad(0.2, 62)];
    const t = beregnVannTrend(rader, 62);
    expect(t.sistFyltAt).toBeNull();
    expect(Array.isArray(t.dagligForbruk)).toBe(true);
  });
});
```

- [ ] **Step 5: Kjør tester — verifiser**

Run: `cd C:\Users\marku\Desktop\AI\Plantepotte && npm run test`
Expected: trend.test.ts grønn (+ eksisterende `lys.test.ts` fortsatt grønn). Hvis `VannPunkt` ikke er eksportert, legg til `export` på `interface VannPunkt`.

---

## Task 2: `viz/SolBue.svelte`

**Files:**
- Create: `src/components/viz/SolBue.svelte`

- [ ] **Step 1: Lag komponenten**

```svelte
<script lang="ts">
  /**
   * Sol-bue — en halvsirkel der sola (gul dot) står langs buen ut fra hvor
   * langt vi er i lys-vinduet. Ren visning; tar klokkeslett som `now`.
   * Formel (fra design-handoff): sunFrac=elapsed/varighet (0=lys på, 1=lys av),
   * angle=(1−sunFrac)·π, x=128+96·cos(angle), y=124−96·sin(angle).
   */
  let {
    timerOn,
    timerOff,
    now = new Date(),
  }: { timerOn: string; timerOff: string; now?: Date } = $props();

  function min(s: string): number {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }
  const aMin = $derived(min(timerOn));
  const varighet = $derived.by(() => {
    let d = min(timerOff) - aMin;
    if (d <= 0) d += 1440;
    return d;
  });
  const nowMin = $derived(now.getHours() * 60 + now.getMinutes());
  const rel = $derived.by(() => {
    let r = nowMin - aMin;
    if (r < 0) r += 1440;
    return r;
  });
  const iVindu = $derived(rel >= 0 && rel <= varighet && varighet > 0);
  const sunFrac = $derived(iVindu ? rel / varighet : 0);
  const angle = $derived((1 - sunFrac) * Math.PI);
  const sunX = $derived((128 + 96 * Math.cos(angle)).toFixed(1));
  const sunY = $derived((124 - 96 * Math.sin(angle)).toFixed(1));
</script>

<svg viewBox="0 0 256 148" width="100%" style="display:block; overflow:visible;" role="img"
     aria-label="Lys-vindu {timerOn}–{timerOff}, sola {iVindu ? 'oppe' : 'nede'}">
  <defs>
    <linearGradient id="sb-lys" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4ade80" stop-opacity="0.18" />
      <stop offset="1" stop-color="#4ade80" stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d="M 32 124 A 96 96 0 0 1 224 124 Z" fill="url(#sb-lys)" />
  <path d="M 32 124 A 96 96 0 0 1 224 124" fill="none" stroke="#1f2433" stroke-width="4" stroke-linecap="round" />
  <path d="M 32 124 A 96 96 0 0 1 {sunX} {sunY}" fill="none" stroke="#4ade80" stroke-width="4"
        stroke-linecap="round" style="filter:drop-shadow(0 0 5px rgba(74,222,128,0.5));" />
  <line x1="22" y1="124" x2="234" y2="124" stroke="#2a3045" stroke-width="1" />
  <circle cx={sunX} cy={sunY} r="10" fill="#fbbf24" stroke="#0b0d12" stroke-width="2.5"
          style="opacity:{iVindu ? 1 : 0.3}; filter:drop-shadow(0 0 8px rgba(251,191,36,0.7));" />
  <g font-family="JetBrains Mono, monospace" font-size="9" fill="#5a6376">
    <text x="32" y="142" text-anchor="middle">{timerOn}</text>
    <text x="224" y="142" text-anchor="middle">{timerOff}</text>
  </g>
</svg>
```

- [ ] **Step 2: Verifiser kompilering**

Run: `npm run check`
Expected: ingen nye feil fra SolBue.

---

## Task 3: `LysSheet.svelte`

**Files:**
- Create: `src/components/LysSheet.svelte`

Henter ut lys-logikken fra gamle `LysKontroll.svelte` og presenterer den i ark-form per mock. Samme kontrakt: `potteId`, `planter: Plante[]`, `command`, `now`, `onLagret`.

- [ ] **Step 1: Lag komponenten**

```svelte
<script lang="ts">
  import { supabase } from '../lib/supabase';
  import type { Plante, PotteCommand } from '../lib/database.types';
  import {
    anbefaltInnstilling,
    beregnDli,
    vurderLysKompatibilitet,
    vurderVannKompatibilitet,
  } from '../lib/lys';
  import SolBue from './viz/SolBue.svelte';

  let {
    potteId,
    planter,
    command,
    now = new Date(),
    onLagret,
  }: {
    potteId: string;
    planter: Plante[];
    command: PotteCommand | null;
    now?: Date;
    onLagret: () => void;
  } = $props();

  let intensitet = $state(70);
  let timer_on = $state('07:00');
  let timer_off = $state('23:00');
  let lagrer = $state(false);

  let lastCommandId = $state<string | null>(null);
  $effect(() => {
    if (command && command.id !== lastCommandId) {
      intensitet = command.intensitet;
      timer_on = command.timer_on;
      timer_off = command.timer_off;
      lastCommandId = command.id;
    }
  });

  const beregnetTimer = $derived.by(() => {
    const [hOn, mOn] = timer_on.split(':').map(Number);
    const [hOff, mOff] = timer_off.split(':').map(Number);
    if (hOn === undefined || mOn === undefined || hOff === undefined || mOff === undefined) return 0;
    let diff = hOff * 60 + mOff - (hOn * 60 + mOn);
    if (diff <= 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  });
  const dliEstimat = $derived(beregnDli(intensitet, beregnetTimer));
  const anbefalt = $derived(anbefaltInnstilling(planter));
  const lysRapport = $derived(vurderLysKompatibilitet(planter));
  const vannRapport = $derived(vurderVannKompatibilitet(planter));
  // Slank advarsel kun ved reelt problem (bevart fra gamle LysKontroll).
  const visAdvarsel = $derived(
    lysRapport.niva === 'risikabel' || lysRapport.niva === 'inkompatibel' || vannRapport.niva !== 'ok',
  );

  const planteHelse = $derived(
    planter.map((p) => {
      const dliMin = p.dli_min ?? p.dli_optimal ?? 0;
      const dliOpt = p.dli_optimal ?? 0;
      const dliMaks = p.dli_maks ?? p.dli_optimal ?? Infinity;
      let status: 'optimal' | 'akseptabel' | 'lavt' | 'hoyt' = 'optimal';
      if (dliEstimat < dliMin * 0.7) status = 'lavt';
      else if (dliEstimat < dliMin) status = 'akseptabel';
      else if (dliEstimat > dliMaks * 1.3) status = 'hoyt';
      else if (dliEstimat > dliMaks) status = 'akseptabel';
      return { plante: p, status, dliOpt };
    }),
  );

  function brukAnbefaling() {
    intensitet = anbefalt.intensitet;
    timer_on = anbefalt.timer_on;
    timer_off = anbefalt.timer_off;
  }

  async function lagre() {
    lagrer = true;
    const { error } = await supabase.from('potte_commands').upsert(
      { potte_id: potteId, intensitet, timer_on, timer_off, updated_at: new Date().toISOString() },
      { onConflict: 'potte_id' },
    );
    lagrer = false;
    if (!error) onLagret();
  }

  const statusBadge: Record<string, string> = {
    optimal: 'bg-leaf/12 text-leaf-glow border-leaf/30',
    akseptabel: 'bg-sun/12 text-sun border-sun/30',
    lavt: 'bg-rose/12 text-rose border-rose/30',
    hoyt: 'bg-rose/12 text-rose border-rose/30',
  };
  const statusTekst: Record<string, string> = {
    optimal: 'Bra', akseptabel: 'Akseptabelt', lavt: 'For lite', hoyt: 'For mye',
  };
</script>

<div class="flex items-start justify-between gap-3.5">
  <div>
    <div class="font-display text-[25px] font-semibold leading-[1.05]">Vekstlys</div>
    <div class="font-mono text-[11px] text-text-muted mt-1">Lyslist · {beregnetTimer.toFixed(0)} t lys</div>
  </div>
  <div class="inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full bg-leaf/12 border border-leaf/30 font-mono text-[11px] text-leaf-glow">
    {dliEstimat.toFixed(1).replace('.', ',')} DLI
  </div>
</div>

{#if visAdvarsel}
  <div class="mt-3 p-2.5 rounded-lg border text-[12px] leading-snug {lysRapport.niva === 'inkompatibel' || vannRapport.niva === 'inkompatibel' ? 'border-rose/30 bg-rose/10 text-rose' : 'border-sun/30 bg-sun/8 text-sun'}">
    {#if lysRapport.niva === 'risikabel' || lysRapport.niva === 'inkompatibel'}<div>⚠ {lysRapport.melding}</div>{/if}
    {#if vannRapport.niva !== 'ok'}<div class="mt-0.5">💧 {vannRapport.melding}</div>{/if}
  </div>
{/if}

<div class="mt-[18px]">
  <SolBue timerOn={timer_on} timerOff={timer_off} {now} />
  <div class="text-center mt-1">
    <div class="font-display text-[46px] font-semibold leading-none">{dliEstimat.toFixed(1).replace('.', ',')}</div>
    <div class="font-mono text-[10px] text-text-muted mt-0.5">DLI mol/m²</div>
  </div>
</div>
<div class="text-center text-[11px] text-text-dim mt-1.5 mb-4">Forhåndsvisning oppdateres mens du justerer</div>

<div class="flex items-baseline justify-between mb-2">
  <span class="font-mono text-[11px] tracking-[0.08em] text-text-muted">INTENSITET</span>
  <span class="font-display text-lg font-semibold text-leaf">{intensitet}%</span>
</div>
<input type="range" min="0" max="100" bind:value={intensitet} class="w-full" />

<div class="grid grid-cols-2 gap-3 mt-3.5">
  <div>
    <div class="font-mono text-[11px] tracking-[0.08em] text-text-muted mb-1.5">LYS PÅ</div>
    <input type="time" bind:value={timer_on} class="input font-mono" />
  </div>
  <div>
    <div class="font-mono text-[11px] tracking-[0.08em] text-text-muted mb-1.5">LYS AV</div>
    <input type="time" bind:value={timer_off} class="input font-mono" />
  </div>
</div>

{#if planter.length > 0}
  <div class="mt-[18px] flex items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-subtle border border-border">
    <div>
      <div class="label mb-0.5">Anbefalt intensitet</div>
      <div class="font-display text-[24px] font-semibold leading-none">{anbefalt.intensitet}%</div>
      <div class="font-mono text-[9.5px] text-text-dim mt-1">Basert på dine planters DLI-behov</div>
    </div>
    <button class="btn-secondary !py-2 text-xs whitespace-nowrap" onclick={brukAnbefaling}>Bruk anbefaling</button>
  </div>

  <div class="mt-4">
    <div class="label mb-2.5">Plantene med denne innstillingen</div>
    {#each planteHelse as { plante, status, dliOpt } (plante.id)}
      <div class="flex items-center gap-2.5 py-2.5 border-b border-surface-raised">
        <span class="w-[7px] h-[7px] rounded-full bg-leaf shrink-0"></span>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-semibold truncate">{plante.navn}</div>
          <div class="font-mono text-[9.5px] text-text-dim mt-px">DLI opt {dliOpt}</div>
        </div>
        <span class="shrink-0 px-2.5 py-[3px] rounded-full text-[11px] font-semibold border {statusBadge[status]}">{statusTekst[status]}</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="mt-4 text-sm text-text-muted">Legg til planter for å se anbefalte innstillinger.</div>
{/if}

<button class="btn-primary w-full mt-[18px]" onclick={lagre} disabled={lagrer}>
  {lagrer ? 'Lagrer…' : 'Ferdig'}
</button>
```

- [ ] **Step 2: Verifiser**

Run: `npm run check`
Expected: ingen nye feil. (LysSheet er ennå ikke importert — det kommer i Task 6.)

---

## Task 4: `Felt.svelte` — orienterings-badge

**Files:**
- Modify: `src/components/Felt.svelte`

Bytt `slotLabel`-prop til en strukturert visning med badge-pille. Behold «våt front» + probe.

- [ ] **Step 1: Erstatt hele filen**

```svelte
<script lang="ts">
  /**
   * Ett planteplass-felt i en oktagon-potte. «Våt front» (fukt) stiger nedenfra.
   * Badge-pille øverst venstre viser orientering (Bak/Foran/Hele) — kun etikett.
   */
  import type { Plante } from '../lib/database.types';
  import { fuktStatus } from '../lib/utils';

  let {
    plante,
    slotLabel,
    rolle,
    fukt,
    onClick,
  }: {
    plante: Plante | null;
    slotLabel: string;
    rolle: 'foran' | 'bak' | 'hel';
    fukt: number | null;
    onClick: () => void;
  } = $props();

  const status = $derived(fuktStatus(fukt));
  const fyllH = $derived(fukt === null ? 0 : Math.max(0, Math.min(100, fukt)));
  const badgeTekst = $derived(rolle === 'foran' ? 'Foran' : rolle === 'bak' ? 'Bak' : 'Hele potta');
  // Foran = blå (tilgjengelig side), Bak/Hele = mørk.
  const badgeKlasse = $derived(
    rolle === 'foran'
      ? 'bg-sky/20 text-[#9ecbff]'
      : 'bg-[#1f2433] text-text-muted',
  );
</script>

<button
  class="relative flex-1 w-full text-left overflow-hidden active:brightness-90 transition-all"
  style="background: linear-gradient(180deg, #6e573f, #473829)"
  onclick={onClick}
>
  {#if plante}
    <div
      class="absolute left-0 right-0 bottom-0 transition-[height] duration-700"
      style="height: {fyllH}%; background: linear-gradient(180deg, #2f5a4a, #173430); border-top: 2px solid rgba(134,239,172,0.22)"
    ></div>

    <div class="absolute w-[3px] rounded-[2px]" style="right:13px; top:13px; height:42%; background:#cdd6e6"></div>
    <div
      class="absolute w-3 h-3 rounded-full"
      style="right:8.5px; top:calc(13px + 42%); transform:translateY(-50%); box-shadow:0 0 0 4px rgba(255,255,255,0.05); background:{status.farge}"
    ></div>

    <span class="absolute left-[11px] top-[10px] inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-medium tracking-[0.1em] {badgeKlasse}">{badgeTekst}</span>
    <div class="absolute left-3 top-[31px]" style="right:30px">
      <div class="text-[13px] font-semibold leading-[1.05] truncate" style="color:#f3f5fa">{plante.navn}</div>
    </div>

    <div
      class="absolute left-3 bottom-[9px] font-display font-semibold leading-none tabular-nums"
      style="color:{status.farge}; font-size:{rolle === 'hel' ? 27 : 25}px"
    >
      {fukt ?? '—'}{#if fukt !== null}<span class="text-base">%</span>{/if}
    </div>
  {:else}
    <span class="absolute left-[11px] top-[10px] inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-medium tracking-[0.1em] {badgeKlasse}">{badgeTekst}</span>
    <div class="absolute inset-0 flex flex-col items-center justify-center text-text-dim gap-0.5">
      <span class="text-2xl leading-none">+</span>
      <span class="text-[11px]">Legg til</span>
    </div>
  {/if}
</button>
```

> `slotLabel` beholdes i props (brukes til badge-tekst i felt-arket via AnleggPanel), men selve visningen bruker nå `rolle`. AnleggPanel sender begge.

- [ ] **Step 2: Verifiser**

Run: `npm run check`
Expected: feil i `Potte.svelte` (mangler `rolle`-prop) — fikses i Task 5. SolBue/LysSheet uberørt.

---

## Task 5: `Potte.svelte` — høyde + rolle

**Files:**
- Modify: `src/components/Potte.svelte`

- [ ] **Step 1: Oppdater FeltData-typen + høyde + videresend rolle**

Endre `FeltData`-typen (legg til `rolle`):

```ts
  type FeltData = {
    seksjon: number;
    slotLabel: string;
    rolle: 'foran' | 'bak' | 'hel';
    plante: Plante | null;
    fukt: number | null;
  };
```

Endre høyde `h-[206px]` → `h-[232px]` på den indre oktagon-diven.

Oppdater `<Felt … />`-kallet til å sende rolle:

```svelte
      {#each felt as f (f.seksjon)}
        <Felt plante={f.plante} slotLabel={f.slotLabel} rolle={f.rolle} fukt={f.fukt} onClick={() => onFelt(f.seksjon)} />
      {/each}
```

- [ ] **Step 2: Verifiser**

Run: `npm run check`
Expected: feil flytter til `AnleggPanel.svelte` (bygger `felt` uten `rolle`) — fikses i Task 6.

---

## Task 6: `AnleggPanel.svelte` — klima, vekstlys-tidslinje, LUKE, lys-ark, vann-ark

**Files:**
- Modify: `src/components/AnleggPanel.svelte`

Største task. Del-steg under. Behold all eksisterende state (felt-ark, vann-kalibrering). Ny prop: `planter: Plante[]` (rene planter til lys-arket — separat fra `pottePlanter`).

- [ ] **Step 1: Importer SolBue/LysSheet + ny prop + `now`-tikk + `rolle` i pots**

Legg til import: `import LysSheet from './LysSheet.svelte';` (SolBue trengs ikke direkte her). Legg `onMount, onDestroy` fra svelte.

Legg til i `$props()`-destructuring: `planter,` med type `planter: Plante[];`.

Legg til `now`-tikk:
```ts
  let now = $state(new Date());
  let nowTimer: ReturnType<typeof setInterval> | undefined;
  onMount(() => { nowTimer = setInterval(() => (now = new Date()), 60_000); });
  onDestroy(() => clearInterval(nowTimer));
```

I `pots`-derived: legg `rolle` på hvert felt. For `hel`-grenen: `rolle: 'hel'`. For delt: `rolle: plass.rolle` (som er 'foran'/'bak').

- [ ] **Step 2: Vekstlys-tidslinje (erstatt dots-baren)**

Bytt ut den nåværende «12 dots»-baren med en tidslinje-pill drevet av command-tidene + `now`. Legg til derived:

```ts
  function tMin(s: string): number { const [h, m] = s.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0); }
  const lysVarighet = $derived(command ? ((tMin(command.timer_off) - tMin(command.timer_on) + 1440) % 1440 || (command.timer_on !== command.timer_off ? 1440 : 0)) : 0);
  const lysRel = $derived(command ? ((now.getHours() * 60 + now.getMinutes()) - tMin(command.timer_on) + 1440) % 1440 : 0);
  const iLysVindu = $derived(lysPaa && lysVarighet > 0 && lysRel <= lysVarighet);
  const lysNaaPct = $derived(iLysVindu ? (lysRel / lysVarighet) * 100 : 0);
  function fmtVar(min: number): string { const h = Math.floor(min / 60); const m = Math.round(min % 60); return m ? `${h} t ${m} min` : `${h} t`; }
  const lysCaption = $derived(
    !command || !lysPaa ? 'Slått av'
      : iLysVindu ? `Lyser nå · av om ${fmtVar(lysVarighet - lysRel)}`
      : `Av nå · slår på ${command.timer_on}`,
  );
```

Markup for tidslinja (erstatter dots-diven), inni vekstlys-kortet etter toggle-raden:

```svelte
    <button class="w-full text-left" onclick={() => (aapent = { type: 'lys' })} aria-label="Åpne lysinnstillinger">
      <div class="flex items-center gap-2.5">
        <span class="font-mono text-[9.5px] text-text-dim">{command?.timer_on ?? '–'}</span>
        <div class="relative flex-1 h-[14px] rounded-[7px] bg-surface-raised border border-border overflow-hidden transition-opacity duration-200" style="opacity:{lysPaa ? 1 : 0.3}">
          <div class="absolute left-0 top-0 bottom-0 rounded-l-[6px]" style="width:{lysNaaPct}%; background:linear-gradient(90deg,rgba(74,222,128,0.2),rgba(74,222,128,0.5))"></div>
          {#if iLysVindu}
            <div class="absolute top-1/2 w-[11px] h-[11px] rounded-full bg-leaf breathe-dot" style="left:{lysNaaPct}%; transform:translate(-50%,-50%); box-shadow:0 0 0 3px rgba(74,222,128,0.18),0 0 9px rgba(74,222,128,0.7)"></div>
          {/if}
        </div>
        <span class="font-mono text-[9.5px] text-text-dim">{command?.timer_off ?? '–'}</span>
      </div>
      <div class="text-[11px] text-text-muted mt-2">{lysCaption}</div>
    </button>
```

> Gjør hele vekstlys-kortet trykkbart for å åpne arket: wrap kort-innholdet slik at toggle-knappen bruker `onclick={(e) => { e.stopPropagation(); toggleLys(); }}` og resten åpner arket. Enklest: behold toggle-knappen som nå (med `stopPropagation` lagt til), og la tidslinje-knappen over være åpne-handlingen. Tittelen «Vekstlys» trenger ikke være klikkbar.

Legg til `breathe-dot`-animasjon i `app.css` (Task 6 Step 5).

- [ ] **Step 3: Klima-stripe (ny, før vekstlys-kortet)**

Erstatt den nåværende «Tilkobling + klima»-mono-linja med mockens klima-stripe (behold tilkoblings-dot som en egen tynn linje over, eller flytt online-info inn i detalj-headeren — her: behold den tynne tilkoblings-linja, legg klima-stripe UNDER den):

```svelte
  {#if potte.har_sensorer && sensor && (sensor.temperatur !== null || sensor.luftfuktighet !== null)}
    <div class="flex gap-2.5 stig" style="--d: 30ms">
      <div class="flex-1 flex items-center gap-[11px] card !rounded-[14px] px-3.5 py-[11px]">
        <div class="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style="background:rgba(232,112,42,0.14)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f0935a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/></svg>
        </div>
        <div>
          <div class="label !text-[10.5px] !tracking-[0.05em]">Temp</div>
          <div class="font-display text-[21px] font-semibold leading-tight">{sensor.temperatur?.toFixed(1).replace('.', ',') ?? '–'}°</div>
        </div>
      </div>
      <div class="flex-1 flex items-center gap-[11px] card !rounded-[14px] px-3.5 py-[11px]">
        <div class="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style="background:rgba(59,130,196,0.14)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6aa9e0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7Z"/></svg>
        </div>
        <div>
          <div class="label !text-[10.5px] !tracking-[0.05em]">Luftfukt</div>
          <div class="font-display text-[21px] font-semibold leading-tight">{sensor.luftfuktighet?.toFixed(0) ?? '–'}%</div>
        </div>
      </div>
    </div>
  {/if}
```

- [ ] **Step 4: LUKE-merke mellom pottene + lys-ark**

Pakk pottene-flexen i en `relative` container, øk gap til `gap-10` (40px), legg til midtdeler + LUKE absolutt-posisjonert, og undertekst under. Erstatt nåværende pottene-markup:

```svelte
  <div class="stig" style="--d: 180ms">
    <div class="flex items-baseline justify-between mb-3">
      <div class="text-[13px] font-semibold">Pottene</div>
      <div class="font-mono text-[11px] text-text-dim">trykk på et felt</div>
    </div>
    <div class="relative">
      <div class="flex gap-10 items-start">
        {#each pots as p (p.potteNr)}
          <PotteViz navn={p.navn} delt={p.delt} felt={p.felt} onToggleSkille={() => onToggleSkille(p.potteNr - 1, !p.delt)} onFelt={feltTrykk} />
        {/each}
      </div>
      {#if pots.length > 1}
        <div class="absolute left-1/2 top-[34px] bottom-0 w-10 -translate-x-1/2 flex flex-col items-center justify-end pointer-events-none">
          <div class="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[14px]" style="border-left:1px solid rgba(255,228,184,0.14); border-right:1px solid rgba(255,228,184,0.14); background:linear-gradient(180deg,rgba(111,90,66,0.25),rgba(56,43,28,0.25))"></div>
          <button class="relative mb-2 flex flex-col items-center gap-1 pointer-events-auto active:brightness-125" onclick={() => (aapent = { type: 'vann' })} aria-label="Åpne vannreservoar (luke)">
            <div class="flex items-center justify-center w-[30px] h-[26px] rounded-[7px]" style="background:#0d1320; border:1px solid #60a5fa; box-shadow:0 0 0 2px rgba(11,13,18,0.92),0 0 14px rgba(96,165,250,0.6)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#7cc0ff" stroke="none"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>
            </div>
            <span class="font-mono text-[8px] font-semibold tracking-[0.08em]" style="color:#9ecbff">LUKE</span>
          </button>
        </div>
      {/if}
    </div>
    {#if potte.har_sensorer && pots.length > 1}
      <div class="flex items-center justify-center gap-1.5 mt-3 font-mono text-[10px] text-text-dim">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#60a5fa" stroke="none"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>
        Luka sitter mellom pottene, på fronten
      </div>
    {/if}
  </div>
```

Legg til lys-arket (ny `Sheet`) etter de to eksisterende arkene:

```svelte
<Sheet open={aapent?.type === 'lys'} onClose={lukk}>
  {#if aapent?.type === 'lys'}
    <LysSheet {potteId} {planter} {command} {now} onLagret={() => { onCommandLagret(); }} />
  {/if}
</Sheet>
```

Legg til `aapent`-typen: `| { type: 'lys' }`. Legg til `potteId`-prop (eller bruk `potte.potte_id`). Bruk `potte.potte_id` direkte → `<LysSheet potteId={potte.potte_id} … />`.

- [ ] **Step 5: `breathe-dot`-animasjon i app.css**

Legg til i `src/app.css` (i datavisualiserings-seksjonen):

```css
/* Tidslinje-nå-dot: myk puls (matcher mockens pp-breathe). */
@keyframes breathe-dot { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.breathe-dot { animation: breathe-dot 2.6s ease-in-out infinite; }
```

Og legg `.breathe-dot` til i `prefers-reduced-motion`-blokka nederst.

- [ ] **Step 6: Vann-arket — «sist fylt» + forbruksgraf**

I reservoar-arket, etter de tre stats-boksene, legg til (bruk `trend.sistFyltAt` + `trend.dagligForbruk`):

```svelte
    {#if trend.sistFyltAt}
      <div class="mt-3.5 text-[12px] text-text-muted">Sist fylt {trend.sistFyltAt.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}.</div>
    {/if}
    {#if trend.dagligForbruk.length > 0}
      <div class="mt-[18px]">
        <div class="flex items-baseline justify-between mb-2.5">
          <span class="text-[11px] text-text-muted">Forbruk siste 7 dager</span>
          <span class="font-mono text-[10px] text-text-dim">liter/dag</span>
        </div>
        {@const maks = Math.max(0.1, ...trend.dagligForbruk)}
        <div class="flex items-end gap-1.5 h-[50px]">
          {#each trend.dagligForbruk as d, i (i)}
            <div class="flex-1 rounded-t-[3px]" style="height:{Math.max(4, (d / maks) * 100)}%; background:#3b82c4; opacity:0.85"></div>
          {/each}
        </div>
      </div>
    {/if}
```

- [ ] **Step 7: Verifiser**

Run: `npm run check`
Expected: AnleggPanel kompilerer. Gjenstående feil kun i `PotteDetalj` (sender ikke `planter` ennå) — Task 7.

---

## Task 7: `PotteDetalj.svelte` — fjern LysKontroll, header, wrapper

**Files:**
- Modify: `src/components/PotteDetalj.svelte`

- [ ] **Step 1: Fjern LysKontroll, gi `planter` til AnleggPanel**

- Fjern `import LysKontroll from './LysKontroll.svelte';`.
- Fjern hele `<LysKontroll … />`-blokka.
- Legg til `planter={planter.map((p) => p.plante)}` i `<AnleggPanel … />`.

- [ ] **Step 2: Sticky header + mobil-wrapper**

Wrap hele innholdet i `<div class="max-w-[430px] mx-auto w-full">`. Bytt tilbake-knapp-raden til sticky header per mock (tilbake-knapp 34×34 `card`, kassenavn Fraunces 22px, tilkoblet-dot høyre — bruk `sensor` for online-status via eksisterende `minutterSiden`/`OFFLINE_GRENSE_MIN`). Behold drift-kortet + historikk under AnleggPanel.

```svelte
    <div class="sticky top-[57px] sm:top-[61px] z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-bg/85 backdrop-blur-md flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <button class="w-[34px] h-[34px] rounded-[10px] card flex items-center justify-center shrink-0" onclick={() => onNavigate({ name: 'oversikt' })} aria-label="Tilbake">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 class="font-display text-[22px] font-semibold leading-none truncate">{potte.navn}</h1>
      </div>
      {#if potte.har_sensorer}
        <span class="inline-flex items-center gap-1.5 font-mono text-[11px] {detaljOffline ? 'text-sun' : 'text-text-muted'} shrink-0">
          <span class="w-[7px] h-[7px] rounded-full {detaljOffline ? 'bg-sun' : 'bg-leaf'}" style="box-shadow:0 0 0 3px {detaljOffline ? 'rgba(251,191,36,0.16)' : 'rgba(74,222,128,0.16)'}"></span>
          {detaljOffline ? 'Frakoblet' : 'Tilkoblet'}
        </span>
      {/if}
    </div>
```

Legg til derived i script: `const detaljOffline = $derived.by(() => { const m = minutterSiden(sensor?.registrert_at); return m !== null && m > OFFLINE_GRENSE_MIN; });` (importer `minutterSiden, OFFLINE_GRENSE_MIN` fra utils).

> AnleggPanel viser også en tilkoblings-linje i dag — siden status nå er i headeren, fjern den tynne tilkoblings-mono-linja i AnleggPanel Step 3-området hvis den dupliserer. Behold offline-info ett sted (headeren). (Sjekk visuelt; behold AnleggPanel-klima-stripa.)

- [ ] **Step 3: Verifiser**

Run: `npm run check`
Expected: 0 feil relatert til disse filene. (LysKontroll/LysDognRing fortsatt på disk men ubrukt — slettes Task 10.)

---

## Task 8: `PotteKort.svelte` — oversikts-kort redesign

**Files:**
- Modify: `src/components/PotteKort.svelte`

- [ ] **Step 1: Legg til «laveste jordfukt» + lysplan-derived**

I script, legg til:
```ts
  const jordLavest = $derived.by(() => {
    if (!sensor) return null;
    const v = [sensor.jord1, sensor.jord2, sensor.jord3, sensor.jord4].map((r) => jordfuktProsent(r)).filter((x): x is number => x !== null);
    return v.length ? Math.min(...v) : null;
  });
  const trengerVann = $derived(jordLavest !== null && jordLavest < 35);
  const lysPlan = $derived(command ? (command.intensitet > 0 ? `${command.timer_on}–${command.timer_off} · ${command.intensitet} %` : 'Av') : 'Ikke satt');
  import { fuktStatus } from '../lib/utils';
```
(`fuktStatus` importeres øverst sammen med de andre utils.)

- [ ] **Step 2: Erstatt markup per mock**

Bygg om kortet til mock-strukturen: plant-ikon-boks (38×38, grønn ramme, løv-SVG), navn (font-display 18px), chevron; rad med online-dot + status + «N felt trenger vann»-badge (når `trengerVann`); plante-chips (grønn dot 6px, ikke emoji); skillelinje + 3-kol mikro-stats (Temp / Jord lavest farget via `fuktStatus(jordLavest).farge` / Vann blå) eller «Uten sensorer — kun lyskontroll»; sol-ikon (gul `#d4a017`) + `lysPlan`. Behold `offline`/`harData`-logikken. Bruk `font-display` for tall (19px mikro-stats).

«Trenger vann»-badge:
```svelte
{#if trengerVann}
  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono" style="background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.32); color:#fca5a5">Lav jordfukt</span>
{/if}
```

- [ ] **Step 3: Verifiser**

Run: `npm run check`
Expected: 0 feil.

---

## Task 9: `PotteOversikt.svelte` — mobil-layout

**Files:**
- Modify: `src/components/PotteOversikt.svelte`

- [ ] **Step 1: Layout + header**

- Bytt grid-wrapperen til `max-w-[430px] mx-auto w-full flex flex-col gap-3.5` (enkelt kolonne).
- Header: «Mine blomsterkasser» (`font-display text-[25px]`) + «N blomsterkasser» (`font-mono text-[11px] text-text-muted`) — bruk `$potter.length`.
- Legg `stig`-animasjon på lista (eller behold eksisterende).

- [ ] **Step 2: Verifiser**

Run: `npm run check && npm run build`
Expected: begge grønne.

---

## Task 10: Slett erstattede komponenter

**Files:**
- Delete: `src/components/LysKontroll.svelte`
- Delete: `src/components/viz/LysDognRing.svelte`

- [ ] **Step 1: Bekreft ingen gjenværende imports**

Run: `cd C:\Users\marku\Desktop\AI\Plantepotte && rg -n "LysKontroll|LysDognRing" src`
Expected: ingen treff (utenom evt. selve filene). Hvis treff: fjern dem først.

- [ ] **Step 2: Slett filene**

Run: `rm src/components/LysKontroll.svelte src/components/viz/LysDognRing.svelte`

- [ ] **Step 3: Verifiser**

Run: `npm run check`
Expected: 0 feil.

---

## Task 11: Full verifisering + commit

- [ ] **Step 1: Kjør alt**

Run: `cd C:\Users\marku\Desktop\AI\Plantepotte && npm run check && npm run test && npm run build`
Expected: svelte-check 0 feil, alle vitest grønne, build OK.

- [ ] **Step 2: Manuell røyktest**

Run: `npm run dev` → åpne http://localhost:5173
Sjekk: oversikt-liste (kort, badges, mikro-stats) → åpne kasse → klima-stripe + vekstlys-tidslinje (nå-dot) → trykk vekstlys → sol-bue-ark (dra slider, sol-buen + DLI oppdaterer, lagre) → trykk felt → felt-ark → trykk LUKE → vann-ark («sist fylt» + forbruksgraf + «marker som fylt»). Test en kasse uten sensorer (kun lys-kort vises).

- [ ] **Step 3: Én samlet commit (på slutten av økta)**

```bash
cd C:\Users\marku\Desktop\AI\Plantepotte
git add -A
git commit -m "$(cat <<'EOF'
feat(app): implementer «Anlegget» mobil-handoff (oversikt + detalj + 3 bunn-ark)

- PotteKort/PotteOversikt: mobil-first redesign, «lav jordfukt»-badge, mikro-stats
- AnleggPanel: klima-stripe, vekstlys-tidslinje m/nå-dot, LUKE mellom pottene
- Nytt vekstlys-ark (SolBue + LysSheet) erstatter LysKontroll/LysDognRing
- Vann-ark: «sist fylt» + 7-dagers forbruksgraf (trend.ts: sistFyltAt + dagligForbruk)
- Felt: orienterings-badge (Foran/Bak/Hele); «snu potta» bygges ikke

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
git push
```

---

## Self-review (utført)

**Spec-dekning:** Oversikt (T9/T8) ✓ · PotteKort alle 6 rader (T8) ✓ · klima-stripe (T6.3) ✓ · vekstlys-tidslinje (T6.2) ✓ · LUKE + undertekst (T6.4) ✓ · Felt-badge (T4) ✓ · Felt-ark beholdt (eksisterende) ✓ · Vann-ark sist-fylt + forbruk (T1+T6.6) ✓ · Lys-ark SolBue (T2/T3) ✓ · slett LysKontroll/LysDognRing (T10) ✓ · trend-felt (T1) ✓ · snu droppet ✓.

**Placeholder-skann:** ingen TBD/TODO; all kode er konkret.

**Type-konsistens:** `FeltData.rolle` ('foran'|'bak'|'hel') brukt i Felt (T4), Potte (T5), AnleggPanel pots (T6.1) — konsistent. `VannTrend.sistFyltAt: Date|null` + `dagligForbruk: number[]` (T1) brukt i AnleggPanel (T6.6). `LysSheet`-props matcher kallet i AnleggPanel (T6.4).
