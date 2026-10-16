import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n/context'
import type { Message } from '../../i18n/translate'
import { validateCredentials, validateEmail, validatePassword, type CredentialErrors } from '../../lib/account'

export const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 focus:border-forest focus:outline-none aria-[invalid=true]:border-alert'

const primaryButton = 'mt-4 min-h-12 w-full rounded-full bg-forest px-6 font-semibold text-paper disabled:opacity-60'

function ErrorText({ message }: { message: Message | undefined | null }) {
  const { m } = useI18n()
  return message ? <p className="mt-1 text-sm text-alert">{m(message)}</p> : null
}

interface CredentialsFormProps {
  submitLabel: string
  isSignIn: boolean
  /** Resolves to an error, or null on success. */
  onSubmit: (email: string, password: string) => Promise<Message | null>
}

/** Email + password: used for "Save my progress" (register) and "Sign in". */
export function CredentialsForm({ submitLabel, isSignIn, onSubmit }: CredentialsFormProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <ErrorText message={errors.email} />
      <label className="mt-3 block text-sm font-semibold">
        {t('account.password')}
        <input
          type="password"
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          className={inputClass}
        />
      </label>
      <ErrorText message={errors.password} />
      {errors.form && <div role="alert"><ErrorText message={errors.form} /></div>}
      <button type="submit" disabled={isBusy} className={primaryButton}>
        {isBusy ? t('common.pleaseWait') : submitLabel}
      </button>
    </form>
  )
}

interface PasswordFormProps {
  submitLabel: string
  onSubmit: (password: string) => Promise<Message | null>
}

/** A single new-password box: set a password after confirming, change it, or reset it. */
export function PasswordForm({ submitLabel, onSubmit }: PasswordFormProps) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<Message | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validatePassword(password)
    if (problem) return setError(problem)
    setIsBusy(true)
    setError(await onSubmit(password))
    setIsBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3">
      <label className="block text-sm font-semibold">
        {t('account.newPassword')}
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} className={inputClass} />
      </label>
      <ErrorText message={error} />
      <button type="submit" disabled={isBusy} className={primaryButton}>
        {isBusy ? t('common.pleaseWait') : submitLabel}
      </button>
    </form>
  )
}

interface EmailFormProps {
  submitLabel: string
  onSubmit: (email: string) => Promise<Message | null>
}

/** Just an email box, for "Forgot password?". */
export function EmailForm({ submitLabel, onSubmit }: EmailFormProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<Message | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validateEmail(email)
    if (problem) return setError(problem)
    setIsBusy(true)
    setError(await onSubmit(email.trim()))
    setIsBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3">
      <label className="block text-sm font-semibold">
        {t('account.email')}
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} className={inputClass} />
      </label>
      <ErrorText message={error} />
      <button type="submit" disabled={isBusy} className={primaryButton}>
        {isBusy ? t('common.pleaseWait') : submitLabel}
      </button>
    </form>
  )
}
