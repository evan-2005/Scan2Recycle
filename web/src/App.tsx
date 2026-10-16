import type { ComponentType } from 'react'
import { BottomNav } from './components/BottomNav'
import { LanguageSwitch } from './components/LanguageSwitch'
import { DropOffPage } from './features/dropoff/DropOffPage'
import { GroupsPage } from './features/groups/GroupsPage'
import { HistoryPage } from './features/history/HistoryPage'
import { ScanPage } from './features/scan/ScanPage'
import { MyRecyclingPage } from './features/stats/MyRecyclingPage'
import { useHashRoute } from './hooks/useHashRoute'
import type { Route } from './lib/routes'

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
