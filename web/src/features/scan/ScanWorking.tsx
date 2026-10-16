import { useI18n } from '../../i18n/context'

interface ScanWorkingProps {
  photoUrl: string
  /** Download percentage while the model loads (0 if already cached); null while analysing. */
  percent: number | null
}

export function ScanWorking({ photoUrl, percent }: ScanWorkingProps) {
  const { t } = useI18n()
  const isDownloading = percent !== null
  const isSettingUp = percent === 100
  const title = isDownloading ? t('working.preparing') : t('working.analysing')
  const detail = isSettingUp ? t('working.settingUp') : isDownloading ? t('working.downloading') : t('working.analysingDetail')

  return (
    <div className="flex flex-col items-center pt-6 text-center" role="status" aria-live="polite">
      <div className="relative">
        <img src={photoUrl} alt={t('photo.alt')} className="size-56 rounded-3xl object-cover shadow-lg" />
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="h-1/3 w-full animate-[scan_1.6s_ease-in-out_infinite_alternate] bg-gradient-to-b from-transparent via-signal/50 to-transparent motion-reduce:hidden" />
        </div>
      </div>
      <h2 className="mt-8 font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">{detail}</p>
      {isDownloading && percent > 0 && (
        <div className="mt-6 w-full max-w-xs">
          <div
            className="h-2 overflow-hidden rounded-full bg-paper-deep"
            role="progressbar"
            aria-label={t('working.progressLabel')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="h-full rounded-full bg-forest transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold tabular-nums text-ink-soft">{percent}%</p>
        </div>
      )}
    </div>
  )
}
