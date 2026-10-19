import type { MessageKey } from '../i18n/en'
import { useI18n } from '../i18n/context'
import { routeHref, type Route } from '../lib/routes'

interface NavItem {
  route: Route
  label: MessageKey
  icon: string
  /** Other routes that should highlight this tab (e.g. History lives under My Recycling). */
  also?: readonly Route[]
}

const NAV_ITEMS: readonly NavItem[] = [
  { route: 'home', label: 'nav.home', icon: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9' },
  { route: 'scan', label: 'nav.scan', icon: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0' },
  { route: 'dropoff', label: 'nav.dropoff', icon: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6' },
  { route: 'groups', label: 'nav.groups', icon: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8' },
  { route: 'stats', label: 'nav.stats', icon: 'M5 20V11M12 20V4M19 20v-6', also: ['history'] },
]

interface BottomNavProps {
  current: Route
}

export function BottomNav({ current }: BottomNavProps) {
  const { t } = useI18n()
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map((item) => {
          const isActive = item.route === current || (item.also?.includes(current) ?? false)
          return (
            <li key={item.route} className="flex-1">
              <a
                href={routeHref(item.route)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-start gap-1 px-0.5 pt-2.5 text-center text-[0.6875rem] leading-tight font-medium transition-colors ${
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
                {t(item.label)}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
