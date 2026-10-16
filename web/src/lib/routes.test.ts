import { describe, expect, it } from 'vitest'
import { DEFAULT_ROUTE, parseRoute, routeHref } from './routes'

describe('parseRoute', () => {
  it.each([
    ['#/scan', 'scan'],
    ['#/stats', 'stats'],
    ['#/history', 'history'],
    ['#history', 'history'],
    ['#/stats/extra', 'stats'],
    ['#/stats?tab=week', 'stats'],
  ])('maps %s to %s', (hash, expected) => {
    expect(parseRoute(hash)).toBe(expected)
  })

  it.each(['', '#', '#/', '#/unknown', '#/SCAN'])('falls back to the default for %j', (hash) => {
    expect(parseRoute(hash)).toBe(DEFAULT_ROUTE)
  })
})

describe('routeHref', () => {
  it('round-trips through parseRoute', () => {
    expect(parseRoute(routeHref('history'))).toBe('history')
  })
})
