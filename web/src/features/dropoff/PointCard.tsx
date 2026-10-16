import { directionsUrl, formatDistance } from '../../lib/places/geo'
import { POINT_MATERIAL_LABELS, type DropOffPoint } from '../../lib/places/types'

interface PointCardProps {
  point: DropOffPoint & { distanceKm: number }
  isSelected: boolean
  onSelect: (id: string) => void
}

function kindLabel(point: DropOffPoint): string {
  if (point.source === 'team') return point.isPending ? 'Your suggestion · waiting for team review' : 'Checked by the Scan2Recycle team'
  if (point.kind === 'centre') return 'Recycling centre'
  if (point.kind === 'container') return 'Recycling bin'
  return 'Recycling point'
}

export function PointCard({ point, isSelected, onSelect }: PointCardProps) {
  const title = point.name ?? (point.kind === 'container' ? 'Recycling bin' : 'Recycling point')

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
          <p className="mt-0.5 text-xs text-ink-soft">{kindLabel(point)}</p>
          {point.address && <p className="mt-1 text-sm text-ink-soft">{point.address}</p>}
          {point.openingHours && <p className="mt-1 text-sm">🕒 {point.openingHours}</p>}
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Accepts">
            {point.materials.length > 0 ? (
              point.materials.map((m) => (
                <li key={m} className="rounded-full bg-paper-deep px-2.5 py-0.5 text-xs font-medium">
                  {POINT_MATERIAL_LABELS[m]}
                </li>
              ))
            ) : (
              <li className="text-xs text-ink-soft italic">Materials not listed: check before you go</li>
            )}
          </ul>
        </button>
        <a
          href={directionsUrl(point)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-sm font-semibold text-paper"
        >
          Directions
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </article>
    </li>
  )
}
