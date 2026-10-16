import { PageHeader } from '../../components/PageHeader'
import { useI18n } from '../../i18n/context'
import { useLoad } from '../../hooks/useLoad'
import { fetchMaterials } from '../../lib/catalog'
import { fetchHistory } from '../../lib/logs'
import { routeHref } from '../../lib/routes'
import { formatWeight, summarize, type Totals } from '../../lib/totals'
import { AccountCard } from '../account/AccountCard'
import { MaterialBars } from './MaterialBars'
import { StreakCard } from './StreakCard'

async function loadTotals() {
  const [materials, history] = await Promise.all([fetchMaterials(), fetchHistory()])
  if (!materials.ok) return materials
  if (!history.ok) return history
  return { ok: true as const, value: { totals: summarize(history.value, materials.materials), history: history.value } }
}

function ImpactBanner({ totals }: { totals: Totals }) {
  const { t, n } = useI18n()
  const weight = formatWeight(totals.totalKg)
  return (
    <section aria-labelledby="impact-heading" className="relative overflow-hidden rounded-3xl bg-forest p-6 text-paper shadow-lg">
      <div aria-hidden="true" className="absolute -top-10 -right-10 size-40 rounded-full bg-forest-light/60" />
      <p id="impact-heading" className="relative text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">
        {t('impact.heading')}
      </p>
      <p className="relative mt-1 font-display text-6xl leading-none font-extrabold tabular-nums">{weight}</p>
      <p className="relative mt-4 text-sm leading-relaxed text-paper/85">
        {t('impact.before')} <strong className="font-semibold text-paper">{weight}</strong> {t('impact.after')}
      </p>
      {totals.itemsWithoutWeight > 0 && <p className="relative mt-2 text-xs text-paper/70">{n('impact.withoutWeight', totals.itemsWithoutWeight)}</p>}
    </section>
  )
}

export function MyRecyclingPage() {
  const { t, m } = useI18n()
  const { state, reload } = useLoad(loadTotals)

  return (
    <>
      <PageHeader eyebrow={t('stats.eyebrow')} title={t('stats.title')} />
      {state.status === 'loading' && <p className="text-ink-soft">{t('stats.loading')}</p>}
      {state.status === 'error' && (
        <div role="alert" className="rounded-2xl border border-alert/30 p-4">
          <p className="text-sm text-alert">{m(state.error)}</p>
          <button type="button" onClick={reload} className="mt-3 min-h-11 font-semibold text-forest underline underline-offset-4">
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          <ImpactBanner totals={state.value.totals} />
          <StreakCard logs={state.value.history} />
          <div className="mt-6 rounded-3xl bg-white/70 p-5">
            <MaterialBars rows={state.value.totals.rows} />
            {state.value.history.length > 0 && (
              <a href={routeHref('history')} className="mt-5 inline-block text-sm font-semibold text-forest underline underline-offset-4">
                {t('stats.seeAll')}
              </a>
            )}
          </div>
          {state.value.totals.totalItems === 0 && (
            <p className="mt-6 text-sm text-ink-soft">
              {t('stats.emptyBefore')}{' '}
              <a href={routeHref('scan')} className="font-semibold text-forest underline underline-offset-4">
                {t('stats.emptyLink')}
              </a>{' '}
              {t('stats.emptyAfter')}
            </p>
          )}
        </>
      )}
      <AccountCard onAccountChange={reload} />
    </>
  )
}
