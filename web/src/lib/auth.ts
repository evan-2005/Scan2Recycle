import { msg, type Message } from '../i18n/translate'
import { supabase } from './supabase'

export type SessionResult = { ok: true; userId: string } | { ok: false; error: Message }

let inFlight: Promise<SessionResult> | null = null

async function signIn(): Promise<SessionResult> {
  if (!supabase) return { ok: false, error: msg('error.notConfigured') }

  const { data: existing } = await supabase.auth.getSession()
  if (existing.session) return { ok: true, userId: existing.session.user.id }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    const disabled = /anonymous/i.test(error?.message ?? '')
    return {
      ok: false,
      error: disabled ? msg('error.anonDisabled') : msg('error.signInFailed', { detail: error?.message ?? 'unknown error' }),
    }
  }
  return { ok: true, userId: data.user.id }
}

/**
 * Makes sure this browser has a user, creating an anonymous one on first use.
 * The session is kept in localStorage, so the same person keeps their totals on this device.
 * Concurrent callers share one sign-in; later calls re-check the (possibly changed) session.
 */
export function ensureSession(): Promise<SessionResult> {
  inFlight ??= signIn().finally(() => {
    inFlight = null
  })
  return inFlight
}
