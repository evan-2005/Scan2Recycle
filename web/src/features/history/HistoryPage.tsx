import { PageHeader } from '../../components/PageHeader'

export function HistoryPage() {
  return (
    <>
      <PageHeader eyebrow="History" title="Every item you've logged" />
      <p className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink-soft">
        Nothing logged yet. Scanned items will appear here.
      </p>
    </>
  )
}
