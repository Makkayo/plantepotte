import { writable, derived, type Readable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { LysFamilie, Plante, Potte, PottePlanteFull } from './database.types';

/** Auth session — null when logged out. */
export const session = writable<Session | null>(null);

/** Logged-in user — null when logged out. */
export const user: Readable<User | null> = derived(session, ($s) => $s?.user ?? null);

supabase.auth.getSession().then(({ data }) => session.set(data.session));
supabase.auth.onAuthStateChange((_event, newSession) => session.set(newSession));

// ============= REFERENCE DATA (cached after first load) =============

export const lysFamilier = writable<LysFamilie[]>([]);
export const planter = writable<Plante[]>([]);
export const potter = writable<Potte[]>([]);

/** Indexed by potte_id → list of plants in that pot. Refreshed by loadPottePlanter(). */
export const pottePlanter = writable<Record<string, PottePlanteFull[]>>({});

let referenceLoaded = false;

export async function loadReferenceData(): Promise<void> {
  if (referenceLoaded) return;

  const [familier, planteListe, potteListe] = await Promise.all([
    supabase.from('lys_familier').select('*').order('sortering'),
    supabase.from('planter').select('*').order('navn'),
    supabase.from('potter').select('*').order('potte_id'),
  ]);

  if (familier.data) lysFamilier.set(familier.data);
  if (planteListe.data) planter.set(planteListe.data);
  if (potteListe.data) potter.set(potteListe.data);

  referenceLoaded = true;
}

export async function loadPottePlanter(potteId: string): Promise<void> {
  const { data, error } = await supabase
    .from('potte_planter')
    .select('*, plante:planter(*)')
    .eq('potte_id', potteId)
    .order('seksjon');

  if (error) {
    console.error('loadPottePlanter:', error);
    return;
  }

  pottePlanter.update((m) => ({ ...m, [potteId]: (data ?? []) as unknown as PottePlanteFull[] }));
}

export async function loadAllPottePlanter(): Promise<void> {
  const { data, error } = await supabase
    .from('potte_planter')
    .select('*, plante:planter(*)')
    .order('seksjon');

  if (error) {
    console.error('loadAllPottePlanter:', error);
    return;
  }

  const grouped: Record<string, PottePlanteFull[]> = {};
  for (const row of (data ?? []) as unknown as PottePlanteFull[]) {
    if (!grouped[row.potte_id]) grouped[row.potte_id] = [];
    grouped[row.potte_id]!.push(row);
  }
  pottePlanter.set(grouped);
}

/** Force-refresh reference data (after the user edits the catalog). */
export async function refreshReferenceData(): Promise<void> {
  referenceLoaded = false;
  await loadReferenceData();
}
