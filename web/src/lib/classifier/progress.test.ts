import { describe, expect, it } from 'vitest'
import { overallPercent, updateProgress } from './progress'

describe('download progress', () => {
  it('is 0 before anything is known', () => {
    expect(overallPercent({})).toBe(0)
  })

  it('combines several files by bytes, not by file count', () => {
    let map = updateProgress({}, 'onnx/text_model_quantized.onnx', 50, 100)
    map = updateProgress(map, 'onnx/vision_model_quantized.onnx', 0, 300)
    expect(overallPercent(map)).toBe(13)
  })

  it('ignores small config files so the bar does not jump to 100% early', () => {
    let map = updateProgress({}, 'tokenizer.json', 2000, 2000)
    map = updateProgress(map, 'onnx/vision_model_quantized.onnx', 10, 100)
    expect(overallPercent(map)).toBe(10)
  })

  it('does not mutate the previous map', () => {
    const first = updateProgress({}, 'a.onnx', 1, 2)
    updateProgress(first, 'a.onnx', 2, 2)
    expect(first['a.onnx']).toEqual({ loaded: 1, total: 2 })
  })

  it('caps over-reported bytes at 100%', () => {
    expect(overallPercent(updateProgress({}, 'a.onnx', 150, 100))).toBe(100)
  })
})
