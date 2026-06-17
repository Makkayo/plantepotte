<script lang="ts">
  type View =
    | { name: 'oversikt' }
    | { name: 'potte'; potteId: string }
    | { name: 'katalog' }
    | { name: 'dyrking' };
  let { onNavigate }: { onNavigate: (v: View) => void } = $props();

  // Anbefalt frø-utvalg (matchet til veke-systemet, fra plantekatalogen)
  const startfro = [
    { navn: 'Ruccola', emoji: '🌿', note: 'Spirer 3–6 dager — nesten umulig å bomme. Reså hver 3.–4. uke.' },
    { navn: 'Løsbladsalat (Salad Bowl / Little Gem)', emoji: '🥬', note: 'Høst løpende, lite stokk-stress.' },
    { navn: 'Babyleaf-mix', emoji: '🥗', note: 'Tett bestand, klipp-og-kom-igjen.' },
    { navn: 'Basilikum', emoji: '🌱', note: 'Elsker jevn fukt + lys. Knip toppen ved 3–4 bladpar.' },
    { navn: 'Gressløk', emoji: '🧅', note: 'Robust, flerårig, tett klynge — ikke tynn.' },
    { navn: 'Dill', emoji: '🌾', note: 'Rask, så direkte (hater omplanting).' },
  ];

  const tolmodig = [
    { navn: 'Koriander', note: 'Går raskt i stokk → reså hver 3.–4. uke.' },
    { navn: 'Grønnkål (Dwarf Blue Curled)', note: 'Langsom, men stødig.' },
    { navn: 'Spinat (babyleaf)', note: 'Vil ha det kjølig + moderat lystid.' },
    { navn: 'Persille', note: 'Bløtlegg frø 12–24t — spirer tregt (2–4 uker!).' },
  ];

  const smaplante = ['Mynte (egen seksjon!)', 'Rosmarin', 'Salvie', 'Fransk estragon', 'Timian'];

  // Konkret kjøpsliste (produkt + butikk + pris + lenke). Avkrysning huskes ikke ennå.
  let kjopt = $state<Record<string, boolean>>({});
  const minimum = [
    {
      id: 'kokos',
      tekst: 'Kokos-medium: Torvfri plantejord (sveller til ~10 L)',
      butikk: 'Clas Ohlson',
      pris: '39,90',
      lenke: 'https://www.clasohlson.com/no/Torvfri-plantejord/p/Pr318238000',
    },
    {
      id: 'perlite',
      tekst: 'Perlite 6 L (bland inn ~30 %)',
      butikk: 'Felleskjøpet / Plantasjen',
      pris: '119',
      lenke: 'https://www.felleskjopet.no/hjem-og-fritid/hage/jord-og-torv/jordforbedring/perlite-6-liter-50319797/',
    },
    {
      id: 'naring',
      tekst: 'Universal flytende plantenæring — fra dag 1 med kokos (rimelig universal ~80–130 holder)',
      butikk: 'Felleskjøpet / Plantasjen',
      pris: '~80–230',
      lenke: 'https://www.felleskjopet.no/produkt/hage-og-uterom/dyrk-og-plante/gjoedsel-og-kalk/spesialgjoedsel-og-vekstnaering/plantenaering-grow-organisk-500-ml-50350574_BASE',
    },
    {
      id: 'fro',
      tekst: 'Frø: ruccola, løsbladsalat, basilikum, gressløk (+ evt. dill)',
      butikk: 'Plantasjen frø-vegg / Felleskjøpet',
      pris: '~30–75/pose',
      lenke: 'https://www.felleskjopet.no/hjem-og-fritid/hage/dyrke-og-plante/froepakker/urter/basilikum-salat-50319814/',
    },
    {
      id: 'spray',
      tekst: 'Spray-flaske / blomstersprøyte (frøene spirer ikke i tørr topp)',
      butikk: 'Clas Ohlson / Biltema / Europris',
      pris: '~30–50',
      lenke: '',
    },
  ];

  const butikker = [
    { navn: 'Plantasjen (Moa)', for: 'Frø, kokos, perlite, næring, spray, småplanter — én tur', type: 'Fysisk — one-stop' },
    { navn: 'Clas Ohlson', for: 'Kokos-jord 39,90 (billigst!), spray-flaske', type: 'Fysisk — billig' },
    { navn: 'Felleskjøpet', for: 'Perlite i stor pose, vermikulitt, næring, frø', type: 'Fysisk' },
    { navn: 'Gartnerbutikken / Botanisk Verden', for: 'Buffret kokos, Biobizz, hydro-næring, bredt frøutvalg', type: 'Nett — backup' },
  ];
</script>

