import { ensureSession } from './auth'
import { describeDbError } from './dbErrors'
import { supabase } from './supabase'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface Group {
  id: string
  name: string
  join_code: string
}

export interface Membership {
  group: Group
  displayName: string
}

export interface LeaderboardRow {
  display_name: string
  items: number
  kg: number
  kg_this_week: number
  is_me: boolean
}

/** Same alphabet as create_group() in 004_features.sql: no 0/O/1/I, so codes are easy to read out. */
const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/

/** "abc-123 " → "ABC123". Returns null if it can't be a valid code. */
export function normalizeJoinCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '')
  return JOIN_CODE_PATTERN.test(code) ? code : null
}

export function cleanName(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

export function validateGroupName(input: string): string | null {
  const name = cleanName(input)
  return name.length >= 2 && name.length <= 60 ? null : 'Group name must be 2–60 characters.'
}

export function validateDisplayName(input: string): string | null {
  const name = cleanName(input)
  return name.length >= 1 && name.length <= 30 ? null : 'Display name must be 1–30 characters.'
}

/** Database functions raise friendly messages; strip Postgres prefixes, and explain a missing setup. */
function messageOf(error: { message: string }): string {
  const message = error.message.replace(/^.*?ERROR:\s*/, '')
  return /schema cache|does not exist/i.test(message) ? describeDbError(message, 'Groups') : message
}

async function signedIn<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  const session = await ensureSession()
  return session.ok ? run() : session
}

function firstRow(data: unknown): Group | null {
  return Array.isArray(data) && data.length > 0 ? (data[0] as Group) : null
}

export function createGroup(name: string, displayName: string): Promise<Result<Group>> {
  return signedIn(async () => {
    const { data, error } = await supabase!.rpc('create_group', { p_name: cleanName(name), p_display_name: cleanName(displayName) })
    const group = firstRow(data)
    if (error || !group) return { ok: false, error: error ? messageOf(error) : 'Could not create the group.' }
    return { ok: true, value: group }
  })
}

export function joinGroup(code: string, displayName: string): Promise<Result<Group>> {
  return signedIn(async () => {
    const { data, error } = await supabase!.rpc('join_group', { p_code: code, p_display_name: cleanName(displayName) })
    const group = firstRow(data)
    if (error || !group) return { ok: false, error: error ? messageOf(error) : 'Could not join the group.' }
    return { ok: true, value: group }
  })
}

export function leaveGroup(groupId: string): Promise<Result<null>> {
  return signedIn(async () => {
    const { error } = await supabase!.rpc('leave_group', { p_group_id: groupId })
    return error ? { ok: false, error: messageOf(error) } : { ok: true, value: null }
  })
}

interface MembershipRow {
  display_name: string
  groups: Group | null
}

/** Groups this user belongs to. Doesn't create an account: no session simply means no groups. */
export async function fetchMyGroups(): Promise<Result<Membership[]>> {
  if (!supabase) return { ok: true, value: [] }
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return { ok: true, value: [] }
  const { data, error } = await supabase.from('group_members').select('display_name, groups(id, name, join_code)').order('joined_at')
  if (error) return { ok: false, error: describeDbError(error.message, 'Groups') }
  const rows = (data ?? []) as unknown as MembershipRow[]
  return {
    ok: true,
    value: rows.flatMap((row) => (row.groups ? [{ group: row.groups, displayName: row.display_name }] : [])),
  }
}

export function fetchLeaderboard(groupId: string): Promise<Result<LeaderboardRow[]>> {
  return signedIn(async () => {
    const { data, error } = await supabase!.rpc('group_leaderboard', { p_group_id: groupId })
    if (error) return { ok: false, error: messageOf(error) }
    const rows = (data ?? []) as LeaderboardRow[]
    return { ok: true, value: rows.map((r) => ({ ...r, items: Number(r.items), kg: Number(r.kg), kg_this_week: Number(r.kg_this_week) })) }
  })
}

export type LeaderboardPeriod = 'week' | 'all'

/** Re-ranks for the chosen period without mutating the input. */
export function rankLeaderboard(rows: readonly LeaderboardRow[], period: LeaderboardPeriod): LeaderboardRow[] {
  const value = (r: LeaderboardRow) => (period === 'week' ? r.kg_this_week : r.kg)
  return [...rows].sort((a, b) => value(b) - value(a) || b.items - a.items || a.display_name.localeCompare(b.display_name))
}
