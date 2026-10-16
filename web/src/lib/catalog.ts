import { msg, type Message } from '../i18n/translate'
import type { ItemType, Material } from '../types'
import { describeDbError } from './dbErrors'
import { supabase } from './supabase'

export interface Catalog {
  materials: Material[]
  itemTypes: ItemType[]
}

type Result<T> = { ok: true; value: T } | { ok: false; error: Message }

export type MaterialsResult = { ok: true; materials: Material[] } | { ok: false; error: Message }

// select('*') rather than a column list, so the app still works on a database that hasn't had the
// Malay columns added yet (it just shows English).
async function selectMaterials(): Promise<Result<Material[]>> {
  if (!supabase) return { ok: false, error: msg('error.notConfigured') }
  const { data, error } = await supabase.from('materials').select('*').order('sort_order')
  return error ? { ok: false, error: describeDbError(error.message) } : { ok: true, value: data as Material[] }
}

async function selectItemTypes(): Promise<Result<ItemType[]>> {
  if (!supabase) return { ok: false, error: msg('error.notConfigured') }
  const { data, error } = await supabase.from('item_types').select('*').order('id')
  return error ? { ok: false, error: describeDbError(error.message) } : { ok: true, value: data as ItemType[] }
}

/** Reads the public materials table. Used by the setup check. */
export async function fetchMaterials(): Promise<MaterialsResult> {
  const result = await selectMaterials()
  return result.ok ? { ok: true, materials: result.value } : result
}

/** Items the camera AI should compare photos against (all items stay searchable). */
export function aiItems(items: readonly ItemType[]): ItemType[] {
  return items.filter((item) => item.in_ai !== false)
}

/** Everything the scanner needs: the items the AI can recognise and the bins they go in. */
export async function fetchCatalog(): Promise<Result<Catalog>> {
  const [materials, itemTypes] = await Promise.all([selectMaterials(), selectItemTypes()])
  if (!materials.ok) return materials
  if (!itemTypes.ok) return itemTypes
  if (aiItems(itemTypes.value).length < 2) return { ok: false, error: msg('error.emptyItems') }
  return { ok: true, value: { materials: materials.value, itemTypes: itemTypes.value } }
}
