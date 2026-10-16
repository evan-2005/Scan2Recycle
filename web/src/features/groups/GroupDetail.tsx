import { useState } from 'react'
import { useLoad } from '../../hooks/useLoad'
import { fetchLeaderboard, leaveGroup, rankLeaderboard, type Group, type LeaderboardPeriod } from '../../lib/groups'
import { routeHref } from '../../lib/routes'
import { formatWeight } from '../../lib/totals'

const MEDALS = ['🥇', '🥈', '🥉']

async function shareGroup(group: Group): Promise<string> {
  const text = `Join my Scan2Recycle group "${group.name}" with code ${group.join_code}`
  const url = window.location.origin
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Scan2Recycle group', text, url })
      return ''
    }
    await navigator.clipboard.writeText(`${text}: ${url}`)
    return 'Invite copied, paste it in your chat.'
  } catch {
    return `Share this code: ${group.join_code}`
  }
}

interface GroupDetailProps {
  group: Group
  onLeft: () => void
}

export function GroupDetail({ group, onLeft }: GroupDetailProps) {
  const { state, reload } = useLoad(() => fetchLeaderboard(group.id))
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  const [shareMessage, setShareMessage] = useState('')
  const [leaveError, setLeaveError] = useState<string | null>(null)

  async function handleLeave() {
    if (!window.confirm(`Leave "${group.name}"? Your own totals are kept.`)) return
    const result = await leaveGroup(group.id)
    if (result.ok) onLeft()
    else setLeaveError(result.error)
  }

  const rows = state.status === 'ready' ? rankLeaderboard(state.value, period) : []
  const total = rows.reduce((sum, r) => sum + (period === 'week' ? r.kg_this_week : r.kg), 0)

  return (
    <div>
      <a href={routeHref('groups')} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest">
        ← All groups
      </a>
      <header className="pb-4">
        <h1 className="font-display text-4xl leading-tight font-extrabold">{group.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="rounded-xl bg-white px-3 py-2 font-mono text-lg font-semibold tracking-[0.3em] shadow-sm" aria-label={`Join code ${group.join_code.split('').join(' ')}`}>
            {group.join_code}
          </p>
          <button type="button" onClick={async () => setShareMessage(await shareGroup(group))} className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-paper">
            Invite friends
          </button>
        </div>
        {shareMessage && (
          <p role="status" className="mt-2 text-sm text-ink-soft">
            {shareMessage}
          </p>
        )}
      </header>

      <section className="relative overflow-hidden rounded-3xl bg-forest p-5 text-paper shadow-lg" aria-label="Group total">
        <div aria-hidden="true" className="absolute -right-8 -bottom-8 size-32 rounded-full bg-forest-light/60" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">{period === 'week' ? 'Together this week' : 'Together all time'}</p>
        <p className="relative mt-1 font-display text-5xl font-extrabold tabular-nums">{formatWeight(total)}</p>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-paper-deep p-1" role="tablist" aria-label="Leaderboard period">
        {(['week', 'all'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`min-h-10 rounded-full text-sm font-semibold transition ${period === p ? 'bg-white text-forest shadow-sm' : 'text-ink-soft'}`}
          >
            {p === 'week' ? 'Last 7 days' : 'All time'}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <p className="mt-4 text-ink-soft">Loading leaderboard…</p>}
      {state.status === 'error' && (
        <div role="alert" className="mt-4 rounded-2xl border border-alert/30 p-4">
          <p className="text-sm text-alert">{state.error}</p>
          <button type="button" onClick={reload} className="mt-2 min-h-11 font-semibold text-forest underline underline-offset-4">
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <ol className="mt-4 divide-y divide-ink/10 rounded-2xl bg-white/80 px-4" aria-label="Leaderboard">
          {rows.map((row, index) => {
            const kg = period === 'week' ? row.kg_this_week : row.kg
            return (
              <li key={`${row.display_name}-${index}`} className={`flex items-center gap-3 py-3 ${row.is_me ? 'font-semibold' : ''}`}>
                <span className="w-8 shrink-0 text-center text-lg tabular-nums" aria-label={`Rank ${index + 1}`}>
                  {kg > 0 && index < MEDALS.length ? MEDALS[index] : index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {row.display_name}
                  {row.is_me && <span className="ml-2 rounded-full bg-signal px-2 py-0.5 text-xs font-semibold text-ink">You</span>}
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-display text-lg font-semibold">{formatWeight(kg)}</span>
                  {period === 'all' && <span className="block text-xs font-normal text-ink-soft">{row.items} items</span>}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {leaveError && (
        <p role="alert" className="mt-4 text-sm text-alert">
          {leaveError}
        </p>
      )}
      <button type="button" onClick={handleLeave} className="mt-8 min-h-11 text-sm font-semibold text-alert underline underline-offset-4">
        Leave this group
      </button>
    </div>
  )
}
