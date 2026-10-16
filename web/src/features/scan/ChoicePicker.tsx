import { useI18n } from '../../i18n/context'
import { itemName, materialName } from '../../i18n/localize'
import type { ScoredItem } from '../../lib/classifier/decide'
import type { ItemType, Material, MaterialId } from '../../types'
import { PhotoHeader } from './PhotoHeader'

interface ChoicePickerProps {
  photoUrl: string
  options: readonly ScoredItem[]
  materials: ReadonlyMap<MaterialId, Material>
  onPick: (item: ItemType) => void
  onNone: () => void
}

/** Shows each guess with its material, so a wrong item name with the right material is still useful. */
export function ChoicePicker({ photoUrl, options, materials, onPick, onNone }: ChoicePickerProps) {
  const { t, lang } = useI18n()
  return (
    <div className="pt-4">
      <PhotoHeader photoUrl={photoUrl} eyebrow={t('choose.eyebrow')}>
        {t('choose.title')}
      </PhotoHeader>

      <ul className="mt-8 flex flex-col gap-3">
        {options.map(({ item, score }) => {
          const material = materials.get(item.material_id)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-5 py-3 text-left shadow-sm ring-forest transition hover:ring-2 active:scale-[0.99]"
              >
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-ink/25" style={{ backgroundColor: material?.bin_colour }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{itemName(item, lang)}</span>
                  <span className="block text-xs text-ink-soft">
                    {material ? materialName(material, lang) : item.material_id}
                    {item.recyclable ? '' : ` · ${t('choose.notRecyclable')}`}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-ink-soft">{Math.round(score * 100)}%</span>
              </button>
            </li>
          )
        })}
      </ul>

      <button type="button" onClick={onNone} className="mt-6 min-h-12 w-full rounded-full border-2 border-forest px-6 font-semibold text-forest">
        {t('choose.none')}
      </button>
    </div>
  )
}
