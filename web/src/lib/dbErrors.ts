/** PostgREST says this when a table or function doesn't exist (the SQL file hasn't been run yet). */
const MISSING_PATTERN = /schema cache|does not exist|could not find the (table|function)/i

/** Turns "table not found" into a setup hint for the team; other errors pass through with context. */
export function describeDbError(message: string, what: string): string {
  if (MISSING_PATTERN.test(message)) {
    return `${what} isn't set up yet. The team needs to run supabase/migrations/004_features.sql in Supabase.`
  }
  return `Couldn't load ${what.toLowerCase()}: ${message}`
}
