import { ensureSession } from '../auth'
import { describeDbError } from '../dbErrors'
import { supabase } from '../supabase'
import { buildOverpassQuery, parseOverpass } from './osm'
import type { CleanSuggestion } from './suggestion'
import { isPointMaterial, type DropOffPoint, type LatLng } from './types'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

/** Public Overpass servers; the main one is often overloaded, so fall back to a mirror. */
const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'] as const
const REQUEST_TIMEOUT_MS = 20_000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'osm-points:'
export const SEARCH_RADIUS_M = 8000

interface CacheEntry {
  savedAt: number
  points: DropOffPoint[]
}

/** Rounded to ~1 km so small movements reuse the same cached search. */
function cacheKey(centre: LatLng): string {
  return `${CACHE_PREFIX}${centre.lat.toFixed(2)},${centre.lng.toFixed(2)},${SEARCH_RADIUS_M}`
}

function readCache(key: string): DropOffPoint[] | null {
  try {
    const entry = JSON.parse(localStorage.getItem(key) ?? 'null') as CacheEntry | null
    return entry && Date.now() - entry.savedAt < CACHE_TTL_MS ? entry.points : null
  } catch {
    return null
  }
}

function writeCache(key: string, points: DropOffPoint[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), points } satisfies CacheEntry))
  } catch {
    // Storage full or blocked (private mode): the map still works, it just refetches next time.
  }
}

async function queryOverpass(endpoint: string, query: string): Promise<DropOffPoint[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return parseOverpass(await response.json())
  } finally {
    clearTimeout(timer)
  }
}

/** Recycling points from OpenStreetMap near `centre`, cached for a day. */
export async function fetchOsmPoints(centre: LatLng): Promise<Result<DropOffPoint[]>> {
  const key = cacheKey(centre)
  const cached = readCache(key)
  if (cached) return { ok: true, value: cached }

  const query = buildOverpassQuery(centre, SEARCH_RADIUS_M)
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const points = await queryOverpass(endpoint, query)
      writeCache(key, points)
      return { ok: true, value: points }
    } catch {
      // Try the next server.
    }
  }
  return { ok: false, error: "Couldn't reach OpenStreetMap right now. Showing the team's list only." }
}

interface PointRow {
  id: string
  name: string
  lat: number
  lng: number
  materials: string[]
  address: string | null
  opening_hours: string | null
  approved: boolean
}

function fromRow(row: PointRow): DropOffPoint {
  return {
    id: `team:${row.id}`,
    name: row.name,
    kind: 'centre',
    materials: row.materials.filter(isPointMaterial),
    openingHours: row.opening_hours,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    source: 'team',
    isPending: !row.approved,
  }
}

/** Approved team points, plus this user's own pending suggestions if they are signed in. */
export async function fetchTeamPoints(): Promise<Result<DropOffPoint[]>> {
  if (!supabase) return { ok: true, value: [] }
  const { data, error } = await supabase
    .from('recycling_points')
    .select('id, name, lat, lng, materials, address, opening_hours, approved')
  if (error) return { ok: false, error: describeDbError(error.message, "The team's drop-off list") }
  return { ok: true, value: (data as PointRow[]).map(fromRow) }
}

export async function suggestPoint(suggestion: CleanSuggestion): Promise<Result<null>> {
  const session = await ensureSession()
  if (!session.ok) return session
  const { error } = await supabase!.from('recycling_points').insert({
    name: suggestion.name,
    lat: suggestion.lat,
    lng: suggestion.lng,
    materials: suggestion.materials,
    opening_hours: suggestion.openingHours,
    notes: suggestion.notes,
  })
  return error ? { ok: false, error: describeDbError(error.message, 'Suggesting points') } : { ok: true, value: null }
}
