import { fetchMaterials } from '../../lib/catalog'
import { fetchHistory } from '../../lib/logs'
import { summarize } from '../../lib/totals'

/** Materials and this user's history, with per-material totals. Shared by Home and My Recycling. */
export async function loadTotals() {
  const [materials, history] = await Promise.all([fetchMaterials(), fetchHistory()])
  if (!materials.ok) return materials
  if (!history.ok) return history
  return { ok: true as const, value: { totals: summarize(history.value, materials.materials), history: history.value } }
}
