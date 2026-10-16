import { describe, expect, it } from 'vitest'
import type { ScoredItem } from '../../lib/classifier/decide'
import type { ItemType, Material, MaterialId } from '../../types'
import { INITIAL_STATE, scanReducer, type ScanState } from './scanState'

const metal: Material = {
  id: 'metal',
  display_name: 'Metal',
  bin_name: 'Metal Recycling Bin',
  bin_colour: '#e6b800',
  is_recyclable: true,
  sort_order: 3,
}
const materials = new Map<MaterialId, Material>([['metal', metal]])
const can: ItemType = {
  id: 1,
  label: 'an aluminium drink can',
  display_name: 'Aluminium Can',
  material_id: 'metal',
  recyclable: true,
  typical_weight_g: null,
  tip: null,
}
const tin: ItemType = { ...can, id: 2, label: 'a tin food can', display_name: 'Tin Can' }
const options: ScoredItem[] = [
  { item: can, score: 0.7 },
  { item: tin, score: 0.2 },
]
const analysing: ScanState = { step: 'analysing', photoUrl: 'blob:photo' }

describe('scanReducer', () => {
  it('shows a confident answer and keeps alternatives for "Change"', () => {
    const state = scanReducer(analysing, { type: 'decided', decision: { kind: 'confident', match: options[0], options }, materials })

    expect(state).toEqual({
      step: 'answer',
      photoUrl: 'blob:photo',
      answer: { item: can, material: metal, score: 0.7 },
      options,
    })
    expect(scanReducer(state, { type: 'change' })).toEqual({ step: 'choose', photoUrl: 'blob:photo', options })
  })

  it('asks the user to choose when the model is unsure', () => {
    const state = scanReducer(analysing, { type: 'decided', decision: { kind: 'choose', options }, materials })
    expect(state).toEqual({ step: 'choose', photoUrl: 'blob:photo', options })
  })

  it('asks for the material when the model has no idea', () => {
    const state = scanReducer(analysing, { type: 'decided', decision: { kind: 'unknown', options: [] }, materials })
    expect(state).toEqual({ step: 'pick-material', photoUrl: 'blob:photo' })
  })

  it('falls back to choosing if a confident item has an unknown material', () => {
    const state = scanReducer(analysing, {
      type: 'decided',
      decision: { kind: 'confident', match: options[0], options },
      materials: new Map(),
    })
    expect(state.step).toBe('choose')
  })

  it('records a user-picked item with no AI score', () => {
    const choosing: ScanState = { step: 'choose', photoUrl: 'blob:photo', options }
    const state = scanReducer(choosing, { type: 'item-picked', item: tin, material: metal })
    expect(state).toMatchObject({ step: 'answer', answer: { item: tin, score: null } })
  })

  it('goes from "None of these" to the material picker and then to a material-only answer', () => {
    const choosing: ScanState = { step: 'choose', photoUrl: 'blob:photo', options }
    const picking = scanReducer(choosing, { type: 'none-of-these' })
    const answered = scanReducer(picking, { type: 'material-picked', material: metal })

    expect(picking).toEqual({ step: 'pick-material', photoUrl: 'blob:photo' })
    expect(answered).toMatchObject({ step: 'answer', answer: { item: null, material: metal, score: null } })
    expect(scanReducer(answered, { type: 'change' })).toEqual({ step: 'pick-material', photoUrl: 'blob:photo' })
  })

  it('ignores answers that arrive after a reset', () => {
    const state = scanReducer(INITIAL_STATE, { type: 'decided', decision: { kind: 'choose', options }, materials })
    expect(state).toBe(INITIAL_STATE)
  })

  it('shows errors and resets', () => {
    const failed = scanReducer(analysing, { type: 'failed', message: 'offline' })
    expect(failed).toEqual({ step: 'error', message: 'offline' })
    expect(scanReducer(failed, { type: 'reset' })).toBe(INITIAL_STATE)
  })
})
