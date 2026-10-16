import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n/context'
import type { Message } from '../../i18n/translate'
import { saveLog, type NewLog } from '../../lib/logs'
import { routeHref } from '../../lib/routes'
import { parseWeight } from '../../lib/weight'

interface SaveFormProps {
  /** Everything about the log except the weight, which the user types here. */
  log: Omit<NewLog, 'weightG'>
  typicalWeightG: number | null
}

type SaveState = { status: 'editing'; error: Message | null } | { status: 'saving' } | { status: 'saved'; grams: number | null }

export function SaveForm({ log, typicalWeightG }: SaveFormProps) {
  const { t, m } = useI18n()
  const [weight, setWeight] = useState('')
  const [state, setState] = useState<SaveState>({ status: 'editing', error: null })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseWeight(weight)
    if (!parsed.ok) {
      setState({ status: 'editing', error: parsed.error })
      return
    }
    setState({ status: 'saving' })
    const result = await saveLog({ ...log, weightG: parsed.grams })
    setState(result.ok ? { status: 'saved', grams: parsed.grams } : { status: 'editing', error: result.error })
  }

  if (state.status === 'saved') {
    return (
      <div className="rounded-2xl bg-forest/10 p-4" role="status">
        <p className="font-semibold text-forest">{state.grams !== null ? t('save.savedWith', { grams: state.grams }) : t('save.savedWithout')}</p>
        <a href={routeHref('stats')} className="mt-1 inline-block text-sm font-semibold text-forest underline underline-offset-4">
          {t('save.seeStats')}
        </a>
      </div>
    )
  }

  const error = state.status === 'editing' ? state.error : null
  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-white/70 p-4">
      <label htmlFor="weight" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {t('save.weightLabel')}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="weight"
          inputMode="decimal"
          autoComplete="off"
          placeholder={typicalWeightG ? t('save.placeholderTypical', { grams: typicalWeightG }) : t('save.placeholder')}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'weight-error' : undefined}
          className="min-h-12 w-full min-w-0 rounded-xl border border-ink/15 bg-white px-4 text-lg tabular-nums focus:border-forest focus:outline-none"
        />
        <span className="font-semibold text-ink-soft">g</span>
      </div>
      {error && (
        <p id="weight-error" className="mt-2 text-sm text-alert">
          {m(error)}
        </p>
      )}
      <button
        type="submit"
        disabled={state.status === 'saving'}
        className="mt-3 min-h-12 w-full rounded-full bg-signal px-6 font-semibold text-ink shadow-sm active:scale-[0.98] disabled:opacity-60"
      >
        {state.status === 'saving' ? t('save.saving') : t('save.button')}
      </button>
    </form>
  )
}
