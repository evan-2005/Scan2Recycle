import { PageHeader } from '../../components/PageHeader'

const PLACEHOLDER_ROWS = ['Plastic', 'Paper', 'Metal', 'Glass'] as const

export function MyRecyclingPage() {
  return (
    <>
      <PageHeader eyebrow="My Recycling" title="Your totals" />
      <dl className="divide-y divide-ink/10 rounded-2xl bg-white/60 px-5">
        {PLACEHOLDER_ROWS.map((name) => (
          <div key={name} className="flex items-baseline justify-between py-4">
            <dt className="font-medium">{name}</dt>
            <dd className="font-display text-xl font-semibold tabular-nums text-ink-soft">— kg</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-ink-soft">Totals come from your saved scans once Phase 2 is built.</p>
    </>
  )
}
