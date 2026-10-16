import type { Material } from '../../types'
import { PhotoHeader } from './PhotoHeader'

interface MaterialPickerProps {
  photoUrl: string
  materials: readonly Material[]
  onPick: (material: Material) => void
}

export function MaterialPicker({ photoUrl, materials, onPick }: MaterialPickerProps) {
  return (
    <div className="pt-8">
      <PhotoHeader photoUrl={photoUrl} eyebrow="Help the AI out">
        What is it made of?
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
              {material.display_name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
