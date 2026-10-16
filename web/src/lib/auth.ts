import { supabase } from './supabase'

export type SessionResult = { ok: true; userId: string } | { ok: false; error: string }

let pending: Promise<SessionResult> | null = null

async function signIn(): Promise<SessionResult> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured (see web/.env.example).' }

  const { data: existing } = await supabase.auth.getSession()
  if (existing.session) return { ok: true, userId: existing.session.user.id }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    const disabled = /anonymous/i.test(error?.message ?? '')
    return {
      ok: false,
      error: disabled
        ? 'Saving is switched off: turn on "Allow anonymous sign-ins" in Supabase → Authentication → Sign In / Providers.'
        : `Could not sign in: ${error?.message ?? 'unknown error'}`,
    }
  }
  return { ok: true, userId: data.user.id }
}

/**
 * Makes sure this browser has a user, creating an anonymous one on first use.
 * The session is kept in localStorage, so the same person keeps their totals on this device.
 */
export function ensureSession(): Promise<SessionResult> {
  pending ??= signIn().then((result) => {
    if (!result.ok) pending = null // let the next call retry
    return result
  })
  return pending
}
