/** Matches the CHECK constraint on recycling_logs.weight_g. */
export const MAX_WEIGHT_G = 50_000

export type WeightResult = { ok: true; grams: number | null } | { ok: false; error: string }

/** Parses the optional weight box. Empty means "no weight", which is allowed. */
export function parseWeight(input: string): WeightResult {
  const text = input.trim().replace(',', '.')
  if (text === '') return { ok: true, grams: null }
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, error: 'Enter the weight as a number of grams, e.g. 32.' }
  const grams = Math.round(Number(text) * 10) / 10 // 0.1 g precision
  if (grams <= 0) return { ok: false, error: 'Weight must be at least 0.1 g.' }
  if (grams >= MAX_WEIGHT_G) return { ok: false, error: 'That is over 50 kg. Check the number (it should be in grams).' }
  return { ok: true, grams }
}
