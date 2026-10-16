import type { ItemType, Material } from '../types'

export interface Disposal {
  recyclable: boolean
  /** The material whose bin to use (null only if the database has no "general" material). */
  bin: Pick<Material, 'bin_name' | 'bin_name_ms' | 'bin_colour'>
}

const GENERAL_MATERIAL_ID = 'general'
const FALLBACK_GENERAL = { bin_name: 'General waste bin', bin_name_ms: 'Tong sisa am', bin_colour: '#4a4a4a' }

/**
 * Where an item should go. An item can be made of a recyclable material but still not be
 * recyclable (a greasy pizza box, a paper cup); those go to general waste instead of the material's bin.
 */
export function disposalFor(item: ItemType | null, material: Material, materials: readonly Material[]): Disposal {
  const recyclable = item ? item.recyclable : material.is_recyclable
  if (recyclable || !material.is_recyclable) return { recyclable, bin: material }
  return { recyclable: false, bin: materials.find((m) => m.id === GENERAL_MATERIAL_ID) ?? FALLBACK_GENERAL }
}
