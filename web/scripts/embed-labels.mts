/**
 * Precomputes label embeddings so phones only download the vision half of the model.
 *
 *   npm run embed-labels
 *
 * Reads item labels from supabase/seed.sql and, if web/.env.local has Supabase keys, from the live
 * item_types table too, then writes web/public/label-embeddings.json. Re-run after adding items
 * (items missing from the file still work, but each phone then downloads the ~110 MB text model).
 */
import { AutoTokenizer, SiglipTextModel } from '@huggingface/transformers'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DTYPE, EMBEDDINGS_FILE, MODEL_ID, PROMPT_TEMPLATES, TEXT_PADDING, type LabelEmbeddingsFile } from '../src/lib/classifier/model.ts'
import { averageEmbeddings, splitRows } from '../src/lib/classifier/similarity.ts'

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const DECIMALS = 4

function labelsFromSeed(): string[] {
  const sql = readFileSync(join(webDir, '../supabase/seed.sql'), 'utf8')
  const start = sql.indexOf('insert into public.item_types')
  if (start < 0) throw new Error('No item_types insert found in seed.sql')
  const block = sql.slice(start, sql.indexOf('on conflict', start))
  return [...block.matchAll(/^\s*\('((?:[^']|'')+)',/gm)].map((m) => m[1].replaceAll("''", "'"))
}

function readEnv(): Record<string, string> {
  try {
    const text = readFileSync(join(webDir, '.env.local'), 'utf8')
    return Object.fromEntries(
      text
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => [m[1], m[2]]),
    )
  } catch {
    return {}
  }
}

async function labelsFromDatabase(): Promise<string[]> {
  const env = readEnv()
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('No Supabase keys in web/.env.local; using seed.sql labels only.')
    return []
  }
  try {
    const response = await fetch(`${url}/rest/v1/item_types?select=label`, { headers: { apikey: key } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const rows = (await response.json()) as { label: string }[]
    return rows.map((row) => row.label)
  } catch (error) {
    console.warn(`Could not read item_types from Supabase (${String(error)}); using seed.sql labels only.`)
    return []
  }
}

const labels = [...new Set([...labelsFromSeed(), ...(await labelsFromDatabase())])].sort()
console.log(`Embedding ${labels.length} labels with ${MODEL_ID} (${PROMPT_TEMPLATES.length} templates each)…`)

const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID)
const textModel = await SiglipTextModel.from_pretrained(MODEL_ID, { dtype: DTYPE })

// Same recipe as embedOnDevice() in classifier.worker.ts.
const perTemplate: Float32Array[][] = []
for (const template of PROMPT_TEMPLATES) {
  const inputs = tokenizer(
    labels.map((label) => template.replace('{}', label)),
    { padding: TEXT_PADDING, truncation: true },
  )
  const { pooler_output } = await textModel(inputs)
  perTemplate.push(splitRows(pooler_output.data as Float32Array, pooler_output.dims[0], pooler_output.dims[1]))
}
const vectors = averageEmbeddings(perTemplate)

const round = (x: number) => Number(x.toFixed(DECIMALS))
const file: LabelEmbeddingsFile = {
  model: MODEL_ID,
  templates: PROMPT_TEMPLATES,
  dims: vectors[0].length,
  embeddings: Object.fromEntries(labels.map((label, i) => [label, Array.from(vectors[i], round)])),
}
const outPath = join(webDir, 'public', EMBEDDINGS_FILE)
writeFileSync(outPath, JSON.stringify(file) + '\n')
console.log(`Wrote ${outPath} (${labels.length} labels × ${file.dims} dims).`)
