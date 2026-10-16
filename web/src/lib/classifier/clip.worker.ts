/// <reference lib="webworker" />
/**
 * Runs CLIP in a background thread so the UI stays responsive on phones.
 * Label (text) embeddings are computed once per label list; each scan then only runs the vision model.
 * Model files come from the Hugging Face Hub and are cached by the browser after the first download.
 */
import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  env,
  RawImage,
  type ProgressInfo,
} from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './protocol'
import { averageEmbeddings, rankLabels, splitRows } from './similarity'

const MODEL_ID = 'Xenova/clip-vit-base-patch32'
/** 8-bit quantised weights: ~150 MB total instead of ~600 MB, with little accuracy loss. */
const DTYPE = 'q8'
/**
 * Each label is embedded with every template and the results averaged ("prompt ensembling").
 * On 145 TrashNet photos this lifted top-1 material accuracy from 60% to 64% (PLAN.md §4.3).
 */
const PROMPT_TEMPLATES = ['a photo of {}', 'a close-up photo of {}', 'a photo of {}, a piece of rubbish'] as const

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

type Models = Awaited<ReturnType<typeof loadModels>>

async function loadModels() {
  const options = { dtype: DTYPE, progress_callback: onProgress } as const
  const [tokenizer, textModel, processor, visionModel] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback: onProgress }),
    CLIPTextModelWithProjection.from_pretrained(MODEL_ID, options),
    AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: onProgress }),
    CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, options),
  ])
  return { tokenizer, textModel, processor, visionModel }
}

async function embedPrompts(models: Models, prompts: string[]): Promise<Float32Array[]> {
  const inputs = models.tokenizer(prompts, { padding: true, truncation: true })
  const { text_embeds } = await models.textModel(inputs)
  const [rows, size] = text_embeds.dims as [number, number]
  return splitRows(text_embeds.data as Float32Array, rows, size)
}

async function embedLabels(models: Models, labels: string[]): Promise<Float32Array[]> {
  const perTemplate: Float32Array[][] = []
  for (const template of PROMPT_TEMPLATES) {
    perTemplate.push(await embedPrompts(models, labels.map((label) => template.replace('{}', label))))
  }
  return averageEmbeddings(perTemplate)
}

interface Prepared {
  models: Models
  labels: string[]
  labelEmbeds: Float32Array[]
}

let modelsPromise: Promise<Models> | null = null
let prepared: Promise<Prepared> | null = null

async function prepare(labels: string[]): Promise<Prepared> {
  modelsPromise ??= loadModels()
  const models = await modelsPromise
  return { models, labels, labelEmbeds: await embedLabels(models, labels) }
}

async function classify(image: Blob) {
  if (!prepared) throw new Error('Classifier used before it was prepared.')
  const { models, labels, labelEmbeds } = await prepared
  const rawImage = await RawImage.fromBlob(image)
  const imageInputs = await models.processor(rawImage)
  const { image_embeds } = await models.visionModel(imageInputs)
  return rankLabels(image_embeds.data as Float32Array, labelEmbeds, labels)
}

scope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.type === 'prepare') {
    prepared = prepare(request.labels)
    prepared.then(
      () => post({ type: 'ready' }),
      (error: unknown) => {
        modelsPromise = null // allow a retry, e.g. after the connection comes back
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
