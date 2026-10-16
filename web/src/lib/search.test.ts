import { describe, expect, it } from 'vitest'
import type { ItemType } from '../types'
import { MAX_RESULTS, searchItems } from './search'

function item(id: number, display_name: string, label: string, material_id: ItemType['material_id'] = 'plastic', display_name_ms: string | null = null): ItemType {
  return { id, label, display_name, material_id, recyclable: true, typical_weight_g: null, tip: null, display_name_ms }
}

const items = [
  item(1, 'Plastic Bottle', 'a plastic water bottle'),
  item(2, 'Glass Bottle', 'a glass bottle', 'glass'),
  item(3, 'Aluminium Can', 'an aluminium drink can', 'metal'),
  item(4, 'Tin Can', 'a tin food can', 'metal'),
  item(5, 'Battery', 'a battery', 'e-waste'),
  item(6, 'Greasy Pizza Box', 'a greasy pizza box', 'paper'),
  item(7, 'Cardboard Box', 'a cardboard box', 'paper'),
  item(8, 'Shoe Box', 'a shoe box', 'paper', 'Kotak Kasut'),
  item(9, 'Cooking Oil Bottle', 'a cooking oil bottle', 'plastic', 'Botol Minyak Masak'),
]
const names = (query: string) => searchItems(query, items).map((i) => i.display_name)

describe('searchItems', () => {
  it('finds items by name, best match first', () => {
    expect(names('bottle')).toEqual(['Cooking Oil Bottle', 'Glass Bottle', 'Plastic Bottle'])
    expect(names('plastic bottle')).toEqual(['Plastic Bottle'])
  })

  it('matches word prefixes and plurals', () => {
    expect(names('batt')).toEqual(['Battery'])
    expect(names('batteries')).toEqual(['Battery'])
    expect(names('boxes')).toEqual(['Cardboard Box', 'Greasy Pizza Box', 'Shoe Box'])
  })

  it('ignores filler words and punctuation', () => {
    expect(names('an empty can!')).toEqual(['Aluminium Can', 'Tin Can'])
  })

  it('understands common Malay words', () => {
    expect(names('botol plastik')).toEqual(['Plastic Bottle'])
    expect(names('kotak kasut')).toEqual(['Shoe Box'])
    expect(names('minyak masak')).toEqual(['Cooking Oil Bottle'])
    expect(names('kasut')).toEqual(['Shoe Box'])
    expect(names('tin')).toContain('Tin Can')
    expect(names('kotak pizza')).toEqual(['Greasy Pizza Box'])
  })

  it('uses the label when the name does not match', () => {
    expect(names('drink')).toEqual(['Aluminium Can'])
  })

  it('returns nothing for very short or unmatched queries', () => {
    expect(names('a')).toEqual([])
    expect(names('spaceship')).toEqual([])
    expect(names('   ')).toEqual([])
  })

  it(`returns at most ${MAX_RESULTS} results`, () => {
    const many = Array.from({ length: 10 }, (_, i) => item(100 + i, `Bottle ${i}`, 'a bottle'))
    expect(searchItems('bottle', many)).toHaveLength(MAX_RESULTS)
  })
})
