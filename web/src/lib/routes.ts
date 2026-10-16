export const ROUTES = ['scan', 'dropoff', 'groups', 'stats', 'history'] as const
export type Route = (typeof ROUTES)[number]

export const DEFAULT_ROUTE: Route = 'scan'

/** Maps a location hash like "#/stats" to a known route, falling back to the default. */
export function parseRoute(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : DEFAULT_ROUTE
}

/** Query parameters after the route, e.g. "#/dropoff?material=glass" → material=glass. */
export function routeParams(hash: string): URLSearchParams {
  const queryStart = hash.indexOf('?')
  return new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : '')
}

export function routeHref(route: Route, params?: Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : ''
  return `#/${route}${query ? `?${query}` : ''}`
}
