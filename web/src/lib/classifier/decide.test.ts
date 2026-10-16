import { describe, expect, it } from 'vitest'
import type { ItemType } from '../../types'
import { CONFIDENT_SCORE, decide, POSSIBLE_SCORE } from './decide'

function item(id: number, label: string): ItemType {
  return {
    id,
    label,
    display_name: label,
    material_id: 'metal',
    recyclable: true,
    typical_weight_g: null,
    tip: null,
  }
}

const catalog = new Map([
  ['a can', item(1, 'a can')],
  ['a bottle', item(2, 'a bottle')],
  ['a box', item(3, 'a box')],
  ['a jar', item(4, 'a jar')],
])

describe('decide', () => {
  it('is confident when the top score reaches the threshold', () => {
    const result = decide(
      [
        { label: 'a can', score: CONFIDENT_SCORE },
        { label: 'a bottle', score: 0.2 },
      ],
      catalog,
    )

    expect(result).toEqual({
      kind: 'confident',
      match: { item: catalog.get('a can'), score: CONFIDENT_SCORE },
      options: [
        { item: catalog.get('a can'), score: CONFIDENT_SCORE },
        { item: catalog.get('a bottle'), score: 0.2 },
      ],
    })
  })

  it('offers the top three when the best guess is only possible', () => {
    const result = decide(
      [
        { label: 'a can', score: 0.45 },
        { label: 'a bottle', score: 0.3 },
        { label: 'a box', score: 0.15 },
        { label: 'a jar', score: 0.1 },
      ],
      catalog,
    )

    expect(result.kind).toBe('choose')
    expect(result.kind === 'choose' && result.options.map((o) => o.item.id)).toEqual([1, 2, 3])
  })

  it('is unknown when the best guess is below the possible threshold', () => {
    const result = decide([{ label: 'a can', score: POSSIBLE_SCORE - 0.01 }], catalog)
    expect(result.kind).toBe('unknown')
  })

  it('ignores labels that are not in the catalog', () => {
    const result = decide(
      [
        { label: 'a removed item', score: 0.9 },
        { label: 'a box', score: 0.05 },
      ],
      catalog,
    )

    expect(result).toEqual({ kind: 'unknown', options: [{ item: catalog.get('a box'), score: 0.05 }] })
  })

  it('sorts by score even if the input is not sorted', () => {
    const result = decide(
      [
        { label: 'a bottle', score: 0.1 },
        { label: 'a jar', score: 0.8 },
      ],
      catalog,
    )
    expect(result.kind === 'confident' && result.match.item.id).toBe(4)
  })

  it('handles an empty score list', () => {
    expect(decide([], catalog)).toEqual({ kind: 'unknown', options: [] })
  })
})
