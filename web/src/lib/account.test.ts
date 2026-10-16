import { describe, expect, it } from 'vitest'
import { accountFromUser, friendlyAuthError, MIN_PASSWORD_LENGTH, validateCredentials } from './account'

describe('accountFromUser', () => {
  it('describes each kind of user', () => {
    expect(accountFromUser(null)).toEqual({ kind: 'none' })
    expect(accountFromUser({ is_anonymous: true, email: '', new_email: undefined })).toEqual({ kind: 'anonymous' })
    expect(accountFromUser({ is_anonymous: true, email: '', new_email: 'a@b.co' })).toEqual({ kind: 'pending', email: 'a@b.co' })
    expect(accountFromUser({ is_anonymous: false, email: 'a@b.co' })).toEqual({ kind: 'email', email: 'a@b.co' })
  })
})

describe('validateCredentials', () => {
  it('accepts a normal email and long enough password', () => {
    expect(validateCredentials(' student@school.edu.my ', 'x'.repeat(MIN_PASSWORD_LENGTH))).toEqual({})
  })

  it('reports both problems', () => {
    expect(validateCredentials('not-an-email', 'short')).toEqual({
      email: 'Enter a valid email address.',
      password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
  })
})

describe('friendlyAuthError', () => {
  it.each([
    ['A user with this email address has already been registered', /already has an account/],
    ['Email address "x@y.z" not authorized', /Confirm email/],
    ['email rate limit exceeded', /Too many attempts/],
    ['Invalid login credentials', /Wrong email or password/],
    ['Password should be at least 8 characters.', /Password should be/],
    ['weird failure', /Something went wrong: weird failure/],
  ])('explains %j', (message, expected) => {
    expect(friendlyAuthError(message)).toMatch(expected)
  })
})
