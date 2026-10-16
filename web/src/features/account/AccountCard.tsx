import { useState, type FormEvent } from 'react'
import { saveProgress, setPassword, signInWithEmail, signOut, validateCredentials, validatePassword, type CredentialErrors } from '../../lib/account'
import { useAccount } from './useAccount'

type Mode = 'save' | 'sign-in'

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 focus:border-forest focus:outline-none aria-[invalid=true]:border-alert'

interface CredentialsFormProps {
  submitLabel: string
  onSubmit: (email: string, password: string) => Promise<string | null>
}

/** Email + password form; onSubmit resolves to an error message or null on success. */
function CredentialsForm({ submitLabel, onSubmit }: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPasswordValue] = useState('')
  const [errors, setErrors] = useState<CredentialErrors & { form?: string }>({})
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problems = validateCredentials(email, password)
    setErrors(problems)
    if (Object.keys(problems).length > 0) return
    setIsBusy(true)
    const error = await onSubmit(email, password)
    setIsBusy(false)
    if (error) setErrors({ form: error })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4">
      <label className="block text-sm font-semibold">
        Email
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} className={inputClass} />
      </label>
      {errors.email && <p className="mt-1 text-sm text-alert">{errors.email}</p>}
      <label className="mt-3 block text-sm font-semibold">
        Password
        <input
          type="password"
          autoComplete={submitLabel === 'Sign in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          className={inputClass}
        />
      </label>
      {errors.password && <p className="mt-1 text-sm text-alert">{errors.password}</p>}
      {errors.form && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={isBusy} className="mt-4 min-h-12 w-full rounded-full bg-forest px-6 font-semibold text-paper disabled:opacity-60">
        {isBusy ? 'Please wait…' : submitLabel}
      </button>
    </form>
  )
}

function SetPasswordForm() {
  const [password, setPasswordValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validatePassword(password)
    if (problem) return setMessage(problem)
    const result = await setPassword(password)
    setMessage(result.ok ? '✓ Password saved.' : result.error)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-wrap gap-2">
      <input type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPasswordValue(e.target.value)} aria-label="New password" className={`${inputClass} mt-0`} />
      <button type="submit" className="min-h-12 shrink-0 rounded-full px-4 font-semibold text-forest ring-1 ring-forest">
        Save
      </button>
      {message && (
        <p role="status" className="basis-full text-sm text-ink-soft">
          {message}
        </p>
      )}
    </form>
  )
}

interface AccountCardProps {
  /** Called after the signed-in user changes, so the page can reload its data. */
  onAccountChange?: () => void
}

/** "Save my progress": link an email + password so totals follow the user to other browsers and phones. */
export function AccountCard({ onAccountChange }: AccountCardProps) {
  const account = useAccount()
  const [mode, setMode] = useState<Mode>('save')
  const [notice, setNotice] = useState<string | null>(null)

  if (!account) return null

  async function handleSave(email: string, password: string) {
    const result = await saveProgress(email, password)
    if (!result.ok) return result.error
    setNotice(result.value.kind === 'pending' ? `Check ${email} for a confirmation link, then come back here to set your password.` : null)
    return null
  }

  async function handleSignIn(email: string, password: string) {
    const result = await signInWithEmail(email, password)
    if (!result.ok) return result.error
    onAccountChange?.()
    return null
  }

  async function handleSignOut() {
    if (!window.confirm('Sign out on this device? Your saved items stay in your account.')) return
    await signOut()
    onAccountChange?.()
  }

  const heading = <h2 className="font-display text-xl font-extrabold">Your account</h2>
  const wrapper = 'mt-10 rounded-3xl border border-ink/10 bg-white/60 p-5'

  if (account.kind === 'email') {
    return (
      <section className={wrapper} aria-label="Your account">
        {heading}
        <p className="mt-1 text-sm text-ink-soft">
          Signed in as <strong className="font-semibold text-ink">{account.email}</strong>. Sign in with the same email on any phone to see your totals.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-forest">Change password</summary>
          <SetPasswordForm />
        </details>
        <button type="button" onClick={handleSignOut} className="mt-4 min-h-11 text-sm font-semibold text-alert underline underline-offset-4">
          Sign out
        </button>
      </section>
    )
  }

  if (account.kind === 'pending') {
    return (
      <section className={wrapper} aria-label="Your account">
        {heading}
        <p className="mt-1 text-sm text-ink-soft">
          {notice ?? `Waiting for you to confirm ${account.email}. Open the link in that email, then reload this page.`}
        </p>
      </section>
    )
  }

  const isSaving = mode === 'save' && account.kind === 'anonymous'
  return (
    <section className={wrapper} aria-label="Your account">
      {heading}
      {isSaving ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Your scans are saved on this browser only. Add an email and password to keep them safe and see them on other phones.
          </p>
          <CredentialsForm submitLabel="Save my progress" onSubmit={handleSave} />
          <button type="button" onClick={() => setMode('sign-in')} className="mt-3 min-h-11 text-sm font-semibold text-forest underline underline-offset-4">
            Already have an account? Sign in
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Sign in to see your totals from another phone or browser.
            {account.kind === 'anonymous' && ' Items saved on this browser so far stay with this browser.'}
          </p>
          <CredentialsForm submitLabel="Sign in" onSubmit={handleSignIn} />
          {account.kind === 'anonymous' && (
            <button type="button" onClick={() => setMode('save')} className="mt-3 min-h-11 text-sm font-semibold text-forest underline underline-offset-4">
              Back to "Save my progress"
            </button>
          )}
        </>
      )}
    </section>
  )
}
