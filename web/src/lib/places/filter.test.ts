import { describe, expect, it } from 'vitest'
import { filterByMaterial, isNothingNearby, mergeOsm, mergePoints, pointMaterialFor } from './filter'
import type { DropOffPoint } from './types'

function point(id: string, overrides: Partial<DropOffPoint> = {}): DropOffPoint {
  return { id, name: id, kind: 'unknown', materials: [], openingHours: null, address: null, lat: 3.1, lng: 101.6, source: 'osm', isPending: false, isMine: false, ...overrides }
}

describe('mergePoints', () => {
  it('drops OSM points that sit on top of a team point', () => {
    const team = [point('team:1', { source: 'team' })]
    const osm = [point('osm:dupe', { lat: 3.10001 }), point('osm:other', { lat: 3.2 })]
    expect(mergePoints(team, osm).map((p) => p.id)).toEqual(['team:1', 'osm:other'])
  })
})

describe('filterByMaterial', () => {
  const points = [point('glass', { materials: ['glass'] }), point('paper', { materials: ['paper', 'metal'] }), point('unlisted')]

  it('returns everything as matching when there is no filter', () => {
    expect(filterByMaterial(points, null)).toEqual({ matching: points, unlisted: [] })
  })

  it('splits points into matching and unlisted', () => {
    const result = filterByMaterial(points, 'metal')
    expect(result.matching.map((p) => p.id)).toEqual(['paper'])
    expect(result.unlisted.map((p) => p.id)).toEqual(['unlisted'])
  })
})

describe('pointMaterialFor', () => {
  it('maps scan materials to drop-off filters', () => {
    expect(pointMaterialFor('e-waste')).toBe('e-waste')
    expect(pointMaterialFor('organic')).toBe('organic')
    expect(pointMaterialFor('general')).toBeNull()
  })
})

describe('mergeOsm', () => {
  it('adds snapshot points the live search did not return, preferring the live copy', () => {
    const live = [point('osm:node/1', { name: 'live' })]
    const snapshot = [point('osm:node/1', { name: 'old' }), point('osm:node/2')]
    expect(mergeOsm(live, snapshot).map((p) => `${p.id}:${p.name}`)).toEqual(['osm:node/1:live', 'osm:node/2:osm:node/2'])
  })
})

describe('isNothingNearby', () => {
  it('is true only when every point is further than the limit', () => {
    expect(isNothingNearby([{ distanceKm: 12 }, { distanceKm: 30 }], 8)).toBe(true)
    expect(isNothingNearby([{ distanceKm: 2 }, { distanceKm: 30 }], 8)).toBe(false)
    expect(isNothingNearby([], 8)).toBe(false)
  })
})
