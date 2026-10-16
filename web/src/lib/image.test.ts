import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, scaledSize, validateImageFile } from './image'

describe('validateImageFile', () => {
  it('accepts a normal photo', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 3_000_000 })).toBeNull()
  })

  it.each([
    [{ type: 'application/pdf', size: 1000 }, 'error.imageType'],
    [{ type: '', size: 1000 }, 'error.imageType'],
    [{ type: 'image/png', size: 0 }, 'error.imageEmpty'],
    [{ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }, 'error.imageSize'],
  ])('rejects %j', (file, key) => {
    expect(validateImageFile(file)).toEqual({ key })
  })
})

describe('scaledSize', () => {
  it('shrinks the long side to the limit and keeps the aspect ratio', () => {
    expect(scaledSize(4000, 3000, 512)).toEqual({ width: 512, height: 384 })
    expect(scaledSize(3000, 4000, 512)).toEqual({ width: 384, height: 512 })
  })

  it('never enlarges a small image', () => {
    expect(scaledSize(300, 200, 512)).toEqual({ width: 300, height: 200 })
  })

  it('never returns a zero dimension', () => {
    expect(scaledSize(10000, 1, 512)).toEqual({ width: 512, height: 1 })
  })
})
