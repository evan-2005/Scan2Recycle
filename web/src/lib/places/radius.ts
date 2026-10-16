/** Search rings, nearest first: if the first has too few points, the map searches the wide one.
 *  Only two, because the free servers rate-limit back-to-back queries. */
export const SEARCH_RADII_M = [8000, 60000] as const

/** Fewer points than this within a ring means "nothing nearby", so widen the search. */
export const MIN_NEARBY_POINTS = 3

/** True when the search should try the next, wider ring. */
export function shouldWiden(foundCount: number, ringIndex: number): boolean {
  return foundCount < MIN_NEARBY_POINTS && ringIndex < SEARCH_RADII_M.length - 1
}

/** "8 km", "25 km": for the "Nothing within…" note. */
export function formatRadius(radiusM: number): string {
  return `${Math.round(radiusM / 1000)} km`
}
