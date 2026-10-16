export interface FileProgress {
  loaded: number
  total: number
}

export type ProgressMap = Readonly<Record<string, FileProgress>>

/** Only the model weights matter for the progress bar; small JSON files would make it jump to 100% early. */
const MODEL_FILE_PATTERN = /\.onnx(_data)?$/

/** Returns a new map with one file's byte progress updated (ignores small non-model files). */
export function updateProgress(map: ProgressMap, file: string, loaded: number, total: number): ProgressMap {
  if (!MODEL_FILE_PATTERN.test(file)) return map
  return { ...map, [file]: { loaded, total } }
}

/** Overall download percentage (0–100) across every model file seen so far. */
export function overallPercent(map: ProgressMap): number {
  const files = Object.values(map)
  const total = files.reduce((sum, f) => sum + f.total, 0)
  if (total === 0) return 0
  const loaded = files.reduce((sum, f) => sum + Math.min(f.loaded, f.total), 0)
  return Math.round((loaded / total) * 100)
}
