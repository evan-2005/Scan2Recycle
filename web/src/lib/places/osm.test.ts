import { describe, expect, it } from 'vitest'
import { buildOverpassQuery, materialsFromTags, parseOverpass } from './osm'

describe('buildOverpassQuery', () => {
  it('asks for recycling points around the centre', () => {
    expect(buildOverpassQuery({ lat: 3.1390123, lng: 101.6869 }, 5000)).toBe(
      '[out:json][timeout:25];nwr["amenity"="recycling"](around:5000,3.13901,101.68690);out tags center 300;',
    )
  })
})

describe('materialsFromTags', () => {
  it('maps OSM recycling tags to our materials without duplicates', () => {
    const materials = materialsFromTags({
      'recycling:paper': 'yes',
      'recycling:cardboard': 'yes',
      'recycling:cans': 'yes',
      'recycling:batteries': 'yes',
      'recycling:glass_bottles': 'no',
      'recycling:unknown_thing': 'yes',
      amenity: 'recycling',
    })
    expect(materials.sort()).toEqual(['e-waste', 'metal', 'paper'])
  })
})

describe('parseOverpass', () => {
  it('reads nodes and way centres', () => {
    const points = parseOverpass({
      elements: [
        {
          type: 'node',
          id: 1,
          lat: 3.1,
          lon: 101.6,
          tags: { amenity: 'recycling', recycling_type: 'centre', name: 'Pusat Kitar Semula', 'recycling:plastic': 'yes', opening_hours: 'Mo-Sa 09:00-17:00', 'addr:street': 'Jalan Ampang', 'addr:city': 'Kuala Lumpur' },
        },
        { type: 'way', id: 2, center: { lat: 3.2, lon: 101.7 }, tags: { amenity: 'recycling', recycling_type: 'container', operator: 'Alam Flora' } },
      ],
    })

    expect(points).toEqual([
      {
        id: 'osm:node/1',
        name: 'Pusat Kitar Semula',
        kind: 'centre',
        materials: ['plastic'],
        openingHours: 'Mo-Sa 09:00-17:00',
        address: 'Jalan Ampang, Kuala Lumpur',
        lat: 3.1,
        lng: 101.6,
        source: 'osm',
        isPending: false,
        isMine: false,
      },
      {
        id: 'osm:way/2',
        name: 'Alam Flora',
        kind: 'container',
        materials: [],
        openingHours: null,
        address: null,
        lat: 3.2,
        lng: 101.7,
        source: 'osm',
        isPending: false,
        isMine: false,
      },
    ])
  })

  it('skips elements without coordinates and survives bad input', () => {
    expect(parseOverpass({ elements: [{ type: 'relation', id: 3, tags: {} }] })).toEqual([])
    expect(parseOverpass(null)).toEqual([])
    expect(parseOverpass({ elements: 'nope' })).toEqual([])
  })
})
