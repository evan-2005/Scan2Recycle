import { describe, expect, it } from 'vitest'
import type { Material } from '../types'
import { formatWeight, summarize } from './totals'

function material(id: Material['id'], sort_order: number, is_recyclable = true): Material {
  return { id, display_name: id, bin_name: `${id} bin`, bin_colour: '#000000', is_recyclable, sort_order }
}

const materials = [material('paper', 2), material('plastic', 1), material('metal', 3), material('general', 7, false)]

describe('summarize', () => {
  it('returns a zero row for every recyclable material, in sort order', () => {
    const totals = summarize([], materials)

    expect(totals.rows.map((r) => [r.material.id, r.items, r.kg])).toEqual([
      ['plastic', 0, 0],
      ['paper', 0, 0],
      ['metal', 0, 0],
    ])
    expect(totals).toMatchObject({ totalKg: 0, totalItems: 0, itemsWithoutWeight: 0 })
  })

  it('adds grams per material and converts to kg', () => {
    const totals = summarize(
      [
        { material_id: 'metal', weight_g: 32 },
        { material_id: 'metal', weight_g: 15 },
        { material_id: 'paper', weight_g: 1200 },
      ],
      materials,
    )

    expect(totals.rows.find((r) => r.material.id === 'metal')).toMatchObject({ items: 2, kg: 0.047 })
    expect(totals.totalKg).toBe(1.247)
    expect(totals.totalItems).toBe(3)
  })

  it('counts items without a weight separately', () => {
    const totals = summarize(
      [
        { material_id: 'plastic', weight_g: null },
        { material_id: 'plastic', weight_g: 20 },
      ],
      materials,
    )

    expect(totals.rows[0]).toMatchObject({ items: 2, kg: 0.02 })
    expect(totals.itemsWithoutWeight).toBe(1)
  })

  it('ignores logs of non-recyclable materials', () => {
    const totals = summarize([{ material_id: 'general', weight_g: 500 }], materials)
    expect(totals).toMatchObject({ totalKg: 0, totalItems: 0 })
  })
})

describe('formatWeight', () => {
  it.each([
    [0, '0 g'],
    [0.047, '47 g'],
    [0.999, '999 g'],
    [1, '1.0 kg'],
    [5.04, '5.0 kg'],
  ])('formats %s kg as %s', (kg, text) => {
    expect(formatWeight(kg)).toBe(text)
  })
})
