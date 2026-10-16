import { useState, type FormEvent } from 'react'
import { routeHref } from '../../lib/routes'
import { saveLog, type NewLog } from '../../lib/logs'
import { parseWeight } from '../../lib/weight'

interface SaveFormProps {
  /** Everything about the log except the weight, which the user types here. */
  log: Omit<NewLog, 'weightG'>
  typicalWeightG: number | null
}

type SaveState = { status: 'editing'; error: string | null } | { status: 'saving' } | { status: 'saved'; grams: number | null }

export function SaveForm({ log, typicalWeightG }: SaveFormProps) {
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
        <p className="font-semibold text-forest">
          ✓ Saved{state.grams !== null ? ` (${state.grams} g)` : ' without a weight'}
        </p>
        <a href={routeHref('stats')} className="mt-1 inline-block text-sm font-semibold text-forest underline underline-offset-4">
          See My Recycling →
        </a>
      </div>
    )
  }

  const error = state.status === 'editing' ? state.error : null
  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-white/70 p-4">
      <label htmlFor="weight" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Weight (optional)
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="weight"
          inputMode="decimal"
          autoComplete="off"
          placeholder={typicalWeightG ? `about ${typicalWeightG}` : 'e.g. 32'}
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
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state.status === 'saving'}
        className="mt-3 min-h-12 w-full rounded-full bg-signal px-6 font-semibold text-ink shadow-sm active:scale-[0.98] disabled:opacity-60"
      >
        {state.status === 'saving' ? 'Saving…' : 'Save to My Recycling'}
      </button>
    </form>
  )
}
