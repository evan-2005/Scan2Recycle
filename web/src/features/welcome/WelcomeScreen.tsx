import { useState } from 'react'
import { LanguageSwitch } from '../../components/LanguageSwitch'
import { useI18n } from '../../i18n/context'
import { msg, type Message } from '../../i18n/translate'
import { continueAsGuest, requestPasswordReset, resendSignUp, signInWithEmail, signUpWithEmail } from '../../lib/account'
import { CredentialsForm, EmailForm } from '../account/AccountForms'

type Mode = 'sign-up' | 'log-in' | 'forgot' | 'check-inbox'

const linkButton = 'mt-3 min-h-11 text-sm font-semibold text-forest underline underline-offset-4'

function Tabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useI18n()
  const tabs = [
    { mode: 'sign-up', label: t('welcome.signUp') },
    { mode: 'log-in', label: t('welcome.logIn') },
  ] as const
  return (
    <div role="group" aria-label={t('welcome.tabsLabel')} className="grid grid-cols-2 rounded-full bg-paper-deep p-1 text-sm font-semibold">
      {tabs.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          aria-pressed={mode === tab.mode}
          onClick={() => onChange(tab.mode)}
          className={`min-h-10 rounded-full transition ${mode === tab.mode ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Shown until the person signs up, logs in or chooses to continue as a guest.
 * Once Supabase reports a session, App swaps this screen for the app itself.
 */
export function WelcomeScreen() {
  const { t, m } = useI18n()
  const [mode, setMode] = useState<Mode>('sign-up')
  const [notice, setNotice] = useState<Message | null>(null)
  const [inboxEmail, setInboxEmail] = useState('')
  const [guestError, setGuestError] = useState<Message | null>(null)
  const [isGuestBusy, setIsGuestBusy] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setNotice(null)
  }

  async function handleSignUp(email: string, password: string) {
    const result = await signUpWithEmail(email, password)
    if (!result.ok) return result.error
    if (result.value === 'confirm') {
      setInboxEmail(email.trim())
      setMode('check-inbox')
    }
    return null
  }

  async function handleLogIn(email: string, password: string) {
    const result = await signInWithEmail(email, password)
    return result.ok ? null : result.error
  }

  async function handleForgot(email: string) {
    const result = await requestPasswordReset(email)
    if (!result.ok) return result.error
    setMode('log-in')
    setNotice(msg('account.resetSent', { email }))
    return null
  }

  async function handleGuest() {
    setIsGuestBusy(true)
    setGuestError(null)
    const result = await continueAsGuest()
    setIsGuestBusy(false)
    if (!result.ok) setGuestError(result.error)
  }

  async function handleResend() {
    const result = await resendSignUp(inboxEmail)
    setNotice(result.ok ? msg('account.resent') : result.error)
  }

  function renderBody() {
    if (mode === 'check-inbox') {
      return (
        <>
          <p className="font-display text-xl font-extrabold">{t('account.checkInboxTitle')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('welcome.checkInbox', { email: inboxEmail })}</p>
          <div className="flex flex-wrap gap-x-5">
            <button type="button" onClick={handleResend} className={linkButton}>
              {t('account.resend')}
            </button>
            <button type="button" onClick={() => switchMode('log-in')} className={linkButton}>
              {t('welcome.logIn')}
            </button>
          </div>
        </>
      )
    }
    if (mode === 'forgot') {
      return (
        <>
          <p className="text-sm text-ink-soft">{t('account.resetIntro')}</p>
          <EmailForm submitLabel={t('account.sendReset')} onSubmit={handleForgot} />
          <button type="button" onClick={() => switchMode('log-in')} className={linkButton}>
            {t('common.back')}
          </button>
        </>
      )
    }
    const isSignUp = mode === 'sign-up'
    return (
      <>
        <Tabs mode={mode} onChange={switchMode} />
        <p className="mt-4 text-sm text-ink-soft">{t(isSignUp ? 'welcome.signUpIntro' : 'welcome.logInIntro')}</p>
        <CredentialsForm
          key={mode}
          submitLabel={t(isSignUp ? 'welcome.createButton' : 'welcome.logIn')}
          isSignIn={!isSignUp}
          onSubmit={isSignUp ? handleSignUp : handleLogIn}
        />
        {!isSignUp && (
          <button type="button" onClick={() => switchMode('forgot')} className={linkButton}>
            {t('account.forgot')}
          </button>
        )}
      </>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10">
      <div className="flex justify-end pt-[max(0.75rem,env(safe-area-inset-top))]">
        <LanguageSwitch />
      </div>

      <header className="pt-8 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-light">Scan2Recycle</p>
        <h1 className="mt-2 font-display text-5xl leading-[1.0] font-extrabold text-ink">
          {t('welcome.titleLine1')}
          <br />
          <span className="text-forest">{t('welcome.titleLine2')}</span>
        </h1>
        <p className="mt-4 text-ink-soft">{t('app.description')}</p>
      </header>

      <section className="relative">
        <div aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-signal" />
        <div className="relative rounded-3xl bg-white p-5 shadow-lg">
          {notice && (
            <p role="status" className="mb-4 rounded-xl bg-forest/10 px-3 py-2 text-sm text-forest">
              {m(notice)}
            </p>
          )}
          {renderBody()}
        </div>
      </section>

      <div className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-soft" aria-hidden="true">
        <span className="h-px flex-1 bg-ink/15" />
        {t('welcome.or')}
        <span className="h-px flex-1 bg-ink/15" />
      </div>

      <button
        type="button"
        onClick={handleGuest}
        disabled={isGuestBusy}
        className="mt-6 min-h-12 w-full rounded-full border-2 border-forest px-6 font-semibold text-forest transition hover:bg-forest hover:text-paper disabled:opacity-60"
      >
        {isGuestBusy ? t('common.pleaseWait') : t('welcome.guest')}
      </button>
      {guestError && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {m(guestError)}
        </p>
      )}
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-soft">{t('welcome.guestNote')}</p>
    </main>
  )
}
