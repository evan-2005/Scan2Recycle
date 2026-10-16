import { describe, expect, it } from 'vitest'
import { authRedirectUrl, parseAuthReturn } from './authReturn'

describe('parseAuthReturn', () => {
  it('recognises a successful confirmation or reset link', () => {
    expect(parseAuthReturn('?auth=confirmed', '#access_token=abc&type=email_change')).toEqual({ kind: 'confirmed', failed: false })
    expect(parseAuthReturn('?auth=reset', '#access_token=abc&type=recovery')).toEqual({ kind: 'reset', failed: false })
  })

  it('flags expired or invalid links', () => {
    expect(parseAuthReturn('?auth=confirmed', '#error=access_denied&error_code=otp_expired')).toEqual({ kind: 'confirmed', failed: true })
  })

  it('ignores normal page loads and unknown values', () => {
    expect(parseAuthReturn('', '#/stats')).toBeNull()
    expect(parseAuthReturn('?auth=hack', '')).toBeNull()
  })
})

describe('authRedirectUrl', () => {
  it('points back at the app with the return kind', () => {
    expect(authRedirectUrl('https://scan2-recycle.vercel.app', '/', 'confirmed')).toBe('https://scan2-recycle.vercel.app/?auth=confirmed')
  })
})
