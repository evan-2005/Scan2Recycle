/**
 * Links in Supabase emails (confirm email, reset password) come back to the app as
 *   https://site/?auth=confirmed#access_token=…   or   …?auth=reset#error_code=otp_expired&…
 * The hash is captured when this module first loads, before supabase-js reads and clears it.
 * main.tsx imports this module first for that reason.
 */
export type AuthReturnKind = 'confirmed' | 'reset'

export interface AuthReturn {
  kind: AuthReturnKind
  /** True when Supabase reported the link as expired, used or invalid. */
  failed: boolean
}

const PARAM = 'auth'

export function parseAuthReturn(search: string, hash: string): AuthReturn | null {
  const kind = new URLSearchParams(search).get(PARAM)
  if (kind !== 'confirmed' && kind !== 'reset') return null
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
  return { kind, failed: hashParams.has('error') || hashParams.has('error_code') }
}

/** Where Supabase should send people back to after clicking an email link. */
export function authRedirectUrl(origin: string, pathname: string, kind: AuthReturnKind): string {
  return `${origin}${pathname}?${PARAM}=${kind}`
}

const initial: AuthReturn | null = typeof window === 'undefined' ? null : parseAuthReturn(window.location.search, window.location.hash)
let pending: AuthReturn | null = initial

/** The email-link return this page was opened with (once; later calls get null after consume). */
export function peekAuthReturn(): AuthReturn | null {
  return pending
}

/** Marks the return as handled and removes ?auth=… from the address bar. */
export function consumeAuthReturn(): void {
  pending = null
  const url = new URL(window.location.href)
  url.searchParams.delete(PARAM)
  window.history.replaceState(null, '', `${url.pathname}${url.search}${window.location.hash}`)
}

export function redirectFor(kind: AuthReturnKind): string {
  return authRedirectUrl(window.location.origin, window.location.pathname, kind)
}
