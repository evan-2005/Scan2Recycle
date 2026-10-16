import { useSyncExternalStore } from 'react'
import { parseRoute, routeParams, type Route } from '../lib/routes'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
}

/** Current route from the URL hash, so tabs survive refresh and can be linked to. */
export function useHashRoute(): Route {
  return parseRoute(useHash())
}

/** One query parameter from the hash, e.g. useHashParam('material') on "#/dropoff?material=glass". */
export function useHashParam(name: string): string | null {
  return routeParams(useHash()).get(name)
}
