import type { User } from '@supabase/supabase-js'
import { msg, type Message } from '../i18n/translate'
import { ensureSession } from './auth'
import { supabase } from './supabase'

export const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type Account =
  | { kind: 'none' }
  | { kind: 'anonymous' }
  | { kind: 'email'; email: string }
  /** Email added but waiting for the user to click the confirmation link. */
  | { kind: 'pending'; email: string }

type Result<T> = { ok: true; value: T } | { ok: false; error: Message }

export function accountFromUser(user: Pick<User, 'is_anonymous' | 'email' | 'new_email'> | null): Account {
  if (!user) return { kind: 'none' }
  if (user.email) return { kind: 'email', email: user.email }
  if (user.new_email) return { kind: 'pending', email: user.new_email }
  return { kind: 'anonymous' }
}

export interface CredentialErrors {
  email?: Message
  password?: Message
}

export function validatePassword(password: string): Message | null {
  return password.length < MIN_PASSWORD_LENGTH ? msg('error.password', { n: MIN_PASSWORD_LENGTH }) : null
}

export function validateCredentials(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {}
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = msg('error.email')
  const passwordProblem = validatePassword(password)
  if (passwordProblem) errors.password = passwordProblem
  return errors
}

/** Supabase error messages, turned into something a student can act on. */
export function friendlyAuthError(message: string): Message {
  if (/already (been )?registered|already exists/i.test(message)) return msg('error.emailExists')
  if (/not authorized/i.test(message)) return msg('error.emailNotAuthorized')
  if (/rate limit|too many/i.test(message)) return msg('error.rateLimit')
  if (/invalid login credentials/i.test(message)) return msg('error.wrongLogin')
  if (/password/i.test(message)) return msg('error.weakPassword')
  return msg('error.generic', { detail: message })
}

/**
 * Turns this device's anonymous account into an email + password account, keeping all its scans.
 * With "Confirm email" off in Supabase this finishes immediately; otherwise Supabase emails a link
 * and the password can be set after confirming.
 */
export async function saveProgress(email: string, password: string): Promise<Result<Account>> {
  const session = await ensureSession()
  if (!session.ok) return session
  const emailStep = await supabase!.auth.updateUser({ email: email.trim() })
  if (emailStep.error) return { ok: false, error: friendlyAuthError(emailStep.error.message) }
  const account = accountFromUser(emailStep.data.user)
  if (account.kind !== 'email') return { ok: true, value: account }
  const passwordStep = await supabase!.auth.updateUser({ password })
  if (passwordStep.error) return { ok: false, error: friendlyAuthError(passwordStep.error.message) }
  return { ok: true, value: accountFromUser(passwordStep.data.user) }
}

export async function setPassword(password: string): Promise<Result<null>> {
  const { error } = await supabase!.auth.updateUser({ password })
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true, value: null }
}

/** Signs in to an existing account on this device. Anonymous scans already on this device stay with that anonymous user. */
export async function signInWithEmail(email: string, password: string): Promise<Result<Account>> {
  if (!supabase) return { ok: false, error: msg('error.notConfigured') }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true, value: accountFromUser(data.user) }
}

export async function signOut(): Promise<Result<null>> {
  if (!supabase) return { ok: true, value: null }
  const { error } = await supabase.auth.signOut()
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true, value: null }
}
