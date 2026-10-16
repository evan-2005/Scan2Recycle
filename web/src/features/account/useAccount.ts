import { useCallback, useEffect, useState } from 'react'
import { accountFromUser, refreshAccount, type Account } from '../../lib/account'
import { supabase } from '../../lib/supabase'

/** The current account, kept in sync with Supabase sign-in / sign-out events. null while loading. */
export function useAccount(): { account: Account | null; refresh: () => Promise<Account> } {
  const [account, setAccount] = useState<Account | null>(supabase ? null : { kind: 'none' })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setAccount(accountFromUser(data.session?.user ?? null)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAccount(accountFromUser(session?.user ?? null)))
    return () => data.subscription.unsubscribe()
  }, [])

  /** Re-reads the user from Supabase (e.g. after confirming the email on another tab or device). */
  const refresh = useCallback(async () => {
    const next = await refreshAccount()
    setAccount(next)
    return next
  }, [])

  return { account, refresh }
}
