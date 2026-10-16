import { useCallback, useEffect, useState } from 'react'
import { fetchOsmPoints, fetchTeamPoints } from '../../lib/places/api'
import type { DropOffPoint, LatLng } from '../../lib/places/types'

export interface PointsState {
  team: DropOffPoint[]
  osm: DropOffPoint[]
  isLoading: boolean
  /** Shown as a note; the map still works with whatever loaded. */
  warning: string | null
}

/** Team points (once, and again after a suggestion) plus OpenStreetMap points around `searchCentre`. */
export function usePoints(searchCentre: LatLng): PointsState & { reloadTeam: () => void } {
  const [team, setTeam] = useState<DropOffPoint[]>([])
  const [teamWarning, setTeamWarning] = useState<string | null>(null)
  const [teamVersion, setTeamVersion] = useState(0)
  const [osm, setOsm] = useState<DropOffPoint[]>([])
  const [osmWarning, setOsmWarning] = useState<string | null>(null)
  /** The centre the current OSM results belong to; loading until it matches the requested one. */
  const [loadedFor, setLoadedFor] = useState<LatLng | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTeamPoints().then((result) => {
      if (cancelled) return
      setTeam(result.ok ? result.value : [])
      setTeamWarning(result.ok ? null : result.error)
    })
    return () => {
      cancelled = true
    }
  }, [teamVersion])

  useEffect(() => {
    let cancelled = false
    fetchOsmPoints(searchCentre).then((result) => {
      if (cancelled) return
      setOsm(result.ok ? result.value : [])
      setOsmWarning(result.ok ? null : result.error)
      setLoadedFor(searchCentre)
    })
    return () => {
      cancelled = true
    }
  }, [searchCentre])

  const reloadTeam = useCallback(() => setTeamVersion((v) => v + 1), [])
  return { team, osm, isLoading: loadedFor !== searchCentre, warning: osmWarning ?? teamWarning, reloadTeam }
}