<div class="flex flex-col gap-6">
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Dyrking</h1>
    <p class="text-text-muted text-sm mt-1">
      Handleliste og dyrketips for urter + salat i den selvvannende veke-potta.
    </p>
  </div>

  <!-- Minimums-handleliste -->
  <div class="card p-4 sm:p-5">
    <h2 class="font-semibold flex items-center gap-2">
      <span>✅</span> Kom-i-gang-liste
    </h2>
    <p class="text-text-dim text-xs mt-1">Det aller nødvendigste — ~270–470 kr. Huk av mens du handler.</p>
    <div class="mt-3 flex flex-col gap-1.5">
      {#each minimum as m (m.id)}
        <div class="flex items-start gap-3 p-2.5 rounded-lg bg-surface-raised">
          <input
            type="checkbox"
            bind:checked={kjopt[m.id]}
            class="mt-1 accent-leaf w-4 h-4 shrink-0"
            id={'chk-' + m.id}
          />
          <div class="min-w-0 flex-1">
            <label
              for={'chk-' + m.id}
              class="text-sm cursor-pointer {kjopt[m.id] ? 'line-through text-text-dim' : 'text-text'}"
            >
              {m.tekst}
            </label>
            <div class="flex items-center gap-2 flex-wrap mt-1">
              <span class="text-xs text-text-dim">{m.butikk}</span>
              <span class="chip border-border bg-surface text-text-muted">{m.pris} kr</span>
              {#if m.lenke}
                <a href={m.lenke} target="_blank" rel="noopener" class="text-xs text-sky hover:underline">lenke ↗</a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
    <p class="text-text-dim text-xs mt-3">
      ⚠️ Ikke kjøp Substral hos Clas Ohlson — den er utgått. Plante-etiketter printer du selv.
    </p>
  </div>

  <!-- Frø-utvalg -->
  <div class="card p-4 sm:p-5">
    <h2 class="font-semibold flex items-center gap-2"><span>🌱</span> Anbefalt frø-utvalg</h2>
    <p class="text-text-dim text-xs mt-1">Lettstelt, rask og tåler veke-fukt. Start med 4–6 sorter, reså etter hvert.</p>

    <h3 class="label mt-4 mb-2">🟢 Lettest — start her</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {#each startfro as f (f.navn)}
        <div class="card-raised p-3 flex items-start gap-3">
          <span class="text-2xl">{f.emoji}</span>
          <div class="min-w-0">
            <div class="font-medium text-sm leading-tight">{f.navn}</div>
            <p class="text-xs text-text-muted mt-1">{f.note}</p>
          </div>
        </div>
      {/each}
    </div>

    <h3 class="label mt-4 mb-2">🟡 Litt mer tålmodighet</h3>
    <ul class="flex flex-col gap-1.5">
      {#each tolmodig as f (f.navn)}
        <li class="text-sm flex gap-2">
          <span class="font-medium shrink-0">{f.navn}:</span>
          <span class="text-text-muted">{f.note}</span>
        </li>
      {/each}
    </ul>

    <h3 class="label mt-4 mb-2">🔴 Kjøp som småplante (ikke frø)</h3>
    <div class="flex gap-1.5 flex-wrap">
      {#each smaplante as s (s)}
        <span class="chip border-border bg-surface-raised text-text-muted">{s}</span>
      {/each}
    </div>
    <p class="text-xs text-text-dim mt-2">Frø av disse er tregt/upålitelig. Mynte må ha egen seksjon — røttene kveler naboene.</p>

    <button class="btn-secondary mt-4 text-sm" onclick={() => onNavigate({ name: 'katalog' })}>
      Se full plantekatalog med så-instrukser →
    </button>
  </div>

  <!-- Dyrkemedium -->
  <div class="card p-4 sm:p-5">
    <h2 class="font-semibold flex items-center gap-2"><span>🪴</span> Dyrkemedium</h2>
    <div class="mt-3 p-3 rounded-lg bg-leaf/10 border border-leaf/25">
      <div class="text-sm font-medium text-leaf">✅ Valgt: kokos + perlite + flytende næring</div>
      <p class="text-sm text-text-muted mt-1">
        Kokos veker vann best og gir luft til røttene. ~70/30 kokos/perlite. Kokos er inert, så
        næringen kommer fra vannet — lettest å holde gående over tid (jord tømmes på 4–6 uker).
      </p>
    </div>
    <p class="text-xs text-text-dim mt-3">
      <span class="font-medium text-text-muted">Backup (Alt. A):</span> torvfri plantejord + ~25 % perlite — enklere,
      men må topp-mates manuelt når næringen tømmes.
    </p>
    <p class="text-xs text-text-dim mt-2">🧂 Vann av og til ovenfra for å skylle ut salter som samler seg på toppen (hver 3.–4. uke).</p>
  </div>

  <!-- Næring -->
  <div class="card p-4 sm:p-5">
    <h2 class="font-semibold flex items-center gap-2"><span>💧</span> Næring</h2>
    <div class="mt-3 p-3 rounded-lg bg-sun/10 border border-sun/25">
      <div class="text-sm font-medium text-sun">⚠️ De to beholderne deler ett vannbad</div>
      <p class="text-sm text-text-muted mt-1">
        Flytende næring i vannbadet treffer <strong>begge</strong> beholderne likt. Ikke stable to
        kilder: bruk kokos (inert) + næring i vannet — ikke næringsjord i tillegg, ellers blir det
        for mye. Vil du dyrke ulikt i de to → bruk jord + topp-mating per beholder.
      </p>
    </div>
    <p class="text-xs text-text-dim mt-3">
      Dosering: følg flaska (~1–2 ml/L). Underdoser heller enn å overdose — urter/salat er nøysomme.
      Frisk opp næringsvannet ca. annenhver uke.
    </p>
  </div>

  <!-- Hvor handle -->
  <div class="card p-4 sm:p-5">
    <h2 class="font-semibold flex items-center gap-2"><span>🏪</span> Hvor handle</h2>
    <div class="mt-3 flex flex-col gap-2">
      {#each butikker as b (b.navn)}
        <div class="card-raised p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-sm">{b.navn}</span>
            <span class="chip border-border bg-surface text-text-dim shrink-0">{b.type}</span>
          </div>
          <p class="text-xs text-text-muted mt-1">{b.for}</p>
        </div>
      {/each}
    </div>
    <p class="text-xs text-text-dim mt-3">
      Realistisk: Plantasjen dekker nesten alt i én tur — innom Clas Ohlson/Biltema for spray.
    </p>
  </div>
</div>
