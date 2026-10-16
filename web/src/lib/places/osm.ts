import type { DropOffPoint, LatLng, PointMaterial } from './types'

/** OpenStreetMap `recycling:*=yes` tags and the material each one means for us. */
const TAG_MATERIALS: Readonly<Record<string, PointMaterial>> = {
  paper: 'paper',
  cardboard: 'paper',
  newspaper: 'paper',
  magazines: 'paper',
  paper_packaging: 'paper',
  cartons: 'paper',
  beverage_cartons: 'paper',
  plastic: 'plastic',
  plastic_bottles: 'plastic',
  plastic_packaging: 'plastic',
  pet: 'plastic',
  PET: 'plastic',
  cans: 'metal',
  scrap_metal: 'metal',
  aluminium: 'metal',
  metal: 'metal',
  glass: 'glass',
  glass_bottles: 'glass',
  batteries: 'e-waste',
  electrical_appliances: 'e-waste',
  electrical_items: 'e-waste',
  small_appliances: 'e-waste',
  mobile_phones: 'e-waste',
  computers: 'e-waste',
  electronics: 'e-waste',
  low_energy_bulbs: 'e-waste',
  clothes: 'clothes',
  shoes: 'clothes',
  textiles: 'clothes',
  organic: 'organic',
  green_waste: 'organic',
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/** Overpass QL: recycling points (nodes, and centres of mapped areas) within `radiusM` of a point. */
export function buildOverpassQuery(centre: LatLng, radiusM: number): string {
  const around = `around:${Math.round(radiusM)},${centre.lat.toFixed(5)},${centre.lng.toFixed(5)}`
  return `[out:json][timeout:25];nwr["amenity"="recycling"](${around});out tags center 300;`
}

export function materialsFromTags(tags: Readonly<Record<string, string>>): PointMaterial[] {
  const found = new Set<PointMaterial>()
  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith('recycling:') || value !== 'yes') continue
    const material = TAG_MATERIALS[key.slice('recycling:'.length)]
    if (material) found.add(material)
  }
  return [...found]
}

function addressFromTags(tags: Readonly<Record<string, string>>): string | null {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const parts = [street, tags['addr:city']].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function kindFromTags(tags: Readonly<Record<string, string>>): DropOffPoint['kind'] {
  if (tags.recycling_type === 'centre') return 'centre'
  if (tags.recycling_type === 'container') return 'container'
  return 'unknown'
}

/** Turns an Overpass JSON response into drop-off points, skipping anything without coordinates. */
export function parseOverpass(json: unknown): DropOffPoint[] {
  const elements = (json as { elements?: unknown })?.elements
  if (!Array.isArray(elements)) return []
  return (elements as OverpassElement[]).flatMap((element) => {
    const lat = element.lat ?? element.center?.lat
    const lng = element.lon ?? element.center?.lon
    if (typeof lat !== 'number' || typeof lng !== 'number') return []
    const tags = element.tags ?? {}
    const point: DropOffPoint = {
      id: `osm:${element.type}/${element.id}`,
      name: tags.name ?? tags['name:en'] ?? tags.operator ?? null,
      kind: kindFromTags(tags),
      materials: materialsFromTags(tags),
      openingHours: tags.opening_hours ?? null,
      address: addressFromTags(tags),
      lat,
      lng,
      source: 'osm',
      isPending: false,
      isMine: false,
    }
    return [point]
  })
}
