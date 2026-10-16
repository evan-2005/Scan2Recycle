import type { ItemType } from '../types'

/** Common Malay words → English, so Malay queries also find items that have no Malay name yet. */
const MALAY_WORDS: Readonly<Record<string, string>> = {
  botol: 'bottle',
  tin: 'can',
  kertas: 'paper',
  kotak: 'box',
  plastik: 'plastic',
  kaca: 'glass',
  bateri: 'battery',
  beg: 'bag',
  cawan: 'cup',
  akhbar: 'newspaper',
  surat: 'newspaper',
  mainan: 'toy',
  baju: 'clothes',
  pakaian: 'clothes',
  berus: 'toothbrush',
  gigi: 'toothbrush',
  telefon: 'phone',
  kabel: 'cable',
  mentol: 'bulb',
  sampul: 'envelope',
  makanan: 'food',
  kulit: 'peel',
  pisang: 'banana',
  tisu: 'tissue',
  topeng: 'mask',
  pen: 'pen',
  aluminium: 'aluminium',
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'or', 'and', 'old', 'used', 'empty', 'my'])
export const MAX_RESULTS = 6
const MIN_QUERY_LENGTH = 2

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
}

/** Very small stemmer: "bottles" → "bottle", "boxes" → "box", "batteries" → "battery". */
function stem(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`
  if (word.endsWith('xes') || word.endsWith('ches') || word.endsWith('shes')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1)
  return word
}

/** Each query word as typed (to match Malay names) and translated to English (to match English names). */
interface Term {
  raw: string
  english: string
}

function queryTerms(query: string): Term[] {
  return words(query).map((w) => ({ raw: stem(w), english: stem(MALAY_WORDS[w] ?? w) }))
}

function termScore(term: Term, nameWords: readonly string[], labelWords: readonly string[]): number {
  const forms = term.raw === term.english ? [term.raw] : [term.raw, term.english]
  if (forms.some((f) => nameWords.includes(f))) return 3
  if (forms.some((f) => nameWords.some((w) => w.startsWith(f)))) return 2
  if (forms.some((f) => labelWords.some((w) => w.startsWith(f)))) return 1
  return 0
}

/** Higher is better; 0 means no match. Every query word must match the English or Malay name (or the label). */
function score(item: ItemType, terms: readonly Term[]): number {
  const nameWords = [...words(item.display_name), ...words(item.display_name_ms ?? '')].map(stem)
  const labelWords = words(item.label).map(stem)
  let total = 0
  for (const term of terms) {
    const points = termScore(term, nameWords, labelWords)
    if (points === 0) return 0
    total += points
  }
  return total
}

/** Finds items for the "Can I recycle…?" box, best match first. */
export function searchItems(query: string, items: readonly ItemType[]): ItemType[] {
  if (query.trim().length < MIN_QUERY_LENGTH) return []
  const terms = queryTerms(query)
  if (terms.length === 0) return []
  return items
    .map((item) => ({ item, score: score(item, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.display_name.localeCompare(b.item.display_name))
    .slice(0, MAX_RESULTS)
    .map((r) => r.item)
}
