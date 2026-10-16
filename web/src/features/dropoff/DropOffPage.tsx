import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useI18n } from '../../i18n/context'
import type { Message } from '../../i18n/translate'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useHashParam } from '../../hooks/useHashRoute'
import { deleteHub } from '../../lib/places/api'
import { filterByMaterial, isNothingNearby, mergePoints } from '../../lib/places/filter'
import { DEFAULT_CENTRE, distanceKm, sortByDistance } from '../../lib/places/geo'
import { formatRadius, SEARCH_RADII_M } from '../../lib/places/radius'
import { isPointMaterial, POINT_MATERIALS, type DropOffPoint, type LatLng, type PointMaterial } from '../../lib/places/types'
import { routeHref } from '../../lib/routes'
import { AddHubForm } from './AddHubForm'
import { MapView } from './MapView'
import { MARKER_STYLES } from './markerStyles'
import { PointCard } from './PointCard'
import { usePoints } from './usePoints'

const MAX_LISTED = 25
const MAX_UNLISTED = 10
/** Offer "Search this area" once the map has moved this far from the last search. */
const RESEARCH_DISTANCE_KM = 3

function Legend() {
  const { t } = useI18n()
  const items = [
    { label: t('legend.community'), style: MARKER_STYLES.team },
    { label: t('legend.centre'), style: MARKER_STYLES.centre },
    { label: t('legend.bin'), style: MARKER_STYLES.container },
  ]
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label={t('dropoff.mapKey')}>
      {items.map(({ label, style }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: style.fillColor, border: `2px solid ${style.color}`, boxShadow: '0 0 0 1px rgb(0 0 0 / 0.15)' }} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-full border-2 border-white bg-[#2f6fb5] shadow" />
        {t('legend.you')}
      </li>
    </ul>
  )
}

export function DropOffPage() {
  const { t, m } = useI18n()
  const materialParam = useHashParam('material')
  const material: PointMaterial | null = materialParam && isPointMaterial(materialParam) ? materialParam : null
  const { geo, locate } = useGeolocation()
  const userPosition = geo.status === 'ready' ? geo.position : null

  const [searchCentre, setSearchCentre] = useState<LatLng>(DEFAULT_CENTRE)
  const [mapCentre, setMapCentre] = useState<LatLng>(DEFAULT_CENTRE)
  const [lastLocated, setLastLocated] = useState<LatLng | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [pickedLocation, setPickedLocation] = useState<LatLng | null>(null)
  const [deleteError, setDeleteError] = useState<Message | null>(null)
  const { community, osm, isLoading, warning, reloadCommunity } = usePoints(searchCentre)

  // When a new location fix arrives, search around it (once per fix).
  if (userPosition && userPosition !== lastLocated) {
    setLastLocated(userPosition)
    setSearchCentre(userPosition)
  }

  const origin = userPosition ?? searchCentre
  // Community hubs are always included, however far away, so there's something to show everywhere.
  const sorted = useMemo(() => sortByDistance(mergePoints(community, osm), origin), [community, osm, origin])
  const { matching, unlisted } = filterByMaterial(sorted, material)
  const shown = [...matching.slice(0, MAX_LISTED), ...unlisted.slice(0, MAX_UNLISTED)]
  const canResearch = distanceKm(mapCentre, searchCentre) > RESEARCH_DISTANCE_KM
  const nearKm = SEARCH_RADII_M[0] / 1000
  const showsNearestAvailable = !isLoading && isNothingNearby(matching.length > 0 ? matching : sorted, nearKm)

  function setMaterial(next: PointMaterial | null) {
    window.location.assign(next ? routeHref('dropoff', { material: next }) : routeHref('dropoff'))
  }

  function finishAdding(didAdd: boolean) {
    setIsAdding(false)
    setPickedLocation(null)
    if (didAdd) reloadCommunity()
  }

  async function handleDelete(point: DropOffPoint) {
    if (!window.confirm(t('point.deleteConfirm', { name: point.name ?? '' }))) return
    const result = await deleteHub(point.id)
    setDeleteError(result.ok ? null : result.error)
    if (result.ok) reloadCommunity()
  }

  return (
    <>
      <PageHeader eyebrow={t('dropoff.eyebrow')} title={t('dropoff.title')} />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t('dropoff.filterLabel')}>
        {[null, ...POINT_MATERIALS].map((option) => {
          const isOn = option === material
          return (
            <button
              key={option ?? 'all'}
              type="button"
              aria-pressed={isOn}
              onClick={() => setMaterial(option)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium ring-1 transition ${isOn ? 'bg-forest text-paper ring-forest' : 'bg-white ring-ink/15'}`}
            >
              {option ? t(`pointMaterial.${option}`) : t('dropoff.all')}
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
          isPicking={isAdding}
          onPick={setPickedLocation}
          onMoveEnd={setMapCentre}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center gap-2">
          {canResearch && !isAdding && (
            <button type="button" onClick={() => setSearchCentre(mapCentre)} className="pointer-events-auto min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-forest shadow-md">
              {t('dropoff.searchArea')}
            </button>
          )}
          <button
            type="button"
            onClick={locate}
            disabled={geo.status === 'locating'}
            className="pointer-events-auto min-h-10 rounded-full bg-forest px-4 text-sm font-semibold text-paper shadow-md disabled:opacity-70"
          >
            {geo.status === 'locating' ? t('dropoff.locating') : t('dropoff.useLocation')}
          </button>
        </div>
      </div>
      <Legend />
      {geo.status === 'error' && <p className="mt-2 text-sm text-alert">{m(geo.message)}</p>}
      {warning && <p className="mt-2 text-sm text-ink-soft">⚠️ {m(warning)}</p>}

      <div className="mt-6">
        {isAdding ? (
          <AddHubForm location={pickedLocation} userPosition={userPosition} onUseMyLocation={setPickedLocation} onDone={finishAdding} />
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-extrabold">
                {material ? t('dropoff.nearestFor', { material: t(`pointMaterial.${material}`).toLowerCase() }) : t('dropoff.nearest')}
              </h2>
              {isLoading && <span className="text-xs text-ink-soft">{t('common.loading')}</span>}
            </div>
            {!userPosition && <p className="mt-1 text-xs text-ink-soft">{t('dropoff.fromCentre')}</p>}
            {showsNearestAvailable && (
              <p className="mt-2 rounded-xl bg-signal/20 px-3 py-2 text-sm" role="status">
                {t('dropoff.widened', { near: formatRadius(SEARCH_RADII_M[0]) })}
              </p>
            )}
            {deleteError && (
              <p role="alert" className="mt-2 text-sm text-alert">
                {m(deleteError)}
              </p>
            )}

            {shown.length === 0 && !isLoading ? (
              <p className="mt-4 rounded-2xl border border-dashed border-ink/20 p-5 text-center text-sm text-ink-soft">{t('dropoff.none')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {shown.map((point) => (
                  <PointCard key={point.id} point={point} isSelected={point.id === selectedId} onSelect={setSelectedId} onDelete={handleDelete} />
                ))}
              </ul>
            )}
            {material && unlisted.length > 0 && <p className="mt-2 text-xs text-ink-soft">{t('dropoff.unlistedNote')}</p>}

            <button type="button" onClick={() => setIsAdding(true)} className="mt-6 min-h-12 w-full rounded-full border-2 border-forest px-6 font-semibold text-forest">
              {t('dropoff.addHub')}
            </button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              {t('dropoff.attribution')}{' '}
              <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer" className="underline">
                {t('dropoff.fixMap')}
              </a>
            </p>
          </>
        )}
      </div>
    </>
  )
}
