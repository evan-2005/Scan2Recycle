import { describe, expect, it } from 'vitest'
import { messageOf, normalizeJoinCode, rankLeaderboard, validateDisplayName, validateGroupName, type LeaderboardRow } from './groups'

describe('normalizeJoinCode', () => {
  it('upper-cases and strips spaces and dashes', () => {
    expect(normalizeJoinCode(' abc-def ')).toBe('ABCDEF')
    expect(normalizeJoinCode('39k ftu')).toBe('39KFTU')
  })

  it('rejects codes that create_group could never make', () => {
    expect(normalizeJoinCode('ABC')).toBeNull()
    expect(normalizeJoinCode('ABCDEFG')).toBeNull()
    expect(normalizeJoinCode('ABCDE0')).toBeNull() // no zero
    expect(normalizeJoinCode('ABCDEI')).toBeNull() // no I
  })
})

describe('name validation', () => {
  it('checks group and display name lengths after trimming', () => {
    expect(validateGroupName('  5A  ')).toBeNull()
    expect(validateGroupName(' x ')).toEqual({ key: 'groups.errorGroupName' })
    expect(validateDisplayName('Ali')).toBeNull()
    expect(validateDisplayName('   ')).toEqual({ key: 'groups.errorDisplayName' })
    expect(validateDisplayName('x'.repeat(31))).toEqual({ key: 'groups.errorDisplayName' })
  })
})

describe('rankLeaderboard', () => {
  const rows: LeaderboardRow[] = [
    { display_name: 'Ali', items: 5, kg: 2, kg_this_week: 0.1, is_me: false },
    { display_name: 'Bea', items: 3, kg: 1, kg_this_week: 0.5, is_me: true },
    { display_name: 'Chen', items: 4, kg: 1, kg_this_week: 0, is_me: false },
  ]

  it('ranks by all-time kg, then items', () => {
    expect(rankLeaderboard(rows, 'all').map((r) => r.display_name)).toEqual(['Ali', 'Chen', 'Bea'])
  })

  it('ranks by this week', () => {
    expect(rankLeaderboard(rows, 'week').map((r) => r.display_name)).toEqual(['Bea', 'Ali', 'Chen'])
  })

  it('does not mutate the input', () => {
    rankLeaderboard(rows, 'week')
    expect(rows[0].display_name).toBe('Ali')
  })
})

describe('messageOf', () => {
  it("maps the database functions' messages to translatable ones", () => {
    expect(messageOf({ message: 'No group has that code. Check it and try again.' })).toEqual({ key: 'groups.errorNoSuchCode' })
    expect(messageOf({ message: 'ERROR: You can be in up to 10 groups.' })).toEqual({ key: 'groups.errorTooMany' })
    expect(messageOf({ message: 'You are not in this group.' })).toEqual({ key: 'groups.errorNotMember' })
    expect(messageOf({ message: "Could not find the function public.create_group in the schema cache" })).toEqual({ key: 'error.notSetUp' })
    expect(messageOf({ message: 'boom' })).toEqual({ key: 'groups.errorFailed', vars: { detail: 'boom' } })
  })
})
