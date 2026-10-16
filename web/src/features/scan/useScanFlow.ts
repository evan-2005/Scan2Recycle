import { useCallback, useEffect, useReducer, useRef } from 'react'
import { msg, type Message } from '../../i18n/translate'
import { classifyImage, prepareClassifier } from '../../lib/classifier/client'
import { decide } from '../../lib/classifier/decide'
import { prepareImage, validateImageFile } from '../../lib/image'
import type { ItemType, Material } from '../../types'
import { INITIAL_STATE, scanReducer, type ScanState } from './scanState'
import type { ReadyCatalog } from './useCatalog'

export interface ScanFlow {
  state: ScanState
  start: (file: File) => void
  /** Shows the answer for an item found with "Can I recycle…?" search. */
  showItem: (item: ItemType) => void
  pickItem: (item: ItemType) => void
  pickMaterial: (material: Material) => void
  change: () => void
  noneOfThese: () => void
  reset: () => void
}

function friendlyError(error: unknown): Message {
  const message = error instanceof Error ? error.message : String(error)
  if (/fetch|network|load the AI model/i.test(message)) return msg('error.modelDownload')
  return msg('error.photo', { detail: message })
}

/** Runs one scan: shrink photo → load model (first time) → classify → decide. */
export function useScanFlow(catalog: ReadyCatalog | null): ScanFlow {
  const [state, dispatch] = useReducer(scanReducer, INITIAL_STATE)
  const runId = useRef(0)
  const photoUrl = useRef<string | null>(null)

  const releasePhoto = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current)
    photoUrl.current = null
  }, [])

  useEffect(() => releasePhoto, [releasePhoto])

  const start = useCallback(
    async (file: File) => {
      if (!catalog) return
      const problem = validateImageFile(file)
      if (problem) {
        dispatch({ type: 'failed', message: problem })
        return
      }
      const run = ++runId.current
      const isCurrent = () => run === runId.current
      releasePhoto()
      try {
        const image = await prepareImage(file)
        if (!isCurrent()) return
        const url = URL.createObjectURL(image)
        photoUrl.current = url
        dispatch({ type: 'loading-model', photoUrl: url, percent: 0 })
        await prepareClassifier(catalog.labels, (percent) => {
          if (isCurrent()) dispatch({ type: 'loading-model', photoUrl: url, percent })
        })
        if (!isCurrent()) return
        dispatch({ type: 'analysing', photoUrl: url })
        const scores = await classifyImage(image)
        if (!isCurrent()) return
        dispatch({ type: 'decided', decision: decide(scores, catalog.itemsByLabel), materials: catalog.materialsById })
      } catch (error) {
        if (isCurrent()) dispatch({ type: 'failed', message: friendlyError(error) })
      }
    },
    [catalog, releasePhoto],
  )

  const pickItem = useCallback(
    (item: ItemType) => {
      const material = catalog?.materialsById.get(item.material_id)
      if (material) dispatch({ type: 'item-picked', item, material })
    },
    [catalog],
  )

  const showItem = useCallback(
    (item: ItemType) => {
      const material = catalog?.materialsById.get(item.material_id)
      if (!material) return
      runId.current++ // cancel any scan still in flight
      releasePhoto()
      dispatch({ type: 'searched', item, material })
    },
    [catalog, releasePhoto],
  )

  const reset = useCallback(() => {
    runId.current++
    releasePhoto()
    dispatch({ type: 'reset' })
  }, [releasePhoto])

  return {
    state,
    start: (file) => void start(file),
    showItem,
    pickItem,
    pickMaterial: (material) => dispatch({ type: 'material-picked', material }),
    change: () => dispatch({ type: 'change' }),
    noneOfThese: () => dispatch({ type: 'none-of-these' }),
    reset,
  }
}
