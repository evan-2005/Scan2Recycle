import { describe, expect, it } from 'vitest'
import type { ItemType, Material } from '../types'
import { disposalFor } from './disposal'

function material(overrides: Partial<Material> & Pick<Material, 'id'>): Material {
  return { display_name: overrides.id, bin_name: `${overrides.id} bin`, bin_colour: '#111111', is_recyclable: true, sort_order: 0, ...overrides }
}

const paper = material({ id: 'paper', bin_name: 'Paper Recycling Bin', bin_colour: '#2f6fb5' })
const general = material({ id: 'general', bin_name: 'General Waste Bin', bin_colour: '#4a4a4a', is_recyclable: false })
const eWaste = material({ id: 'e-waste', bin_name: 'E-waste Drop-off Point', is_recyclable: false })
const materials = [paper, general, eWaste]

function item(overrides: Partial<ItemType>): ItemType {
  return { id: 1, label: 'x', display_name: 'X', material_id: 'paper', recyclable: true, typical_weight_g: null, tip: null, ...overrides }
}

describe('disposalFor', () => {
  it('sends a recyclable item to its material bin', () => {
    expect(disposalFor(item({}), paper, materials)).toEqual({
      recyclable: true,
      binName: 'Paper Recycling Bin',
      binColour: '#2f6fb5',
    })
  })

  it('sends a non-recyclable item of a recyclable material to general waste', () => {
    expect(disposalFor(item({ recyclable: false }), paper, materials)).toEqual({
      recyclable: false,
      binName: 'General Waste Bin',
      binColour: '#4a4a4a',
    })
  })

  it('uses the special bin for non-recyclable materials like e-waste', () => {
    expect(disposalFor(item({ material_id: 'e-waste', recyclable: false }), eWaste, materials).binName).toBe(
      'E-waste Drop-off Point',
    )
  })

  it('falls back to the material when no item was identified', () => {
    expect(disposalFor(null, paper, materials).recyclable).toBe(true)
    expect(disposalFor(null, eWaste, materials).recyclable).toBe(false)
  })

  it('still answers if the general material is missing from the database', () => {
    expect(disposalFor(item({ recyclable: false }), paper, [paper]).binName).toBe('General Waste Bin')
  })
})
