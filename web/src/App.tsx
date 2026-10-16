import { useEffect, type ComponentType } from 'react'
import { BottomNav } from './components/BottomNav'
import { LanguageSwitch } from './components/LanguageSwitch'
import { DropOffPage } from './features/dropoff/DropOffPage'
import { GroupsPage } from './features/groups/GroupsPage'
import { HistoryPage } from './features/history/HistoryPage'
import { ScanPage } from './features/scan/ScanPage'
import { MyRecyclingPage } from './features/stats/MyRecyclingPage'
import { useHashRoute } from './hooks/useHashRoute'
import { peekAuthReturn } from './lib/authReturn'
import { routeHref, type Route } from './lib/routes'
import { supabase } from './lib/supabase'

const PAGES: Record<Route, ComponentType> = {
  scan: ScanPage,
  dropoff: DropOffPage,
  groups: GroupsPage,
  stats: MyRecyclingPage,
  history: HistoryPage,
}

export default function App() {
  const route = useHashRoute()
  const Page = PAGES[route]

  // Coming back from a confirm-email or reset-password link: show the account card on My Recycling.
  // Wait for supabase-js to read the sign-in tokens from the URL hash first, or the session would be lost.
  useEffect(() => {
    if (!peekAuthReturn() || route === 'stats') return
    let cancelled = false
    const ready = supabase ? supabase.auth.getSession() : Promise.resolve()
    ready.then(() => {
      if (!cancelled) window.location.replace(routeHref('stats'))
    })
    return () => {
      cancelled = true
    }
  }, [route])

  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-28">
        <div className="flex justify-end pt-[max(0.75rem,env(safe-area-inset-top))]">
          <LanguageSwitch />
        </div>
        <Page />
      </main>
      <BottomNav current={route} />
    </>
  )
}
