import { useEffect, useState } from 'react'
import { config, isSupabaseConfigured } from '../../lib/env'
import { fetchMaterials } from '../../lib/catalog'

type DbState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string }

interface CheckRowProps {
  label: string
  ok: boolean
  detail: string
}

function CheckRow({ label, ok, detail }: CheckRowProps) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-paper ${
          ok ? 'bg-forest' : 'bg-alert'
        }`}
      >
        {ok ? '✓' : '!'}
      </span>
      <div>
        <p className="text-sm font-semibold">
          {label} <span className="sr-only">{ok ? 'ready' : 'not ready'}</span>
        </p>
        <p className="text-xs text-ink-soft">{detail}</p>
      </div>
    </li>
  )
}

/** Setup checklist: shows whether env vars are set and the database seed is reachable.
 *  The AI model needs no setup; it downloads from the Hugging Face Hub on the first scan. */
export function SetupStatus() {
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
      ? `${db.count} materials loaded from the seed.`
      : db.status === 'error'
        ? `Could not read materials: ${db.message}`
        : db.status === 'checking'
          ? 'Checking…'
          : 'Waiting for Supabase keys.'

  return (
    <section aria-labelledby="setup-heading" className="rounded-2xl border border-dashed border-ink/20 bg-paper-deep/60 p-4">
      <h2 id="setup-heading" className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        Setup check
      </h2>
      <ul className="mt-2 divide-y divide-ink/10">
        <CheckRow
          label="Supabase keys"
          ok={supabaseReady}
          detail={supabaseReady ? 'URL and anon key found.' : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to web/.env.local.'}
        />
        <CheckRow label="Database seeded" ok={db.status === 'ok'} detail={dbDetail} />
      </ul>
    </section>
  )
}
