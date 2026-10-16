import { describe, expect, it } from 'vitest'
import { currentStreak, dayKey, DEFAULT_GOAL_KG, parseGoal, startOfWeek, weekProgress } from './streaks'

/** Local time, so tests behave the same in any timezone. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)
const log = (date: Date, weight_g: number | null = 10) => ({ created_at: date.toISOString(), weight_g })

// Thursday 15 October 2026, 18:00
const NOW = at(2026, 10, 15, 18)

describe('dayKey', () => {
  it('formats the local date', () => {
    expect(dayKey(at(2026, 1, 5))).toBe('2026-01-05')
  })
})

describe('currentStreak', () => {
  it('is 0 with no logs', () => {
    expect(currentStreak([], NOW)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const logs = [log(at(2026, 10, 15)), log(at(2026, 10, 14)), log(at(2026, 10, 14, 8)), log(at(2026, 10, 13)), log(at(2026, 10, 11))]
    expect(currentStreak(logs, NOW)).toBe(3)
  })

  it('keeps a streak that ended yesterday alive', () => {
    expect(currentStreak([log(at(2026, 10, 14)), log(at(2026, 10, 13))], NOW)).toBe(2)
  })

  it('resets after a missed day', () => {
    expect(currentStreak([log(at(2026, 10, 13))], NOW)).toBe(0)
  })

  it('crosses month boundaries', () => {
    const now = at(2026, 11, 1)
    expect(currentStreak([log(at(2026, 11, 1)), log(at(2026, 10, 31)), log(at(2026, 10, 30))], now)).toBe(3)
  })
})

describe('startOfWeek', () => {
  it('returns Monday 00:00 of the current week', () => {
    expect(startOfWeek(NOW)).toEqual(at(2026, 10, 12, 0))
    expect(startOfWeek(at(2026, 10, 12, 9))).toEqual(at(2026, 10, 12, 0))
    expect(startOfWeek(at(2026, 10, 18, 23))).toEqual(at(2026, 10, 12, 0)) // Sunday
  })
})

describe('weekProgress', () => {
  it('adds this week only and caps the fraction at 1', () => {
    const logs = [log(at(2026, 10, 12), 400), log(at(2026, 10, 15), 200), log(at(2026, 10, 15), null), log(at(2026, 10, 11), 5000)]
    expect(weekProgress(logs, NOW, 1)).toEqual({ kg: 0.6, items: 3, goalKg: 1, fraction: 0.6, daysLeft: 3 })
    expect(weekProgress(logs, NOW, 0.5).fraction).toBe(1)
  })
})

describe('parseGoal', () => {
  it('accepts the offered goals and falls back otherwise', () => {
    expect(parseGoal('2')).toBe(2)
    expect(parseGoal('0.5')).toBe(0.5)
    expect(parseGoal('7')).toBe(DEFAULT_GOAL_KG)
    expect(parseGoal(null)).toBe(DEFAULT_GOAL_KG)
    expect(parseGoal('abc')).toBe(DEFAULT_GOAL_KG)
  })
})
