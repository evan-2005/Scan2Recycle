import { useState } from 'react'
import { useI18n } from '../../i18n/context'
import { currentStreak, GOAL_OPTIONS_KG, hasSavedToday, parseGoal, weekProgress, type DatedLog } from '../../lib/streaks'
import { formatWeight } from '../../lib/totals'

const GOAL_KEY = 'weekly-goal-kg'

function readGoal(): number {
  try {
    return parseGoal(localStorage.getItem(GOAL_KEY))
  } catch {
    return parseGoal(null)
  }
}

function saveGoal(goal: number): void {
  try {
    localStorage.setItem(GOAL_KEY, String(goal))
  } catch {
    // Private mode etc.: the goal just resets next visit.
  }
}

interface StreakCardProps {
  logs: readonly DatedLog[]
}

/** Streak and weekly-goal progress, worked out from the user's saved items. The goal is a per-device preference. */
export function StreakCard({ logs }: StreakCardProps) {
  const { t, n } = useI18n()
  const [goal, setGoal] = useState(readGoal)
  // Read the clock once per visit to the page, not on every render.
  const [now] = useState(() => new Date())
  const streak = currentStreak(logs, now)
  const week = weekProgress(logs, now, goal)
  const isGoalMet = week.fraction >= 1

  function changeGoal(next: number) {
    setGoal(next)
    saveGoal(next)
  }

  return (
    <section aria-labelledby="week-heading" className="mt-6 grid grid-cols-[auto_1fr] gap-3">
      <div className="flex flex-col items-center justify-center rounded-3xl bg-signal px-5 py-4 text-ink shadow-sm">
        <span aria-hidden="true" className="text-3xl leading-none">
          {streak > 0 ? '🔥' : '🌱'}
        </span>
        <span className="mt-1 font-display text-3xl leading-none font-extrabold tabular-nums">{streak}</span>
        <span className="mt-1 text-xs font-semibold">{t('streak.days')}</span>
      </div>

      <div className="rounded-3xl bg-white/80 p-4 shadow-sm">
        <h2 id="week-heading" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {t('streak.thisWeek')}
        </h2>
        <p className="mt-1">
          <strong className="font-display text-2xl font-extrabold tabular-nums">{formatWeight(week.kg)}</strong>
          <span className="text-sm text-ink-soft"> {t('streak.ofGoal', { goal: formatWeight(goal) })}</span>
        </p>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-deep"
          role="progressbar"
          aria-label={t('streak.goalLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(week.fraction * 100)}
        >
          <div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{ width: `${week.fraction * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          {isGoalMet
            ? t('streak.goalReached')
            : t('streak.progress', { items: n('common.items', week.items), days: n('common.days', week.daysLeft) })}
        </p>
        <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
          {t('streak.goal')}
          <select
            value={goal}
            onChange={(e) => changeGoal(Number(e.target.value))}
            className="min-h-8 rounded-lg border border-ink/15 bg-white px-2 text-xs font-semibold text-ink"
          >
            {GOAL_OPTIONS_KG.map((kg) => (
              <option key={kg} value={kg}>
                {t('streak.perWeek', { weight: formatWeight(kg) })}
              </option>
            ))}
          </select>
        </label>
      </div>
      {streak === 0 && <p className="col-span-2 text-xs text-ink-soft">{t('streak.start')}</p>}
      {streak > 0 && !hasSavedToday(logs, now) && <p className="col-span-2 text-xs font-semibold text-ink">{t('streak.keepGoing')}</p>}
    </section>
  )
}
