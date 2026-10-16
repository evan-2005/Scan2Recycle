import type { Decision, ScoredItem } from '../../lib/classifier/decide'
import type { Message } from '../../i18n/translate'
import type { ItemType, Material, MaterialId } from '../../types'

export interface Answer {
  item: ItemType | null
  material: Material
  /** Model confidence for an AI answer; null when the user picked or searched for it. */
  score: number | null
  /** How the answer was reached: the AI, the user correcting the AI, or a text search. */
  method: 'ai' | 'picked' | 'search'
}

/** photoUrl is null when the answer came from "Can I recycle…?" search instead of a photo. */
export type ScanState =
  | { step: 'idle' }
  | { step: 'loading-model'; photoUrl: string; percent: number }
  | { step: 'analysing'; photoUrl: string }
  | { step: 'answer'; photoUrl: string | null; answer: Answer; options: ScoredItem[] }
  | { step: 'choose'; photoUrl: string; options: ScoredItem[] }
  | { step: 'pick-material'; photoUrl: string | null; options: ScoredItem[] }
  | { step: 'error'; message: Message }

export type ScanEvent =
  | { type: 'loading-model'; photoUrl: string; percent: number }
  | { type: 'analysing'; photoUrl: string }
  | { type: 'decided'; decision: Decision; materials: ReadonlyMap<MaterialId, Material> }
  | { type: 'searched'; item: ItemType; material: Material }
  | { type: 'item-picked'; item: ItemType; material: Material }
  | { type: 'change' }
  | { type: 'none-of-these' }
  | { type: 'material-picked'; material: Material }
  | { type: 'failed'; message: Message }
  | { type: 'reset' }

export const INITIAL_STATE: ScanState = { step: 'idle' }

function fromDecision(photoUrl: string, decision: Decision, materials: ReadonlyMap<MaterialId, Material>): ScanState {
  if (decision.kind === 'confident') {
    const material = materials.get(decision.match.item.material_id)
    if (material) {
      const answer: Answer = { item: decision.match.item, material, score: decision.match.score, method: 'ai' }
      return { step: 'answer', photoUrl, answer, options: decision.options }
    }
  }
  if (decision.kind === 'unknown') return { step: 'pick-material', photoUrl, options: decision.options }
  return { step: 'choose', photoUrl, options: decision.options }
}

/** Pure state machine for the scan screen; side effects live in useScanFlow. Events that don't fit the current step are ignored. */
export function scanReducer(state: ScanState, event: ScanEvent): ScanState {
  switch (event.type) {
    case 'loading-model':
      return { step: 'loading-model', photoUrl: event.photoUrl, percent: event.percent }
    case 'analysing':
      return { step: 'analysing', photoUrl: event.photoUrl }
    case 'decided':
      return state.step === 'analysing' ? fromDecision(state.photoUrl, event.decision, event.materials) : state
    case 'searched':
      return {
        step: 'answer',
        photoUrl: null,
        answer: { item: event.item, material: event.material, score: null, method: 'search' },
        options: [],
      }
    case 'item-picked':
      return state.step === 'choose'
        ? {
            step: 'answer',
            photoUrl: state.photoUrl,
            answer: { item: event.item, material: event.material, score: null, method: 'picked' },
            options: state.options,
          }
        : state
    case 'change':
      if (state.step !== 'answer') return state
      return state.options.length > 0 && state.photoUrl !== null
        ? { step: 'choose', photoUrl: state.photoUrl, options: state.options }
        : { step: 'pick-material', photoUrl: state.photoUrl, options: state.options }
    case 'none-of-these':
      return state.step === 'choose' ? { step: 'pick-material', photoUrl: state.photoUrl, options: state.options } : state
    case 'material-picked':
      return state.step === 'pick-material'
        ? {
            step: 'answer',
            photoUrl: state.photoUrl,
            answer: { item: null, material: event.material, score: null, method: state.photoUrl ? 'picked' : 'search' },
            options: state.options,
          }
        : state
    case 'failed':
      return { step: 'error', message: event.message }
    case 'reset':
      return INITIAL_STATE
  }
}
