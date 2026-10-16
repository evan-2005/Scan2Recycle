import { useId, useState } from 'react'
import { searchItems } from '../../lib/search'
import type { ItemType, Material, MaterialId } from '../../types'

interface SearchBoxProps {
  items: readonly ItemType[]
  materials: ReadonlyMap<MaterialId, Material>
  onPick: (item: ItemType) => void
}

/** "Can I recycle…?": find an item by typing (English or common Malay words) instead of taking a photo. */
export function SearchBox({ items, materials, onPick }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const listId = useId()
  const results = searchItems(query, items)
  const hasQuery = query.trim().length >= 2

  return (
    <section aria-labelledby={`${listId}-heading`} className="mt-8">
      <h2 id={`${listId}-heading`} className="font-display text-xl font-extrabold">
        Can I recycle…?
      </h2>
      <div className="relative mt-2">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. pizza box, battery, botol"
          aria-label="Search for an item"
          aria-controls={listId}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-12 w-full rounded-full border border-ink/15 bg-white pr-4 pl-12 focus:border-forest focus:outline-none"
        />
      </div>

      <ul id={listId} className="mt-3 flex flex-col gap-2" aria-live="polite">
        {results.map((item) => {
          const material = materials.get(item.material_id)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 py-2 text-left shadow-sm ring-forest transition hover:ring-2"
              >
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-ink/25" style={{ backgroundColor: material?.bin_colour }} />
                <span className="flex-1 font-semibold">{item.display_name}</span>
                <span className={`text-xs font-semibold ${item.recyclable ? 'text-forest' : 'text-alert'}`}>
                  {item.recyclable ? '✓ Recyclable' : '✕ Not recyclable'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {hasQuery && results.length === 0 && (
        <p className="mt-2 text-sm text-ink-soft">No match. Try another word, or scan it with the camera.</p>
      )}
    </section>
  )
}
