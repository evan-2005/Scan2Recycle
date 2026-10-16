import { describe, expect, it } from 'vitest'
import { describeDbError } from './dbErrors'

describe('describeDbError', () => {
  it('turns a missing table or function into a setup hint', () => {
    expect(describeDbError("Could not find the table 'public.group_members' in the schema cache")).toEqual({ key: 'error.notSetUp' })
    expect(describeDbError('Could not find the function public.create_group(p_name) in the schema cache')).toEqual({ key: 'error.notSetUp' })
  })

  it('keeps other errors as detail', () => {
    expect(describeDbError('JWT expired')).toEqual({ key: 'error.loadFailed', vars: { detail: 'JWT expired' } })
  })
})
