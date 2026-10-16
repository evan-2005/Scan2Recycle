import type { Material, MaterialId } from '../types'

export interface LogForTotals {
  material_id: MaterialId
  weight_g: number | null
}

export interface MaterialTotal {
  material: Material
  items: number
  kg: number
}

export interface Totals {
  rows: MaterialTotal[]
  totalKg: number
  totalItems: number
  /** Logged items with no weight entered; they count as items but not towards kg. */
  itemsWithoutWeight: number
}

const roundKg = (kg: number) => Math.round(kg * 1000) / 1000

/**
 * Per-material totals for the "My Recycling" screen. Every recyclable material gets a row (even at 0)
 * so the screen always shows Plastic / Paper / Metal / Glass. Logs of non-recyclable materials are ignored.
 */
export function summarize(logs: readonly LogForTotals[], materials: readonly Material[]): Totals {
  const recyclable = materials.filter((m) => m.is_recyclable).sort((a, b) => a.sort_order - b.sort_order)
  const rows = recyclable.map((material) => {
    const mine = logs.filter((log) => log.material_id === material.id)
    const grams = mine.reduce((sum, log) => sum + (log.weight_g ?? 0), 0)
    return { material, items: mine.length, kg: roundKg(grams / 1000) }
  })
  const counted = logs.filter((log) => recyclable.some((m) => m.id === log.material_id))
  return {
    rows,
    totalKg: roundKg(rows.reduce((sum, row) => sum + row.kg, 0)),
    totalItems: counted.length,
    itemsWithoutWeight: counted.filter((log) => log.weight_g === null).length,
  }
}

/** "1.2 kg" for larger amounts, "350 g" below 1 kg so small first scans still feel like progress. */
export function formatWeight(kg: number): string {
  if (kg >= 1) return `${kg.toFixed(1)} kg`
  return `${Math.round(kg * 1000)} g`
}
