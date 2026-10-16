import { describe, expect, it } from 'vitest'
import { accountFromUser, friendlyAuthError, MIN_PASSWORD_LENGTH, validateCredentials } from './account'

describe('accountFromUser', () => {
  it('describes each kind of user', () => {
    expect(accountFromUser(null)).toEqual({ kind: 'none' })
    expect(accountFromUser({ is_anonymous: true, email: '', new_email: undefined })).toEqual({ kind: 'anonymous' })
    expect(accountFromUser({ is_anonymous: true, email: '', new_email: 'a@b.co' })).toEqual({ kind: 'pending', email: 'a@b.co' })
    expect(accountFromUser({ is_anonymous: false, email: 'a@b.co' })).toEqual({ kind: 'email', email: 'a@b.co', hasPassword: false })
    expect(accountFromUser({ is_anonymous: false, email: 'a@b.co', user_metadata: { has_password: true } })).toEqual({ kind: 'email', email: 'a@b.co', hasPassword: true })
  })
})

describe('validateCredentials', () => {
  it('accepts a normal email and long enough password', () => {
    expect(validateCredentials(' student@school.edu.my ', 'x'.repeat(MIN_PASSWORD_LENGTH))).toEqual({})
  })

  it('reports both problems', () => {
    expect(validateCredentials('not-an-email', 'short')).toEqual({
      email: { key: 'error.email' },
      password: { key: 'error.password', vars: { n: MIN_PASSWORD_LENGTH } },
    })
  })
})

describe('friendlyAuthError', () => {
  it.each([
    ['A user with this email address has already been registered', 'error.emailExists'],
    ['Email address "x@y.z" not authorized', 'error.emailNotAuthorized'],
    ['email rate limit exceeded', 'error.rateLimit'],
    ['Invalid login credentials', 'error.wrongLogin'],
    ['Email not confirmed', 'error.emailNotConfirmed'],
    ['For security purposes, you can only request this after 52 seconds.', 'error.rateLimit'],
    ['Password should be at least 8 characters.', 'error.weakPassword'],
  ])('explains %j', (message, key) => {
    expect(friendlyAuthError(message).key).toBe(key)
  })

  it('keeps unknown errors as detail', () => {
    expect(friendlyAuthError('weird failure')).toEqual({ key: 'error.generic', vars: { detail: 'weird failure' } })
  })
})
