/** Materials a drop-off point can accept. Matches the CHECK constraint on recycling_points.materials. */
export const POINT_MATERIALS = ['paper', 'plastic', 'metal', 'glass', 'e-waste', 'clothes', 'organic'] as const
export type PointMaterial = (typeof POINT_MATERIALS)[number]


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
  /** Hidden from everyone else (the team unticked "approved" in Supabase); its author still sees it. */
  isPending: boolean
  /** Added by the current user, so they can delete it. */
  isMine: boolean
}

export function isPointMaterial(value: string): value is PointMaterial {
  return (POINT_MATERIALS as readonly string[]).includes(value)
}
