/** Mirrors the tables in supabase/migrations (001_init.sql, plus the Malay columns from 005). */

export type MaterialId = 'plastic' | 'paper' | 'metal' | 'glass' | 'organic' | 'e-waste' | 'general'

export interface Material {
  id: MaterialId
  display_name: string
  bin_name: string
  bin_colour: string
  is_recyclable: boolean
  sort_order: number
  /** Malay names (005_languages_hubs.sql). Missing on older databases; the app then shows English. */
  display_name_ms?: string | null
  bin_name_ms?: string | null
}

export interface ItemType {
  id: number
  label: string
  display_name: string
  material_id: MaterialId
  recyclable: boolean
  typical_weight_g: number | null
  tip: string | null
  display_name_ms?: string | null
  tip_ms?: string | null
  /** false = searchable but left out of the camera AI's labels. Missing means true. */
  in_ai?: boolean
}

export interface RecyclingLog {
  id: string
  user_id: string
  item_type_id: number | null
  material_id: MaterialId
  weight_g: number | null
  ai_label: string | null
  ai_score: number | null
  was_corrected: boolean
  created_at: string
}

export interface UserTotal {
  user_id: string
  material_id: MaterialId
  items: number
  kg: number
}
