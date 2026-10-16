import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useLoad } from '../../hooks/useLoad'
import { fetchMaterials } from '../../lib/catalog'
import { deleteLog, fetchHistory, type HistoryEntry } from '../../lib/logs'
import type { Material, MaterialId } from '../../types'

interface HistoryData {
  entries: HistoryEntry[]
  materials: ReadonlyMap<MaterialId, Material>
}

async function loadHistory() {
  const [materials, history] = await Promise.all([fetchMaterials(), fetchHistory()])
  if (!materials.ok) return materials
  if (!history.ok) return history
  return { ok: true as const, value: { entries: history.value, materials: new Map(materials.materials.map((m) => [m.id, m])) } }
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

interface EntryRowProps {
  entry: HistoryEntry
  material: Material | undefined
  onDelete: (id: string) => Promise<void>
}

function EntryRow({ entry, material, onDelete }: EntryRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const name = entry.item_types?.display_name ?? `${material?.display_name ?? entry.material_id} item`

  async function handleDelete() {
    if (!window.confirm(`Delete "${name}" from your recycling?`)) return
    setIsDeleting(true)
    await onDelete(entry.id)
    setIsDeleting(false)
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-ink/25" style={{ backgroundColor: material?.bin_colour }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-xs text-ink-soft">
          {material?.display_name ?? entry.material_id} · {entry.weight_g !== null ? `${entry.weight_g} g` : 'no weight'} ·{' '}
          {dateFormat.format(new Date(entry.created_at))}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Delete ${name}`}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-alert/10 hover:text-alert disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      </button>
    </li>
  )
}

export function HistoryPage() {
  const { state, reload, set } = useLoad<HistoryData>(loadHistory)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (state.status !== 'ready') return
    const result = await deleteLog(id)
    if (!result.ok) {
      setDeleteError(result.error)
      return
    }
    setDeleteError(null)
    set({ ...state.value, entries: state.value.entries.filter((entry) => entry.id !== id) })
  }

  return (
    <>
      <PageHeader eyebrow="History" title="Every item you've saved" />
      {state.status === 'loading' && <p className="text-ink-soft">Loading…</p>}
      {state.status === 'error' && (
        <div role="alert" className="rounded-2xl border border-alert/30 p-4">
          <p className="text-sm text-alert">{state.error}</p>
          <button type="button" onClick={reload} className="mt-3 min-h-11 font-semibold text-forest underline underline-offset-4">
            Try again
          </button>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="mb-3 text-sm text-alert">
          {deleteError}
        </p>
      )}
      {state.status === 'ready' &&
        (state.value.entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink-soft">
            Nothing saved yet. Items you save after scanning appear here.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-2xl bg-white/70 px-4">
            {state.value.entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} material={state.value.materials.get(entry.material_id)} onDelete={handleDelete} />
            ))}
          </ul>
        ))}
    </>
  )
}
