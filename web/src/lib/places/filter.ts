import { distanceKm } from './geo'
import type { DropOffPoint, PointMaterial } from './types'
import type { MaterialId } from '../../types'

/** Points closer than this to a team-list point are treated as the same place. */
const DUPLICATE_RADIUS_KM = 0.03

/** Team points win over OpenStreetMap ones at the same spot (they're checked and have better details). */
export function mergePoints(team: readonly DropOffPoint[], osm: readonly DropOffPoint[]): DropOffPoint[] {
  const unique = osm.filter((o) => !team.some((t) => distanceKm(t, o) < DUPLICATE_RADIUS_KM))
  return [...team, ...unique]
}

export interface FilteredPoints<T extends DropOffPoint> {
  /** Points that say they accept the material (or all points when there is no filter). */
  matching: T[]
  /** Points that don't list any materials: might accept it, worth a check before going. */
  unlisted: T[]
}

export function filterByMaterial<T extends DropOffPoint>(points: readonly T[], material: PointMaterial | null): FilteredPoints<T> {
  if (!material) return { matching: [...points], unlisted: [] }
  return {
    matching: points.filter((p) => p.materials.includes(material)),
    unlisted: points.filter((p) => p.materials.length === 0),
  }
}

/** Which drop-off filter to open from a scan result. General waste has no drop-off point. */
export function pointMaterialFor(materialId: MaterialId): PointMaterial | null {
  return materialId === 'general' ? null : materialId
}
