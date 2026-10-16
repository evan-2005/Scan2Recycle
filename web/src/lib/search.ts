import type { ItemType } from '../types'

/** Common Malay words → the English words used in item names, so "botol plastik" finds "Plastic Bottle". */
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

function queryWords(query: string): string[] {
  return words(query).map((w) => stem(MALAY_WORDS[w] ?? w))
}

/** Higher is better; 0 means no match. Every query word must match something. */
function score(item: ItemType, terms: readonly string[]): number {
  const nameWords = words(item.display_name).map(stem)
  const labelWords = words(item.label).map(stem)
  let total = 0
  for (const term of terms) {
    if (nameWords.includes(term)) total += 3
    else if (nameWords.some((w) => w.startsWith(term))) total += 2
    else if (labelWords.some((w) => w.startsWith(term))) total += 1
    else return 0
  }
  return total
}

/** Finds items for the "Can I recycle…?" box, best match first. */
export function searchItems(query: string, items: readonly ItemType[]): ItemType[] {
  if (query.trim().length < MIN_QUERY_LENGTH) return []
  const terms = queryWords(query)
  if (terms.length === 0) return []
  return items
    .map((item) => ({ item, score: score(item, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.display_name.localeCompare(b.item.display_name))
    .slice(0, MAX_RESULTS)
    .map((r) => r.item)
}
