import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n/context'
import type { Message } from '../../i18n/translate'
import { addHub } from '../../lib/places/api'
import { validateSuggestion } from '../../lib/places/suggestion'
import { POINT_MATERIALS, type LatLng, type PointMaterial } from '../../lib/places/types'

interface AddHubFormProps {
  location: LatLng | null
  userPosition: LatLng | null
  onUseMyLocation: (location: LatLng) => void
  onDone: (didAdd: boolean) => void
}

type Errors = Partial<Record<'name' | 'location' | 'materials' | 'openingHours' | 'notes' | 'form', Message>>

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 focus:border-forest focus:outline-none aria-[invalid=true]:border-alert'

/** Anyone can add a recycling hub; it shows on the map for everyone immediately. */
export function AddHubForm({ location, userPosition, onUseMyLocation, onDone }: AddHubFormProps) {
  const { t, m } = useI18n()
  const [name, setName] = useState('')
  const [materials, setMaterials] = useState<PointMaterial[]>([])
  const [openingHours, setOpeningHours] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [isSending, setIsSending] = useState(false)
  const [isAdded, setIsAdded] = useState(false)

  function toggle(material: PointMaterial) {
    setMaterials((current) => (current.includes(material) ? current.filter((x) => x !== material) : [...current, material]))
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
    const saved = await addHub(result.value)
    setIsSending(false)
    if (saved.ok) setIsAdded(true)
    else setErrors({ form: saved.error })
  }

  if (isAdded) {
    return (
      <div className="rounded-3xl bg-forest/10 p-5" role="status">
        <p className="font-semibold text-forest">{t('hub.added')}</p>
        <p className="mt-1 text-sm text-ink-soft">{t('hub.addedNote')}</p>
        <button type="button" onClick={() => onDone(true)} className="mt-4 min-h-11 font-semibold text-forest underline underline-offset-4">
          {t('hub.backToList')}
        </button>
      </div>
    )
  }

  const error = (field: keyof Errors) => errors[field] && <p className="mt-1 text-sm text-alert">{m(errors[field])}</p>

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl bg-white/80 p-5 shadow-sm">
      <h2 className="font-display text-2xl font-extrabold">{t('hub.title')}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('hub.intro')}</p>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">{t('hub.where')}</legend>
        <p className={`mt-1 text-sm ${location ? 'text-forest' : 'text-ink-soft'}`}>
          {location ? t('hub.pinPlaced', { lat: location.lat.toFixed(4), lng: location.lng.toFixed(4) }) : t('hub.tapMap')}
        </p>
        {userPosition && (
          <button type="button" onClick={() => onUseMyLocation(userPosition)} className="mt-1 min-h-10 text-sm font-semibold text-forest underline underline-offset-4">
            {t('hub.useLocation')}
          </button>
        )}
        {error('location')}
      </fieldset>

      <label className="mt-4 block text-sm font-semibold">
        {t('hub.name')}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t('hub.namePlaceholder')} aria-invalid={Boolean(errors.name)} className={inputClass} />
      </label>
      {error('name')}

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">{t('hub.accepts')}</legend>
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
                {t(`pointMaterial.${material}`)}
              </button>
            )
          })}
        </div>
        {error('materials')}
      </fieldset>

      <label className="mt-4 block text-sm font-semibold">
        {t('hub.hours')} <span className="font-normal text-ink-soft">{t('common.optional')}</span>
        <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} maxLength={120} placeholder={t('hub.hoursPlaceholder')} aria-invalid={Boolean(errors.openingHours)} className={inputClass} />
      </label>
      {error('openingHours')}

      <label className="mt-4 block text-sm font-semibold">
        {t('hub.notes')} <span className="font-normal text-ink-soft">{t('common.optional')}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={2} placeholder={t('hub.notesPlaceholder')} aria-invalid={Boolean(errors.notes)} className={`${inputClass} py-3`} />
      </label>
      {error('notes')}

      {errors.form && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {m(errors.form)}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={isSending} className="min-h-12 flex-1 rounded-full bg-forest px-6 font-semibold text-paper disabled:opacity-60">
          {isSending ? t('hub.sending') : t('hub.send')}
        </button>
        <button type="button" onClick={() => onDone(false)} className="min-h-12 rounded-full px-5 font-semibold text-forest ring-1 ring-forest">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
