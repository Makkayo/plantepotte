/**
 * Database types matching the Supabase schema.
 * Kept hand-written for clarity; could be replaced with `supabase gen types typescript` output later.
 */

export type LysFamilieId =
  | 'skygge-tolerante'
  | 'standard-urter'
  | 'salat-blader'
  | 'solhungrige'
  | 'mikrogront';

export type PlanteKategori = 'urt' | 'salat' | 'gronnsak' | 'frukt' | 'blomst' | 'mikrogront' | 'sukkulent';
export type VannBehov = 'hoy' | 'medium' | 'lav';
export type VekeEgnet = 'utmerket' | 'bra' | 'forsiktig' | 'ikke_anbefalt';
export type Vanskelighet = 'lett' | 'middels' | 'vanskelig';

export interface LysFamilie {
  id: LysFamilieId;
  navn: string;
  beskrivelse: string;
  emoji: string | null;
  dli_min: number;
  dli_maks: number;
  timer_min: number;
  timer_maks: number;
  intensitet_min: number;
  intensitet_maks: number;
  sortering: number;
}

export interface Plante {
  id: string;
  slug: string;
  navn: string;
  vitenskapelig: string | null;
  emoji: string | null;
  kategori: PlanteKategori;
  lys_familie: LysFamilieId;
  dli_min: number | null;
  dli_optimal: number | null;
  dli_maks: number | null;
  timer_optimal: number | null;
  intensitet_optimal: number | null;
  vann_behov: VannBehov;
  veke_egnet: VekeEgnet;
  dager_til_hosting: number | null;
  hoyde_maks_cm: number | null;
  vanskelighetsgrad: Vanskelighet | null;
  beskrivelse: string | null;
  dyrking_tips: string | null;
  nering_notat: string | null;
  varianter: string[] | null;
  kilder: string[] | null;
  owner_id: string | null;
  publisert: boolean;
  opprettet_at: string;
}

export interface Potte {
  id: string;
  potte_id: string;
  navn: string;
  emoji: string | null;
  antall_seksjoner: number;
  har_sensorer: boolean;
  notater: string | null;
  owner_id: string | null;
  opprettet_at: string;
}

export interface PottePlante {
  id: string;
  potte_id: string;
  plante_id: string;
  seksjon: number;
  plantet_at: string;
  notater: string | null;
}

/** Joined row used in many components. */
export interface PottePlanteFull extends PottePlante {
  plante: Plante;
}

export interface PotteCommand {
  id: string;
  potte_id: string;
  intensitet: number;
  timer_on: string;
  timer_off: string;
  plantetype: string | null;
  updated_at: string | null;
  owner_id: string | null;
}

export interface PotteSensorData {
  id: string;
  potte_id: string;
  temperatur: number | null;
  luftfuktighet: number | null;
  jord1: number | null;
  jord2: number | null;
  jord3: number | null;
  /** Rå avstand i mm fra VL53L0X-laser til flottør. Web-appen kalibrerer tom/full → %. */
  vann_avstand_mm: number | null;
  registrert_at: string | null;
  owner_id: string | null;
}

/**
 * Database-type for Supabase-klienten.
 *
 * To ting må stemme, ellers kollapser hvert `.from(...)`-kall til `never`
 * (det var årsaken til de 5 typefeilene i `npm run check`):
 *
 *  1. Skjemaet må ha `Views`/`Functions`/`Enums`/`CompositeTypes`, og hver tabell
 *     må ha `Row`/`Insert`/`Update` + `Relationships`.
 *  2. `Row` må være et type-literal, ikke et `interface`. supabase-js krever at
 *     raden er `Record<string, unknown>`, og et `interface` (som kan utvides) er
 *     IKKE tilordnbart dit — bare type-literaler er. `Flat<>` mapper interfacet
 *     om til et type-literal slik at det godtas.
 */
type Flat<T> = { [K in keyof T]: T[K] };
type Tabell<Row> = {
  Row: Flat<Row>;
  Insert: Partial<Flat<Row>>;
  Update: Partial<Flat<Row>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      lys_familier: Tabell<LysFamilie>;
      planter: Tabell<Plante>;
      potter: Tabell<Potte>;
      potte_planter: Tabell<PottePlante>;
      potte_commands: Tabell<PotteCommand>;
      potte_sensor_data: Tabell<PotteSensorData>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
