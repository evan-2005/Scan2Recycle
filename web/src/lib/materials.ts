import type { Material } from '../types'
import { supabase } from './supabase'

export type MaterialsResult =
  | { ok: true; materials: Material[] }
  | { ok: false; error: string }

/** Reads the public materials table. Used by the setup check now, and by the result screen in Phase 1. */
export async function fetchMaterials(): Promise<MaterialsResult> {
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured (see web/.env.example).' }
  }
  const { data, error } = await supabase
    .from('materials')
    .select('id, display_name, bin_name, bin_colour, is_recyclable, sort_order')
    .order('sort_order')
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, materials: data as Material[] }
}
