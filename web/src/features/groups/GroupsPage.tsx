import { PageHeader } from '../../components/PageHeader'
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
      <PageHeader eyebrow="Groups" title="Recycle together" />
      <p className="-mt-2 text-sm text-ink-soft">Team up with your class, CCA or neighbours and see how much you recycle together.</p>

      {state.status === 'loading' && <p className="mt-6 text-ink-soft">Loading your groups…</p>}
      {state.status === 'error' && (
        <p role="alert" className="mt-6 text-sm text-alert">
          {state.error}
        </p>
      )}
      {memberships.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3" aria-label="Your groups">
          {memberships.map(({ group, displayName }) => (
            <li key={group.id}>
              <a href={routeHref('groups', { id: group.id })} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-forest transition hover:ring-2">
                <span className="min-w-0">
                  <span className="block truncate font-display text-xl font-extrabold">{group.name}</span>
                  <span className="block text-xs text-ink-soft">
                    You're “{displayName}” · code <span className="font-mono tracking-wider">{group.join_code}</span>
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
