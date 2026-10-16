import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from './env'

/** Null until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in web/.env.local. */
export const supabase: SupabaseClient | null =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null
