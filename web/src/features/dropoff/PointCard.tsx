import type { MessageKey } from '../../i18n/en'
import { useI18n } from '../../i18n/context'
import { directionsUrl, formatDistance } from '../../lib/places/geo'
import type { DropOffPoint } from '../../lib/places/types'

interface PointCardProps {
  point: DropOffPoint & { distanceKm: number }
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (point: DropOffPoint) => void
}

function kindKey(point: DropOffPoint): MessageKey {
  if (point.source === 'team') return point.isMine ? 'point.yours' : 'point.community'
  if (point.kind === 'centre') return 'point.centre'
  if (point.kind === 'container') return 'point.bin'
  return 'point.point'
}

export function PointCard({ point, isSelected, onSelect, onDelete }: PointCardProps) {
  const { t } = useI18n()
  const title = point.name ?? t(point.kind === 'container' ? 'point.bin' : 'point.point')

  return (
    <li>
      <article
        className={`rounded-2xl bg-white p-4 shadow-sm transition ${isSelected ? 'ring-2 ring-forest' : 'ring-1 ring-ink/5'}`}
        aria-current={isSelected ? 'true' : undefined}
      >
        <button type="button" onClick={() => onSelect(point.id)} className="block w-full text-left">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold leading-snug">{title}</h3>
            <span className="shrink-0 font-display text-lg font-semibold tabular-nums">{formatDistance(point.distanceKm)}</span>
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">{t(kindKey(point))}</p>
          {point.address && <p className="mt-1 text-sm text-ink-soft">{point.address}</p>}
          {point.openingHours && <p className="mt-1 text-sm">🕒 {point.openingHours}</p>}
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('point.accepts')}>
            {point.materials.length > 0 ? (
              point.materials.map((m) => (
                <li key={m} className="rounded-full bg-paper-deep px-2.5 py-0.5 text-xs font-medium">
                  {t(`pointMaterial.${m}`)}
                </li>
              ))
            ) : (
              <li className="text-xs text-ink-soft italic">{t('point.notListed')}</li>
            )}
          </ul>
        </button>
        <div className="mt-3 flex items-center gap-4">
          <a
            href={directionsUrl(point)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-sm font-semibold text-paper"
          >
            {t('point.directions')}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
          {point.isMine && (
            <button type="button" onClick={() => onDelete(point)} className="min-h-10 text-sm font-semibold text-alert underline underline-offset-4">
              {t('point.delete')}
            </button>
          )}
        </div>
      </article>
    </li>
  )
}
