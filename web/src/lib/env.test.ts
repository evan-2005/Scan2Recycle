import { describe, expect, it } from 'vitest'
import { isSupabaseConfigured, readConfig } from './env'

describe('readConfig', () => {
  it('returns all nulls when nothing is set', () => {
    const config = readConfig({})

    expect(config).toEqual({ supabaseUrl: null, supabaseAnonKey: null })
    expect(isSupabaseConfigured(config)).toBe(false)
  })

  it('accepts valid values and trims whitespace', () => {
    const config = readConfig({
      VITE_SUPABASE_URL: ' https://abc.supabase.co ',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    })

    expect(config.supabaseUrl).toBe('https://abc.supabase.co')
    expect(isSupabaseConfigured(config)).toBe(true)
  })

  it('rejects a malformed Supabase URL', () => {
    const config = readConfig({ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_ANON_KEY: 'k' })

    expect(config.supabaseUrl).toBeNull()
    expect(isSupabaseConfigured(config)).toBe(false)
  })

  it('rejects non-http URL schemes', () => {
    expect(readConfig({ VITE_SUPABASE_URL: 'javascript:alert(1)' }).supabaseUrl).toBeNull()
  })

  it('treats blank strings as missing', () => {
    expect(readConfig({ VITE_SUPABASE_ANON_KEY: '   ' }).supabaseAnonKey).toBeNull()
  })
})
