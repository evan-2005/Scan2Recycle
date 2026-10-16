import type { WorkerRequest, WorkerResponse } from './protocol'
import { overallPercent, updateProgress, type ProgressMap } from './progress'
import type { LabelScore } from './similarity'

type ProgressListener = (percent: number) => void

interface Pending {
  resolve: (scores: LabelScore[]) => void
  reject: (error: Error) => void
}

let worker: Worker | null = null
let readyPromise: Promise<void> | null = null
let preparedKey: string | null = null
let progress: ProgressMap = {}
let nextId = 1
const pending = new Map<number, Pending>()
const progressListeners = new Set<ProgressListener>()
let settleReady: { resolve: () => void; reject: (error: Error) => void } | null = null

function send(request: WorkerRequest): void {
  getWorker().postMessage(request)
}

function failEverything(error: Error): void {
  settleReady?.reject(error)
  settleReady = null
  readyPromise = null
  preparedKey = null
  pending.forEach((p) => p.reject(error))
  pending.clear()
}

function handleMessage(message: WorkerResponse): void {
  switch (message.type) {
    case 'progress':
      progress = updateProgress(progress, message.file, message.loaded, message.total)
      progressListeners.forEach((listener) => listener(overallPercent(progress)))
      return
    case 'ready':
      settleReady?.resolve()
      settleReady = null
      return
    case 'prepare-error':
      failEverything(new Error(`Could not load the AI model: ${message.message}`))
      return
    case 'result':
      pending.get(message.id)?.resolve(message.scores)
      pending.delete(message.id)
      return
    case 'classify-error':
      pending.get(message.id)?.reject(new Error(message.message))
      pending.delete(message.id)
      return
  }
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./clip.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => handleMessage(event.data))
    worker.addEventListener('error', (event) => {
      failEverything(new Error(event.message || 'The AI worker crashed.'))
      worker?.terminate()
      worker = null
    })
  }
  return worker
}

/**
 * Downloads the model (first time only) and embeds the item labels.
 * Safe to call repeatedly: it only does work again if the label list changes or a previous attempt failed.
 */
export function prepareClassifier(labels: readonly string[], onProgress?: ProgressListener): Promise<void> {
  const key = labels.join('\n')
  if (readyPromise && preparedKey === key) return withProgress(readyPromise, onProgress)

  preparedKey = key
  readyPromise = new Promise<void>((resolve, reject) => {
    settleReady = { resolve, reject }
  })
  send({ type: 'prepare', labels: [...labels] })
  return withProgress(readyPromise, onProgress)
}

function withProgress(promise: Promise<void>, onProgress?: ProgressListener): Promise<void> {
  if (!onProgress) return promise
  progressListeners.add(onProgress)
  return promise.finally(() => progressListeners.delete(onProgress))
}

/** Scores the photo against the prepared labels, best match first. */
export function classifyImage(image: Blob): Promise<LabelScore[]> {
  if (!readyPromise) return Promise.reject(new Error('Call prepareClassifier before classifyImage.'))
  const id = nextId++
  return new Promise<LabelScore[]>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    send({ type: 'classify', id, image })
  })
}
