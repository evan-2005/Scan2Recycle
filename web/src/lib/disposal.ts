import type { ItemType, Material } from '../types'

export interface Disposal {
  recyclable: boolean
  binName: string
  binColour: string
}

const GENERAL_MATERIAL_ID = 'general'
const FALLBACK_GENERAL = { binName: 'General Waste Bin', binColour: '#4a4a4a' }

/**
 * Where an item should go. An item can be made of a recyclable material but still not be
 * recyclable (a greasy pizza box, a paper cup); those go to general waste instead of the material's bin.
 */
export function disposalFor(item: ItemType | null, material: Material, materials: readonly Material[]): Disposal {
  const recyclable = item ? item.recyclable : material.is_recyclable
  if (recyclable || !material.is_recyclable) {
    return { recyclable, binName: material.bin_name, binColour: material.bin_colour }
  }
  const general = materials.find((m) => m.id === GENERAL_MATERIAL_ID)
  return {
    recyclable: false,
    ...(general ? { binName: general.bin_name, binColour: general.bin_colour } : FALLBACK_GENERAL),
  }
}
