import { msg, type Message } from '../../i18n/translate'
import { ensureSession } from '../auth'
import { describeDbError } from '../dbErrors'
import { supabase } from '../supabase'
import { buildOverpassQuery, parseOverpass } from './osm'
import { SEARCH_RADII_M, shouldWiden } from './radius'
import type { CleanSuggestion } from './suggestion'
import { isPointMaterial, type DropOffPoint, type LatLng } from './types'

type Result<T> = { ok: true; value: T } | { ok: false; error: Message }

/**
 * Public Overpass servers, tried in turn. They are often overloaded or rate-limited. In testing (Oct 2026)
 * the private.coffee mirror answered in under a second while overpass-api.de took ~30 s, so the mirror goes first.
 */
const OVERPASS_ENDPOINTS = ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter'] as const
const REQUEST_TIMEOUT_MS = 20_000
/** Pause before another request, because back-to-back queries get rate-limited. */
const PAUSE_MS = 1500
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'osm-points:'

interface CacheEntry {
  savedAt: number
  points: DropOffPoint[]
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Rounded to ~1 km so small movements reuse the same cached search. */
function cacheKey(centre: LatLng, radiusM: number): string {
  return `${CACHE_PREFIX}${centre.lat.toFixed(2)},${centre.lng.toFixed(2)},${radiusM}`
}

/** Fresh cache entries only, unless `allowStale` (used when the servers are down). */
function readCache(key: string, allowStale = false): DropOffPoint[] | null {
  try {
    const entry = JSON.parse(localStorage.getItem(key) ?? 'null') as CacheEntry | null
    if (!entry || !Array.isArray(entry.points)) return null
    return allowStale || Date.now() - entry.savedAt < CACHE_TTL_MS ? entry.points.map((p) => ({ ...p, isMine: false })) : null
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

/** One ring: fresh cache, else each server in turn (with a pause between), else stale cache, else null. */
async function fetchRing(centre: LatLng, radiusM: number): Promise<DropOffPoint[] | null> {
  const key = cacheKey(centre, radiusM)
  const cached = readCache(key)
  if (cached) return cached
  const query = buildOverpassQuery(centre, radiusM)
  for (const [index, endpoint] of OVERPASS_ENDPOINTS.entries()) {
    if (index > 0) await pause(PAUSE_MS)
    try {
      const points = await queryOverpass(endpoint, query)
      writeCache(key, points)
      return points
    } catch {
      // Try the next server.
    }
  }
  return readCache(key, true)
}

export interface OsmSearch {
  points: DropOffPoint[]
  /** The ring that was finally searched; larger than the first ring means nothing was nearby. */
  radiusM: number
}

/**
 * Recycling points from OpenStreetMap near `centre`, cached for a day per ring. If the nearest ring
 * has too few, it searches a much wider one so people in quieter areas still see the nearest points.
 * If a wider search fails, the results already found are kept; only a total failure is an error
 * (the community's hubs still show in that case).
 */
export async function fetchOsmPoints(centre: LatLng): Promise<Result<OsmSearch>> {
  let best: OsmSearch | null = null
  for (let ring = 0; ring < SEARCH_RADII_M.length; ring++) {
    const radiusM = SEARCH_RADII_M[ring]
    if (ring > 0) await pause(PAUSE_MS)
    const points = await fetchRing(centre, radiusM)
    if (!points) break
    best = { points, radiusM }
    if (!shouldWiden(points.length, ring)) break
  }
  return best ? { ok: true, value: best } : { ok: false, error: msg('error.osmUnreachable') }
}

/** Bundled copy of every OpenStreetMap recycling point in Malaysia (npm run snapshot-points). */
const SNAPSHOT_FILE = 'osm-points-my.json'

/** The bundled snapshot, so the map has points even when the live servers are down. Empty if missing. */
export async function fetchSnapshotPoints(): Promise<DropOffPoint[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${SNAPSHOT_FILE}`)
    if (!response.ok) return []
    const file = (await response.json()) as { points?: unknown }
    if (!Array.isArray(file.points)) return []
    return (file.points as Omit<DropOffPoint, 'source' | 'isPending' | 'isMine'>[])
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.id === 'string')
      .map((p) => ({ ...p, materials: (p.materials ?? []).filter(isPointMaterial), source: 'osm', isPending: false, isMine: false }))
  } catch {
    return []
  }
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
  suggested_by: string | null
}

function fromRow(row: PointRow, userId: string | null): DropOffPoint {
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
    isMine: userId !== null && row.suggested_by === userId,
  }
}

/** Hubs added by the community (all of them, however far away), marking the ones this user added. */
export async function fetchCommunityPoints(): Promise<Result<DropOffPoint[]>> {
  if (!supabase) return { ok: true, value: [] }
  const [{ data: session }, { data, error }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from('recycling_points').select('id, name, lat, lng, materials, address, opening_hours, approved, suggested_by'),
  ])
  if (error) return { ok: false, error: describeDbError(error.message) }
  const userId = session.session?.user.id ?? null
  return { ok: true, value: (data as PointRow[]).map((row) => fromRow(row, userId)) }
}

/** Adds a hub; it shows for everyone straight away. */
export async function addHub(suggestion: CleanSuggestion): Promise<Result<null>> {
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
  if (!error) return { ok: true, value: null }
  return { ok: false, error: /10 hubs a day/i.test(error.message) ? msg('hub.errorLimit') : describeDbError(error.message) }
}

/** Deletes a hub this user added (Row Level Security blocks anyone else's). */
export async function deleteHub(pointId: string): Promise<Result<null>> {
  const session = await ensureSession()
  if (!session.ok) return session
  const id = pointId.replace(/^team:/, '')
  const { error } = await supabase!.from('recycling_points').delete().eq('id', id)
  return error ? { ok: false, error: msg('error.deleteFailed', { detail: error.message }) } : { ok: true, value: null }
}
