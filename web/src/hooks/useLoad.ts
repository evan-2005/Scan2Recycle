import { useCallback, useEffect, useState } from 'react'
import { msg, type Message } from '../i18n/translate'

type Result<T> = { ok: true; value: T } | { ok: false; error: Message }

export type LoadState<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: Message }

/** Runs an async loader on mount (and on reload()), ignoring results that arrive after unmount. */
export function useLoad<T>(loader: () => Promise<Result<T>>): { state: LoadState<T>; reload: () => void; set: (value: T) => void } {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loader().then(
      (result) => {
        if (!cancelled) setState(result.ok ? { status: 'ready', value: result.value } : { status: 'error', error: result.error })
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', error: msg('error.generic', { detail: error instanceof Error ? error.message : String(error) }) })
      },
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader is a stable module function
  }, [attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])
  const set = useCallback((value: T) => setState({ status: 'ready', value }), [])

  return { state, reload, set }
}
