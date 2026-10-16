/**
 * Saves every OpenStreetMap recycling point in Malaysia to web/public/osm-points-my.json, so the map works
 * even when the free Overpass servers are down or rate-limited, and shows the nearest points anywhere.
 *
 *   npm run snapshot-points
 *
 * Re-run every few months and commit the file. Data © OpenStreetMap contributors (ODbL); the map shows
 * the required attribution.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseOverpass } from '../src/lib/places/osm.ts'

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SNAPSHOT_FILE = 'osm-points-my.json'
const ENDPOINTS = ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter']
const QUERY = '[out:json][timeout:180];area["ISO3166-1"="MY"][admin_level=2]->.my;nwr["amenity"="recycling"](area.my);out tags center;'

async function query(endpoint: string): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: new URLSearchParams({ data: QUERY }),
    headers: { 'User-Agent': 'Scan2Recycle snapshot script (school project)' },
    signal: AbortSignal.timeout(200_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

let json: unknown = null
for (const endpoint of ENDPOINTS) {
  try {
    console.log(`Querying ${endpoint}…`)
    json = await query(endpoint)
    break
  } catch (error) {
    console.warn(`  failed: ${String(error)}`)
  }
}
if (!json) {
  console.error('All Overpass servers failed. Try again in a few minutes.')
  process.exit(1)
}

const round = (x: number) => Math.round(x * 1e6) / 1e6
const points = parseOverpass(json).map(({ isMine: _isMine, isPending: _isPending, source: _source, ...p }) => ({ ...p, lat: round(p.lat), lng: round(p.lng) }))
const file = { generatedAt: new Date().toISOString(), attribution: '© OpenStreetMap contributors, ODbL', points }
const outPath = join(webDir, 'public', SNAPSHOT_FILE)
writeFileSync(outPath, JSON.stringify(file) + '\n')
console.log(`Wrote ${points.length} recycling points to ${outPath}`)
