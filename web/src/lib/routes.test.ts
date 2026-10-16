import { describe, expect, it } from 'vitest'
import { DEFAULT_ROUTE, parseRoute, routeHref, routeParams } from './routes'

describe('parseRoute', () => {
  it.each([
    ['#/scan', 'scan'],
    ['#/dropoff', 'dropoff'],
    ['#/groups', 'groups'],
    ['#/stats', 'stats'],
    ['#/history', 'history'],
    ['#history', 'history'],
    ['#/stats/extra', 'stats'],
    ['#/dropoff?material=glass', 'dropoff'],
  ])('maps %s to %s', (hash, expected) => {
    expect(parseRoute(hash)).toBe(expected)
  })

  it.each(['', '#', '#/', '#/unknown', '#/SCAN'])('falls back to the default for %j', (hash) => {
    expect(parseRoute(hash)).toBe(DEFAULT_ROUTE)
  })
})

describe('routeParams', () => {
  it('reads query parameters after the route', () => {
    expect(routeParams('#/dropoff?material=e-waste').get('material')).toBe('e-waste')
    expect(routeParams('#/dropoff').get('material')).toBeNull()
  })
})

describe('routeHref', () => {
  it('round-trips through parseRoute and routeParams', () => {
    const href = routeHref('dropoff', { material: 'glass' })
    expect(href).toBe('#/dropoff?material=glass')
    expect(parseRoute(href)).toBe('dropoff')
    expect(routeParams(href).get('material')).toBe('glass')
    expect(routeHref('history')).toBe('#/history')
  })
})
