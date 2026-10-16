/** Materials a drop-off point can accept. Matches the CHECK constraint on recycling_points.materials. */
export const POINT_MATERIALS = ['paper', 'plastic', 'metal', 'glass', 'e-waste', 'clothes', 'organic'] as const
export type PointMaterial = (typeof POINT_MATERIALS)[number]

export const POINT_MATERIAL_LABELS: Readonly<Record<PointMaterial, string>> = {
  paper: 'Paper',
  plastic: 'Plastic',
  metal: 'Metal & cans',
  glass: 'Glass',
  'e-waste': 'E-waste',
  clothes: 'Clothes',
  organic: 'Food & garden',
}

export interface LatLng {
  lat: number
  lng: number
}

export interface DropOffPoint extends LatLng {
  /** "osm:node/123" or "team:<uuid>". */
  id: string
  name: string | null
  kind: 'centre' | 'container' | 'unknown'
  materials: PointMaterial[]
  openingHours: string | null
  address: string | null
  source: 'osm' | 'team'
  /** A team-list suggestion that only its author can see until approved. */
  isPending: boolean
}

export function isPointMaterial(value: string): value is PointMaterial {
  return (POINT_MATERIALS as readonly string[]).includes(value)
}
