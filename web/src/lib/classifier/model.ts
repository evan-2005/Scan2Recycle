/**
 * Which zero-shot model the app uses, shared by the in-browser worker and scripts/embed-labels.mts.
 * No imports here, so the Node script can load this file directly.
 *
 * SigLIP beat CLIP ViT-B/32 on 145 TrashNet photos: right bin from the top guess 80% vs 57% (PLAN.md §4.3).
 */
export const MODEL_ID = 'Xenova/siglip-base-patch16-224'

/** 8-bit weights: the vision half is ~100 MB, the text half ~110 MB (only needed for labels not precomputed). */
export const DTYPE = 'q8'

/** SigLIP was trained with text padded to a fixed length; other padding hurts accuracy. */
export const TEXT_PADDING = 'max_length'

/** Each label is embedded with every template and averaged ("prompt ensembling"). */
export const PROMPT_TEMPLATES = ['a photo of {}', 'a close-up photo of {}', 'a photo of {}, a piece of rubbish'] as const

/** Temperature applied to cosine similarities before softmax. Thresholds in decide.ts are tuned for this value. */
export const LOGIT_SCALE = 100

/** Precomputed label embeddings, served from web/public. Regenerate with `npm run embed-labels`. */
export const EMBEDDINGS_FILE = 'label-embeddings.json'

export interface LabelEmbeddingsFile {
  model: string
  templates: readonly string[]
  dims: number
  embeddings: Record<string, number[]>
}

export function promptsFor(label: string): string[] {
  return PROMPT_TEMPLATES.map((template) => template.replace('{}', label))
}
