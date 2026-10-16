import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/context'
import type { Message } from '../../i18n/translate'
import { fetchMaterials } from '../../lib/catalog'
import { config, isSupabaseConfigured } from '../../lib/env'

type DbState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: Message }

interface CheckRowProps {
  label: string
  ok: boolean
  detail: string
}

function CheckRow({ label, ok, detail }: CheckRowProps) {
  const { t } = useI18n()
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-paper ${ok ? 'bg-forest' : 'bg-alert'}`}
      >
        {ok ? '✓' : '!'}
      </span>
      <div>
        <p className="text-sm font-semibold">
          {label} <span className="sr-only">{ok ? t('setup.ready') : t('setup.notReady')}</span>
        </p>
        <p className="text-xs text-ink-soft">{detail}</p>
      </div>
    </li>
  )
}

/** Setup checklist, shown only when something is misconfigured. The AI model needs no setup. */
export function SetupStatus() {
  const { t, m } = useI18n()
  const supabaseReady = isSupabaseConfigured(config)
  const [db, setDb] = useState<DbState>({ status: supabaseReady ? 'checking' : 'idle' })

  useEffect(() => {
    if (!supabaseReady) return
    let cancelled = false
    fetchMaterials().then((result) => {
      if (cancelled) return
      setDb(result.ok ? { status: 'ok', count: result.materials.length } : { status: 'error', message: result.error })
    })
    return () => {
      cancelled = true
    }
  }, [supabaseReady])

  const dbDetail =
    db.status === 'ok'
      ? t('setup.dbOk', { n: db.count })
      : db.status === 'error'
        ? m(db.message)
        : db.status === 'checking'
          ? t('setup.dbChecking')
          : t('setup.dbWaiting')

  return (
    <section aria-labelledby="setup-heading" className="rounded-2xl border border-dashed border-ink/20 bg-paper-deep/60 p-4">
      <h2 id="setup-heading" className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        {t('setup.heading')}
      </h2>
      <ul className="mt-2 divide-y divide-ink/10">
        <CheckRow label={t('setup.keys')} ok={supabaseReady} detail={supabaseReady ? t('setup.keysFound') : t('setup.keysMissing')} />
        <CheckRow label={t('setup.db')} ok={db.status === 'ok'} detail={dbDetail} />
      </ul>
    </section>
  )
}
