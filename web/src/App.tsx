import type { ComponentType } from 'react'
import { BottomNav } from './components/BottomNav'
import { HistoryPage } from './features/history/HistoryPage'
import { ScanPage } from './features/scan/ScanPage'
import { MyRecyclingPage } from './features/stats/MyRecyclingPage'
import { useHashRoute } from './hooks/useHashRoute'
import type { Route } from './lib/routes'

const PAGES: Record<Route, ComponentType> = {
  scan: ScanPage,
  stats: MyRecyclingPage,
  history: HistoryPage,
}

export default function App() {
  const route = useHashRoute()
  const Page = PAGES[route]

  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-28">
        <Page />
      </main>
      <BottomNav current={route} />
    </>
  )
}
