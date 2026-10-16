import { PageHeader } from '../../components/PageHeader'
import { SetupStatus } from '../setup/SetupStatus'

export function ScanPage() {
  return (
    <>
      <PageHeader
        eyebrow="Scan2Recycle"
        title={
          <>
            What's in
            <br />
            your hand?
          </>
        }
      />

      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-signal" />
        <button
          type="button"
          disabled
          className="relative flex w-full flex-col items-start gap-6 rounded-3xl bg-forest p-6 text-left text-paper shadow-lg disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>
            <span className="block font-display text-2xl font-extrabold">Scan an item</span>
            <span className="mt-1 block text-sm text-paper/75">Camera and AI arrive in Phase 1.</span>
          </span>
        </button>
      </div>

      <div className="mt-10">
        <SetupStatus />
      </div>
    </>
  )
}
