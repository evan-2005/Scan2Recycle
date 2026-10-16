import { describe, expect, it } from 'vitest'
import { formatRadius, MIN_NEARBY_POINTS, SEARCH_RADII_M, shouldWiden } from './radius'

describe('shouldWiden', () => {
  it('widens while too few points were found and a wider ring exists', () => {
    expect(shouldWiden(0, 0)).toBe(true)
    expect(shouldWiden(MIN_NEARBY_POINTS - 1, 0)).toBe(true)
  })

  it('stops when enough points were found', () => {
    expect(shouldWiden(MIN_NEARBY_POINTS, 0)).toBe(false)
  })

  it('stops at the widest ring even if nothing was found', () => {
    expect(shouldWiden(0, SEARCH_RADII_M.length - 1)).toBe(false)
  })
})

describe('formatRadius', () => {
  it('shows kilometres', () => {
    expect(formatRadius(8000)).toBe('8 km')
    expect(formatRadius(60000)).toBe('60 km')
  })
})
