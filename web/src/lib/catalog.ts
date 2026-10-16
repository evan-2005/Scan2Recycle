import type { ItemType, Material } from '../types'
import { supabase } from './supabase'

export interface Catalog {
  materials: Material[]
  itemTypes: ItemType[]
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const NOT_CONFIGURED = 'Supabase is not configured (see web/.env.example).'

export type MaterialsResult = { ok: true; materials: Material[] } | { ok: false; error: string }

async function selectMaterials(): Promise<Result<Material[]>> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED }
  const { data, error } = await supabase
    .from('materials')
    .select('id, display_name, bin_name, bin_colour, is_recyclable, sort_order')
    .order('sort_order')
  return error ? { ok: false, error: error.message } : { ok: true, value: data as Material[] }
}

async function selectItemTypes(): Promise<Result<ItemType[]>> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED }
  const { data, error } = await supabase
    .from('item_types')
    .select('id, label, display_name, material_id, recyclable, typical_weight_g, tip')
    .order('id')
  return error ? { ok: false, error: error.message } : { ok: true, value: data as ItemType[] }
}

/** Reads the public materials table. Used by the setup check. */
export async function fetchMaterials(): Promise<MaterialsResult> {
  const result = await selectMaterials()
  return result.ok ? { ok: true, materials: result.value } : result
}

/** Everything the scanner needs: the items the AI can recognise and the bins they go in. */
export async function fetchCatalog(): Promise<Result<Catalog>> {
  const [materials, itemTypes] = await Promise.all([selectMaterials(), selectItemTypes()])
  if (!materials.ok) return materials
  if (!itemTypes.ok) return itemTypes
  if (itemTypes.value.length < 2) return { ok: false, error: 'The item list is empty. Run supabase/setup_all.sql.' }
  return { ok: true, value: { materials: materials.value, itemTypes: itemTypes.value } }
}
