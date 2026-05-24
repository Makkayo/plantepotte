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
  vann_lav: boolean | null;
  vann_mid: boolean | null;
  registrert_at: string | null;
  owner_id: string | null;
}

/** Skeletal Database type for the Supabase client. We only use the row types above directly. */
export type Database = {
  public: {
    Tables: {
      lys_familier: { Row: LysFamilie; Insert: Partial<LysFamilie>; Update: Partial<LysFamilie> };
      planter: { Row: Plante; Insert: Partial<Plante>; Update: Partial<Plante> };
      potter: { Row: Potte; Insert: Partial<Potte>; Update: Partial<Potte> };
      potte_planter: { Row: PottePlante; Insert: Partial<PottePlante>; Update: Partial<PottePlante> };
      potte_commands: { Row: PotteCommand; Insert: Partial<PotteCommand>; Update: Partial<PotteCommand> };
      potte_sensor_data: {
        Row: PotteSensorData;
        Insert: Partial<PotteSensorData>;
        Update: Partial<PotteSensorData>;
      };
    };
  };
};
