import type { LatLng } from './types'

const EARTH_RADIUS_KM = 6371

/** Kuala Lumpur city centre: where the map opens before we know the user's location. */
export const DEFAULT_CENTRE: LatLng = { lat: 3.139, lng: 101.6869 }

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance in km (haversine). Plenty accurate for "which bin is nearest". */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

/** Returns a new array, nearest first, with each item's distance attached. */
export function sortByDistance<T extends LatLng>(items: readonly T[], origin: LatLng): (T & { distanceKm: number })[] {
  return items
    .map((item) => ({ ...item, distanceKm: distanceKm(origin, item) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/** Universal Google Maps directions link; opens the Maps app on Android and iPhone if installed. */
export function directionsUrl(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat.toFixed(6)},${to.lng.toFixed(6)}`
}
