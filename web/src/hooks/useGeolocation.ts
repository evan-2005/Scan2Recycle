import { useCallback, useState } from 'react'
import type { LatLng } from '../lib/places/types'

export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; position: LatLng }
  | { status: 'error'; message: string }

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 }

function messageFor(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location is blocked. Allow it in your browser settings, or move the map yourself.'
  }
  return "Couldn't find your location. Move the map to your area instead."
}

/** Asks for the user's location only when they tap the button. The position never leaves the phone. */
export function useGeolocation(): { geo: GeoState; locate: () => void } {
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: "This browser can't share your location." })
      return
    }
    setGeo({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (position) => setGeo({ status: 'ready', position: { lat: position.coords.latitude, lng: position.coords.longitude } }),
      (error) => setGeo({ status: 'error', message: messageFor(error) }),
      OPTIONS,
    )
  }, [])

  return { geo, locate }
}
