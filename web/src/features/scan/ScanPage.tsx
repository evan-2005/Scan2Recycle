import { PageHeader } from '../../components/PageHeader'
import { useI18n } from '../../i18n/context'
import { SetupStatus } from '../setup/SetupStatus'
import { ChoicePicker } from './ChoicePicker'
import { MaterialPicker } from './MaterialPicker'
import { ResultCard } from './ResultCard'
import { ScanStart } from './ScanStart'
import { ScanWorking } from './ScanWorking'
import { SearchBox } from './SearchBox'
import { useCatalog } from './useCatalog'
import { useScanFlow } from './useScanFlow'

export function ScanPage() {
  const { t, m } = useI18n()
  const catalog = useCatalog()
  const ready = catalog.status === 'ready' ? catalog.catalog : null
  const flow = useScanFlow(ready)
  const { state } = flow

  switch (state.step) {
    case 'loading-model':
      return <ScanWorking photoUrl={state.photoUrl} percent={state.percent} />
    case 'analysing':
      return <ScanWorking photoUrl={state.photoUrl} percent={null} />
    case 'answer':
      return (
        <ResultCard
          photoUrl={state.photoUrl}
          answer={state.answer}
          aiGuess={state.options[0] ?? null}
          materials={ready?.materials ?? []}
          onChange={flow.change}
          onDone={flow.reset}
        />
      )
    case 'choose':
      return (
        <ChoicePicker
          photoUrl={state.photoUrl}
          options={state.options}
          materials={ready?.materialsById ?? new Map()}
          onPick={flow.pickItem}
          onNone={flow.noneOfThese}
        />
      )
    case 'pick-material':
      return <MaterialPicker photoUrl={state.photoUrl} materials={ready?.materials ?? []} onPick={flow.pickMaterial} />
    case 'error':
      return (
        <div role="alert">
          <PageHeader eyebrow={t('scan.eyebrow')} title={t('scan.errorTitle')} />
          <p className="text-ink-soft">{m(state.message)}</p>
          <button type="button" onClick={flow.reset} className="mt-8 min-h-12 w-full rounded-full bg-forest px-6 font-semibold text-paper">
            {t('common.tryAgain')}
          </button>
        </div>
      )
    case 'idle':
      return (
        <>
          <PageHeader
            eyebrow={t('scan.eyebrow')}
            title={
              <>
                {t('scan.titleLine1')}
                <br />
                {t('scan.titleLine2')}
              </>
            }
          />
          <ScanStart catalog={catalog} onPhoto={flow.start} />
          {ready && <SearchBox items={ready.itemTypes} materials={ready.materials} materialsById={ready.materialsById} onPick={flow.showItem} />}
          {/* The setup checklist only matters while something is misconfigured. */}
          {catalog.status === 'error' && (
            <div className="mt-10">
              <SetupStatus />
            </div>
          )}
        </>
      )
  }
}
