import { disposalFor } from '../../lib/disposal'
import type { Material } from '../../types'
import { PhotoHeader } from './PhotoHeader'
import type { Answer } from './scanState'

interface ResultCardProps {
  photoUrl: string
  answer: Answer
  materials: readonly Material[]
  onChange: () => void
  onDone: () => void
}

export function ResultCard({ photoUrl, answer, materials, onChange, onDone }: ResultCardProps) {
  const { item, material, score } = answer
  const disposal = disposalFor(item, material, materials)
  const verb = disposal.recyclable ? 'Place in' : 'Put in'

  return (
    <div className="pt-8">
      <PhotoHeader photoUrl={photoUrl} eyebrow={score !== null ? 'Detected' : 'You picked'}>
        {item?.display_name ?? `${material.display_name} item`}
      </PhotoHeader>

      <dl className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Material</dt>
          <dd className="mt-1 text-lg font-semibold">{material.display_name}</dd>
        </div>
        <div className={`rounded-2xl p-4 ${disposal.recyclable ? 'bg-forest text-paper' : 'bg-alert text-paper'}`}>
          <dt className="text-xs font-semibold uppercase tracking-wider opacity-80">Recyclable</dt>
          <dd className="mt-1 text-lg font-semibold">{disposal.recyclable ? '✓ Yes' : '✕ No'}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-stretch overflow-hidden rounded-2xl bg-white shadow-sm">
        <div aria-hidden="true" className="w-4 shrink-0" style={{ backgroundColor: disposal.binColour }} />
        <p className="p-4 text-lg leading-snug">
          {verb} <strong className="font-semibold">{disposal.binName}</strong>
        </p>
      </div>

      {item?.tip && <p className="mt-4 rounded-2xl border border-ink/10 p-4 text-sm leading-relaxed">💡 {item.tip}</p>}

      {score !== null && <p className="mt-4 text-xs text-ink-soft">AI confidence: {Math.round(score * 100)}%</p>}

      <div className="mt-8 flex flex-col gap-3">
        <button type="button" onClick={onDone} className="min-h-12 rounded-full bg-forest px-6 font-semibold text-paper shadow-md active:scale-[0.98]">
          Scan another item
        </button>
        <button type="button" onClick={onChange} className="min-h-12 rounded-full px-6 font-semibold text-forest underline decoration-2 underline-offset-4">
          Not right? Change it
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-ink-soft">Saving to My Recycling (with weight) arrives in Phase 2.</p>
    </div>
  )
}
