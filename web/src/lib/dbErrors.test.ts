import { describe, expect, it } from 'vitest'
import { describeDbError } from './dbErrors'

describe('describeDbError', () => {
  it('turns a missing table into a setup hint', () => {
    expect(describeDbError("Could not find the table 'public.group_members' in the schema cache", 'Groups')).toBe(
      "Groups isn't set up yet. The team needs to run supabase/migrations/004_features.sql in Supabase.",
    )
    expect(describeDbError('Could not find the function public.create_group(p_name) in the schema cache', 'Groups')).toMatch(/isn't set up yet/)
  })

  it('keeps other errors, with context', () => {
    expect(describeDbError('JWT expired', 'Groups')).toBe("Couldn't load groups: JWT expired")
  })
})
