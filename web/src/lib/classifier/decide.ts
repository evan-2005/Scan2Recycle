import type { ItemType } from '../../types'
import type { LabelScore } from './similarity'

/**
 * Thresholds picked from a 145-photo TrashNet sample with SigLIP and 50 labels (PLAN.md §4.3);
 * re-check with your own phone photos. About half the photos scored at or above CONFIDENT_SCORE,
 * and the top guess put them in the right bin 87% of the time, so show it as the answer.
 */
export const CONFIDENT_SCORE = 0.6
/**
 * Between this and CONFIDENT_SCORE, ask the user to pick from the top guesses (the right bin was in
 * the top 3 for 94% of photos). Below it, skip straight to "pick the material".
 */
export const POSSIBLE_SCORE = 0.1
export const MAX_CHOICES = 3

export interface ScoredItem {
  item: ItemType
  score: number
}

export type Decision =
  | { kind: 'confident'; match: ScoredItem; options: ScoredItem[] }
  | { kind: 'choose'; options: ScoredItem[] }
  | { kind: 'unknown'; options: ScoredItem[] }

/** Turns ranked model scores into what the result screen should show. */
export function decide(scores: readonly LabelScore[], itemsByLabel: ReadonlyMap<string, ItemType>): Decision {
  const known = scores
    .flatMap(({ label, score }) => {
      const item = itemsByLabel.get(label)
      return item ? [{ item, score }] : []
    })
    .sort((a, b) => b.score - a.score)
  const top = known.slice(0, MAX_CHOICES)
  const best = top[0]

  if (best && best.score >= CONFIDENT_SCORE) return { kind: 'confident', match: best, options: top }
  if (best && best.score >= POSSIBLE_SCORE) return { kind: 'choose', options: top }
  return { kind: 'unknown', options: top }
}
