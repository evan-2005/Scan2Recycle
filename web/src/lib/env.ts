export interface AppConfig {
  supabaseUrl: string | null
  supabaseAnonKey: string | null
  hfSpaceId: string | null
}

type RawEnv = Record<string, string | boolean | undefined>

const HF_SPACE_ID_PATTERN = /^[\w.-]+\/[\w.-]+$/

function clean(value: string | boolean | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function validUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null
  } catch {
    return null
  }
}

/** Reads and validates VITE_* env vars. Missing or malformed values become null instead of throwing,
 *  so the app can still render and show the setup checklist. */
export function readConfig(env: RawEnv): AppConfig {
  const hfSpaceId = clean(env.VITE_HF_SPACE_ID)
  return {
    supabaseUrl: validUrl(clean(env.VITE_SUPABASE_URL)),
    supabaseAnonKey: clean(env.VITE_SUPABASE_ANON_KEY),
    hfSpaceId: hfSpaceId && HF_SPACE_ID_PATTERN.test(hfSpaceId) ? hfSpaceId : null,
  }
}

export function isSupabaseConfigured(config: AppConfig): boolean {
  return config.supabaseUrl !== null && config.supabaseAnonKey !== null
}

export const config: AppConfig = readConfig(import.meta.env)
