/** Map kapasitiv jordfuktsensor ADC (0–4095) til prosent (lavere ADC = våtere). */
export function jordfuktProsent(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  // Empirisk: ~1500 = vått, ~4095 = bone-dry
  return Math.max(0, Math.min(100, Math.round(((4095 - raw) / 2595) * 100)));
}

export function jordfuktKlasse(pct: number | null): 'dry' | 'ok' | 'wet' | 'unknown' {
  if (pct === null) return 'unknown';
  if (pct < 30) return 'dry';
  if (pct > 85) return 'wet';
  return 'ok';
}

export function formaterTidssiden(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'nettopp';
  if (min < 60) return `for ${min} min siden`;
  const t = Math.round(min / 60);
  if (t < 24) return `for ${t} t siden`;
  const dager = Math.round(t / 24);
  if (dager < 7) return `for ${dager} d siden`;
  return d.toLocaleDateString('no', { day: 'numeric', month: 'short' });
}

export function formaterDato(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('no', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function pluralisering(n: number, ent: string, fl: string): string {
  return `${n} ${n === 1 ? ent : fl}`;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
