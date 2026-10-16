import { msg, type Message } from '../i18n/translate'

/** PostgREST says this when a table or function doesn't exist (the SQL file hasn't been run yet). */
const MISSING_PATTERN = /schema cache|does not exist|could not find the (table|function)/i

/** Turns "table not found" into a setup hint for the team; other errors keep their detail. */
export function describeDbError(message: string): Message {
  return MISSING_PATTERN.test(message) ? msg('error.notSetUp') : msg('error.loadFailed', { detail: message })
}
