import { useId, useState } from 'react'
import { useI18n } from '../../i18n/context'
import { itemName, materialName } from '../../i18n/localize'
import { searchItems } from '../../lib/search'
import type { ItemType, Material, MaterialId } from '../../types'

interface SearchBoxProps {
  items: readonly ItemType[]
  materials: readonly Material[]
  materialsById: ReadonlyMap<MaterialId, Material>
  onPick: (item: ItemType) => void
}

interface ItemButtonProps {
  item: ItemType
  material: Material | undefined
  onPick: (item: ItemType) => void
}

function ItemButton({ item, material, onPick }: ItemButtonProps) {
  const { t, lang } = useI18n()
  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 py-2 text-left shadow-sm ring-forest transition hover:ring-2"
    >
      <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-ink/25" style={{ backgroundColor: material?.bin_colour }} />
      <span className="flex-1 font-semibold">{itemName(item, lang)}</span>
      <span className={`text-right text-xs font-semibold ${item.recyclable ? 'text-forest' : 'text-alert'}`}>
        {item.recyclable ? t('search.recyclable') : t('search.notRecyclable')}
      </span>
    </button>
  )
}

/** "Can I recycle…?": find an item by typing (English or Malay) or browse them all, instead of taking a photo. */
export function SearchBox({ items, materials, materialsById, onPick }: SearchBoxProps) {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [isBrowsing, setIsBrowsing] = useState(false)
  const listId = useId()
  const results = searchItems(query, items)
  const hasQuery = query.trim().length >= 2
  const collator = new Intl.Collator(lang === 'ms' ? 'ms' : 'en')
  const groups = materials
    .map((material) => ({
      material,
      items: items.filter((item) => item.material_id === material.id).sort((a, b) => collator.compare(itemName(a, lang), itemName(b, lang))),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <section aria-labelledby={`${listId}-heading`} className="mt-8">
      <h2 id={`${listId}-heading`} className="font-display text-xl font-extrabold">
        {t('search.title')}
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
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          aria-controls={listId}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-12 w-full rounded-full border border-ink/15 bg-white pr-4 pl-12 focus:border-forest focus:outline-none"
        />
      </div>

      <ul id={listId} className="mt-3 flex flex-col gap-2" aria-live="polite">
        {results.map((item) => (
          <li key={item.id}>
            <ItemButton item={item} material={materialsById.get(item.material_id)} onPick={onPick} />
          </li>
        ))}
      </ul>
      {hasQuery && results.length === 0 && <p className="mt-2 text-sm text-ink-soft">{t('search.noMatch')}</p>}

      <button
        type="button"
        aria-expanded={isBrowsing}
        onClick={() => setIsBrowsing((open) => !open)}
        className="mt-3 min-h-11 text-sm font-semibold text-forest underline decoration-2 underline-offset-4"
      >
        {isBrowsing ? t('search.hideAll') : t('search.browse', { n: items.length })}
      </button>

      {isBrowsing && (
        <div className="mt-2 flex flex-col gap-5">
          {groups.map(({ material, items: groupItems }) => (
            <section key={material.id} aria-label={materialName(material, lang)}>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <span aria-hidden="true" className="size-2.5 rounded-full ring-1 ring-ink/25" style={{ backgroundColor: material.bin_colour }} />
                {materialName(material, lang)}
              </h3>
              <ul className="flex flex-col gap-2">
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <ItemButton item={item} material={material} onPick={onPick} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
