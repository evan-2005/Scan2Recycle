import { describe, expect, it } from 'vitest'
import { directionsUrl, distanceKm, formatDistance, sortByDistance } from './geo'

const KLCC = { lat: 3.1579, lng: 101.7116 }
const KL_SENTRAL = { lat: 3.1343, lng: 101.6861 }

describe('distanceKm', () => {
  it('is 0 for the same point', () => {
    expect(distanceKm(KLCC, KLCC)).toBe(0)
  })

  it('matches a known distance (KLCC to KL Sentral ≈ 3.8 km)', () => {
    expect(distanceKm(KLCC, KL_SENTRAL)).toBeCloseTo(3.84, 1)
  })

  it('is symmetric', () => {
    expect(distanceKm(KLCC, KL_SENTRAL)).toBeCloseTo(distanceKm(KL_SENTRAL, KLCC), 10)
  })
})

describe('formatDistance', () => {
  it.each([
    [0.004, '10 m'],
    [0.234, '230 m'],
    [1.25, '1.3 km'],
    [12.6, '13 km'],
  ])('formats %s km as %s', (km, text) => {
    expect(formatDistance(km)).toBe(text)
  })
})

describe('sortByDistance', () => {
  it('returns a new array nearest first with distances, without mutating the input', () => {
    const points = [
      { id: 'far', ...KL_SENTRAL },
      { id: 'near', ...KLCC },
    ]
    const sorted = sortByDistance(points, KLCC)

    expect(sorted.map((p) => p.id)).toEqual(['near', 'far'])
    expect(sorted[0].distanceKm).toBe(0)
    expect(points[0].id).toBe('far')
  })
})

describe('directionsUrl', () => {
  it('builds a Google Maps directions link', () => {
    expect(directionsUrl(KLCC)).toBe('https://www.google.com/maps/dir/?api=1&destination=3.157900,101.711600')
  })
})
