import { useRef, type ChangeEvent } from 'react'
import { useI18n } from '../../i18n/context'
import type { CatalogState } from './useCatalog'

interface ScanStartProps {
  catalog: CatalogState
  onPhoto: (file: File) => void
}

const CAMERA_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export function ScanStart({ catalog, onPhoto }: ScanStartProps) {
  const { t, m } = useI18n()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const isReady = catalog.status === 'ready'
  const status = catalog.status === 'loading' ? t('scan.statusLoading') : catalog.status === 'error' ? t('scan.statusError') : t('scan.statusReady')

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same photo be picked again
    if (file) onPhoto(file)
  }

  return (
    <div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-signal" />
        <button
          type="button"
          disabled={!isReady}
          onClick={() => cameraInput.current?.click()}
          className="relative flex w-full flex-col items-start gap-6 rounded-3xl bg-forest p-6 text-left text-paper shadow-lg transition-transform active:translate-x-1 active:translate-y-1 disabled:cursor-wait disabled:opacity-80"
        >
          {CAMERA_ICON}
          <span>
            <span className="block font-display text-2xl font-extrabold">{t('scan.button')}</span>
            <span className="mt-1 block text-sm text-paper/75">{status}</span>
          </span>
        </button>
      </div>

      <button
        type="button"
        disabled={!isReady}
        onClick={() => galleryInput.current?.click()}
        className="mt-6 min-h-11 text-sm font-semibold text-forest underline decoration-2 underline-offset-4 disabled:opacity-50"
      >
        {t('scan.gallery')}
      </button>

      {catalog.status === 'error' && <p className="mt-2 text-sm text-alert">{m(catalog.message)}</p>}

      <p className="mt-4 text-xs leading-relaxed text-ink-soft">{t('scan.privacy')}</p>
    </div>
  )
}
