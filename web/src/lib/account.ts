import type { User } from '@supabase/supabase-js'
import { msg, type Message } from '../i18n/translate'
import { ensureSession } from './auth'
import { redirectFor } from './authReturn'
import { supabase } from './supabase'

export const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type Account =
  | { kind: 'none' }
  | { kind: 'anonymous' }
  /** hasPassword is tracked in user_metadata when the app sets one (older accounts may lack the flag). */
  | { kind: 'email'; email: string; hasPassword: boolean }
  /** Email added but waiting for the user to click the confirmation link. */
  | { kind: 'pending'; email: string }

type Result<T> = { ok: true; value: T } | { ok: false; error: Message }

type UserLike = Pick<User, 'is_anonymous' | 'email' | 'new_email'> & { user_metadata?: Record<string, unknown> }

export function accountFromUser(user: UserLike | null): Account {
  if (!user) return { kind: 'none' }
  if (user.email) return { kind: 'email', email: user.email, hasPassword: user.user_metadata?.has_password === true }
  if (user.new_email) return { kind: 'pending', email: user.new_email }
  return { kind: 'anonymous' }
}

export interface CredentialErrors {
  email?: Message
  password?: Message
}

export function validateEmail(email: string): Message | null {
  return EMAIL_PATTERN.test(email.trim()) ? null : msg('error.email')
}

export function validatePassword(password: string): Message | null {
  return password.length < MIN_PASSWORD_LENGTH ? msg('error.password', { n: MIN_PASSWORD_LENGTH }) : null
}

export function validateCredentials(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {}
  const emailProblem = validateEmail(email)
  if (emailProblem) errors.email = emailProblem
  const passwordProblem = validatePassword(password)
  if (passwordProblem) errors.password = passwordProblem
  return errors
}

/** Supabase error messages, turned into something a student can act on. */
export function friendlyAuthError(message: string): Message {
  if (/already (been )?registered|already exists/i.test(message)) return msg('error.emailExists')
  if (/not authorized/i.test(message)) return msg('error.emailNotAuthorized')
  if (/rate limit|too many|security purposes/i.test(message)) return msg('error.rateLimit')
  if (/email not confirmed/i.test(message)) return msg('error.emailNotConfirmed')
  if (/invalid login credentials/i.test(message)) return msg('error.wrongLogin')
  if (/password/i.test(message)) return msg('error.weakPassword')
  return msg('error.generic', { detail: message })
}

async function setPasswordNow(password: string): Promise<Result<Account>> {
  const { data, error } = await supabase!.auth.updateUser({ password, data: { has_password: true } })
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true, value: accountFromUser(data.user) }
}

/**
 * Turns this device's (anonymous) account into an email account, keeping all its scans.
 * With "Confirm email" on, Supabase emails a confirmation link and the password is set after the user
 * comes back (Supabase only allows a password once the email is verified). With it off, both happen now.
 */
export async function saveProgress(email: string, password: string): Promise<Result<Account>> {
  const session = await ensureSession()
  if (!session.ok) return session
  const emailStep = await supabase!.auth.updateUser({ email: email.trim() }, { emailRedirectTo: redirectFor('confirmed') })
  if (emailStep.error) return { ok: false, error: friendlyAuthError(emailStep.error.message) }
  const account = accountFromUser(emailStep.data.user)
  return account.kind === 'email' ? setPasswordNow(password) : { ok: true, value: account }
}

export function setPassword(password: string): Promise<Result<Account>> {
  return setPasswordNow(password)
}

/** Sends the confirmation email again. */
export async function resendConfirmation(email: string): Promise<Result<null>> {
  const { error } = await supabase!.auth.resend({ type: 'email_change', email, options: { emailRedirectTo: redirectFor('confirmed') } })
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true, value: null }
}

/** Re-reads the user from Supabase, e.g. after they confirmed their email in another tab. */
export async function refreshAccount(): Promise<Account> {
  if (!supabase) return { kind: 'none' }
  const { data } = await supabase.auth.refreshSession()
  return accountFromUser(data.user)
}

/** Emails a password-reset link. Succeeds even for unknown emails, so nobody can probe who has an account. */
export async function requestPasswordReset(email: string): Promise<Result<null>> {
  if (!supabase) return { ok: false, error: msg('error.notConfigured') }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectFor('reset') })
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
