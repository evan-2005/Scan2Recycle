import { formatWeight, type MaterialTotal } from '../../lib/totals'

interface MaterialBarsProps {
  rows: readonly MaterialTotal[]
}

/**
 * One bar per material, scaled to the largest. Fills use the real bin colours so users connect them to
 * the bins they see, which means some (yellow, orange) are low-contrast on paper. Every bar therefore
 * carries its name and value as text, and an outline so pale fills still have an edge.
 */
export function MaterialBars({ rows }: MaterialBarsProps) {
  const maxKg = Math.max(...rows.map((r) => r.kg), 0)

  return (
    <ul className="flex flex-col gap-4" aria-label="Recycling by material">
      {rows.map(({ material, items, kg }) => {
        const share = maxKg > 0 ? kg / maxKg : 0
        return (
          <li key={material.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{material.display_name}</span>
              <span className="text-sm tabular-nums text-ink-soft">
                <strong className="font-display text-lg font-semibold text-ink">{formatWeight(kg)}</strong>
                {' · '}
                {items} {items === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-paper-deep" aria-hidden="true">
              {share > 0 && (
                <div
                  className="h-full rounded-full ring-1 ring-ink/25 ring-inset"
                  style={{ width: `${Math.max(share * 100, 3)}%`, backgroundColor: material.bin_colour }}
                />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
