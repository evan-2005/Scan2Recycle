import { useI18n } from '../../i18n/context'
import { materialName } from '../../i18n/localize'
import type { Material } from '../../types'
import { PhotoHeader } from './PhotoHeader'

interface MaterialPickerProps {
  photoUrl: string | null
  materials: readonly Material[]
  onPick: (material: Material) => void
}

export function MaterialPicker({ photoUrl, materials, onPick }: MaterialPickerProps) {
  const { t, lang } = useI18n()
  return (
    <div className="pt-4">
      <PhotoHeader photoUrl={photoUrl} eyebrow={t('pick.eyebrow')}>
        {t('pick.title')}
      </PhotoHeader>

      <ul className="mt-8 grid grid-cols-2 gap-3">
        {materials.map((material) => (
          <li key={material.id}>
            <button
              type="button"
              onClick={() => onPick(material)}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left font-semibold shadow-sm ring-forest transition hover:ring-2 active:scale-[0.98]"
            >
              <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ backgroundColor: material.bin_colour }} />
              {materialName(material, lang)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
