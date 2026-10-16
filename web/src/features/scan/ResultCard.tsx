import type { MessageKey } from '../../i18n/en'
import { useI18n } from '../../i18n/context'
import { binName, itemName, itemTip, materialName } from '../../i18n/localize'
import type { ScoredItem } from '../../lib/classifier/decide'
import { disposalFor } from '../../lib/disposal'
import { pointMaterialFor } from '../../lib/places/filter'
import { routeHref } from '../../lib/routes'
import type { Material } from '../../types'
import { PhotoHeader } from './PhotoHeader'
import { SaveForm } from './SaveForm'
import type { Answer } from './scanState'

interface ResultCardProps {
  /** null when the answer came from search. */
  photoUrl: string | null
  answer: Answer
  /** The AI's top guess for this photo, kept so we can tell later how often users had to correct it. */
  aiGuess: ScoredItem | null
  materials: readonly Material[]
  onChange: () => void
  onDone: () => void
}

const EYEBROWS: Readonly<Record<Answer['method'], MessageKey>> = {
  ai: 'result.eyebrowAi',
  picked: 'result.eyebrowPicked',
  search: 'result.eyebrowSearch',
}

export function ResultCard({ photoUrl, answer, aiGuess, materials, onChange, onDone }: ResultCardProps) {
  const { t, lang } = useI18n()
  const { item, material, score, method } = answer
  const disposal = disposalFor(item, material, materials)
  const dropOffMaterial = pointMaterialFor(material.id)
  const tip = item ? itemTip(item, lang) : null
  const log = {
    itemTypeId: item?.id ?? null,
    materialId: material.id,
    aiLabel: method === 'search' ? null : (aiGuess?.item.label ?? null),
    aiScore: method === 'search' ? null : (aiGuess?.score ?? null),
    wasCorrected: method === 'picked',
  }

  return (
    <div className="pt-4">
      <PhotoHeader photoUrl={photoUrl} eyebrow={t(EYEBROWS[method])}>
        {item ? itemName(item, lang) : t('result.unknownItem', { material: materialName(material, lang) })}
      </PhotoHeader>

      <dl className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('result.material')}</dt>
          <dd className="mt-1 text-lg font-semibold">{materialName(material, lang)}</dd>
        </div>
        <div className={`rounded-2xl p-4 ${disposal.recyclable ? 'bg-forest text-paper' : 'bg-alert text-paper'}`}>
          <dt className="text-xs font-semibold uppercase tracking-wider opacity-80">{t('result.recyclable')}</dt>
          <dd className="mt-1 text-lg font-semibold">{disposal.recyclable ? t('result.yes') : t('result.no')}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-stretch overflow-hidden rounded-2xl bg-white shadow-sm">
        <div aria-hidden="true" className="w-4 shrink-0" style={{ backgroundColor: disposal.bin.bin_colour }} />
        <p className="p-4 text-lg leading-snug">
          {disposal.recyclable ? t('result.placeIn') : t('result.putIn')} <strong className="font-semibold">{binName(disposal.bin, lang)}</strong>
        </p>
      </div>

      {tip && <p className="mt-4 rounded-2xl border border-ink/10 p-4 text-sm leading-relaxed">💡 {tip}</p>}

      {dropOffMaterial && (
        <a
          href={routeHref('dropoff', { material: dropOffMaterial })}
          className="mt-3 flex min-h-12 items-center justify-between rounded-2xl bg-white px-4 font-semibold text-forest shadow-sm"
        >
          {t('result.dropOff')}
          <span aria-hidden="true">→</span>
        </a>
      )}

      {score !== null && <p className="mt-4 text-xs text-ink-soft">{t('result.confidence', { percent: Math.round(score * 100) })}</p>}

      <div className="mt-6">
        {disposal.recyclable ? (
          <SaveForm log={log} typicalWeightG={item?.typical_weight_g ?? null} />
        ) : (
          <p className="rounded-2xl bg-paper-deep/70 p-4 text-sm text-ink-soft">{t('result.notCounted')}</p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={onDone} className="min-h-12 rounded-full bg-forest px-6 font-semibold text-paper shadow-md active:scale-[0.98]">
          {photoUrl ? t('result.scanAnother') : t('common.back')}
        </button>
        <button type="button" onClick={onChange} className="min-h-12 rounded-full px-6 font-semibold text-forest underline decoration-2 underline-offset-4">
          {t('result.change')}
        </button>
      </div>
    </div>
  )
}
