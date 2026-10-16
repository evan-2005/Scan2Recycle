import type { LatLng, PointMaterial } from './types'

export interface SuggestionInput {
  name: string
  location: LatLng | null
  materials: readonly PointMaterial[]
  openingHours: string
  notes: string
}

export interface CleanSuggestion {
  name: string
  lat: number
  lng: number
  materials: PointMaterial[]
  openingHours: string | null
  notes: string | null
}

export type SuggestionResult = { ok: true; value: CleanSuggestion } | { ok: false; errors: Partial<Record<keyof SuggestionInput, string>> }

const optional = (text: string) => {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/** Mirrors the CHECK constraints on recycling_points so users get a clear message before saving. */
export function validateSuggestion(input: SuggestionInput): SuggestionResult {
  const errors: Partial<Record<keyof SuggestionInput, string>> = {}
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 120) errors.name = 'Give the place a name (2–120 characters).'
  if (!input.location) errors.location = 'Tap the map to place the pin, or use your location.'
  if (input.materials.length === 0) errors.materials = 'Pick at least one thing it accepts.'
  if (input.openingHours.trim().length > 120) errors.openingHours = 'Keep opening hours under 120 characters.'
  if (input.notes.trim().length > 300) errors.notes = 'Keep notes under 300 characters.'
  if (Object.keys(errors).length > 0 || !input.location) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      lat: input.location.lat,
      lng: input.location.lng,
      materials: [...new Set(input.materials)],
      openingHours: optional(input.openingHours),
      notes: optional(input.notes),
    },
  }
}
