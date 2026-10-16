export const ROUTES = ['scan', 'stats', 'history'] as const
export type Route = (typeof ROUTES)[number]

export const DEFAULT_ROUTE: Route = 'scan'

/** Maps a location hash like "#/stats" to a known route, falling back to the default. */
export function parseRoute(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : DEFAULT_ROUTE
}

export function routeHref(route: Route): string {
  return `#/${route}`
}
