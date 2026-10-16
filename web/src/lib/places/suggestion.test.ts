import { describe, expect, it } from 'vitest'
import { validateSuggestion, type SuggestionInput } from './suggestion'

const valid: SuggestionInput = {
  name: '  Sekolah   Kebangsaan drop-off ',
  location: { lat: 3.1, lng: 101.6 },
  materials: ['paper', 'paper', 'plastic'],
  openingHours: ' ',
  notes: 'Behind the canteen',
}

describe('validateSuggestion', () => {
  it('cleans up a valid suggestion', () => {
    expect(validateSuggestion(valid)).toEqual({
      ok: true,
      value: {
        name: 'Sekolah Kebangsaan drop-off',
        lat: 3.1,
        lng: 101.6,
        materials: ['paper', 'plastic'],
        openingHours: null,
        notes: 'Behind the canteen',
      },
    })
  })

  it('reports every problem at once', () => {
    const result = validateSuggestion({ name: 'x', location: null, materials: [], openingHours: 'h'.repeat(121), notes: 'n'.repeat(301) })
    expect(result.ok).toBe(false)
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['location', 'materials', 'name', 'notes', 'openingHours'])
  })
})
