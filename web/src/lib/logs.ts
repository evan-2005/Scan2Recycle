import type { MaterialId } from '../types'
import { ensureSession } from './auth'
import { supabase } from './supabase'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface NewLog {
  itemTypeId: number | null
  materialId: MaterialId
  weightG: number | null
  aiLabel: string | null
  aiScore: number | null
  wasCorrected: boolean
}

export interface HistoryEntry {
  id: string
  material_id: MaterialId
  weight_g: number | null
  created_at: string
  was_corrected: boolean
  item_types: { display_name: string } | null
}

/** Enough rows for a school-project lifetime of scans; totals are computed from these. */
const HISTORY_LIMIT = 1000

async function withSession<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  const session = await ensureSession()
  if (!session.ok) return session
  return run()
}

export function saveLog(log: NewLog): Promise<Result<null>> {
  return withSession(async () => {
    const { error } = await supabase!.from('recycling_logs').insert({
      item_type_id: log.itemTypeId,
      material_id: log.materialId,
      weight_g: log.weightG,
      ai_label: log.aiLabel,
      ai_score: log.aiScore === null ? null : Math.round(log.aiScore * 10000) / 10000,
      was_corrected: log.wasCorrected,
    })
    return error ? { ok: false, error: `Could not save: ${error.message}` } : { ok: true, value: null }
  })
}

/** This user's logs, newest first. Row Level Security limits it to their own rows. */
export function fetchHistory(): Promise<Result<HistoryEntry[]>> {
  return withSession(async () => {
    const { data, error } = await supabase!
      .from('recycling_logs')
      .select('id, material_id, weight_g, created_at, was_corrected, item_types(display_name)')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)
    if (error) return { ok: false, error: `Could not load your recycling: ${error.message}` }
    const rows = (data ?? []) as unknown as HistoryEntry[]
    // PostgREST returns numeric columns as numbers; normalise anything that comes back as a string.
    return { ok: true, value: rows.map((row) => ({ ...row, weight_g: row.weight_g === null ? null : Number(row.weight_g) })) }
  })
}

export function deleteLog(id: string): Promise<Result<null>> {
  return withSession(async () => {
    const { error } = await supabase!.from('recycling_logs').delete().eq('id', id)
    return error ? { ok: false, error: `Could not delete: ${error.message}` } : { ok: true, value: null }
  })
}
