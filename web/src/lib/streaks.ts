export interface DatedLog {
  created_at: string
  weight_g: number | null
}

export const GOAL_OPTIONS_KG = [0.5, 1, 2, 5] as const
export const DEFAULT_GOAL_KG = 1
const DAY_MS = 24 * 60 * 60 * 1000

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
 * Days in a row with at least one saved item, counting back from today. A streak that ended
 * yesterday still counts (you have until midnight to keep it going).
 */
export function currentStreak(logs: readonly DatedLog[], now: Date): number {
  const days = new Set(logs.map((log) => dayKey(new Date(log.created_at))))
  let cursor = days.has(dayKey(now)) ? now : addDays(now, -1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Whether anything was saved on today's local date (if not, a running streak ends at midnight). */
export function hasSavedToday(logs: readonly DatedLog[], now: Date): boolean {
  const today = dayKey(now)
  return logs.some((log) => dayKey(new Date(log.created_at)) === today)
}

/** Monday 00:00 local time of the week containing `now` (weeks start on Monday in Malaysia). */
export function startOfWeek(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysSinceMonday = (start.getDay() + 6) % 7
  return addDays(start, -daysSinceMonday)
}

export interface WeekProgress {
  kg: number
  items: number
  goalKg: number
  /** 0–1, capped at 1. */
  fraction: number
  daysLeft: number
}

export function weekProgress(logs: readonly DatedLog[], now: Date, goalKg: number): WeekProgress {
  const start = startOfWeek(now).getTime()
  const thisWeek = logs.filter((log) => {
    const time = new Date(log.created_at).getTime()
    return time >= start && time <= now.getTime()
  })
  const kg = Math.round(thisWeek.reduce((sum, log) => sum + (log.weight_g ?? 0), 0)) / 1000
  const daysLeft = Math.max(0, 7 - Math.floor((now.getTime() - start) / DAY_MS) - 1)
  return { kg, items: thisWeek.length, goalKg, fraction: goalKg > 0 ? Math.min(1, kg / goalKg) : 0, daysLeft }
}

/** Reads a saved goal, falling back to the default for anything unexpected. */
export function parseGoal(stored: string | null): number {
  const value = Number(stored)
  return (GOAL_OPTIONS_KG as readonly number[]).includes(value) ? value : DEFAULT_GOAL_KG
}
