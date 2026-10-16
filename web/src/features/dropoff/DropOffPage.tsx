import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useHashParam } from '../../hooks/useHashRoute'
import { filterByMaterial, mergePoints } from '../../lib/places/filter'
import { DEFAULT_CENTRE, distanceKm, sortByDistance } from '../../lib/places/geo'
import { isPointMaterial, POINT_MATERIALS, POINT_MATERIAL_LABELS, type LatLng, type PointMaterial } from '../../lib/places/types'
import { routeHref } from '../../lib/routes'
import { MapView } from './MapView'
import { MARKER_STYLES } from './markerStyles'
import { PointCard } from './PointCard'
import { SuggestPointForm } from './SuggestPointForm'
import { usePoints } from './usePoints'

const MAX_LISTED = 25
const MAX_UNLISTED = 10
/** Offer "Search this area" once the map has moved this far from the last search. */
const RESEARCH_DISTANCE_KM = 3

function Legend() {
  const items = [
    { label: 'Checked by team', style: MARKER_STYLES.team },
    { label: 'Recycling centre', style: MARKER_STYLES.centre },
    { label: 'Recycling bin', style: MARKER_STYLES.container },
  ]
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label="Map key">
      {items.map(({ label, style }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: style.fillColor, border: `2px solid ${style.color}`, boxShadow: '0 0 0 1px rgb(0 0 0 / 0.15)' }} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-full border-2 border-white bg-[#2f6fb5] shadow" />
        You
      </li>
    </ul>
  )
}

export function DropOffPage() {
  const materialParam = useHashParam('material')
  const material: PointMaterial | null = materialParam && isPointMaterial(materialParam) ? materialParam : null
  const { geo, locate } = useGeolocation()
  const userPosition = geo.status === 'ready' ? geo.position : null

  const [searchCentre, setSearchCentre] = useState<LatLng>(DEFAULT_CENTRE)
  const [mapCentre, setMapCentre] = useState<LatLng>(DEFAULT_CENTRE)
  const [lastLocated, setLastLocated] = useState<LatLng | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [pickedLocation, setPickedLocation] = useState<LatLng | null>(null)
  const { team, osm, isLoading, warning, reloadTeam } = usePoints(searchCentre)

  // When a new location fix arrives, search around it (once per fix).
  if (userPosition && userPosition !== lastLocated) {
    setLastLocated(userPosition)
    setSearchCentre(userPosition)
  }

  const origin = userPosition ?? searchCentre
  const sorted = useMemo(() => sortByDistance(mergePoints(team, osm), origin), [team, osm, origin])
  const { matching, unlisted } = filterByMaterial(sorted, material)
  const shown = [...matching.slice(0, MAX_LISTED), ...unlisted.slice(0, MAX_UNLISTED)]
  const canResearch = distanceKm(mapCentre, searchCentre) > RESEARCH_DISTANCE_KM

  function setMaterial(next: PointMaterial | null) {
    window.location.assign(next ? routeHref('dropoff', { material: next }) : routeHref('dropoff'))
  }

  function finishSuggesting(didSubmit: boolean) {
    setIsSuggesting(false)
    setPickedLocation(null)
    if (didSubmit) reloadTeam()
  }

  return (
    <>
      <PageHeader eyebrow="Drop-off" title="Find a recycling point" />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by material">
        {[null, ...POINT_MATERIALS].map((m) => {
          const isOn = m === material
          return (
            <button
              key={m ?? 'all'}
              type="button"
              aria-pressed={isOn}
              onClick={() => setMaterial(m)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium ring-1 transition ${isOn ? 'bg-forest text-paper ring-forest' : 'bg-white ring-ink/15'}`}
            >
              {m ? POINT_MATERIAL_LABELS[m] : 'All'}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <MapView
          centre={searchCentre}
          points={sorted}
          userPosition={userPosition}
          selectedId={selectedId}
          onSelect={setSelectedId}
          pickedLocation={pickedLocation}
          isPicking={isSuggesting}
          onPick={setPickedLocation}
          onMoveEnd={setMapCentre}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center gap-2">
          {canResearch && !isSuggesting && (
            <button type="button" onClick={() => setSearchCentre(mapCentre)} className="pointer-events-auto min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-forest shadow-md">
              Search this area
            </button>
          )}
          <button
            type="button"
            onClick={locate}
            disabled={geo.status === 'locating'}
            className="pointer-events-auto min-h-10 rounded-full bg-forest px-4 text-sm font-semibold text-paper shadow-md disabled:opacity-70"
          >
            {geo.status === 'locating' ? 'Finding you…' : '📍 Use my location'}
          </button>
        </div>
      </div>
      <Legend />
      {geo.status === 'error' && <p className="mt-2 text-sm text-alert">{geo.message}</p>}
      {warning && <p className="mt-2 text-sm text-ink-soft">⚠️ {warning}</p>}

      <div className="mt-6">
        {isSuggesting ? (
          <SuggestPointForm location={pickedLocation} userPosition={userPosition} onUseMyLocation={setPickedLocation} onDone={finishSuggesting} />
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-extrabold">
                {material ? `Nearest for ${POINT_MATERIAL_LABELS[material].toLowerCase()}` : 'Nearest to you'}
              </h2>
              {isLoading && <span className="text-xs text-ink-soft">Loading…</span>}
            </div>
            {!userPosition && <p className="mt-1 text-xs text-ink-soft">Distances are from the map centre until you share your location.</p>}

            {shown.length === 0 && !isLoading ? (
              <p className="mt-4 rounded-2xl border border-dashed border-ink/20 p-5 text-center text-sm text-ink-soft">
                No recycling points found here yet. Try "Search this area" somewhere else, or suggest one below.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {shown.map((point) => (
                  <PointCard key={point.id} point={point} isSelected={point.id === selectedId} onSelect={setSelectedId} />
                ))}
              </ul>
            )}
            {material && unlisted.length > 0 && (
              <p className="mt-2 text-xs text-ink-soft">Points that don't list their materials are shown last, as they may still accept it.</p>
            )}

            <button
              type="button"
              onClick={() => setIsSuggesting(true)}
              className="mt-6 min-h-12 w-full rounded-full border-2 border-forest px-6 font-semibold text-forest"
            >
              + Suggest a drop-off point
            </button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              Map data from OpenStreetMap. Your location stays on your phone.{' '}
              <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer" className="underline">
                Fix the map
              </a>
            </p>
          </>
        )}
      </div>
    </>
  )
}
