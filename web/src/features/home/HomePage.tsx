import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useI18n } from '../../i18n/context'
import type { MessageKey } from '../../i18n/en'
import { useLoad } from '../../hooks/useLoad'
import type { HistoryEntry } from '../../lib/logs'
import { routeHref, type Route } from '../../lib/routes'
import { currentStreak, hasSavedToday, weekProgress } from '../../lib/streaks'
import { formatWeight } from '../../lib/totals'
import { useAccount } from '../account/useAccount'
import { loadTotals } from '../stats/loadTotals'

const CAMERA_ICON = 'M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8'

interface Shortcut {
  route: Route
  title: MessageKey
  hint: MessageKey
  icon: string
}

const SHORTCUTS: readonly Shortcut[] = [
  { route: 'dropoff', title: 'home.dropoff', hint: 'home.dropoffHint', icon: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6' },
  { route: 'groups', title: 'home.groups', hint: 'home.groupsHint', icon: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8' },
]

function Icon({ path, className }: { path: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

/** Streak, this week and all-time weight at a glance; the whole strip links to My Recycling. */
function StatsStrip({ logs, totalKg }: { logs: readonly HistoryEntry[]; totalKg: number }) {
  const { t } = useI18n()
  const [now] = useState(() => new Date())
  const streak = currentStreak(logs, now)
  const week = weekProgress(logs, now, 1)
  const needsToday = streak > 0 && !hasSavedToday(logs, now)

  return (
    <a href={routeHref('stats')} aria-label={t('home.statsLabel')} className="mt-6 block rounded-3xl bg-white/80 p-4 shadow-sm ring-forest transition hover:ring-2">
      <div className="grid grid-cols-3 divide-x divide-ink/10 text-center">
        <div>
          <p className="font-display text-2xl font-extrabold tabular-nums">
            <span aria-hidden="true">{streak > 0 ? '🔥' : '🌱'}</span> {streak}
          </p>
          <p className="text-xs text-ink-soft">{t('streak.days')}</p>
        </div>
        <div>
          <p className="font-display text-2xl font-extrabold tabular-nums">{formatWeight(week.kg)}</p>
          <p className="text-xs text-ink-soft">{t('home.week')}</p>
        </div>
        <div>
          <p className="font-display text-2xl font-extrabold tabular-nums">{formatWeight(totalKg)}</p>
          <p className="text-xs text-ink-soft">{t('home.total')}</p>
        </div>
      </div>
      {(needsToday || streak === 0) && (
        <p className="mt-3 rounded-xl bg-signal/25 px-3 py-2 text-center text-xs font-semibold text-ink">
          {t(needsToday ? 'streak.keepGoing' : 'streak.start')}
        </p>
      )}
    </a>
  )
}

export function HomePage() {
  const { t } = useI18n()
  const { account } = useAccount()
  const { state } = useLoad(loadTotals)

  return (
    <>
      <PageHeader
        eyebrow={t('home.eyebrow')}
        title={
          <>
            {t('home.titleLine1')}
            <br />
            <span className="text-forest">{t('home.titleLine2')}</span>
          </>
        }
      />

      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-signal" />
        <a
          href={routeHref('scan')}
          className="relative flex items-center gap-5 rounded-3xl bg-forest p-6 text-paper shadow-lg transition-transform active:translate-x-1 active:translate-y-1"
        >
          <Icon path={CAMERA_ICON} className="size-12 shrink-0" />
          <span>
            <span className="block font-display text-2xl font-extrabold">{t('scan.button')}</span>
            <span className="mt-1 block text-sm text-paper/75">{t('home.scanHint')}</span>
          </span>
        </a>
      </div>

      {state.status === 'ready' && <StatsStrip logs={state.value.history} totalKg={state.value.totals.totalKg} />}

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {SHORTCUTS.map((item) => (
          <li key={item.route}>
            <a href={routeHref(item.route)} className="flex h-full flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-forest transition hover:ring-2">
              <Icon path={item.icon} className="size-7 text-forest" />
              <span>
                <span className="block font-semibold">{t(item.title)}</span>
                <span className="block text-xs text-ink-soft">{t(item.hint)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      {account?.kind === 'anonymous' && (
        <p className="mt-6 rounded-2xl border border-ink/10 bg-white/60 p-4 text-sm text-ink-soft">
          {t('home.guest')}{' '}
          <a href={routeHref('stats')} className="font-semibold text-forest underline underline-offset-4">
            {t('home.guestLink')}
          </a>
        </p>
      )}
    </>
  )
}
