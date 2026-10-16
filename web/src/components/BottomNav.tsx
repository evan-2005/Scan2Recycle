import { routeHref, type Route } from '../lib/routes'

interface NavItem {
  route: Route
  label: string
  icon: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { route: 'scan', label: 'Scan', icon: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0' },
  { route: 'stats', label: 'My Recycling', icon: 'M5 20V11M12 20V4M19 20v-6' },
  { route: 'history', label: 'History', icon: 'M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9' },
]

interface BottomNavProps {
  current: Route
}

export function BottomNav({ current }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map((item) => {
          const isActive = item.route === current
          return (
            <li key={item.route} className="flex-1">
              <a
                href={routeHref(item.route)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-forest' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={`size-6 transition-transform ${isActive ? 'scale-110' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isActive ? 2.25 : 1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
