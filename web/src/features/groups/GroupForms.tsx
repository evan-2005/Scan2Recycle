import { useState, type FormEvent } from 'react'
import { createGroup, joinGroup, normalizeJoinCode, validateDisplayName, validateGroupName, type Group } from '../../lib/groups'

type Mode = 'join' | 'create'

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 focus:border-forest focus:outline-none aria-[invalid=true]:border-alert'

interface GroupFormsProps {
  onDone: (group: Group) => void
}

/** Join with a code, or create a new group; both ask for the name others will see. */
export function GroupForms({ onDone }: GroupFormsProps) {
  const [mode, setMode] = useState<Mode>('join')
  const [code, setCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeJoinCode(code)
    const problem =
      validateDisplayName(displayName) ??
      (mode === 'join' ? (normalized ? null : 'Join codes are 6 letters and numbers, e.g. K7Q3MZ.') : validateGroupName(groupName))
    if (problem) return setError(problem)
    setError(null)
    setIsBusy(true)
    const result = mode === 'join' ? await joinGroup(normalized!, displayName) : await createGroup(groupName, displayName)
    setIsBusy(false)
    if (result.ok) onDone(result.value)
    else setError(result.error)
  }

  return (
    <section className="mt-8 rounded-3xl bg-white/80 p-5 shadow-sm" aria-label="Join or create a group">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper-deep p-1" role="tablist">
        {(['join', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`min-h-10 rounded-full text-sm font-semibold transition ${mode === m ? 'bg-white text-forest shadow-sm' : 'text-ink-soft'}`}
          >
            {m === 'join' ? 'Join a group' : 'Create a group'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4">
        {mode === 'join' ? (
          <label className="block text-sm font-semibold">
            Join code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="K7Q3MZ"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={9}
              className={`${inputClass} font-mono text-lg tracking-[0.3em] uppercase`}
            />
          </label>
        ) : (
          <label className="block text-sm font-semibold">
            Group name
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Class 5 Amanah, Taman Desa residents" maxLength={60} className={inputClass} />
          </label>
        )}

        <label className="mt-3 block text-sm font-semibold">
          Your display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Aina T." maxLength={30} autoComplete="nickname" className={inputClass} />
        </label>
        <p className="mt-1 text-xs text-ink-soft">Others in the group see this name and your totals, nothing else. A nickname is fine.</p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={isBusy} className="mt-4 min-h-12 w-full rounded-full bg-forest px-6 font-semibold text-paper disabled:opacity-60">
          {isBusy ? 'Please wait…' : mode === 'join' ? 'Join group' : 'Create group'}
        </button>
      </form>
    </section>
  )
}
