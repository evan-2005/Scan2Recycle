import { useSyncExternalStore } from 'react'
import { parseRoute, type Route } from '../lib/routes'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** Current route from the URL hash, so tabs survive refresh and can be linked to. */
export function useHashRoute(): Route {
  return useSyncExternalStore(
    subscribe,
    () => parseRoute(window.location.hash),
    () => parseRoute(''),
  )
}
