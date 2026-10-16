import { PageHeader } from '../../components/PageHeader'
import { useI18n } from '../../i18n/context'
import { useHashParam } from '../../hooks/useHashRoute'
import { useLoad } from '../../hooks/useLoad'
import { fetchMyGroups, type Group } from '../../lib/groups'
import { routeHref } from '../../lib/routes'
import { GroupDetail } from './GroupDetail'
import { GroupForms } from './GroupForms'

function openGroup(group: Group) {
  window.location.assign(routeHref('groups', { id: group.id }))
}

export function GroupsPage() {
  const { t, m } = useI18n()
  const selectedId = useHashParam('id')
  const { state, reload } = useLoad(fetchMyGroups)
  const memberships = state.status === 'ready' ? state.value : []
  const selected = memberships.find((m) => m.group.id === selectedId)

  if (selectedId && selected) {
    return (
      <GroupDetail
        key={selected.group.id}
        group={selected.group}
        onLeft={() => {
          window.location.assign(routeHref('groups'))
          reload()
        }}
      />
    )
  }

  return (
    <>
      <PageHeader eyebrow={t('groups.eyebrow')} title={t('groups.title')} />
      <p className="-mt-2 text-sm text-ink-soft">{t('groups.intro')}</p>

      {state.status === 'loading' && <p className="mt-6 text-ink-soft">{t('groups.loading')}</p>}
      {state.status === 'error' && (
        <p role="alert" className="mt-6 text-sm text-alert">
          {m(state.error)}
        </p>
      )}
      {memberships.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3" aria-label={t('groups.listLabel')}>
          {memberships.map(({ group, displayName }) => (
            <li key={group.id}>
              <a href={routeHref('groups', { id: group.id })} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-forest transition hover:ring-2">
                <span className="min-w-0">
                  <span className="block truncate font-display text-xl font-extrabold">{group.name}</span>
                  <span className="block text-xs text-ink-soft">
                    {t('groups.youAre', { name: displayName })} <span className="font-mono tracking-wider">{group.join_code}</span>
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl text-forest">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <GroupForms
        onDone={(group) => {
          reload()
          openGroup(group)
        }}
      />
    </>
  )
}
