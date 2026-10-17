import { msg, type Message } from '../i18n/translate'
import { supabase } from './supabase'

export type SessionResult = { ok: true; userId: string } | { ok: false; error: Message }

let inFlight: Promise<SessionResult> | null = null

async function signIn(allowGuest: boolean): Promise<SessionResult> {
  if (!supabase) return { ok: false, error: msg('error.notConfigured') }

  const { data: existing } = await supabase.auth.getSession()
  if (existing.session) return { ok: true, userId: existing.session.user.id }
  if (!allowGuest) return { ok: false, error: msg('error.signedOut') }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    const disabled = /anonymous/i.test(error?.message ?? '')
    return {
      ok: false,
      error: disabled ? msg('error.anonDisabled') : msg('error.signInFailed', { detail: error?.message ?? '?' }),
    }
  }
  return { ok: true, userId: data.user.id }
}

/**
 * Makes sure this browser has a user. Only the welcome screen's "Continue as guest" passes allowGuest,
 * which creates an anonymous user; everything else needs someone already signed in, so a request that
 * finishes after signing out can't quietly start a new guest account.
 * The session is kept in localStorage, so the same person keeps their totals on this device.
 * Concurrent callers share one sign-in; later calls re-check the (possibly changed) session.
 */
export function ensureSession({ allowGuest = false } = {}): Promise<SessionResult> {
  if (allowGuest) return signIn(true)
  inFlight ??= signIn(false).finally(() => {
    inFlight = null
  })
  return inFlight
}
