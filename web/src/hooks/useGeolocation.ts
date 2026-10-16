import { useCallback, useState } from 'react'
import { msg, type Message } from '../i18n/translate'
import type { LatLng } from '../lib/places/types'

export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; position: LatLng }
  | { status: 'error'; message: Message }

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 }

/** Asks for the user's location only when they tap the button. The position never leaves the phone. */
export function useGeolocation(): { geo: GeoState; locate: () => void } {
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: msg('error.geoUnsupported') })
      return
    }
    setGeo({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (position) => setGeo({ status: 'ready', position: { lat: position.coords.latitude, lng: position.coords.longitude } }),
      (error) => setGeo({ status: 'error', message: msg(error.code === error.PERMISSION_DENIED ? 'error.geoBlocked' : 'error.geoFailed') }),
      OPTIONS,
    )
  }, [])

  return { geo, locate }
}
