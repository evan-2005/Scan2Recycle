import { useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n/context'
import { msg, type Message } from '../../i18n/translate'
import { requestPasswordReset, resendConfirmation, saveProgress, setPassword, signInWithEmail, signOut } from '../../lib/account'
import { consumeAuthReturn, peekAuthReturn } from '../../lib/authReturn'
import { CredentialsForm, EmailForm, PasswordForm } from './AccountForms'
import { useAccount } from './useAccount'

type Mode = 'save' | 'sign-in' | 'forgot'

const linkButton = 'mt-3 min-h-11 text-sm font-semibold text-forest underline underline-offset-4'

interface AccountCardProps {
  /** Called after the signed-in user changes, so the page can reload its data. */
  onAccountChange?: () => void
}

/**
 * Register ("Save my progress"), sign in, confirm email, set / reset password, sign out.
 * Registration links an email to this browser's anonymous account, so earlier scans are kept.
 */
export function AccountCard({ onAccountChange }: AccountCardProps) {
  const { t, m } = useI18n()
  const { account, refresh } = useAccount()
  const [mode, setMode] = useState<Mode>('save')
  // Opened from an email link? Read once; the effect below cleans ?auth=… out of the address bar.
  const [linkReturn] = useState(peekAuthReturn)
  const [notice, setNotice] = useState<Message | null>(() =>
    linkReturn?.failed ? msg('account.linkExpired') : linkReturn?.kind === 'confirmed' ? msg('account.confirmedNotice') : null,
  )
  const [isResetting, setIsResetting] = useState(linkReturn?.kind === 'reset' && !linkReturn.failed)

  useEffect(() => {
    if (linkReturn) consumeAuthReturn()
  }, [linkReturn])

  if (!account) return null

  const wrap = (body: ReactNode) => (
    <section className="mt-10 rounded-3xl border border-ink/10 bg-white/60 p-5" aria-label={t('account.heading')}>
      <h2 className="font-display text-xl font-extrabold">{t('account.heading')}</h2>
      {notice && (
        <p role="status" className="mt-2 rounded-xl bg-forest/10 px-3 py-2 text-sm text-forest">
          {m(notice)}
        </p>
      )}
      {body}
    </section>
  )

  async function handleSave(email: string, password: string) {
    const result = await saveProgress(email, password)
    if (!result.ok) return result.error
    setNotice(null)
    return null
  }

  async function handleSignIn(email: string, password: string) {
    const result = await signInWithEmail(email, password)
    if (!result.ok) return result.error
    setNotice(null)
    onAccountChange?.()
    return null
  }

  async function handleForgot(email: string) {
    const result = await requestPasswordReset(email)
    if (!result.ok) return result.error
    setNotice(msg('account.resetSent', { email }))
    setMode('sign-in')
    return null
  }

  async function handleSetPassword(password: string) {
    const result = await setPassword(password)
    if (!result.ok) return result.error
    setNotice(msg(isResetting ? 'account.resetDone' : 'account.passwordSaved'))
    setIsResetting(false)
    return null
  }

  async function handleSignOut() {
    if (!window.confirm(t('account.signOutConfirm'))) return
    await signOut()
    setNotice(null)
    onAccountChange?.()
  }

  if (account.kind === 'pending') {
    const email = account.email
    return wrap(
      <>
        <p className="mt-2 font-semibold">{t('account.checkInboxTitle')}</p>
        <p className="mt-1 text-sm text-ink-soft">{t('account.checkInbox', { email })}</p>
        <div className="flex flex-wrap gap-x-5">
          <button
            type="button"
            className={linkButton}
            onClick={async () => {
              const next = await refresh()
              setNotice(next.kind === 'pending' ? msg('account.stillPending') : msg('account.confirmedNotice'))
            }}
          >
            {t('account.refresh')}
          </button>
          <button
            type="button"
            className={linkButton}
            onClick={async () => {
              const result = await resendConfirmation(email)
              setNotice(result.ok ? msg('account.resent') : result.error)
            }}
          >
            {t('account.resend')}
          </button>
        </div>
      </>,
    )
  }

  if (account.kind === 'email') {
    const needsPassword = isResetting || !account.hasPassword
    return wrap(
      needsPassword ? (
        <>
          <p className="mt-2 font-semibold">{t(isResetting ? 'account.resetTitle' : 'account.setPasswordTitle')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('account.setPasswordIntro', { email: account.email })}</p>
          <PasswordForm submitLabel={t('account.save')} onSubmit={handleSetPassword} />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">{t('account.signedInAs', { email: account.email })}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-forest">{t('account.changePassword')}</summary>
            <PasswordForm submitLabel={t('account.save')} onSubmit={handleSetPassword} />
          </details>
          <button type="button" onClick={handleSignOut} className="mt-4 min-h-11 text-sm font-semibold text-alert underline underline-offset-4">
            {t('account.signOut')}
          </button>
        </>
      ),
    )
  }

  // No account yet ('none') or an anonymous one: both can register, sign in or reset a password.
  if (mode === 'forgot') {
    return wrap(
      <>
        <p className="mt-1 text-sm text-ink-soft">{t('account.resetIntro')}</p>
        <EmailForm submitLabel={t('account.sendReset')} onSubmit={handleForgot} />
        <button type="button" onClick={() => setMode('sign-in')} className={linkButton}>
          {t('common.back')}
        </button>
      </>,
    )
  }

  if (mode === 'sign-in') {
    return wrap(
      <>
        <p className="mt-1 text-sm text-ink-soft">
          {t('account.signInIntro')}
          {account.kind === 'anonymous' && ` ${t('account.signInNote')}`}
        </p>
        <CredentialsForm submitLabel={t('account.signIn')} isSignIn onSubmit={handleSignIn} />
        <div className="flex flex-wrap gap-x-5">
          <button type="button" onClick={() => setMode('forgot')} className={linkButton}>
            {t('account.forgot')}
          </button>
          <button type="button" onClick={() => setMode('save')} className={linkButton}>
            {t('account.backToSave')}
          </button>
        </div>
      </>,
    )
  }

  return wrap(
    <>
      <p className="mt-1 text-sm text-ink-soft">{t('account.saveIntro')}</p>
      <CredentialsForm submitLabel={t('account.saveButton')} isSignIn={false} onSubmit={handleSave} />
      <button type="button" onClick={() => setMode('sign-in')} className={linkButton}>
        {t('account.haveAccount')}
      </button>
    </>,
  )
}
