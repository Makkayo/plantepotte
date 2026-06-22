/**
 * Sentralisert «tilbake-knapp lukker overlegg».
 *
 * Maskinvare-/nettleser-tilbake (Android-knapp, iPhone-sveip, Alt+←) skal lukke
 * et åpent overlegg (ark/modal) FØR den navigerer mellom visninger. Vi holder
 * derfor ÉN history-oppføring så lenge minst ett overlegg er åpent:
 *   - åpne første overlegg  → pushState (én oppføring)
 *   - tilbake               → popstate fanges, øverste overlegg lukkes
 *   - lukke siste overlegg programmatisk (knapp/bakteppe) → history.back() for
 *     å rydde oppføringen
 *
 * Bytte mellom to overlegg i samme tick (f.eks. «Bytt plante»: lukk felt-ark →
 * åpne plantevelger) håndteres ved at opprydningen er utsatt til en microtask:
 * da har telleren rukket å gå 1 → 0 → 1, og oppføringen beholdes.
 */

let openCount = 0;
let entryPushed = false;
let popping = false;
const closers = new Set<() => void>();

function sync(): void {
  if (typeof history === 'undefined') return;
  if (openCount > 0 && !entryPushed) {
    history.pushState({ overlay: true }, '');
    entryPushed = true;
  } else if (openCount === 0 && entryPushed && !popping) {
    entryPushed = false;
    if ((history.state as { overlay?: boolean } | null)?.overlay) history.back();
  }
}

/**
 * Registrer et åpent overlegg. `close` kalles når tilbake trykkes.
 * Returnerer en funksjon som avregistrerer (kall ved programmatisk lukking /
 * komponent-destroy).
 */
export function overlayOpened(close: () => void): () => void {
  closers.add(close);
  openCount++;
  sync();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (closers.delete(close)) {
      openCount = Math.max(0, openCount - 1);
      queueMicrotask(sync);
    }
  };
}

/** Kalles fra popstate. Returnerer true hvis et overlegg ble lukket. */
export function handleOverlayBack(): boolean {
  if (closers.size === 0) return false;
  popping = true;
  entryPushed = false;
  openCount = 0;
  const alle = [...closers];
  closers.clear();
  for (const c of alle) c();
  popping = false;
  return true;
}
