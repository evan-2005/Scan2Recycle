import type { LabelScore } from './similarity'

/** Messages between the app and classifier.worker.ts. */
export type WorkerRequest =
  | { type: 'prepare'; labels: string[] }
  | { type: 'classify'; id: number; image: Blob }

export type WorkerResponse =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'prepare-error'; message: string }
  | { type: 'result'; id: number; scores: LabelScore[] }
  | { type: 'classify-error'; id: number; message: string }
