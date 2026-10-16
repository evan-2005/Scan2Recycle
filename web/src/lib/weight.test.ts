import { describe, expect, it } from 'vitest'
import { parseWeight } from './weight'

describe('parseWeight', () => {
  it.each([
    ['32', 32],
    [' 32 ', 32],
    ['12.5', 12.5],
    ['12,5', 12.5],
    ['15.26', 15.3],
    ['0.1', 0.1],
  ])('reads %j as %s g', (input, grams) => {
    expect(parseWeight(input)).toEqual({ ok: true, grams })
  })

  it('treats an empty box as "no weight"', () => {
    expect(parseWeight('')).toEqual({ ok: true, grams: null })
    expect(parseWeight('   ')).toEqual({ ok: true, grams: null })
  })

  it.each(['abc', '-5', '1e3', '12g', '1.2.3'])('rejects %j', (input) => {
    expect(parseWeight(input)).toMatchObject({ ok: false })
  })

  it('rejects weights that round to zero, and absurd weights', () => {
    expect(parseWeight('0')).toMatchObject({ ok: false, error: expect.stringMatching(/at least 0.1/) })
    expect(parseWeight('0.04')).toMatchObject({ ok: false, error: expect.stringMatching(/at least 0.1/) })
    expect(parseWeight('50000')).toMatchObject({ ok: false, error: expect.stringMatching(/50 kg/) })
  })
})
