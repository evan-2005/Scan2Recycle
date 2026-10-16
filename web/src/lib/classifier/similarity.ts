export interface LabelScore {
  label: string
  score: number
}

/** Default temperature applied to cosine similarities before softmax (CLIP's learned value is ≈ 100). */
export const DEFAULT_LOGIT_SCALE = 100

export function normalize(vector: ArrayLike<number>): Float32Array {
  let sumSquares = 0
  for (let i = 0; i < vector.length; i++) sumSquares += vector[i] * vector[i]
  const norm = Math.sqrt(sumSquares) || 1
  return Float32Array.from({ length: vector.length }, (_, i) => vector[i] / norm)
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

export function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits)
  const exps = logits.map((x) => Math.exp(x - max))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map((x) => x / total)
}

/** Splits a flat [rows × size] embedding buffer into normalised rows. */
export function splitRows(data: ArrayLike<number>, rows: number, size: number): Float32Array[] {
  return Array.from({ length: rows }, (_, r) => normalize(Array.prototype.slice.call(data, r * size, (r + 1) * size)))
}

/**
 * Prompt ensembling: average each label's embedding across several phrasings, then re-normalise.
 * `perTemplate[t][i]` is label i embedded with template t.
 */
export function averageEmbeddings(perTemplate: readonly (readonly Float32Array[])[]): Float32Array[] {
  if (perTemplate.length === 0) return []
  return perTemplate[0].map((first, i) => {
    const sum = new Float32Array(first.length)
    for (const rows of perTemplate) {
      const row = rows[i]
      for (let k = 0; k < sum.length; k++) sum[k] += row[k]
    }
    return normalize(sum)
  })
}

/** Turns a precomputed-embeddings file into normalised vectors, or an empty map if it is for another model. */
export function parseEmbeddings(
  file: { model?: unknown; embeddings?: unknown },
  expectedModel: string,
): Map<string, Float32Array> {
  if (file.model !== expectedModel || typeof file.embeddings !== 'object' || file.embeddings === null) return new Map()
  const entries = Object.entries(file.embeddings as Record<string, unknown>).filter(
    (entry): entry is [string, number[]] => Array.isArray(entry[1]) && entry[1].every((x) => typeof x === 'number'),
  )
  return new Map(entries.map(([label, vector]) => [label, normalize(vector)]))
}

/**
 * Same maths as CLIP zero-shot classification: cosine similarity between the image and each
 * label embedding, scaled, then softmax. `labelEmbeds` must already be normalised.
 */
export function rankLabels(
  imageEmbed: ArrayLike<number>,
  labelEmbeds: readonly Float32Array[],
  labels: readonly string[],
  logitScale: number = DEFAULT_LOGIT_SCALE,
): LabelScore[] {
  if (labelEmbeds.length !== labels.length) {
    throw new Error(`Got ${labelEmbeds.length} label embeddings for ${labels.length} labels.`)
  }
  const image = normalize(imageEmbed)
  const probabilities = softmax(labelEmbeds.map((text) => logitScale * dot(image, text)))
  return labels
    .map((label, i) => ({ label, score: probabilities[i] }))
    .sort((a, b) => b.score - a.score)
}
