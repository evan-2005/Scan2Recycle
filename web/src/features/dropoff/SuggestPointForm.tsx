import { useState, type FormEvent } from 'react'
import { suggestPoint } from '../../lib/places/api'
import { validateSuggestion } from '../../lib/places/suggestion'
import { POINT_MATERIALS, POINT_MATERIAL_LABELS, type LatLng, type PointMaterial } from '../../lib/places/types'

interface SuggestPointFormProps {
  location: LatLng | null
  userPosition: LatLng | null
  onUseMyLocation: (location: LatLng) => void
  onDone: (didSubmit: boolean) => void
}

type Errors = Partial<Record<'name' | 'location' | 'materials' | 'openingHours' | 'notes' | 'form', string>>

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 focus:border-forest focus:outline-none aria-[invalid=true]:border-alert'

export function SuggestPointForm({ location, userPosition, onUseMyLocation, onDone }: SuggestPointFormProps) {
  const [name, setName] = useState('')
  const [materials, setMaterials] = useState<PointMaterial[]>([])
  const [openingHours, setOpeningHours] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  function toggle(material: PointMaterial) {
    setMaterials((current) => (current.includes(material) ? current.filter((m) => m !== material) : [...current, material]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = validateSuggestion({ name, location, materials, openingHours, notes })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setIsSending(true)
    const saved = await suggestPoint(result.value)
    setIsSending(false)
    if (saved.ok) setIsSent(true)
    else setErrors({ form: saved.error })
  }

  if (isSent) {
    return (
      <div className="rounded-3xl bg-forest/10 p-5" role="status">
        <p className="font-semibold text-forest">✓ Thanks! The team will check it soon.</p>
        <p className="mt-1 text-sm text-ink-soft">Until then, only you can see it on the map (dashed outline).</p>
        <button type="button" onClick={() => onDone(true)} className="mt-4 min-h-11 font-semibold text-forest underline underline-offset-4">
          Back to the list
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl bg-white/80 p-5 shadow-sm">
      <h2 className="font-display text-2xl font-extrabold">Suggest a drop-off point</h2>
      <p className="mt-1 text-sm text-ink-soft">The team checks every suggestion before it appears for everyone.</p>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Where is it?</legend>
        <p className={`mt-1 text-sm ${location ? 'text-forest' : 'text-ink-soft'}`}>
          {location ? `📍 Pin placed (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}). Tap the map to move it.` : 'Tap the map above to place a pin.'}
        </p>
        {userPosition && (
          <button type="button" onClick={() => onUseMyLocation(userPosition)} className="mt-1 min-h-10 text-sm font-semibold text-forest underline underline-offset-4">
            Use my current location
          </button>
        )}
        {errors.location && <p className="mt-1 text-sm text-alert">{errors.location}</p>}
      </fieldset>

      <label className="mt-4 block text-sm font-semibold">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. SK Taman Desa recycling corner" aria-invalid={Boolean(errors.name)} className={inputClass} />
      </label>
      {errors.name && <p className="mt-1 text-sm text-alert">{errors.name}</p>}

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">What does it accept?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {POINT_MATERIALS.map((material) => {
            const isOn = materials.includes(material)
            return (
              <button
                key={material}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(material)}
                className={`min-h-10 rounded-full px-4 text-sm font-medium ring-1 transition ${isOn ? 'bg-forest text-paper ring-forest' : 'bg-white ring-ink/15'}`}
              >
                {POINT_MATERIAL_LABELS[material]}
              </button>
            )
          })}
        </div>
        {errors.materials && <p className="mt-1 text-sm text-alert">{errors.materials}</p>}
      </fieldset>

      <label className="mt-4 block text-sm font-semibold">
        Opening hours <span className="font-normal text-ink-soft">(optional)</span>
        <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} maxLength={120} placeholder="e.g. Mon–Sat 9am–5pm" aria-invalid={Boolean(errors.openingHours)} className={inputClass} />
      </label>

      <label className="mt-4 block text-sm font-semibold">
        Notes <span className="font-normal text-ink-soft">(optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={2} placeholder="e.g. Behind the canteen" aria-invalid={Boolean(errors.notes)} className={`${inputClass} py-3`} />
      </label>

      {errors.form && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {errors.form}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={isSending} className="min-h-12 flex-1 rounded-full bg-forest px-6 font-semibold text-paper disabled:opacity-60">
          {isSending ? 'Sending…' : 'Send suggestion'}
        </button>
        <button type="button" onClick={() => onDone(false)} className="min-h-12 rounded-full px-5 font-semibold text-forest ring-1 ring-forest">
          Cancel
        </button>
      </div>
    </form>
  )
}
