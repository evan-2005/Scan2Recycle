/// <reference lib="webworker" />
/**
 * Runs the zero-shot image model (SigLIP) in a background thread so the UI stays responsive on phones.
 *
 * Label embeddings come precomputed from public/label-embeddings.json, so a normal phone only downloads
 * the vision half of the model. Labels missing from that file (items added in Supabase later) are embedded
 * on the device, which downloads the text half once. Model files come from the Hugging Face Hub and are
 * cached by the browser.
 */
import {
  AutoProcessor,
  AutoTokenizer,
  env,
  RawImage,
  SiglipTextModel,
  SiglipVisionModel,
  type ProgressInfo,
} from '@huggingface/transformers'
import { DTYPE, EMBEDDINGS_FILE, LOGIT_SCALE, MODEL_ID, PROMPT_TEMPLATES, TEXT_PADDING } from './model'
import type { WorkerRequest, WorkerResponse } from './protocol'
import { averageEmbeddings, parseEmbeddings, rankLabels, splitRows } from './similarity'

// Always fetch from the Hub; never look for model files on our own server.
env.allowLocalModels = false

const scope = self as unknown as DedicatedWorkerGlobalScope

function post(message: WorkerResponse): void {
  scope.postMessage(message)
}

function onProgress(info: ProgressInfo): void {
  if (info.status === 'progress') {
    post({ type: 'progress', file: info.file, loaded: info.loaded, total: info.total })
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function loadVision() {
  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: onProgress }),
    SiglipVisionModel.from_pretrained(MODEL_ID, { dtype: DTYPE, progress_callback: onProgress }),
  ])
  return { processor, model }
}

async function loadText() {
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback: onProgress }),
    SiglipTextModel.from_pretrained(MODEL_ID, { dtype: DTYPE, progress_callback: onProgress }),
  ])
  return { tokenizer, model }
}

/** Precomputed label embeddings, or an empty map if the file is missing, stale or for another model. */
async function loadPrecomputed(): Promise<Map<string, Float32Array>> {
  try {
    const response = await fetch(new URL(`${import.meta.env.BASE_URL}${EMBEDDINGS_FILE}`, scope.location.origin))
    return response.ok ? parseEmbeddings(await response.json(), MODEL_ID) : new Map()
  } catch {
    return new Map()
  }
}

type Vision = Awaited<ReturnType<typeof loadVision>>
type Text = Awaited<ReturnType<typeof loadText>>

/** Same recipe as scripts/embed-labels.mts, so on-device and precomputed vectors match. */
async function embedOnDevice(text: Text, labels: string[]): Promise<Map<string, Float32Array>> {
  const perTemplate: Float32Array[][] = []
  for (const template of PROMPT_TEMPLATES) {
    const inputs = text.tokenizer(
      labels.map((label) => template.replace('{}', label)),
      { padding: TEXT_PADDING, truncation: true },
    )
    const { pooler_output } = await text.model(inputs)
    const [rows, size] = pooler_output.dims as [number, number]
    perTemplate.push(splitRows(pooler_output.data as Float32Array, rows, size))
  }
  const vectors = averageEmbeddings(perTemplate)
  return new Map(labels.map((label, i) => [label, vectors[i]]))
}

interface Prepared {
  vision: Vision
  labels: string[]
  labelEmbeds: Float32Array[]
}

let visionPromise: Promise<Vision> | null = null
let textPromise: Promise<Text> | null = null
let precomputedPromise: Promise<Map<string, Float32Array>> | null = null
let prepared: Promise<Prepared> | null = null

async function prepare(labels: string[]): Promise<Prepared> {
  visionPromise ??= loadVision()
  precomputedPromise ??= loadPrecomputed()
  const known = await precomputedPromise
  const missing = labels.filter((label) => !known.has(label))
  const extra = missing.length > 0 ? await embedOnDevice(await (textPromise ??= loadText()), missing) : new Map()
  const vectors = new Map([...known, ...extra])
  return { vision: await visionPromise, labels, labelEmbeds: labels.map((label) => vectors.get(label)!) }
}

async function classify(image: Blob) {
  if (!prepared) throw new Error('Classifier used before it was prepared.')
  const { vision, labels, labelEmbeds } = await prepared
  const rawImage = await RawImage.fromBlob(image)
  const { pooler_output } = await vision.model(await vision.processor(rawImage))
  return rankLabels(pooler_output.data as Float32Array, labelEmbeds, labels, LOGIT_SCALE)
}

scope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.type === 'prepare') {
    prepared = prepare(request.labels)
    prepared.then(
      () => post({ type: 'ready' }),
      (error: unknown) => {
        // Allow a retry, e.g. after the connection comes back.
        visionPromise = null
        textPromise = null
        precomputedPromise = null
        prepared = null
        post({ type: 'prepare-error', message: errorMessage(error) })
      },
    )
    return
  }
  classify(request.image).then(
    (scores) => post({ type: 'result', id: request.id, scores }),
    (error: unknown) => post({ type: 'classify-error', id: request.id, message: errorMessage(error) }),
  )
})
