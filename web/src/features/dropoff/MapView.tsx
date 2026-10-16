import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { DropOffPoint, LatLng } from '../../lib/places/types'
import { MARKER_STYLES } from './markerStyles'

/**
 * OpenStreetMap's own tiles: free and keyless, fine for a small project under the OSM tile usage policy
 * (attribution required, no heavy traffic). For a large rollout switch to a keyed provider (e.g. MapTiler).
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const DEFAULT_ZOOM = 13

function styleFor(point: DropOffPoint, isSelected: boolean): L.CircleMarkerOptions {
  const base = point.source === 'team' ? MARKER_STYLES.team : point.kind === 'container' ? MARKER_STYLES.container : MARKER_STYLES.centre
  return { ...base, radius: isSelected ? 11 : 7, dashArray: point.isPending ? '3 3' : undefined }
}

interface MapViewProps {
  /** Changing this re-centres the map (e.g. after "Use my location"). */
  centre: LatLng
  points: readonly DropOffPoint[]
  userPosition: LatLng | null
  selectedId: string | null
  onSelect: (id: string) => void
  /** In pick mode, tapping the map places a pin instead of selecting points. */
  pickedLocation: LatLng | null
  isPicking: boolean
  onPick: (location: LatLng) => void
  onMoveEnd: (centre: LatLng) => void
}

export function MapView({ centre, points, userPosition, selectedId, onSelect, pickedLocation, isPicking, onPick, onMoveEnd }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const pointLayer = useRef<L.LayerGroup | null>(null)
  const overlayLayer = useRef<L.LayerGroup | null>(null)
  // Latest callbacks, so map listeners registered once always call the current ones.
  const handlers = useRef({ onSelect, onPick, onMoveEnd, isPicking })
  handlers.current = { onSelect, onPick, onMoveEnd, isPicking }

  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { zoomControl: true, attributionControl: true }).setView([centre.lat, centre.lng], DEFAULT_ZOOM)
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(instance)
    pointLayer.current = L.layerGroup().addTo(instance)
    overlayLayer.current = L.layerGroup().addTo(instance)
    instance.on('click', (event: L.LeafletMouseEvent) => {
      if (handlers.current.isPicking) handlers.current.onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    })
    instance.on('moveend', () => {
      const c = instance.getCenter()
      handlers.current.onMoveEnd({ lat: c.lat, lng: c.lng })
    })
    map.current = instance
    return () => {
      instance.remove()
      map.current = null
    }
    // Create the map once; later centre changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setView([centre.lat, centre.lng], Math.max(map.current.getZoom(), DEFAULT_ZOOM))
  }, [centre.lat, centre.lng])

  useEffect(() => {
    const layer = pointLayer.current
    if (!layer) return
    layer.clearLayers()
    for (const point of points) {
      const marker = L.circleMarker([point.lat, point.lng], styleFor(point, point.id === selectedId))
      marker.bindTooltip(point.name ?? (point.kind === 'container' ? 'Recycling bin' : 'Recycling point'))
      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        if (!handlers.current.isPicking) handlers.current.onSelect(point.id)
      })
      marker.addTo(layer)
      if (point.id === selectedId) marker.bringToFront()
    }
  }, [points, selectedId])

  useEffect(() => {
    const layer = overlayLayer.current
    if (!layer) return
    layer.clearLayers()
    if (userPosition) {
      L.circleMarker([userPosition.lat, userPosition.lng], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2f6fb5', fillOpacity: 1 })
        .bindTooltip('You are here')
        .addTo(layer)
    }
    if (pickedLocation) {
      L.circleMarker([pickedLocation.lat, pickedLocation.lng], { radius: 12, color: '#b3412e', weight: 3, fillColor: '#ffffff', fillOpacity: 0.9 })
        .bindTooltip('New point', { permanent: true, direction: 'top' })
        .addTo(layer)
    }
  }, [userPosition, pickedLocation])

  useEffect(() => {
    container.current?.classList.toggle('cursor-crosshair', isPicking)
  }, [isPicking])

  return (
    <div
      ref={container}
      className="h-[45dvh] min-h-64 w-full overflow-hidden rounded-3xl shadow-md ring-1 ring-ink/10"
      role="region"
      aria-label="Map of recycling points"
    />
  )
}
