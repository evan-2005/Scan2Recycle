import type { ScoredItem } from '../../lib/classifier/decide'
import type { ItemType } from '../../types'
import { PhotoHeader } from './PhotoHeader'

interface ChoicePickerProps {
  photoUrl: string
  options: readonly ScoredItem[]
  onPick: (item: ItemType) => void
  onNone: () => void
}

export function ChoicePicker({ photoUrl, options, onPick, onNone }: ChoicePickerProps) {
  return (
    <div className="pt-8">
      <PhotoHeader photoUrl={photoUrl} eyebrow="Not quite sure">
        Is it one of these?
      </PhotoHeader>

      <ul className="mt-8 flex flex-col gap-3">
        {options.map(({ item, score }) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 py-3 text-left shadow-sm ring-forest transition hover:ring-2 active:scale-[0.99]"
            >
              <span className="font-semibold">{item.display_name}</span>
              <span className="text-xs tabular-nums text-ink-soft">{Math.round(score * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={onNone} className="mt-6 min-h-12 w-full rounded-full border-2 border-forest px-6 font-semibold text-forest">
        None of these
      </button>
    </div>
  )
}
