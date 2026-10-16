import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Message } from '../../i18n/translate'
import { fetchCommunityPoints, fetchOsmPoints, fetchSnapshotPoints } from '../../lib/places/api'
import { mergeOsm } from '../../lib/places/filter'
import { SEARCH_RADII_M } from '../../lib/places/radius'
import type { DropOffPoint, LatLng } from '../../lib/places/types'

export interface PointsState {
  community: DropOffPoint[]
  osm: DropOffPoint[]
  /** How far the OpenStreetMap search had to go; more than the first ring means nothing was nearby. */
  radiusM: number
  isLoading: boolean
  /** Shown as a note; the map still works with whatever loaded. */
  warning: Message | null
}

/** Community hubs (once, and again after changes) plus OpenStreetMap points around `searchCentre`. */
export function usePoints(searchCentre: LatLng): PointsState & { reloadCommunity: () => void } {
  const [community, setCommunity] = useState<DropOffPoint[]>([])
  const [communityWarning, setCommunityWarning] = useState<Message | null>(null)
  const [communityVersion, setCommunityVersion] = useState(0)
  const [osm, setOsm] = useState<DropOffPoint[]>([])
  const [snapshot, setSnapshot] = useState<DropOffPoint[]>([])
  const [radiusM, setRadiusM] = useState<number>(SEARCH_RADII_M[0])
  const [osmWarning, setOsmWarning] = useState<Message | null>(null)
  /** The centre the current OSM results belong to; loading until it matches the requested one. */
  const [loadedFor, setLoadedFor] = useState<LatLng | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCommunityPoints().then((result) => {
      if (cancelled) return
      setCommunity(result.ok ? result.value : [])
      setCommunityWarning(result.ok ? null : result.error)
    })
    return () => {
      cancelled = true
    }
  }, [communityVersion])

  useEffect(() => {
    let cancelled = false
    fetchSnapshotPoints().then((points) => {
      if (!cancelled) setSnapshot(points)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchOsmPoints(searchCentre).then((result) => {
      if (cancelled) return
      setOsm(result.ok ? result.value.points : [])
      setRadiusM(result.ok ? result.value.radiusM : SEARCH_RADII_M[0])
      setOsmWarning(result.ok ? null : result.error)
      setLoadedFor(searchCentre)
    })
    return () => {
      cancelled = true
    }
  }, [searchCentre])

  const reloadCommunity = useCallback(() => setCommunityVersion((v) => v + 1), [])
  // With the bundled snapshot there is still a map when the live servers fail, so their warning is only shown
  // if there is no snapshot either.
  const warning = (snapshot.length > 0 ? null : osmWarning) ?? communityWarning
  // Memoised so the map only redraws its markers when the points actually change.
  const merged = useMemo(() => mergeOsm(osm, snapshot), [osm, snapshot])
  return { community, osm: merged, radiusM, isLoading: loadedFor !== searchCentre, warning, reloadCommunity }
}
