import type { Decision, ScoredItem } from '../../lib/classifier/decide'
import type { ItemType, Material, MaterialId } from '../../types'

export interface Answer {
  item: ItemType | null
  material: Material
  /** Model confidence for an AI answer; null when the user picked it. */
  score: number | null
}

export type ScanState =
  | { step: 'idle' }
  | { step: 'loading-model'; photoUrl: string; percent: number }
  | { step: 'analysing'; photoUrl: string }
  | { step: 'answer'; photoUrl: string; answer: Answer; options: ScoredItem[] }
  | { step: 'choose'; photoUrl: string; options: ScoredItem[] }
  | { step: 'pick-material'; photoUrl: string }
  | { step: 'error'; message: string }

export type ScanEvent =
  | { type: 'loading-model'; photoUrl: string; percent: number }
  | { type: 'analysing'; photoUrl: string }
  | { type: 'decided'; decision: Decision; materials: ReadonlyMap<MaterialId, Material> }
  | { type: 'item-picked'; item: ItemType; material: Material }
  | { type: 'change' }
  | { type: 'none-of-these' }
  | { type: 'material-picked'; material: Material }
  | { type: 'failed'; message: string }
  | { type: 'reset' }

export const INITIAL_STATE: ScanState = { step: 'idle' }

function photoOf(state: ScanState): string | null {
  return 'photoUrl' in state ? state.photoUrl : null
}

function optionsOf(state: ScanState): ScoredItem[] {
  return 'options' in state ? state.options : []
}

function fromDecision(photoUrl: string, decision: Decision, materials: ReadonlyMap<MaterialId, Material>): ScanState {
  if (decision.kind === 'confident') {
    const material = materials.get(decision.match.item.material_id)
    if (material) {
      const answer = { item: decision.match.item, material, score: decision.match.score }
      return { step: 'answer', photoUrl, answer, options: decision.options }
    }
  }
  if (decision.kind === 'unknown') return { step: 'pick-material', photoUrl }
  return { step: 'choose', photoUrl, options: decision.options }
}

/** Pure state machine for the scan screen; side effects live in useScanFlow. */
export function scanReducer(state: ScanState, event: ScanEvent): ScanState {
  const photoUrl = photoOf(state)
  switch (event.type) {
    case 'loading-model':
      return { step: 'loading-model', photoUrl: event.photoUrl, percent: event.percent }
    case 'analysing':
      return { step: 'analysing', photoUrl: event.photoUrl }
    case 'decided':
      return photoUrl ? fromDecision(photoUrl, event.decision, event.materials) : state
    case 'item-picked':
      return photoUrl
        ? { step: 'answer', photoUrl, answer: { item: event.item, material: event.material, score: null }, options: optionsOf(state) }
        : state
    case 'change':
      if (state.step !== 'answer') return state
      return state.options.length > 0
        ? { step: 'choose', photoUrl: state.photoUrl, options: state.options }
        : { step: 'pick-material', photoUrl: state.photoUrl }
    case 'none-of-these':
      return photoUrl ? { step: 'pick-material', photoUrl } : state
    case 'material-picked':
      return photoUrl
        ? { step: 'answer', photoUrl, answer: { item: null, material: event.material, score: null }, options: optionsOf(state) }
        : state
    case 'failed':
      return { step: 'error', message: event.message }
    case 'reset':
      return INITIAL_STATE
  }
}
