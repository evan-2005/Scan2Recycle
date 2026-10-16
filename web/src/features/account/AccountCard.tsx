import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n/context'
import { msg, type Message } from '../../i18n/translate'
import { saveProgress, setPassword, signInWithEmail, signOut, validateCredentials, validatePassword, type CredentialErrors } from '../../lib/account'
import { useAccount } from './useAccount'

type Mode = 'save' | 'sign-in'

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 focus:border-forest focus:outline-none aria-[invalid=true]:border-alert'

interface CredentialsFormProps {
  submitLabel: string
  isSignIn: boolean
  onSubmit: (email: string, password: string) => Promise<Message | null>
}

/** Email + password form; onSubmit resolves to an error message or null on success. */
function CredentialsForm({ submitLabel, isSignIn, onSubmit }: CredentialsFormProps) {
  const { t, m } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPasswordValue] = useState('')
  const [errors, setErrors] = useState<CredentialErrors & { form?: Message }>({})
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
        {t('account.email')}
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} className={inputClass} />
      </label>
      {errors.email && <p className="mt-1 text-sm text-alert">{m(errors.email)}</p>}
      <label className="mt-3 block text-sm font-semibold">
        {t('account.password')}
        <input
          type="password"
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          className={inputClass}
        />
      </label>
      {errors.password && <p className="mt-1 text-sm text-alert">{m(errors.password)}</p>}
      {errors.form && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {m(errors.form)}
        </p>
      )}
      <button type="submit" disabled={isBusy} className="mt-4 min-h-12 w-full rounded-full bg-forest px-6 font-semibold text-paper disabled:opacity-60">
        {isBusy ? t('common.pleaseWait') : submitLabel}
      </button>
    </form>
  )
}

function SetPasswordForm() {
  const { t, m } = useI18n()
  const [password, setPasswordValue] = useState('')
  const [message, setMessage] = useState<Message | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validatePassword(password)
    if (problem) return setMessage(problem)
    const result = await setPassword(password)
    setMessage(result.ok ? msg('account.passwordSaved') : result.error)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-wrap gap-2">
      <input
        type="password"
        autoComplete="new-password"
        placeholder={t('account.newPassword')}
        value={password}
        onChange={(e) => setPasswordValue(e.target.value)}
        aria-label={t('account.newPassword')}
        className={`${inputClass} mt-0`}
      />
      <button type="submit" className="min-h-12 shrink-0 rounded-full px-4 font-semibold text-forest ring-1 ring-forest">
        {t('account.save')}
      </button>
      {message && (
        <p role="status" className="basis-full text-sm text-ink-soft">
          {m(message)}
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
  const { t } = useI18n()
  const account = useAccount()
  const [mode, setMode] = useState<Mode>('save')
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  if (!account) return null

  async function handleSave(email: string, password: string) {
    const result = await saveProgress(email, password)
    if (!result.ok) return result.error
    setPendingEmail(result.value.kind === 'pending' ? email : null)
    return null
  }

  async function handleSignIn(email: string, password: string) {
    const result = await signInWithEmail(email, password)
    if (!result.ok) return result.error
    onAccountChange?.()
    return null
  }

  async function handleSignOut() {
    if (!window.confirm(t('account.signOutConfirm'))) return
    await signOut()
    onAccountChange?.()
  }

  const heading = <h2 className="font-display text-xl font-extrabold">{t('account.heading')}</h2>
  const wrapper = 'mt-10 rounded-3xl border border-ink/10 bg-white/60 p-5'

  if (account.kind === 'email') {
    return (
      <section className={wrapper} aria-label={t('account.heading')}>
        {heading}
        <p className="mt-1 text-sm text-ink-soft">{t('account.signedInAs', { email: account.email })}</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-forest">{t('account.changePassword')}</summary>
          <SetPasswordForm />
        </details>
        <button type="button" onClick={handleSignOut} className="mt-4 min-h-11 text-sm font-semibold text-alert underline underline-offset-4">
          {t('account.signOut')}
        </button>
      </section>
    )
  }

  if (account.kind === 'pending') {
    return (
      <section className={wrapper} aria-label={t('account.heading')}>
        {heading}
        <p className="mt-1 text-sm text-ink-soft">
          {pendingEmail ? t('account.checkInbox', { email: pendingEmail }) : t('account.pending', { email: account.email })}
        </p>
      </section>
    )
  }

  const isSaving = mode === 'save' && account.kind === 'anonymous'
  return (
    <section className={wrapper} aria-label={t('account.heading')}>
      {heading}
      {isSaving ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">{t('account.saveIntro')}</p>
          <CredentialsForm submitLabel={t('account.saveButton')} isSignIn={false} onSubmit={handleSave} />
          <button type="button" onClick={() => setMode('sign-in')} className="mt-3 min-h-11 text-sm font-semibold text-forest underline underline-offset-4">
            {t('account.haveAccount')}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            {t('account.signInIntro')}
            {account.kind === 'anonymous' && ` ${t('account.signInNote')}`}
          </p>
          <CredentialsForm submitLabel={t('account.signIn')} isSignIn onSubmit={handleSignIn} />
          {account.kind === 'anonymous' && (
            <button type="button" onClick={() => setMode('save')} className="mt-3 min-h-11 text-sm font-semibold text-forest underline underline-offset-4">
              {t('account.backToSave')}
            </button>
          )}
        </>
      )}
    </section>
  )
}
