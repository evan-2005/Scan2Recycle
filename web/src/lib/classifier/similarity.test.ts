import { describe, expect, it } from 'vitest'
import { averageEmbeddings, normalize, rankLabels, softmax, splitRows } from './similarity'

function expectClose(actual: ArrayLike<number>, expected: number[]) {
  expect(actual.length).toBe(expected.length)
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value))
}

describe('normalize', () => {
  it('scales a vector to unit length', () => {
    expectClose(normalize([3, 4]), [0.6, 0.8])
  })

  it('leaves a zero vector as zeros instead of dividing by zero', () => {
    expect(Array.from(normalize([0, 0]))).toEqual([0, 0])
  })
})

describe('softmax', () => {
  it('returns probabilities that sum to 1', () => {
    const result = softmax([1, 2, 3])
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(result[2]).toBeGreaterThan(result[1])
  })

  it('stays finite for large logits', () => {
    const result = softmax([1000, 999])
    expect(result.every(Number.isFinite)).toBe(true)
  })
})

describe('splitRows', () => {
  it('splits a flat buffer into normalised rows', () => {
    const rows = splitRows(new Float32Array([3, 4, 0, 2]), 2, 2)
    expect(rows).toHaveLength(2)
    expectClose(rows[0], [0.6, 0.8])
    expectClose(rows[1], [0, 1])
  })
})

describe('averageEmbeddings', () => {
  it('averages each label across templates and re-normalises', () => {
    const templateA = [normalize([1, 0]), normalize([0, 1])]
    const templateB = [normalize([0, 1]), normalize([0, 1])]

    const result = averageEmbeddings([templateA, templateB])

    expectClose(result[0], [Math.SQRT1_2, Math.SQRT1_2])
    expectClose(result[1], [0, 1])
  })

  it('returns an empty list when there are no templates', () => {
    expect(averageEmbeddings([])).toEqual([])
  })
})

describe('rankLabels', () => {
  const labels = ['a can', 'a bottle', 'a box']
  const labelEmbeds = [normalize([1, 0, 0]), normalize([0, 1, 0]), normalize([0, 0, 1])]

  it('ranks the label closest to the image first', () => {
    const ranked = rankLabels([0.1, 0.9, 0.2], labelEmbeds, labels)

    expect(ranked[0].label).toBe('a bottle')
    expect(ranked.map((r) => r.score)).toEqual([...ranked.map((r) => r.score)].sort((a, b) => b - a))
    expect(ranked.reduce((sum, r) => sum + r.score, 0)).toBeCloseTo(1)
  })

  it('does not depend on the image vector length', () => {
    const small = rankLabels([0.1, 0.9, 0.2], labelEmbeds, labels)
    const large = rankLabels([1, 9, 2], labelEmbeds, labels)
    expect(large[0].score).toBeCloseTo(small[0].score)
  })

  it('throws when labels and embeddings do not line up', () => {
    expect(() => rankLabels([1, 0, 0], labelEmbeds, ['only one'])).toThrow(/3 label embeddings for 1 labels/)
  })
})
