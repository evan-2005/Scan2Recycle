import { describe, expect, it } from 'vitest'
import type { ScoredItem } from '../../lib/classifier/decide'
import type { ItemType, Material, MaterialId } from '../../types'
import { INITIAL_STATE, scanReducer, type ScanState } from './scanState'

const metal: Material = {
  id: 'metal',
  display_name: 'Metal',
  bin_name: 'Orange recycling bin (plastic & metal)',
  bin_colour: '#f28c28',
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
const choosing: ScanState = { step: 'choose', photoUrl: 'blob:photo', options }

describe('scanReducer', () => {
  it('shows a confident answer and keeps alternatives for "Change"', () => {
    const state = scanReducer(analysing, { type: 'decided', decision: { kind: 'confident', match: options[0], options }, materials })

    expect(state).toEqual({
      step: 'answer',
      photoUrl: 'blob:photo',
      answer: { item: can, material: metal, score: 0.7, method: 'ai' },
      options,
    })
    expect(scanReducer(state, { type: 'change' })).toEqual(choosing)
  })

  it('asks the user to choose when the model is unsure', () => {
    expect(scanReducer(analysing, { type: 'decided', decision: { kind: 'choose', options }, materials })).toEqual(choosing)
  })

  it('asks for the material when the model has no idea', () => {
    const state = scanReducer(analysing, { type: 'decided', decision: { kind: 'unknown', options: [] }, materials })
    expect(state).toEqual({ step: 'pick-material', photoUrl: 'blob:photo', options: [] })
  })

  it('falls back to choosing if a confident item has an unknown material', () => {
    const state = scanReducer(analysing, {
      type: 'decided',
      decision: { kind: 'confident', match: options[0], options },
      materials: new Map(),
    })
    expect(state.step).toBe('choose')
  })

  it('records a user-picked item as a correction with no AI score', () => {
    const state = scanReducer(choosing, { type: 'item-picked', item: tin, material: metal })
    expect(state).toMatchObject({ step: 'answer', answer: { item: tin, score: null, method: 'picked' }, options })
  })

  it('goes from "None of these" to the material picker and then to a material-only answer', () => {
    const picking = scanReducer(choosing, { type: 'none-of-these' })
    const answered = scanReducer(picking, { type: 'material-picked', material: metal })

    expect(picking).toEqual({ step: 'pick-material', photoUrl: 'blob:photo', options })
    expect(answered).toMatchObject({ step: 'answer', answer: { item: null, material: metal, method: 'picked' } })
    expect(scanReducer(answered, { type: 'change' })).toEqual(choosing)
  })

  it('shows a search result without a photo, and "Change" goes to the material picker', () => {
    const state = scanReducer(INITIAL_STATE, { type: 'searched', item: tin, material: metal })

    expect(state).toEqual({ step: 'answer', photoUrl: null, answer: { item: tin, material: metal, score: null, method: 'search' }, options: [] })
    const picking = scanReducer(state, { type: 'change' })
    expect(picking).toEqual({ step: 'pick-material', photoUrl: null, options: [] })
    expect(scanReducer(picking, { type: 'material-picked', material: metal })).toMatchObject({ answer: { method: 'search' } })
  })

  it('ignores events that do not fit the current step', () => {
    expect(scanReducer(INITIAL_STATE, { type: 'decided', decision: { kind: 'choose', options }, materials })).toBe(INITIAL_STATE)
    expect(scanReducer(INITIAL_STATE, { type: 'item-picked', item: tin, material: metal })).toBe(INITIAL_STATE)
    expect(scanReducer(analysing, { type: 'none-of-these' })).toBe(analysing)
    expect(scanReducer(analysing, { type: 'material-picked', material: metal })).toBe(analysing)
  })

  it('shows errors and resets', () => {
    const failed = scanReducer(analysing, { type: 'failed', message: { key: 'error.modelDownload' } })
    expect(failed).toEqual({ step: 'error', message: { key: 'error.modelDownload' } })
    expect(scanReducer(failed, { type: 'reset' })).toBe(INITIAL_STATE)
  })
})
